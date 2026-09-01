/**
 * Pull churches for every US state.
 *
 * Built to survive a long, flaky run rather than to be fast. Overpass is
 * volunteer-run — we watched three mirrors return 500, 502 and 504 in a single
 * minute — so this queries one state at a time, writes each result to its own
 * file, and skips any state it has already got. Interrupt it, re-run it, come
 * back tomorrow: it picks up where it stopped.
 *
 *   node scripts/fetch-churches-us.mjs              # every state, resuming
 *   node scripts/fetch-churches-us.mjs NY TX CA     # only these
 *   node scripts/fetch-churches-us.mjs --status     # what is done so far
 *
 * Output: data/churches-US-XX.json per state. Feed them to import-churches.mjs.
 *
 * Queries by ISO code rather than a bounding box — a box round New York also
 * catches New Jersey, which is how the first survey ended up a third Hoboken.
 */
import { writeFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';

const STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND',
  'OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

const OUT = 'data';
if (!existsSync(OUT)) mkdirSync(OUT);

const args = process.argv.slice(2);

if (args.includes('--status')) {
  const done = readdirSync(OUT).filter(f => /^churches-US-\w\w\.json$/.test(f));
  let total = 0;
  for (const f of done) total += JSON.parse(readFileSync(`${OUT}/${f}`, 'utf8')).length;
  console.log(`\n  ${done.length}/${STATES.length} states fetched, ${total.toLocaleString()} churches`);
  const missing = STATES.filter(s => !existsSync(`${OUT}/churches-US-${s}.json`));
  if (missing.length) console.log(`  Still to do: ${missing.join(' ')}`);
  console.log();
  process.exit(0);
}

const wanted = args.filter(a => !a.startsWith('--')).map(a => a.toUpperCase());
const todo = (wanted.length ? wanted : STATES).filter(
  s => args.includes('--force') || !existsSync(`${OUT}/churches-US-${s}.json`),
);

if (!todo.length) {
  console.log('\n  Every state already fetched. --force to redo, --status to see totals.\n');
  process.exit(0);
}

const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];
const HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded',
  'User-Agent': 'FaithFinder/1.0 (church directory; one-time state import)',
  Accept: 'application/json',
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchState(code) {
  // 180s: California and Texas are genuinely large and the default is not enough.
  const query = `
[out:json][timeout:180];
area["ISO3166-2"="US-${code}"][admin_level=4]->.a;
(
  node["amenity"="place_of_worship"]["religion"="christian"](area.a);
  way["amenity"="place_of_worship"]["religion"="christian"](area.a);
);
out center tags;`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    for (const url of MIRRORS) {
      try {
        const res = await fetch(url, { method: 'POST', headers: HEADERS, body: 'data=' + encodeURIComponent(query) });
        if (res.ok) return await res.json();
        // 429 and 504 mean busy, not broken. Back off rather than hammering.
        if (res.status === 429 || res.status === 504) await sleep(20000 * attempt);
      } catch { /* try the next mirror */ }
    }
    if (attempt < 3) await sleep(30000);
  }
  return null;
}

function parse(data, code) {
  return (data.elements || []).map((el) => {
    const t = el.tags || {};
    const street = [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ');
    return {
      osmId: `${el.type}/${el.id}`,
      name: t.name || '',
      address: [street, t['addr:city'], t['addr:state'] || code, t['addr:postcode']].filter(Boolean).join(', '),
      city: t['addr:city'] || '',
      state: t['addr:state'] || code,
      zip: t['addr:postcode'] || '',
      denomination: t.denomination || '',
      phone: t.phone || t['contact:phone'] || '',
      website: t.website || t['contact:website'] || '',
      lat: el.lat ?? el.center?.lat,
      lng: el.lon ?? el.center?.lon,
      image: t.image || '',
      commons: t['wikimedia_commons'] || '',
      wikidata: t.wikidata || '',
    };
  }).filter(c => c.name && c.lat && c.lng);
}

console.log(`\n  Fetching ${todo.length} state${todo.length === 1 ? '' : 's'}.`);
console.log('  Safe to interrupt — re-running skips what is already done.\n');

let grand = 0, failed = [];
for (const [i, code] of todo.entries()) {
  process.stdout.write(`  [${String(i + 1).padStart(2)}/${todo.length}] ${code} … `);

  const data = await fetchState(code);
  if (!data) {
    console.log('failed (will retry on a later run)');
    failed.push(code);
    continue;
  }

  const churches = parse(data, code);
  writeFileSync(`${OUT}/churches-US-${code}.json`, JSON.stringify(churches, null, 2));
  grand += churches.length;
  const withPhoto = churches.filter(c => c.wikidata || c.commons || c.image).length;
  console.log(`${String(churches.length).padStart(6)} churches, ${withPhoto} with a photo link`);

  // Deliberate pause between states. These servers are donated; a national
  // scrape that hammers them is how the next person gets blocked.
  if (i < todo.length - 1) await sleep(8000);
}

console.log(`\n  ${grand.toLocaleString()} churches fetched this run.`);
if (failed.length) console.log(`  Failed, re-run to retry: ${failed.join(' ')}`);
console.log('\n  Then import them all:');
console.log('    for f in data/churches-US-*.json; do node scripts/import-churches.mjs "$f"; done\n');
