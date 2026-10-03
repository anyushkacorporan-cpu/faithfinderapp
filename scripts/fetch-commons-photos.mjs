/**
 * Fill the gaps Wikidata left, from tags we already have.
 *
 * fetch-church-photos.mjs uses the `wikidata` tag, which reaches 4,293 of
 * 235,146 churches. Two other OSM tags point at pictures and have never been
 * read:
 *
 *   wikimedia_commons   505 churches — a Commons file or category
 *   image               183 churches — a URL to a picture
 *
 * The Commons tag is safe to use by definition: everything on Commons carries
 * a licence that permits commercial use with attribution. The `image` tag is
 * not — it is any URL a mapper felt like typing, often a photo on the church's
 * own website. Those are skipped. Showing them would mean serving a picture we
 * have no licence to and loading it off somebody else's server, and the app is
 * going to charge money, so "probably fine" is not good enough.
 *
 *   node scripts/fetch-commons-photos.mjs data/churches-US-*.json
 *
 * Only fills churches with no photo yet, so it never overwrites a Wikidata
 * image or a church's own upload. Needs DATABASE_URL in .env.local.
 * Re-running is safe.
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
const API = 'https://commons.wikimedia.org/w/api.php';

function commonsUrl(filename) {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=800`;
}

// A category can hold a floor plan, a coat of arms or a locator map as well as
// a photograph. Raster formats are not a guarantee of a photo, but SVG very
// reliably means a drawing, so this at least keeps diagrams off the cards.
const PHOTO = /\.(jpe?g|png|webp)$/i;

/**
 * What the `wikimedia_commons` tag is pointing at.
 *
 * The tag is supposed to carry its namespace — `File:Foo.jpg` or
 * `Category:Foo` — and usually does. When it does not, the extension decides:
 * a name ending in an image extension is a file, anything else is a category.
 */
function readCommonsTag(tag) {
  const s = String(tag).trim().replace(/_/g, ' ');
  if (!s) return null;
  let m = s.match(/^(?:File|Image)\s*:\s*(.+)$/i);
  if (m) return { kind: 'file', title: m[1].trim() };
  m = s.match(/^Category\s*:\s*(.+)$/i);
  if (m) return { kind: 'category', title: m[1].trim() };
  return PHOTO.test(s) ? { kind: 'file', title: s } : { kind: 'category', title: s };
}

/**
 * A Commons filename out of an `image` tag, or nothing.
 *
 * Deliberately narrow. Only the two shapes that are certainly Commons are
 * accepted; every other URL is somebody else's picture on somebody else's
 * server.
 */
function commonsFileFromUrl(raw) {
  const s = String(raw).trim();
  let m = s.match(/^https?:\/\/(?:[a-z-]+\.)?(?:commons\.)?wikimedia\.org\/wiki\/(?:File|Image):(.+)$/i);
  if (m) return decodeURIComponent(m[1].split('#')[0].split('?')[0]).replace(/_/g, ' ');
  m = s.match(/^https?:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/]+)$/i);
  if (m) return decodeURIComponent(m[1]).replace(/_/g, ' ');
  return '';
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

// Only the churches still without a picture are worth asking about. Doing this
// up front turns a few hundred pointless category lookups into none.
const { rows: blankRows } = await client.query(
  'select source_id from churches where photo_url is null',
);
const blank = new Set(blankRows.map(r => r.source_id));
console.log(`  ${blank.size.toLocaleString()} of them have no photo yet`);

/** source_id → filename on Commons */
const direct = new Map();
const categories = [];   // { source_id, title }
let fromImageTag = 0;
let foreign = 0;

for (const c of churches) {
  if (!c.osmId) continue;
  const sourceId = `osm:${c.osmId}`;
  if (!blank.has(sourceId) || direct.has(sourceId)) continue;

  if (c.commons) {
    const tag = readCommonsTag(c.commons);
    if (tag?.kind === 'file') { direct.set(sourceId, tag.title); continue; }
    if (tag?.kind === 'category') { categories.push({ sourceId, title: tag.title }); continue; }
  }

  if (c.image) {
    const file = commonsFileFromUrl(c.image);
    if (file) { direct.set(sourceId, file); fromImageTag++; }
    else foreign++;
  }
}

console.log(`\n  ${direct.size} named a Commons file outright${fromImageTag ? ` (${fromImageTag} via an image URL)` : ''}`);
console.log(`  ${categories.length} named a Commons category, which has to be looked inside`);
if (foreign) {
  console.log(`  ${foreign} image tag(s) point somewhere other than Commons — skipped,`);
  console.log(`  because we have no licence to show those and would be loading them`);
  console.log(`  off someone else's server.`);
}

/**
 * The first photograph in a category.
 *
 * One request per category — categorymembers takes a single title, so there is
 * no batching to be had here. Ten members is enough to skip past a map or a
 * coat of arms without pulling down a large category in full.
 */
async function firstPhotoIn(title) {
  const url = `${API}?action=query&format=json&origin=*&list=categorymembers&cmtype=file&cmlimit=10&cmtitle=${encodeURIComponent('Category:' + title)}`;
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
      const members = (j.query?.categorymembers || []).map(m => String(m.title).replace(/^File:/i, ''));
      return { file: members.find(n => PHOTO.test(n)) || '' };
    } catch (e) {
      last = e.message || String(e);
      await new Promise(s => setTimeout(s, 1000 * attempt * attempt));
    }
  }
  return { error: last };
}

let looked = 0, empty = 0, refused = 0, firstError = '';

if (categories.length) {
  process.stdout.write('\n  Looking inside categories … ');
  for (const { sourceId, title } of categories) {
    const res = await firstPhotoIn(title);
    if (res.error) {
      refused++;
      if (!firstError) firstError = res.error;
    } else if (res.file) {
      direct.set(sourceId, res.file);
    } else {
      empty++;
    }
    looked++;
    process.stdout.write(`\r  Looking inside categories … ${looked}/${categories.length}`);
    // Commons is donated infrastructure, same as Wikidata. Unhurried and
    // serial is the price of being allowed to ask at all.
    await new Promise(s => setTimeout(s, 250));
  }
  console.log(`\r  Looking inside categories … ${looked}/${categories.length}` + ' '.repeat(10));
  if (empty) console.log(`  ${empty} categor${empty === 1 ? 'y held' : 'ies held'} no photograph`);
  if (refused) console.log(`  \x1b[31m${refused} refused\x1b[0m — first error: ${firstError} (re-run to retry those)`);
}

console.log(`\n  ${direct.size} churches will get a photo\n`);

if (!direct.size) {
  await client.end().catch(() => {});
  process.exit(0);
}

let done = 0, skipped = 0;
try {
  for (const [sourceId, file] of direct) {
    // `photo_url is null` again, not just in the read above: between then and
    // now a church could have had a photo set, and a tag from a map should
    // never displace one.
    const res = await client.query(
      `update churches set photo_url = $2, photo_credit = $3
       where source_id = $1 and photo_url is null`,
      [sourceId, commonsUrl(file), 'Wikimedia Commons'],
    );
    if (res.rowCount) done++; else skipped++;
    if ((done + skipped) % 25 === 0) process.stdout.write(`\r  updated ${done}/${direct.size}`);
  }
  process.stdout.write(`\r  updated ${done}/${direct.size}` + ' '.repeat(10) + '\n');
  if (skipped) console.log(`  ${skipped} already had a photo and were left alone`);

  const { rows } = await client.query(
    'select count(*)::int as n from churches where photo_url is not null',
  );
  console.log(`\n  ${rows[0].n.toLocaleString()} churches now have a photo.\n`);

  const { rows: sample } = await client.query(
    `select name from churches where photo_credit = 'Wikimedia Commons'
     and photo_url is not null order by random() limit 5`,
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
