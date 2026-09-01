/**
 * What the directory actually holds, state by state.
 *
 * "Do we have all the churches?" deserves a number per state rather than a
 * total, because a total hides the failure that matters: one state that
 * imported badly disappears inside 235,000 and nobody notices until someone
 * there opens the app and finds nothing.
 *
 * Flags any state whose count looks low for its population, which is how a
 * silently failed import shows up.
 *
 *   node scripts/coverage.mjs
 */
import { readFileSync } from 'node:fs';
import pg from 'pg';

let env = {};
try {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* fall through */ }

const DB = env.DATABASE_URL || process.env.DATABASE_URL;
if (!DB) { console.error('\n  No DATABASE_URL in .env.local\n'); process.exit(1); }

// Rough population in millions, only to spot a state that came in far too
// light. Not meant to be precise — an order of magnitude is enough to catch a
// failed import.
const POP = {
  CA:39,TX:30,FL:22,NY:19,PA:13,IL:12,OH:12,GA:11,NC:10,MI:10,NJ:9,VA:8.7,WA:7.8,
  AZ:7.4,TN:7,MA:7,IN:6.8,MO:6.2,MD:6.2,WI:5.9,CO:5.8,MN:5.7,SC:5.3,AL:5,LA:4.6,
  KY:4.5,OR:4.2,OK:4,CT:3.6,UT:3.4,IA:3.2,NV:3.2,AR:3,MS:2.9,KS:2.9,NM:2.1,NE:2,
  ID:1.9,WV:1.8,HI:1.4,NH:1.4,ME:1.4,MT:1.1,RI:1.1,DE:1,SD:0.9,ND:0.8,AK:0.7,
  DC:0.7,VT:0.6,WY:0.6,
};

const client = new pg.Client({ connectionString: DB, ssl: { rejectUnauthorized: false } });
await client.connect();

try {
  // A report should not fail on the thing it is reporting about. Photos are
  // optional here: if 02_church_photos.sql has not been run, say so and carry
  // on rather than dying on a missing column.
  const { rows: hasPhotos } = await client.query(`
    select 1 from information_schema.columns
    where table_name = 'churches' and column_name = 'photo_url'
  `);
  const photos = hasPhotos.length;

  const { rows } = await client.query(`
    select state, count(*)::int as n,
           ${photos ? 'count(photo_url)::int' : '0'} as photos,
           count(address)::int as addressed
    from churches where country = 'US'
    group by state order by state
  `);

  if (!photos) {
    console.log('\n  (no photo columns yet — run scripts/run-sql.mjs supabase/02_church_photos.sql)');
  }

  // The question behind a state search returning nothing: is `state` stored
  // as one value per state, or several? OSM's addr:state is free text, so
  // "GA" and "Georgia" can both be in there, and an exact match sees one.
  const odd = rows.filter(r => !/^[A-Z]{2}$/.test(r.state || ''));
  if (odd.length) {
    console.log(`\n  ${odd.length} state value(s) are not a two-letter code:`);
    for (const r of odd.slice(0, 20)) {
      console.log(`    ${JSON.stringify(r.state)}  (${r.n} churches)`);
    }
    console.log('  These are invisible to a state search until normalised.\n');
  } else {
    console.log('\n  Every state value is a clean two-letter code.\n');
  }

  const byState = Object.fromEntries(rows.map(r => [r.state, r]));
  const missing = Object.keys(POP).filter(s => !byState[s]);
  const total = rows.reduce((s, r) => s + r.n, 0);

  console.log(`\n  ${total.toLocaleString()} churches across ${rows.length} states\n`);

  if (missing.length) {
    console.log(`  MISSING ENTIRELY: ${missing.join(' ')}`);
    console.log(`  Re-fetch those:  node scripts/fetch-churches-us.mjs ${missing.join(' ')}\n`);
  }

  // ~1,100 churches per million people is the national average here; a state
  // under a third of that probably did not import properly.
  const rate = total / Object.values(POP).reduce((a, b) => a + b, 0);
  const thin = rows
    .filter(r => POP[r.state] && r.n / POP[r.state] < rate / 3)
    .sort((a, b) => a.n / POP[a.state] - b.n / POP[b.state]);

  console.log('  state   churches   per million   photos   with address');
  for (const r of rows.sort((a, b) => b.n - a.n)) {
    const per = POP[r.state] ? Math.round(r.n / POP[r.state]) : '—';
    const flag = thin.includes(r) ? '  ← thin' : '';
    console.log(
      `    ${r.state}   ${String(r.n).padStart(8)}   ${String(per).padStart(11)}` +
      `   ${String(r.photos).padStart(6)}   ${String(Math.round(r.addressed / r.n * 100) + '%').padStart(12)}${flag}`,
    );
  }

  if (thin.length) {
    console.log(`\n  Thin for their population: ${thin.map(r => r.state).join(' ')}`);
    console.log('  Could be a failed import, or just sparse OSM coverage there.');
    console.log(`  Re-fetch to check:  node scripts/fetch-churches-us.mjs ${thin.map(r => r.state).join(' ')} --force`);
  } else {
    console.log('\n  No state looks obviously short for its population.');
  }

  const { rows: [ca] } = await client.query(
    `select count(*)::int as n from churches where country = 'CA'`,
  );
  console.log(`\n  Canada: ${ca.n.toLocaleString()}`);
  console.log('  (Not imported yet — run fetch for Canadian provinces when you want it.)\n');
} catch (err) {
  console.error(`\n  Failed: ${err.message}\n`);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
