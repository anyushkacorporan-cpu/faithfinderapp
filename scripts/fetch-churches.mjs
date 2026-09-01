/**
 * Pull churches from OpenStreetMap and see what we actually get.
 *
 * This is the proof step, not the import: it hits the free Overpass API for one
 * area, normalises what comes back into the shape the app already uses for a
 * church, and reports how complete the data is field by field. Run it before
 * committing to anything — if the coverage is poor for New York it will be poor
 * everywhere, and we should look at Overture or Foursquare instead.
 *
 * It also counts how many churches carry a free photo link — an `image` tag,
 * a Wikimedia Commons category, or a Wikidata entry that usually has one. That
 * is the number that decides how many churches show a real picture on day one
 * without anybody uploading anything or Google being paid.
 *
 *   node scripts/fetch-churches.mjs                  # Manhattan
 *   node scripts/fetch-churches.mjs nyc              # all five boroughs
 *   node scripts/fetch-churches.mjs 40.7,-74.0,40.8,-73.9
 *
 * No dependencies, no API key, no cost.
 */
import { writeFileSync } from 'node:fs';

const AREAS = {
  manhattan: [40.700, -74.020, 40.880, -73.907],
  nyc:       [40.477, -74.047, 40.917, -73.700],
  brooklyn:  [40.570, -74.042, 40.739, -73.833],
};

const arg = (process.argv[2] || 'manhattan').toLowerCase();
const bbox = AREAS[arg] || arg.split(',').map(Number);
if (bbox.length !== 4 || bbox.some(Number.isNaN)) {
  console.error('Usage: node scripts/fetch-churches.mjs [manhattan|nyc|brooklyn|south,west,north,east]');
  process.exit(1);
}

// Churches are tagged place_of_worship; religion=christian keeps synagogues and
// mosques out. Both node and way, because a large church is mapped as a
// building outline rather than a point — `center` gives us its centroid.
const query = `
[out:json][timeout:90];
(
  node["amenity"="place_of_worship"]["religion"="christian"](${bbox.join(',')});
  way["amenity"="place_of_worship"]["religion"="christian"](${bbox.join(',')});
);
out center tags;`;

console.log(`Fetching churches for ${arg} …`);

// Overpass runs on donated hardware and rejects clients that do not identify
// themselves — that is the 406, not rate limiting. A descriptive User-Agent is
// the fair-use expectation, not a workaround.
const HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded',
  'User-Agent': 'FaithFinder/1.0 (church directory; one-time data survey)',
  Accept: 'application/json',
};

// Several public mirrors run the same API. If one is busy or unhappy, try the
// next rather than making you re-run the command.
const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

let data = null;
for (const url of MIRRORS) {
  const host = new URL(url).host;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: HEADERS,
      body: 'data=' + encodeURIComponent(query),
    });

    if (res.ok) {
      data = await res.json();
      console.log(`  (via ${host})`);
      break;
    }

    // Print what the server actually said. A guess at the cause is how the
    // last version sent you chasing a rate limit that was not there.
    const body = (await res.text()).slice(0, 300).replace(/\s+/g, ' ').trim();
    const why = res.status === 429 || res.status === 504
      ? 'busy — this one really is rate limiting'
      : res.status === 400
      ? 'rejected the query'
      : res.status === 406
      ? 'refused the request'
      : '';
    console.log(`  ${host}: ${res.status} ${why}`);
    if (body) console.log(`    ${body}`);
  } catch (err) {
    console.log(`  ${host}: ${err.message}`);
  }
}

if (!data) {
  console.error('\n  Every mirror failed. Wait a few minutes and retry — these are');
  console.error('  volunteer-run servers and they do go down.\n');
  process.exit(1);
}

const churches = (data.elements || []).map((el) => {
  const t = el.tags || {};
  const street = [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ');
  const address = [street, t['addr:city'], t['addr:state'], t['addr:postcode']]
    .filter(Boolean).join(', ');
  return {
    osmId: `${el.type}/${el.id}`,
    name: t.name || '',
    address,
    city: t['addr:city'] || '',
    state: t['addr:state'] || 'NY',
    zip: t['addr:postcode'] || '',
    // OSM's denomination values are lowercase and underscored
    // ("roman_catholic"); the app's list is title case, so this needs mapping
    // before import — left raw here so you can see what actually turns up.
    denomination: t.denomination || '',
    phone: t.phone || t['contact:phone'] || '',
    website: t.website || t['contact:website'] || '',
    lat: el.lat ?? el.center?.lat,
    lng: el.lon ?? el.center?.lon,
    // Free photo routes, best first. `image` is a direct URL; the other two
    // are lookups into Commons and Wikidata, which are free to resolve and
    // free to use with attribution.
    image: t.image || '',
    commons: t['wikimedia_commons'] || '',
    wikidata: t.wikidata || '',
  };
}).filter(c => c.name && c.lat && c.lng);

const pct = (n) => `${Math.round((n / churches.length) * 100)}%`.padStart(4);
const has = (f) => churches.filter(c => c[f]).length;

console.log(`\n  ${churches.length} named churches found\n`);
console.log('  Field completeness:');
for (const f of ['address', 'denomination', 'phone', 'website', 'zip']) {
  console.log(`    ${f.padEnd(13)} ${pct(has(f))}  (${has(f)})`);
}

const withPhoto = churches.filter(c => c.image || c.commons || c.wikidata);
console.log('\n  Free photo coverage:');
console.log(`    direct image url   ${pct(has('image'))}  (${has('image')})`);
console.log(`    wikimedia commons  ${pct(has('commons'))}  (${has('commons')})`);
console.log(`    wikidata entry     ${pct(has('wikidata'))}  (${has('wikidata')})`);
console.log(`    ANY of the above   ${pct(withPhoto.length)}  (${withPhoto.length})`);
console.log('    (the rest need a church upload, a user photo, or the gradient)');

if (withPhoto.length) {
  console.log('\n  Churches that already have a free photo:');
  for (const c of withPhoto.slice(0, 8)) {
    const src = c.image ? 'image' : c.commons ? 'commons' : 'wikidata';
    console.log(`    ${c.name}  [${src}]`);
  }
}

// Resolve what those wikidata entries actually hold. An entry is not a
// picture — plenty are bare stubs — so counting them overstates the coverage.
const qids = churches.map(c => c.wikidata).filter(Boolean);
if (qids.length) {
  process.stdout.write('    checking wikidata for real images … ');
  let withImage = 0;
  for (let i = 0; i < qids.length; i += 50) {
    const batch = qids.slice(i, i + 50);
    try {
      const r = await fetch(
        'https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims&ids=' + batch.join('|'),
        { headers: HEADERS },
      );
      const j = await r.json();
      for (const ent of Object.values(j.entities || {})) {
        if (ent?.claims?.P18) withImage++;
      }
    } catch { /* a failed batch just undercounts; not worth stopping for */ }
  }
  const realPct = `${Math.round((withImage / churches.length) * 100)}%`.padStart(4);
  console.log('done');
  console.log(`    …of which really have one ${realPct}  (${withImage})`);
}

const denoms = {};
for (const c of churches) if (c.denomination) denoms[c.denomination] = (denoms[c.denomination] || 0) + 1;
const top = Object.entries(denoms).sort((a, b) => b[1] - a[1]).slice(0, 10);
if (top.length) {
  console.log('\n  Denominations present:');
  for (const [d, n] of top) console.log(`    ${String(n).padStart(4)}  ${d}`);
}

console.log('\n  Sample:');
for (const c of churches.slice(0, 5)) {
  console.log(`    ${c.name}`);
  console.log(`      ${c.address || '(no address)'}${c.denomination ? ' · ' + c.denomination : ''}`);
}

const out = `churches-${arg.replace(/[^a-z0-9]/g, '')}.json`;
writeFileSync(out, JSON.stringify(churches, null, 2));
console.log(`\n  Written to ${out}\n`);
console.log('  Data © OpenStreetMap contributors, ODbL. Attribution required if shipped.\n');
