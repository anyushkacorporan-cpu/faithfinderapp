/**
 * Load churches into Supabase.
 *
 * Built to be re-run, not to be run once: it upserts on `source_id`, so a
 * second run updates the rows it made the first time rather than doubling the
 * directory. That matters because the data will be refreshed — new churches
 * appear, addresses get fixed upstream — and a refresh should not be a rebuild.
 *
 * It writes only to `churches`. Anything a church said about itself lives in
 * `church_profiles`, which this never touches, so a refresh cannot overwrite a
 * claimed listing. See supabase/01_churches.sql for why the tables are split.
 *
 *   node scripts/import-churches.mjs churches-nyc.json
 *   node scripts/import-churches.mjs churches-nyc.json --dry-run
 *
 * Needs, in .env.local:
 *   SUPABASE_URL=https://xxxx.supabase.co
 *   SUPABASE_SERVICE_KEY=...      ← service_role key, NOT the anon key
 *
 * The service key bypasses row-level security, which is exactly why it belongs
 * in a script you run and never in the app.
 */
import { readFileSync } from 'node:fs';

const file = process.argv[2] || 'churches-nyc.json';
const dryRun = process.argv.includes('--dry-run');

// Minimal .env.local reader — one fewer dependency to keep current.
let env = {};
try {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* fall through to process.env */ }

const URL_ = env.SUPABASE_URL || process.env.SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!dryRun && (!URL_ || !KEY)) {
  console.error(`
  Missing credentials. Create .env.local in the project root:

    SUPABASE_URL=https://YOURPROJECT.supabase.co
    SUPABASE_SERVICE_KEY=eyJ...

  Both are in your Supabase dashboard under Settings → API.
  Use the service_role key, not anon. Never commit this file.

  Run with --dry-run to see what would be imported without credentials.
`);
  process.exit(1);
}

/**
 * OSM writes denominations lowercase and underscored; the app's list is title
 * case. `catholic` and `roman_catholic` are also the same thing under two
 * tags — 324 NYC churches were split across them — so they merge here rather
 * than showing up as two filter entries for one denomination.
 */
const DENOM = {
  roman_catholic: 'Catholic',
  catholic: 'Catholic',
  baptist: 'Baptist',
  southern_baptist: 'Southern Baptist',
  lutheran: 'Lutheran',
  methodist: 'Methodist',
  united_methodist: 'United Methodist',
  presbyterian: 'Presbyterian',
  episcopal: 'Episcopal',
  anglican: 'Anglican',
  pentecostal: 'Pentecostal',
  evangelical: 'Evangelical',
  orthodox: 'Orthodox',
  greek_orthodox: 'Greek Orthodox',
  seventh_day_adventist: 'Seventh-day Adventist',
  adventist: 'Adventist',
  nondenominational: 'Non-Denominational',
  jehovahs_witness: "Jehovah's Witness",
  mormon: 'Latter-day Saints',
  quaker: 'Quaker',
  mennonite: 'Mennonite',
  nazarene: 'Nazarene',
  reformed: 'Reformed',
  assemblies_of_god: 'Assemblies of God',
};

function denomination(raw) {
  if (!raw) return null;
  const key = raw.toLowerCase().trim();
  if (DENOM[key]) return DENOM[key];
  // Anything unmapped still gets through, readably, rather than being dropped.
  return key.replace(/_/g, ' ').replace(/\b\w/g, m => m.toUpperCase());
}

let raw;
try {
  raw = JSON.parse(readFileSync(file, 'utf8'));
} catch (err) {
  console.error(`\n  Cannot read ${file} — ${err.code === 'ENOENT' ? 'no such file' : err.message}.`);
  console.error('  Run scripts/fetch-churches.mjs first to produce it.\n');
  process.exit(1);
}

const rows = raw
  .filter(c => c.name && Number.isFinite(c.lat) && Number.isFinite(c.lng))
  .map(c => ({
    source_id: `osm:${c.osmId}`,
    source: 'osm',
    name: c.name.trim(),
    address: c.address || null,
    city: c.city || null,
    state: c.state || null,
    zip: c.zip || null,
    country: 'US',
    denomination: denomination(c.denomination),
    phone: c.phone || null,
    website: c.website || null,
    lat: c.lat,
    lng: c.lng,
  }));

// A source can list the same place twice. Upsert would reject a batch that
// contains one source_id twice, so collapse before sending.
const seen = new Set();
const unique = rows.filter(r => !seen.has(r.source_id) && seen.add(r.source_id));

console.log(`\n  ${raw.length} records in ${file}`);
console.log(`  ${rows.length} with a name and coordinates`);
console.log(`  ${unique.length} unique by source_id\n`);

const byDenom = {};
for (const r of unique) if (r.denomination) byDenom[r.denomination] = (byDenom[r.denomination] || 0) + 1;
console.log('  After denomination mapping:');
for (const [d, n] of Object.entries(byDenom).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
  console.log(`    ${String(n).padStart(4)}  ${d}`);
}

if (dryRun) {
  console.log('\n  --dry-run: nothing sent.\n');
  console.log('  Example row:');
  console.log('   ', JSON.stringify(unique[0], null, 2).replace(/\n/g, '\n    '));
  process.exit(0);
}

// Batched so one oversized request cannot fail the whole import, and so a
// failure tells you how far it got.
const BATCH = 500;
let done = 0;
for (let i = 0; i < unique.length; i += BATCH) {
  const batch = unique.slice(i, i + BATCH);
  const res = await fetch(`${URL_}/rest/v1/churches?on_conflict=source_id`, {
    method: 'POST',
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(batch),
  });

  if (!res.ok) {
    console.error(`\n  Batch at ${i} failed: ${res.status}`);
    console.error(`  ${(await res.text()).slice(0, 400)}`);
    console.error(`\n  ${done} rows imported before this. Re-running is safe — it upserts.\n`);
    process.exit(1);
  }
  done += batch.length;
  process.stdout.write(`\r  imported ${done}/${unique.length}`);
}

console.log(`\n\n  Done. ${done} churches in the directory.`);
console.log('  Claimed listings were not touched.\n');
