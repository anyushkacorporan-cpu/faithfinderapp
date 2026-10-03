#!/usr/bin/env node
/**
 * Who is waiting for their church claim to be approved, and approving it.
 *
 * A claim lands in profiles.verification_status as 'pending' and nothing tells
 * anyone. notify_verification only fires on approved or rejected — it tells the
 * claimant the decision, never the reviewer that a decision is wanted. So the
 * app promises "we review all claims within 3-5 business days" and the queue
 * is invisible. One claim is fine. Fifty is fifty people who were promised an
 * answer.
 *
 * check-claim.mjs shows this too, but prints every account to do it, which
 * stops being readable the moment there is more than a handful.
 *
 *   node scripts/claims.mjs                       who is waiting
 *   node scripts/claims.mjs --approve a@b.com     grant it
 *   node scripts/claims.mjs --reject  a@b.com     refuse it
 *   node scripts/claims.mjs --all                 decided ones too
 *
 * Approving hands someone control of a public listing — its name, address,
 * phone and photos — so it asks before doing it.
 */
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import pg from 'pg';

const argv = process.argv.slice(2);
const after = (name) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : null; };
const APPROVE = after('approve');
const REJECT  = after('reject');
const ALL     = argv.includes('--all');

let env = {};
try {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const eq = line.indexOf('=');
    if (eq > 0) env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
} catch { /* fall through */ }
const DB = env.DATABASE_URL || process.env.DATABASE_URL;
if (!DB) { console.error('\n  No DATABASE_URL in .env.local — run: node scripts/setup-env.mjs\n'); process.exit(1); }

const client = new pg.Client({ connectionString: DB, ssl: { rejectUnauthorized: false } });
await client.connect();

const ok   = s => console.log(`  \x1b[32m✓\x1b[0m ${s}`);
const bad  = s => console.log(`  \x1b[31m✗\x1b[0m ${s}`);
const days = d => {
  const n = Math.floor((Date.now() - new Date(d)) / 86400000);
  return n === 0 ? 'today' : n === 1 ? '1 day ago' : `${n} days ago`;
};

/** One person's claim, with the church it names and whether it is grantable. */
async function claimFor(email) {
  const { rows } = await client.query(`
    select u.id, u.email, p.verification_status, p.claimed_church_id,
           p.church_name, p.updated_at, c.name as church, c.address, c.city, c.state,
           cp.claimed_by as already_owned_by, ou.email as owner_email
      from auth.users u
      join profiles p on p.id = u.id
      left join churches c on c.id = p.claimed_church_id
      left join church_profiles cp on cp.church_id = p.claimed_church_id and cp.claimed_at is not null
      left join auth.users ou on ou.id = cp.claimed_by
     where lower(u.email) = lower($1)`, [email]);
  return rows[0] || null;
}

async function decide(email, status) {
  const c = await claimFor(email);
  if (!c) { bad(`No account with email: ${email}`); await client.end(); process.exit(1); }

  console.log(`\n  \x1b[1m${c.email}\x1b[0m`);
  console.log(`      claims    ${c.church || c.church_name || '(no church named)'}`);
  if (c.address) console.log(`      address   ${[c.address, c.city, c.state].filter(Boolean).join(', ')}`);
  console.log(`      status    ${c.verification_status}`);

  if (status === 'approved') {
    if (!c.claimed_church_id) {
      bad('This claim names no church in the directory, so approving it grants nothing.');
      console.log('      They searched a church we do not hold a listing for. Nothing to own.\n');
      await client.end(); process.exit(1);
    }
    if (c.already_owned_by && c.already_owned_by !== c.id) {
      bad(`Already owned by ${c.owner_email}. Approving will NOT transfer it.`);
      console.log('      A transfer is a decision, not a side effect — do it deliberately.\n');
      await client.end(); process.exit(1);
    }
    console.log(`\n  Approving gives them control of this church's public listing:`);
    console.log(`  its name, address, phone, website and photos.`);
  }

  const rl = createInterface({ input: stdin, output: stdout });
  const answer = await rl.question(`\n  Type \x1b[1m${status === 'approved' ? 'approve' : 'reject'}\x1b[0m to confirm, anything else to stop: `);
  rl.close();
  if (answer.trim() !== (status === 'approved' ? 'approve' : 'reject')) {
    console.log('\n  Stopped. Nothing changed.\n');
    await client.end(); process.exit(0);
  }

  // The trigger in 23_church_photos_editable.sql turns this one column into
  // ownership, and only on the change INTO approved — so a re-approval of an
  // already-approved claim does nothing, which is why the status is shown above.
  await client.query(`update profiles set verification_status = $2 where id = $1`, [c.id, status]);

  const { rows: check } = await client.query(
    `select claimed_at from church_profiles where church_id = $1 and claimed_by = $2`,
    [c.claimed_church_id, c.id]);
  console.log('');
  if (status === 'approved') {
    if (check[0]?.claimed_at) ok(`approved — ${c.email} now owns ${c.church}`);
    else bad('status set, but no ownership row appeared. Run: node scripts/check-claim.mjs');
  } else {
    ok(`rejected — ${c.email} has been notified in the app`);
  }
  console.log('');
  await client.end();
  process.exit(0);
}

if (APPROVE) await decide(APPROVE, 'approved');
if (REJECT)  await decide(REJECT,  'rejected');

// ── The queue ───────────────────────────────────────────────────────────────
const { rows } = await client.query(`
  select u.email, p.verification_status, p.updated_at, p.church_name,
         c.name as church, c.city, c.state, p.claimed_church_id
    from auth.users u
    join profiles p on p.id = u.id
    left join churches c on c.id = p.claimed_church_id
   where p.verification_status ${ALL ? "<> 'none'" : "= 'pending'"}
   order by p.updated_at`);

if (!rows.length) {
  console.log(`\n  No ${ALL ? '' : 'pending '}claims.\n`);
  await client.end();
  process.exit(0);
}

console.log(`\n  \x1b[1m${rows.length} ${ALL ? 'claim' : 'pending claim'}${rows.length === 1 ? '' : 's'}\x1b[0m\n`);
for (const r of rows) {
  const mark = r.verification_status === 'pending' ? '\x1b[33m·\x1b[0m'
             : r.verification_status === 'approved' ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
  console.log(`  ${mark} ${r.email}`);
  console.log(`      ${r.church || r.church_name || '\x1b[33m(no church in the directory — cannot be granted)\x1b[0m'}`);
  if (r.city) console.log(`      ${[r.city, r.state].filter(Boolean).join(', ')}`);
  console.log(`      asked ${days(r.updated_at)}${ALL ? ` · ${r.verification_status}` : ''}`);
  if (r.verification_status === 'pending' && r.claimed_church_id) {
    console.log(`      \x1b[2mnode scripts/claims.mjs --approve ${r.email}\x1b[0m`);
  }
  console.log('');
}
await client.end();
