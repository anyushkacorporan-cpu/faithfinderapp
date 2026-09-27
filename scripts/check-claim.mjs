#!/usr/bin/env node
/**
 * Why can this account not edit its church's photos? — one answer.
 *
 * The gate has four parts: an account, a claim that names a church, an
 * approval, and the ownership row the approval trigger writes. Any one of them
 * missing looks identical from inside the app — the Gallery Photos section says
 * the claim is not approved and stops there — so working out which one it is
 * meant a different query each time, and the wrong email in any of them
 * reported a healthy account as broken.
 *
 * This checks all four for every account and says which step is the one to fix.
 *
 *   node scripts/check-claim.mjs
 */
import { readFileSync } from 'node:fs';
import pg from 'pg';

const ok   = s => console.log(`  \x1b[32m✓\x1b[0m ${s}`);
const bad  = s => console.log(`  \x1b[31m✗\x1b[0m ${s}`);
const warn = s => console.log(`  \x1b[33m·\x1b[0m ${s}`);
const info = s => console.log(`      ${s}`);

let env = {};
try {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const eq = line.indexOf('=');
    if (eq > 0) env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
} catch { /* fall through */ }

const url = env.DATABASE_URL || process.env.DATABASE_URL;
if (!url) {
  console.error('\n  No DATABASE_URL in .env.local — run: node scripts/setup-env.mjs\n');
  process.exit(1);
}

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

// The schema has to be there before any of the rest means anything.
const { rows: cols } = await client.query(`
  select
    (select count(*) from information_schema.columns
      where table_name='profiles' and column_name='claimed_church_id') as m23_claim_col,
    (select count(*) from information_schema.tables
      where table_name='church_photos') as m23_photos_table,
    (select count(*) from pg_proc where proname='search_churches') as m24_search_fn,
    (select count(*) from information_schema.columns
      where table_name='church_profiles' and column_name='cover_url') as m25_cover_col,
    (select count(*) from information_schema.columns
      where table_name='churches_public' and column_name='cover_url') as m25_view_col`);
const c0 = cols[0];

// A private bucket serves an error for every photo url, everywhere, while the
// rows all look correct — which is indistinguishable from the app being broken.
try {
  const { rows: b } = await client.query(
    `select public from storage.buckets where id = 'church-photos'`);
  console.log('\n\x1b[1mStorage\x1b[0m');
  if (!b.length) bad("the 'church-photos' bucket does not exist — run: node scripts/migrate.mjs");
  else if (b[0].public) ok("'church-photos' bucket is public");
  else {
    bad("'church-photos' bucket is NOT public — every photo url will fail to load");
    info(`node scripts/sql.mjs "update storage.buckets set public = true where id='church-photos'"`);
  }
  const { rows: f } = await client.query(
    `select count(*)::int as n from storage.objects where bucket_id = 'church-photos'`);
  ok(`${f[0].n} file${f[0].n === 1 ? '' : 's'} uploaded`);
} catch {
  console.log('\n\x1b[1mStorage\x1b[0m');
  warn('could not read storage.buckets from this connection');
}

console.log('\n\x1b[1mMigrations\x1b[0m');
const m23 = Number(c0.m23_claim_col) && Number(c0.m23_photos_table);
const m24 = Number(c0.m24_search_fn);
const m25 = Number(c0.m25_cover_col) && Number(c0.m25_view_col);
m23 ? ok('23_church_photos_editable.sql — gallery and ownership')
    : bad('23_church_photos_editable.sql NOT applied');
m24 ? ok('24_search_performance.sql — indexed search')
    : bad('24_search_performance.sql NOT applied — searching the directory will time out');
m25 ? ok('25_church_profile_cover.sql — profile and cover photos')
    : bad('25_church_profile_cover.sql NOT applied — the profile photo and cover cannot save');
if (!m23 || !m24 || !m25) {
  console.log('');
  info('\x1b[33mRun: node scripts/migrate.mjs\x1b[0m');
}
if (!m23) {
  console.log('');
  await client.end();
  process.exit(1);
}

const { rows } = await client.query(`
  select
    u.email,
    u.email_confirmed_at is not null           as confirmed,
    p.verification_status,
    p.claimed_church_id,
    c.name                                     as church_name,
    cp.claimed_at                              as owned_since,
    cp.hide_imported_photo,
    cp.photo_url                               as profile_photo,
    ${m25 ? 'cp.cover_url' : 'null::text as cover_url'},
    c.photo_url                                as imported_photo,
    (select g.url from church_photos g where g.church_id = p.claimed_church_id
      order by g.sort, g.created_at limit 1)   as first_gallery,
    (select count(*) from church_photos g where g.church_id = p.claimed_church_id) as gallery
  from auth.users u
  left join profiles p        on p.id = u.id
  left join churches c        on c.id = p.claimed_church_id
  left join church_profiles cp on cp.church_id = p.claimed_church_id and cp.claimed_by = u.id
  order by u.created_at`);

console.log(`\n\x1b[1m${rows.length} account${rows.length === 1 ? '' : 's'}\x1b[0m\n`);

let anyReady = false;
for (const r of rows) {
  console.log(`\x1b[1m${r.email}\x1b[0m`);
  if (!r.confirmed) bad('not email-confirmed — cannot sign in');
  if (!r.verification_status) { bad('no profile row'); console.log(''); continue; }

  if (!r.claimed_church_id) {
    bad('no church claimed');
    info('Claim one in the app: Profile → claim your church.');
    info('It must be a church from the directory — the result card shows a photo.');
  } else {
    ok(`claim names: ${r.church_name || '(a church no longer in the directory)'}`);
  }

  if (r.verification_status !== 'approved') {
    warn(`verification_status is "${r.verification_status}", not "approved"`);
    if (r.claimed_church_id) {
      info('Approve it with:');
      info(`node scripts/sql.mjs "update profiles set verification_status='approved' where id=(select id from auth.users where email='${r.email}')"`);
    }
  } else if (!r.owned_since) {
    // Approved but no ownership row: the approval happened while no church was
    // named, so the trigger had nothing to act on and will not fire again.
    bad('approved, but no ownership row — the approval ran before a church was claimed');
    info('The trigger only fires on the change INTO approved, so re-approving does nothing.');
    info('Reset it, claim a church, then approve again:');
    info(`node scripts/sql.mjs "update profiles set verification_status='none' where id=(select id from auth.users where email='${r.email}')"`);
  } else {
    ok(`owns it since ${new Date(r.owned_since).toLocaleString()}`);
    ok(`gallery photos: ${r.gallery}`);
    // What a card will actually draw, worked out the same way the view does.
    const shown = r.profile_photo || r.first_gallery
      || (r.hide_imported_photo ? null : r.imported_photo);
    console.log(`      profile photo  ${r.profile_photo || '(none)'}`);
    console.log(`      cover photo    ${r.cover_url || '(none)'}`);
    console.log(`      imported       ${r.imported_photo || '(none)'}${r.hide_imported_photo ? '  \x1b[33m(hidden)\x1b[0m' : ''}`);
    if (Number(r.gallery)) {
      const { rows: g } = await client.query(
        `select url from church_photos where church_id = $1 order by sort, created_at`,
        [r.claimed_church_id]);
      g.forEach((row, i) => console.log(`      gallery ${i + 1}       ${row.url}`));
    }
    if (shown) ok(`cards will show: ${shown}`);
    else warn('cards will show no photo at all — nothing is set and the imported one is hidden or absent');
    ok('\x1b[32mphoto editing is unlocked for this account\x1b[0m');
    anyReady = true;
  }
  console.log('');
}

if (!anyReady) {
  console.log('\x1b[33m  No account can edit church photos yet. The first ✗ above is the step to fix.\x1b[0m\n');
} else {
  console.log('  Sign in as the account marked unlocked, then open Edit Church Profile.\n');
}

await client.end();
