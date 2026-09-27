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
      where table_name='profiles' and column_name='claimed_church_id') as has_claim_col,
    (select count(*) from information_schema.tables
      where table_name='church_photos') as has_photos_table`);
if (!Number(cols[0].has_claim_col) || !Number(cols[0].has_photos_table)) {
  console.log('');
  bad('23_church_photos_editable.sql has not been applied.');
  info('Run: node scripts/migrate.mjs');
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
    if (r.hide_imported_photo) warn('the imported photo is hidden');
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
