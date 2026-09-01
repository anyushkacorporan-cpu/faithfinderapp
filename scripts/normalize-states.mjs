/**
 * Collapse state spellings already in the database.
 *
 *   node scripts/normalize-states.mjs --dry-run
 *   node scripts/normalize-states.mjs
 *
 * Rewrites in place. Anything it cannot read as a state is left alone and
 * listed rather than guessed at — a wrong state is worse than a blank one,
 * because it puts a church in a place it is not.
 */
import { readFileSync } from 'node:fs';
import pg from 'pg';
import { normalizeState } from './states.mjs';

const dryRun = process.argv.includes('--dry-run');

let env = {};
try {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* fall through */ }

const DB = env.DATABASE_URL || process.env.DATABASE_URL;
if (!DB) { console.error('\n  No DATABASE_URL in .env.local\n'); process.exit(1); }

const client = new pg.Client({ connectionString: DB, ssl: { rejectUnauthorized: false } });
await client.connect();

try {
  const { rows } = await client.query(`
    select state, count(*)::int as n from churches
    where country = 'US' and state is not null
    group by state order by n desc
  `);

  const changes = [], unreadable = [];
  for (const r of rows) {
    const to = normalizeState(r.state);
    if (!to) unreadable.push(r);
    else if (to !== r.state) changes.push({ from: r.state, to, n: r.n });
  }

  console.log(`\n  ${rows.length} distinct state values`);

  if (unreadable.length) {
    console.log(`\n  Cannot be read as a state — left as they are:`);
    for (const r of unreadable) console.log(`    ${JSON.stringify(r.state)}  (${r.n})`);
  }

  if (!changes.length) {
    console.log('\n  Every value is already a clean code.\n');
    process.exit(0);
  }

  const merged = {};
  for (const c of changes) (merged[c.to] ||= []).push(c);
  console.log('\n  Merges:');
  for (const [to, list] of Object.entries(merged).sort()) {
    console.log(`    ${to}  ←  ${list.map(c => `${JSON.stringify(c.from)} (${c.n})`).join(', ')}`);
  }

  const affected = changes.reduce((s, c) => s + c.n, 0);
  console.log(`\n  ${affected} churches would move to a correct state code.`);
  console.log(`  ${rows.length} values → ${new Set(rows.map(r => normalizeState(r.state) || r.state)).size}.\n`);

  if (dryRun) { console.log('  --dry-run: nothing written.\n'); process.exit(0); }

  for (const c of changes) {
    await client.query(
      'update churches set state = $2 where country = $3 and state = $1',
      [c.from, c.to, 'US'],
    );
  }
  console.log(`  Done. ${affected} churches relabelled.\n`);
} catch (err) {
  console.error(`\n  Failed: ${err.message}\n`);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
