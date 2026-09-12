#!/usr/bin/env node
/**
 * Rebuild .env.local, one question at a time.
 *
 * The file is git-ignored, so there is no copy of it anywhere — lose it and
 * the app stops reaching the server with no clue as to why. Restoring it by
 * hand means knowing five variable names, remembering which dashboard page
 * each value hides on, and editing a dotfile in TextEdit without clipping a
 * line you needed. That is a lot of steps to get wrong while already annoyed.
 *
 * So this asks for what is missing, checks each value against the service it
 * belongs to before writing anything, and leaves what is already working
 * alone. A value that fails its check is rejected on the spot, with what the
 * server said, rather than at the next app launch.
 *
 *   node scripts/setup-env.mjs
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { stdin, stdout } from 'node:process';

const ok    = s => console.log(`  \x1b[32m✓\x1b[0m ${s}`);
const bad   = s => console.log(`  \x1b[31m✗\x1b[0m ${s}`);
const note  = s => console.log(`    ${s}`);
const head  = s => console.log(`\n\x1b[1m${s}\x1b[0m`);
const mask  = v => (v.length <= 12 ? '*'.repeat(v.length) : `${v.slice(0, 8)}…${v.slice(-4)}`);

const FILE = '.env.local';

/**
 * What the file holds, and how to know a value is real.
 *
 * `check` talks to the actual service. A key that is the right shape and the
 * wrong key looks identical until something uses it, which is the failure this
 * is here to prevent.
 */
const VARS = [
  {
    name: 'EXPO_PUBLIC_SUPABASE_URL',
    label: 'Supabase project URL',
    where: 'Supabase → Project Settings → Data API → Project URL',
    looks: v => /^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(v) || 'Should look like https://abcdefgh.supabase.co',
    required: true,
  },
  {
    name: 'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    label: 'Supabase publishable key',
    where: 'Supabase → Project Settings → API Keys → publishable key',
    looks: v => (!/\s/.test(v) && v.length > 20) || 'That has a space or is too short — likely a partial paste.',
    required: true,
    check: async (v, env) => {
      const base = (env.EXPO_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
      const r = await fetch(`${base}/auth/v1/settings`, { headers: { apikey: v } });
      if (r.ok) return true;

      // 401 is the one that means this key. Supabase answers a wrong or
      // mismatched key with 401 and "Invalid API key"; a 403 or a 5xx is
      // something between here and there — a proxy, a network, an outage —
      // and says nothing about the key. Reading every non-200 as a bad key
      // rejected a working one from behind a corporate network.
      if (r.status === 401) {
        return 'the server says this key is not valid for that project (401).';
      }
      return { state: 'unknown', msg:
        `the server answered ${r.status}, which is not an answer about the key — `
        + 'something between here and Supabase. Check it with scripts/check-auth.mjs.' };
    },
  },
  {
    name: 'EXPO_PUBLIC_GOOGLE_API_KEY',
    label: 'Google API key',
    where: 'Google Cloud → APIs & Services → Credentials → Show key',
    looks: v => v.startsWith('AIza') || 'Google keys start with AIza.',
    required: true,
    check: async v => {
      const r = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=church&key=${v}`);
      const j = await r.json().catch(() => ({}));
      if (j.status === 'OK' || j.status === 'ZERO_RESULTS') return true;

      // A key restricted to iOS apps — which is how this app's key is set up,
      // and how it should be — is refused for any call that is not from the
      // app, including this one. Google says REQUEST_DENIED with "The provided
      // API key is invalid", word for word what it says about a key that is
      // genuinely wrong, so this cannot tell the two apart and must not claim
      // to. Rejecting on it turned a correct key away and sent someone back to
      // the console to fetch it again.
      if (j.status === 'REQUEST_DENIED') {
        return { state: 'unknown', msg:
          `Google says: ${j.error_message || 'REQUEST_DENIED'} — expected if the key is restricted `
          + 'to iOS apps, which cannot be checked from here. Test it in the app: create an event and '
          + 'type an address.' };
      }
      return `Places API says ${j.status}. ${j.error_message || ''}`.trim();
    },
  },
  {
    name: 'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    label: 'Stripe publishable key',
    where: 'Not set up yet — payments are parked. Leave blank.',
    required: false,
  },
  {
    name: 'EXPO_PUBLIC_APPLE_MERCHANT_ID',
    label: 'Apple merchant id',
    where: 'Not set up yet — leave blank.',
    required: false,
  },
];

function read() {
  const env = {};
  if (!existsSync(FILE)) return env;
  for (const line of readFileSync(FILE, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

/**
 * Ask for a line, whether or not a person is typing it.
 *
 * node:readline hands over only the first line when stdin is not a terminal,
 * which makes this script impossible to test without a human at the keyboard —
 * and an untested setup script is how you end up hand-holding someone through
 * a broken one. Buffering lines here behaves the same either way.
 *
 * Returns null at end of input, which is Ctrl+D as much as a finished file.
 */
function asker() {
  const queued = [];
  let waiting = null, ended = false, buf = '';

  stdin.setEncoding('utf8');
  stdin.on('data', chunk => {
    buf += chunk;
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i);
      buf = buf.slice(i + 1);
      if (waiting) { const w = waiting; waiting = null; w(line); } else queued.push(line);
    }
  });
  stdin.on('end', () => {
    ended = true;
    if (waiting) { const w = waiting; waiting = null; w(buf.length ? buf : null); }
  });
  stdin.resume();

  return {
    question(prompt) {
      stdout.write(prompt);
      if (queued.length) return Promise.resolve(queued.shift());
      if (ended) return Promise.resolve(null);
      return new Promise(resolve => { waiting = resolve; });
    },
    close() { stdin.pause(); },
  };
}

const env = read();
const rl = asker();
// Values the service could not be asked about, so the closing line can say so
// rather than claiming a confirmation that never happened.
const unverified = [];

console.log('\n\x1b[1mSetting up .env.local\x1b[0m');
console.log('Each value is checked against the service it belongs to before anything');
console.log('is written. Press Enter to keep what is there. Ctrl+C to stop.');

/**
 * What we know about one value: right, wrong, or unverifiable.
 *
 * Kept apart from asking, because "the service says this key is wrong" and
 * "I could not reach the service" lead to different places — the first is a
 * reason to type something else, the second is not.
 */
async function judge(v, value, env) {
  const shape = v.looks ? v.looks(value) : true;
  if (shape !== true) return { state: 'bad', msg: shape };
  if (!v.check) return { state: 'ok' };
  stdout.write(`    checking ${mask(value)} … `);
  try {
    const result = await v.check(value, env);
    if (result === true) { console.log('\x1b[32mworks\x1b[0m'); return { state: 'ok' }; }
    // A check may report that it could not tell, rather than that the value is
    // wrong. Treating "cannot tell" as "wrong" is what makes a setup script
    // refuse a key that works.
    if (result && result.state === 'unknown') {
      console.log('\x1b[33mcannot check from here\x1b[0m');
      return result;
    }
    console.log('\x1b[31mno\x1b[0m');
    return { state: 'bad', msg: result };
  } catch (e) {
    console.log('\x1b[33mcould not check\x1b[0m');
    return { state: 'unknown', msg: e.message };
  }
}

for (const v of VARS) {
  head(v.label);

  const held = env[v.name] || '';   // what the file had before this run
  let current = held;
  let entered = false;   // did this value come from the person, this run?

  // Every variable asks exactly once on the happy path, whether or not it
  // already holds something good. Skipping the question for values that look
  // fine made the script unable to replace a working key — the main reason
  // anyone runs it — and, with answers piped in, fed each one to the wrong
  // variable.
  for (;;) {
    if (!current) {
      if (!v.required) { note('(blank — not needed yet)'); break; }
    } else {
      const verdict = await judge(v, current, env);
      if (verdict.state === 'ok') {
        if (!v.check) ok(mask(current));
        if (entered) break;                   // just typed, and it works
      } else {
        note(verdict.msg + (verdict.state === 'unknown'
          ? ' — the value looks right, so keeping it is reasonable.' : ''));
        if (verdict.state === 'unknown' && !unverified.includes(v.label)) unverified.push(v.label);
        if (entered && verdict.state === 'unknown') break;
      }
    }

    // Enter keeps what is there — but only when what is there could be kept.
    // A value that just failed its own shape check is not a fallback, and
    // offering it as one wrote "node scripts/setup-env.mjs" into the file as a
    // Google key, because the reader pressed Enter at a prompt that said it
    // would keep that.
    const keepable = current && (!v.looks || v.looks(current) === true);
    note(v.where);
    const raw = await rl.question(keepable
      ? `    ${v.name}= [Enter keeps ${mask(current)}] `
      : `    ${v.name}= `);

    // End of input is not an empty answer: carrying on would ask a required
    // question forever against a stream with nothing left in it.
    if (raw === null) {
      console.log();
      bad('Input ended before every value was given. Nothing written.');
      process.exit(1);
    }

    const answer = raw.trim();
    if (!answer) {
      if (keepable || !v.required) break;     // Enter keeps what is there
      // Nothing usable typed. Fall back to whatever the file already held, so
      // a mistaken paste costs a retry rather than the working value that was
      // there before it.
      if (current !== held) {
        current = held;
        entered = false;
        bad(held ? 'Keeping the previous value.' : 'This one is required.');
        continue;
      }
      bad('This one is required.');
      continue;
    }

    current = answer;
    entered = true;
  }

  env[v.name] = current;
}

rl.close();

// The old file is worth more than the new one if anything here is wrong.
if (existsSync(FILE)) {
  copyFileSync(FILE, `${FILE}.backup`);
  note(`\nPrevious file kept as ${FILE}.backup`);
}

const body = VARS.map(v => `${v.name}=${env[v.name] || ''}`).join('\n') + '\n';
writeFileSync(FILE, body);

head('Done');
if (unverified.length) {
  ok(`${FILE} written`);
  note(`Not confirmed with the service: ${unverified.join(', ')}.`);
  note('Not a problem in itself — test them in the app, or run this again later.');
} else {
  ok(`${FILE} written, every value confirmed with its service`);
}
console.log('\nStart the app with the new settings:');
console.log('  npx expo start -c --go\n');
