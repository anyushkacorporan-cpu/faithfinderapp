/**
 * Answer the two open questions from the file we already have.
 *
 * Reading churches-nyc.json rather than re-querying Overpass, because the
 * expensive, flaky step and the analysis step have no business being the same
 * command. The fetch is done; this is just arithmetic plus one free API.
 *
 *   node scripts/check-photos.mjs                    # churches-nyc.json
 *   node scripts/check-photos.mjs churches-nyc.json
 *
 * 1. Drops anything west of the Hudson — the first run's box crossed into
 *    Hoboken and Jersey City, so the NYC numbers were not NYC numbers.
 * 2. Asks Wikidata whether those entries actually carry an image. An entry is
 *    a database record, not a photograph; plenty are bare stubs. Counting
 *    entries overstated the photo coverage and I want the real figure.
 */
import { readFileSync } from 'node:fs';

const file = process.argv[2] || 'churches-nyc.json';
let all;
try {
  all = JSON.parse(readFileSync(file, 'utf8'));
} catch {
  console.error(`Cannot read ${file}. Run scripts/fetch-churches.mjs first.`);
  process.exit(1);
}

// The Hudson sits at roughly -74.02 at this latitude.
const HUDSON = -74.02;
const nyc = all.filter(c => c.lng > HUDSON);

console.log(`\n  ${all.length} churches in the file`);
console.log(`  ${all.length - nyc.length} west of the Hudson (New Jersey) — excluded`);
console.log(`  ${nyc.length} actually in New York City\n`);

const pct = (n) => `${Math.round((n / nyc.length) * 100)}%`.padStart(4);
const has = (f) => nyc.filter(c => c[f]).length;

console.log('  New York City only:');
for (const f of ['address', 'denomination', 'phone', 'website', 'zip']) {
  console.log(`    ${f.padEnd(13)} ${pct(has(f))}  (${has(f)})`);
}

const qids = nyc.map(c => c.wikidata).filter(Boolean);
console.log(`\n  ${qids.length} have a wikidata entry (${pct(qids.length)})`);

if (qids.length) {
  process.stdout.write('  Asking wikidata which of those have a real image … ');
  const withImage = [];
  for (let i = 0; i < qids.length; i += 50) {
    const batch = qids.slice(i, i + 50);
    try {
      const r = await fetch(
        'https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims&ids=' + batch.join('|'),
        { headers: { 'User-Agent': 'FaithFinder/1.0 (church directory; one-time data survey)' } },
      );
      const j = await r.json();
      for (const [qid, ent] of Object.entries(j.entities || {})) {
        if (ent?.claims?.P18) withImage.push(qid);
      }
    } catch { /* a failed batch undercounts; not worth stopping for */ }
  }
  console.log('done\n');

  const direct = nyc.filter(c => c.image || c.commons).length;
  const total = withImage.length + direct;
  console.log(`  REAL free photos: ${`${Math.round((total / nyc.length) * 100)}%`.trim()}  (${total} of ${nyc.length})`);
  console.log(`    wikidata with an image   ${withImage.length}`);
  console.log(`    direct image / commons   ${direct}`);
  console.log(`\n  The other ${nyc.length - total} need a church upload, a user photo, or the gradient.\n`);
}

// catholic and roman_catholic are the same thing under two tags. Worth seeing
// the merged shape now, since this is the mapping the import will need.
const MERGE = { roman_catholic: 'Catholic', catholic: 'Catholic' };
const denoms = {};
for (const c of nyc) {
  if (!c.denomination) continue;
  const key = MERGE[c.denomination]
    || c.denomination.replace(/_/g, ' ').replace(/\b\w/g, m => m.toUpperCase());
  denoms[key] = (denoms[key] || 0) + 1;
}
console.log('  Denominations, normalised:');
for (const [d, n] of Object.entries(denoms).sort((a, b) => b[1] - a[1]).slice(0, 12)) {
  console.log(`    ${String(n).padStart(4)}  ${d}`);
}
console.log();
