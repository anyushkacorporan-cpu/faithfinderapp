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

/**
 * OSM's `wikidata` tag is typed by hand, so some of it may not be an entity
 * id: two ids separated the way OSM separates values, a pasted URL, a
 * `wikidata:` prefix, stray spaces. wbgetentities refuses an entire request if
 * a single id in it is malformed, so one bad tag can cost its whole batch.
 *
 * On the 235,146-church national set this finds nothing to clean — all 4,813
 * tags are already well formed. It stays because the tags come from an open
 * map that anyone can edit, and the failure it prevents is silent and
 * disproportionate.
 *
 * It is deliberately strict. A tag that does not clearly name one entity is
 * dropped rather than guessed at — a church with no photo is a gap, a church
 * wearing another church's photo is a lie.
 */
function toQid(tag) {
  let s = String(tag).trim();
  s = s.replace(/^https?:\/\/(?:www\.)?wikidata\.org\/(?:wiki|entity)\//i, '');
  s = s.split(';')[0].trim();
  s = s.replace(/^wikidata\s*[:=]\s*/i, '');
  return /^[Qq][1-9][0-9]*$/.test(s) ? 'Q' + s.slice(1) : '';
}

const targets = [];
const unusable = [];
for (const c of churches) {
  if (!c.wikidata || !c.osmId) continue;
  const qid = toQid(c.wikidata);
  if (qid) targets.push({ ...c, qid });
  else unusable.push(c.wikidata);
}

console.log(`\n  ${targets.length} churches with a wikidata entry`);
if (unusable.length) {
  const show = [...new Set(unusable)].slice(0, 5).map(s => JSON.stringify(s)).join(', ');
  console.log(`  ${unusable.length} tag(s) do not name an entity and were skipped: ${show}`);
}

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

/** qid → { file, label } */
const found = new Map();
// Normally one church per entity, but nothing stops two from carrying the
// same tag, so ask once and let both have the answer.
const qids = [...new Set(targets.map(c => c.qid))];

/**
 * One request, retried only while wikidata is asking us to wait.
 *
 * This once swallowed every failure — `catch { /* a failed batch just finds
 * fewer photos *\/ }` — which was wrong twice over. A failed batch finds none,
 * not fewer; and saying nothing let the script report a number as though it
 * were the answer. 4,813 churches is ninety-seven requests, fired back to back
 * with no pause, which wikidata throttles: five states answered, forty-four
 * got nothing, and it announced "found 471".
 *
 * A throttle or a server error is a request to come back later, so those are
 * retried. Everything else is handed back to the caller, which asks something
 * smaller instead. The last real error travels with the refusal — the old code
 * always said "gave up after 4 attempts", which named the symptom and hid the
 * cause.
 */
async function ask(ids) {
  const url = 'https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims|labels&languages=en&ids=' + ids.join('|');
  let last = 'no answer after 4 attempts';
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (r.status === 429 || r.status >= 500) {
        last = `HTTP ${r.status}`;
        await new Promise(s => setTimeout(s, 1000 * attempt * attempt));
        continue;
      }
      if (!r.ok) return { error: `HTTP ${r.status}` };
      const j = await r.json();
      if (j.error) return { error: j.error.info || j.error.code };
      return { entities: j.entities || {} };
    } catch (e) {
      // A response too large to arrive whole lands here as well as a dropped
      // connection, and both are worth asking again more modestly.
      last = e.message || String(e);
      await new Promise(s => setTimeout(s, 1000 * attempt * attempt));
    }
  }
  return { error: last };
}

let asked = 0;
let firstError = '';
const dead = [];       // ids wikidata refused even when asked about alone
let exhausted = false; // wikidata is unwell; stop rather than hammer it

// Twenty ids refused one at a time is no longer a story about bad tags. These
// servers are donated, and a split that keeps splitting through an outage
// would turn one refused request into a hundred.
const GIVE_UP_AFTER = 20;

function progress() {
  process.stdout.write(`\r  Asking wikidata for images … ${asked}/${qids.length}`);
}

/**
 * Ask about a group; if the whole request is refused, ask about the halves.
 *
 * This is the fix for the thirteen batches that failed on every run, taking
 * NC, IA, MT, ID, ND and HI to exactly zero photos twice over. Retrying an
 * identical request cannot help when the request is itself the problem, which
 * is why repeating the run never moved those states.
 *
 * Fifty entities' worth of claims was simply more than would come back whole.
 * Halving the question fixes it: the run that had been finding 3,682 images
 * found 4,255, with nothing permanently refused and no malformed tag anywhere
 * in the set. Splitting also covers the other reason a request cannot
 * succeed — one bad id — which then costs one church instead of fifty and
 * gets named at the end rather than disappearing into a count.
 */
async function harvest(ids) {
  if (exhausted) return;

  const res = await ask(ids);
  // Wikidata asks for serial, unhurried clients. A quarter second between
  // requests is the difference between ninety-seven answers and five.
  await new Promise(s => setTimeout(s, 250));

  if (!res.error) {
    for (const [qid, ent] of Object.entries(res.entities)) {
      const file = ent?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
      if (file) found.set(qid, { file, label: ent?.labels?.en?.value || '' });
    }
    asked += ids.length;
    progress();
    return;
  }

  if (!firstError) firstError = res.error;

  if (ids.length === 1) {
    dead.push(ids[0]);
    asked += 1;
    progress();
    if (dead.length >= GIVE_UP_AFTER) exhausted = true;
    return;
  }

  const mid = Math.ceil(ids.length / 2);
  await harvest(ids.slice(0, mid));
  await harvest(ids.slice(mid));
}

for (let i = 0; i < qids.length; i += 50) {
  await harvest(qids.slice(i, i + 50));
  if (exhausted) break;
}

console.log(`\r  Asking wikidata for images … found ${found.size} of ${asked} asked` + ' '.repeat(20));

if (dead.length && !exhausted) {
  console.log(`\n  ${dead.length} entr${dead.length === 1 ? 'y was' : 'ies were'} refused: ${dead.slice(0, 10).join(' ')}${dead.length > 10 ? ' …' : ''}`);
  console.log(`  First error: ${firstError}`);
  console.log(`  Every other church was asked about, so re-running will not change these.\n`);
}

if (exhausted) {
  console.log(`\n  \x1b[31mStopped early — wikidata refused ${dead.length} requests in a row\x1b[0m`);
  console.log(`  First error: ${firstError}`);
  console.log(`  ${(qids.length - asked).toLocaleString()} churches were never asked about. This looks`);
  console.log(`  temporary, so wait a few minutes and run it again; photos already`);
  console.log(`  found are rewritten harmlessly.\n`);
}

const updates = targets
  .filter(c => found.has(c.qid))
  .map(c => ({
    source_id: `osm:${c.osmId}`,
    photo_url: commonsUrl(found.get(c.qid).file),
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
