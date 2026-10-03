#!/usr/bin/env node
/**
 * How many churches would actually get a Street View photo? — asked for free.
 *
 * Google charges to send a photo and nothing at all to say whether one exists.
 * The metadata endpoint is free, unlimited, and consumes no quota, so the whole
 * directory can be surveyed before a single cent is committed — which is the
 * point, because every number offered so far has been a guess. Street View
 * covers most American streets and not all of them: a church down a private
 * drive, on an upper floor, or inside a shopping centre has nothing to show.
 *
 *   node scripts/check-streetview.mjs             a 1,000-church sample
 *   node scripts/check-streetview.mjs --all       every church (slow)
 *   node scripts/check-streetview.mjs --state NY  one state
 *   node scripts/check-streetview.mjs --n 5000    a bigger sample
 *
 * A random sample of 1,000 lands within about three points of the true figure,
 * which is far more precision than this decision needs, and takes a minute
 * rather than an afternoon.
 *
 * Needs DATABASE_URL and EXPO_PUBLIC_GOOGLE_API_KEY in .env.local. Writes
 * nothing, charges nothing, and changes nothing.
 */
import { readFileSync } from 'node:fs';
import pg from 'pg';

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? (argv[i + 1] ?? true) : null;
};
const ALL    = argv.includes('--all');
const STATE  = flag('state');
const SAMPLE = Number(flag('n')) || 1000;

let env = {};
try {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const eq = line.indexOf('=');
    if (eq > 0) env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
} catch { /* fall through to process.env */ }

const DB  = env.DATABASE_URL || process.env.DATABASE_URL;
// A server key first, because the app's key is restricted to iOS bundle ids
// and a script cannot present one. Falls back to the app's so this works
// unchanged if that restriction is ever relaxed.
const KEY = env.STREETVIEW_API_KEY || process.env.STREETVIEW_API_KEY
         || env.EXPO_PUBLIC_GOOGLE_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_API_KEY;
if (!DB)  { console.error('\n  No DATABASE_URL in .env.local — run: node scripts/setup-env.mjs\n'); process.exit(1); }
if (!KEY) { console.error('\n  No STREETVIEW_API_KEY or EXPO_PUBLIC_GOOGLE_API_KEY in .env.local\n'); process.exit(1); }

const client = new pg.Client({ connectionString: DB, ssl: { rejectUnauthorized: false } });
await client.connect();

// Random rather than the first N: churches are stored roughly in import order,
// which is geographic, so the first thousand would all be one corner of one
// state and would say nothing about the rest.
const where = STATE ? `where state = $1 and lat is not null` : `where lat is not null`;
const limit = ALL ? '' : `order by random() limit ${Number(SAMPLE)}`;
const { rows } = await client.query(
  `select id, name, state, lat, lng from churches ${where} ${limit}`,
  STATE ? [STATE] : []);
await client.end();

if (!rows.length) {
  console.error(`\n  No churches found${STATE ? ` in ${STATE}` : ''}.\n`);
  process.exit(1);
}

console.log(`\n  Asking Google about ${rows.length.toLocaleString()} church${rows.length === 1 ? '' : 'es'}${STATE ? ` in ${STATE}` : ''}…`);
console.log('  This costs nothing — metadata requests are free and use no quota.\n');

/**
 * `radius` is the distance Google may wander to find a panorama. 50m is the
 * default and about right: a church's stored point is its building, and a
 * photo taken from the road outside is the photo wanted. Widening it would
 * inflate the hit rate with pictures of the next street.
 */
let googleSaid = '';   // Google's own explanation, kept for the report.

async function hasImagery(lat, lng) {
  const url = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&radius=50&key=${KEY}`;
  try {
    const r = await fetch(url);
    const j = await r.json();
    // Google says why it refused, in a sentence. Printing that beats listing
    // the three things it might have been.
    if (j.error_message && !googleSaid) googleSaid = j.error_message;
    return j.status;   // OK | ZERO_RESULTS | REQUEST_DENIED | OVER_QUERY_LIMIT | …
  } catch (e) {
    return 'NETWORK_ERROR';
  }
}

const counts = {};
const byState = {};
let done = 0;

// Twenty at a time: fast enough for a national sample, gentle enough not to
// trip Google's per-second limit and start reporting denials that are really
// just impatience.
const CONCURRENCY = 20;
const queue = [...rows];

async function worker() {
  while (queue.length) {
    const c = queue.shift();
    const status = await hasImagery(c.lat, c.lng);
    counts[status] = (counts[status] || 0) + 1;
    if (c.state) {
      byState[c.state] ||= { ok: 0, total: 0 };
      byState[c.state].total++;
      if (status === 'OK') byState[c.state].ok++;
    }
    done++;
    if (done % 100 === 0 || done === rows.length) {
      process.stdout.write(`\r  ${done.toLocaleString()} / ${rows.length.toLocaleString()}`);
    }
    // The one answer that means "stop, this is not going to work".
    if (status === 'REQUEST_DENIED' && (counts.REQUEST_DENIED || 0) > 5) queue.length = 0;
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
console.log('\n');

if ((counts.REQUEST_DENIED || 0) > 5) {
  console.log('  \x1b[31mGoogle refused the requests.\x1b[0m\n');
  if (googleSaid) console.log(`  Google said: \x1b[1m${googleSaid}\x1b[0m\n`);
  console.log('  Three things cause this, most likely first:\n');
  console.log('    1. The key is restricted to iOS apps.');
  console.log('       This project\'s key is limited to the bundle ids com.faithfinder');
  console.log('       and host.exp.Exponent, which a script on a Mac cannot present.');
  console.log('       Make a SECOND key for server use rather than loosening this one:');
  console.log('       Cloud Console -> APIs & Services -> Credentials -> Create key,');
  console.log('       restrict it to the Street View Static API, and put it in');
  console.log('       .env.local as STREETVIEW_API_KEY.\n');
  console.log('    2. The Street View Static API is not enabled on the project.');
  console.log('       APIs & Services -> Library -> "Street View Static API" -> Enable.\n');
  console.log('    3. The project has no billing account. Maps APIs refuse every');
  console.log('       request without one, even free ones like this.\n');
  console.log('  None of these costs anything, and this check stays free either way.\n');
  process.exit(1);
}

const ok = counts.OK || 0;
const asked = Object.values(counts).reduce((a, b) => a + b, 0);
const pct = (ok / asked) * 100;

console.log('  \x1b[1mResult\x1b[0m\n');
console.log(`    ${ok.toLocaleString()} of ${asked.toLocaleString()} have a Street View photo available  \x1b[1m${pct.toFixed(1)}%\x1b[0m`);
for (const [status, n] of Object.entries(counts)) {
  if (status === 'OK') continue;
  console.log(`    ${n.toLocaleString()} ${status}`);
}

if (!ALL && !STATE) {
  // A proportion from a random sample, with the usual 95% interval, so the
  // number is not read as more precise than it is.
  const se = Math.sqrt((pct / 100) * (1 - pct / 100) / asked) * 100;
  console.log(`\n    Sampled, so the true figure is about ${(pct - 1.96 * se).toFixed(1)}–${(pct + 1.96 * se).toFixed(1)}%.`);
  console.log(`    Across all 235,146 churches that is roughly ${Math.round(235146 * pct / 100).toLocaleString()} with a photo.`);
}

const states = Object.entries(byState).filter(([, v]) => v.total >= 20)
  .map(([s, v]) => [s, (v.ok / v.total) * 100, v.total])
  .sort((a, b) => b[1] - a[1]);
if (states.length > 1) {
  console.log('\n  \x1b[1mBy state\x1b[0m  (20+ churches sampled)\n');
  for (const [s, p, n] of states.slice(0, 8))  console.log(`    ${s}  ${p.toFixed(0).padStart(3)}%   (${n})`);
  if (states.length > 8) {
    console.log('    …');
    for (const [s, p, n] of states.slice(-3)) console.log(`    ${s}  ${p.toFixed(0).padStart(3)}%   (${n})`);
  }
}
console.log('');
