/**
 * Find free photos for imported churches.
 *
 * Many churches have a Wikidata entry, and most of those entries carry an
 * image (P18) — 263 of 283 in the New York survey. Those images live on
 * Wikimedia Commons under licences that permit commercial use with
 * attribution, so they cost nothing but a credit line.
 *
 * This reads the wikidata ids out of the fetch script's JSON, asks Wikidata
 * which have images, and writes the resulting URLs to churches.photo_url. It
 * never touches church_profiles, so a church that uploaded its own photo keeps
 * it — the view prefers theirs over ours.
 *
 *   node scripts/fetch-church-photos.mjs churches-nyc.json
 *   node scripts/fetch-church-photos.mjs data/churches-US-*.json
 *
 * Needs DATABASE_URL in .env.local. Re-running is safe.
 */
import { readFileSync } from 'node:fs';
import pg from 'pg';

const files = process.argv.slice(2).filter(a => !a.startsWith('--'));
if (!files.length) files.push('churches-nyc.json');

let env = {};
try {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* fall through */ }

const DB = env.DATABASE_URL || process.env.DATABASE_URL;
if (!DB) {
  console.error('\n  No DATABASE_URL in .env.local\n');
  process.exit(1);
}

// Several files at once, so a national run is one command rather than fifty.
const churches = [];
for (const f of files) {
  try {
    churches.push(...JSON.parse(readFileSync(f, 'utf8')));
  } catch (err) {
    console.error(`  Skipping ${f} — ${err.code === 'ENOENT' ? 'no such file' : err.message}`);
  }
}
if (!churches.length) {
  console.error('\n  Nothing to read.\n');
  process.exit(1);
}
console.log(`\n  ${churches.length.toLocaleString()} churches across ${files.length} file(s)`);

const UA = { 'User-Agent': 'FaithFinder/1.0 (church directory; photo lookup)' };

// Commons serves any file by name through Special:FilePath, which redirects to
// the real image and will resize on the way. 800px is plenty for a card and
// keeps the download small on cellular.
function commonsUrl(filename) {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=800`;
}

const targets = churches.filter(c => c.wikidata && c.osmId);
console.log(`\n  ${targets.length} churches with a wikidata entry`);

if (!targets.length) {
  console.log('  Nothing to look up.\n');
  process.exit(0);
}

const client = new pg.Client({ connectionString: DB, ssl: { rejectUnauthorized: false } });
await client.connect();

const { rows: cols } = await client.query(`
  select 1 from information_schema.columns
  where table_name = 'churches' and column_name = 'photo_url'
`);
if (!cols.length) {
  console.error(`
  The churches table has no photo_url column yet. Add it first:

    node scripts/run-sql.mjs supabase/02_church_photos.sql

  Then run this again.
`);
  await client.end().catch(() => {});
  process.exit(1);
}

process.stdout.write('  Asking wikidata for images … ');

/** qid → { file, credit } */
const found = new Map();
const qids = targets.map(c => c.wikidata);

/**
 * One batch of fifty, with retries, and never silently.
 *
 * This swallowed every failure — `catch { /* a failed batch just finds fewer
 * photos *\/ }` — which was wrong twice over. A failed batch finds none, not
 * fewer; and saying nothing let the script report a number as though it were
 * the answer.
 *
 * It mattered. 4,813 churches is ninety-seven requests, and they were fired
 * back to back with no pause, which Wikidata throttles. The first few landed
 * and the rest were refused, so the run covered AK, AL, AR, AZ and CA — the
 * first five files alphabetically — and announced "found 471". Forty-four
 * states got nothing and nobody was told. Texas has 16,123 churches and zero
 * photos because of this line.
 */
async function askWikidata(batch) {
  const url = 'https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims|labels&languages=en&ids=' + batch.join('|');
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (r.status === 429 || r.status >= 500) {
        // Backing off rather than giving up: a throttle is a request to wait,
        // not a refusal.
        await new Promise(s => setTimeout(s, 1000 * attempt * attempt));
        continue;
      }
      if (!r.ok) return { error: `HTTP ${r.status}` };
      const j = await r.json();
      if (j.error) return { error: j.error.info || j.error.code };
      return { entities: j.entities || {} };
    } catch (e) {
      await new Promise(s => setTimeout(s, 1000 * attempt * attempt));
    }
  }
  return { error: 'gave up after 4 attempts' };
}

let failed = 0;
let firstError = '';
const batches = Math.ceil(qids.length / 50);

for (let i = 0; i < qids.length; i += 50) {
  const batch = qids.slice(i, i + 50);
  const res = await askWikidata(batch);
  if (res.error) {
    failed++;
    if (!firstError) firstError = res.error;
  } else {
    for (const [qid, ent] of Object.entries(res.entities)) {
      const file = ent?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
      if (file) found.set(qid, { file, label: ent?.labels?.en?.value || '' });
    }
  }
  process.stdout.write(`\r  Asking wikidata for images … ${Math.min(i + 50, qids.length)}/${qids.length}`);
  // Wikidata asks for serial, unhurried clients. A quarter second between
  // batches is the difference between ninety-seven answers and five.
  await new Promise(s => setTimeout(s, 250));
}

console.log(`\r  Asking wikidata for images … found ${found.size}` + ' '.repeat(20));

if (failed) {
  console.log(`\n  \x1b[31m${failed} of ${batches} batches failed\x1b[0m — first error: ${firstError}`);
  console.log(`  Up to ${(failed * 50).toLocaleString()} churches were never asked about.`);
  console.log(`  Re-run this; already-found photos are rewritten harmlessly.\n`);
}

const updates = targets
  .filter(c => found.has(c.wikidata))
  .map(c => ({
    source_id: `osm:${c.osmId}`,
    photo_url: commonsUrl(found.get(c.wikidata).file),
    // Commons licences require attribution. Storing the credit next to the URL
    // means the screen showing the photo can always show who to credit.
    photo_credit: 'Wikimedia Commons',
  }));

console.log(`  ${updates.length} churches will get a photo\n`);


let done = 0;
try {
  for (const u of updates) {
    await client.query(
      'update churches set photo_url = $2, photo_credit = $3 where source_id = $1',
      [u.source_id, u.photo_url, u.photo_credit],
    );
    done++;
    if (done % 25 === 0) process.stdout.write(`\r  updated ${done}/${updates.length}`);
  }
  process.stdout.write(`\r  updated ${done}/${updates.length}\n`);

  const { rows } = await client.query(
    'select count(*)::int as n from churches where photo_url is not null',
  );
  console.log(`\n  ${rows[0].n} churches now have a photo.\n`);

  const { rows: sample } = await client.query(
    'select name from churches where photo_url is not null order by random() limit 5',
  );
  console.log('  For example:');
  for (const r of sample) console.log(`    ${r.name}`);
  console.log();
} catch (err) {
  console.error(`\n  Failed after ${done}: ${err.message}\n`);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
