#!/usr/bin/env node
/**
 * Delete accounts by email, after showing what goes with them.
 *
 *   node scripts/delete-account.mjs someone@example.com another@example.com
 *
 * Deleting a row from auth.users cascades into eighteen tables — posts,
 * comments, likes, connections, tickets, notifications, saved events, hidden
 * posts, invites, saved churches, reports, blocks — and nulls the owner out of
 * three more. A plain `delete from auth.users where email = …` gives no hint of
 * that, and it is a single keystroke away from a real account: this project has
 * anyushka@gmail.com, anyushka.@gmail.com, anyushkaa@gmail.com and
 * anyushkaaa@gmail.com, which differ by one character each.
 *
 * So this resolves each email, prints the stored spelling back for comparison,
 * counts what would be destroyed, lists the accounts that will survive, and
 * waits to be told to go ahead. The tables it counts come from the foreign keys
 * themselves, so a new table that references a user is included without anyone
 * remembering to add it here.
 *
 * Nothing is deleted without typing: delete
 */
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import pg from 'pg';

const emails = process.argv.slice(2).filter(a => !a.startsWith('-'));
if (!emails.length) {
  console.error('\n  Usage: node scripts/delete-account.mjs someone@example.com [another@…]\n');
  process.exit(1);
}

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

// Resolve first, and show the stored spelling: a typo is only visible next to
// the thing it was meant to be.
const targets = [];
for (const wanted of emails) {
  const { rows } = await client.query(
    'select id, email, created_at from auth.users where lower(email) = lower($1)', [wanted]);
  if (!rows.length) {
    console.error(`\n  \x1b[31mNo account with email:\x1b[0m ${wanted}`);
    console.error('  Nothing was deleted. Run: node scripts/accounts.mjs\n');
    await client.end();
    process.exit(1);
  }
  targets.push(rows[0]);
}

// Which tables point at a user, straight from the constraints.
const { rows: refs } = await client.query(`
  select
    src.relname       as table_name,
    srcns.nspname     as schema_name,
    att.attname       as column_name,
    con.confdeltype   as on_delete
  from pg_constraint con
  join pg_class src        on src.oid = con.conrelid
  join pg_namespace srcns  on srcns.oid = src.relnamespace
  join pg_class tgt        on tgt.oid = con.confrelid
  join pg_namespace tgtns  on tgtns.oid = tgt.relnamespace
  join unnest(con.conkey) as k(attnum) on true
  join pg_attribute att    on att.attrelid = src.oid and att.attnum = k.attnum
  where con.contype = 'f' and tgt.relname = 'users' and tgtns.nspname = 'auth'
  order by src.relname`);

console.log(`\n\x1b[1mAbout to delete ${targets.length} account${targets.length === 1 ? '' : 's'}\x1b[0m\n`);

for (const t of targets) {
  console.log(`  \x1b[1m${t.email}\x1b[0m`);
  console.log(`      you asked for  ${emails.find(e => e.toLowerCase() === t.email.toLowerCase())}`);
  console.log(`      created        ${new Date(t.created_at).toLocaleString()}`);
  let destroyed = 0, orphaned = 0;
  for (const r of refs) {
    const q = `select count(*)::int as n from ${r.schema_name}."${r.table_name}" where "${r.column_name}" = $1`;
    let n = 0;
    try { n = (await client.query(q, [t.id])).rows[0].n; } catch { continue; }
    if (!n) continue;
    // 'c' is cascade — those rows go. 'n' is set null — the row survives
    // without an owner.
    const gone = r.on_delete === 'c';
    if (gone) destroyed += n; else orphaned += n;
    console.log(`      ${gone ? '\x1b[31mdeletes\x1b[0m' : '\x1b[33mun-owns\x1b[0m'} ${String(n).padStart(4)}  ${r.table_name}.${r.column_name}`);
  }
  if (!destroyed && !orphaned) console.log('      \x1b[32mno data attached\x1b[0m');
  console.log('');
}

// What survives, named, so it is obvious the wrong row is not in the list.
const { rows: surviving } = await client.query(
  `select email from auth.users where id <> all($1::uuid[]) order by created_at`,
  [targets.map(t => t.id)]);
console.log(`  \x1b[32mKeeping ${surviving.length}:\x1b[0m ${surviving.map(r => r.email).join(', ') || '(none)'}\n`);

const rl = createInterface({ input: stdin, output: stdout });
const answer = await rl.question('  Type \x1b[1mdelete\x1b[0m to go ahead, anything else to stop: ');
rl.close();
if (answer.trim() !== 'delete') {
  console.log('\n  Stopped. Nothing was deleted.\n');
  await client.end();
  process.exit(0);
}

// One transaction: a half-finished delete across eighteen cascades is worse
// than either outcome.
await client.query('begin');
try {
  const res = await client.query('delete from auth.users where id = any($1::uuid[])',
    [targets.map(t => t.id)]);
  await client.query('commit');
  console.log(`\n  \x1b[32m✓\x1b[0m deleted ${res.rowCount} account${res.rowCount === 1 ? '' : 's'}\n`);
} catch (err) {
  await client.query('rollback').catch(() => {});
  console.error(`\n  \x1b[31mFailed, nothing deleted:\x1b[0m ${err.message}\n`);
  await client.end();
  process.exit(1);
}

const { rows: left } = await client.query('select count(*)::int as n from auth.users');
console.log(`  ${left[0].n} accounts remain. Run node scripts/check-claim.mjs to confirm.\n`);
await client.end();
