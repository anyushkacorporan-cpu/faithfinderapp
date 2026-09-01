/**
 * Collapse denomination spellings already in the database.
 *
 * The first national import used a smaller mapping table, so variants of the
 * same denomination came through as separate values — Utah ended up with
 * "Latter-day Saints", "Latter Day Saints" and "Latter-Day Saints" as three
 * filter entries covering one church body. That does not just look untidy: a
 * filter is a promise that picking a denomination shows you all of it, and
 * this broke that promise for a fifth of Utah.
 *
 * Rewrites in place rather than asking for a re-import, since the fix is a
 * relabelling and re-fetching 235,000 churches to change a string would be
 * absurd.
 *
 *   node scripts/normalize-denominations.mjs --dry-run
 *   node scripts/normalize-denominations.mjs
 */
import { readFileSync } from 'node:fs';
import pg from 'pg';
import { canonical } from './denominations.mjs';

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
    select denomination, count(*)::int as n
    from churches
    where denomination is not null
    group by denomination
    order by n desc
  `);

  console.log(`\n  ${rows.length} distinct denomination values in the database\n`);

  // What each existing value should become, keeping only real changes.
  const changes = rows
    .map(r => ({ from: r.denomination, to: canonical(r.denomination), n: r.n }))
    .filter(c => c.to && c.to !== c.from);

  if (!changes.length) {
    console.log('  Everything is already canonical.\n');
    process.exit(0);
  }

  // Group by destination so the merges are visible rather than implied.
  const merged = {};
  for (const c of changes) (merged[c.to] ||= []).push(c);

  console.log('  Merges:');
  for (const [to, list] of Object.entries(merged).sort((a, b) =>
    b[1].reduce((s, c) => s + c.n, 0) - a[1].reduce((s, c) => s + c.n, 0)
  ).slice(0, 25)) {
    const total = list.reduce((s, c) => s + c.n, 0);
    console.log(`    ${String(total).padStart(6)}  ${to}`);
    for (const c of list) console.log(`            ← ${c.from} (${c.n})`);
  }
  if (Object.keys(merged).length > 25) {
    console.log(`    … and ${Object.keys(merged).length - 25} more`);
  }

  const affected = changes.reduce((s, c) => s + c.n, 0);
  console.log(`\n  ${affected.toLocaleString()} churches would be relabelled.\n`);

  if (dryRun) { console.log('  --dry-run: nothing written.\n'); process.exit(0); }

  let done = 0;
  for (const c of changes) {
    await client.query('update churches set denomination = $2 where denomination = $1', [c.from, c.to]);
    done += c.n;
    process.stdout.write(`\r  relabelled ${done}/${affected}`);
  }

  const { rows: after } = await client.query(`
    select count(distinct denomination)::int as n from churches where denomination is not null
  `);
  console.log(`\n\n  Done. ${rows.length} values → ${after[0].n}.\n`);
} catch (err) {
  console.error(`\n  Failed: ${err.message}\n`);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
