#!/usr/bin/env node
/**
 * Does auth actually work? — a self-contained answer.
 *
 * Written after a broken .env.local sent us chasing the wrong cause three
 * times: an unconfirmed account, then a failing trigger, then the wrong
 * project. Each guess cost a round trip and none of them were it.
 *
 * This asks the server directly and prints what it says. It reads the same
 * file the app reads, checks the credentials are shaped like credentials,
 * calls the auth endpoint, and creates and signs into a throwaway account.
 * Whatever is wrong, it is in the output rather than inferred from a symptom.
 *
 *   node scripts/check-auth.mjs
 */

import { readFileSync } from 'node:fs';

const ok   = s => console.log(`  \x1b[32m✓\x1b[0m ${s}`);
const bad  = s => console.log(`  \x1b[31m✗\x1b[0m ${s}`);
const info = s => console.log(`    ${s}`);
const head = s => console.log(`\n\x1b[1m${s}\x1b[0m`);

// Show enough of a value to recognise it, never enough to leak it.
const mask = v => (v.length <= 12 ? '*'.repeat(v.length) : `${v.slice(0, 8)}…${v.slice(-4)} (${v.length} chars)`);

// ── 1. The file the app reads ──────────────────────────────────────────────
head('1. .env.local');

let raw;
try {
  raw = readFileSync('.env.local', 'utf8');
} catch {
  bad('.env.local not found. Run this from the project folder.');
  process.exit(1);
}

const env = {};
const malformed = [];
for (const line of raw.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const eq = t.indexOf('=');
  if (eq < 1) { malformed.push(t); continue; }
  // Last one wins, matching how a shell and Expo both read these.
  env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
}
if (malformed.length) {
  bad(`${malformed.length} line(s) are not KEY=VALUE:`);
  for (const m of malformed) info(m.slice(0, 70) + (m.length > 70 ? '…' : ''));
}

const url = env.EXPO_PUBLIC_SUPABASE_URL || '';
const key = env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!url) bad('EXPO_PUBLIC_SUPABASE_URL is missing');
else if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)\/?$/i.test(url)) {
  bad(`EXPO_PUBLIC_SUPABASE_URL is not a Supabase URL: "${url}"`);
} else ok(`URL  ${url}`);

if (!key) bad('EXPO_PUBLIC_SUPABASE_ANON_KEY is missing');
else if (/\s/.test(key)) {
  bad('EXPO_PUBLIC_SUPABASE_ANON_KEY contains whitespace — something other than a key ended up in it:');
  info(key.slice(0, 70) + (key.length > 70 ? '…' : ''));
} else if (!/^(eyJ|sb_publishable_)/.test(key)) {
  bad(`EXPO_PUBLIC_SUPABASE_ANON_KEY does not start with eyJ or sb_publishable_: ${mask(key)}`);
} else ok(`KEY  ${mask(key)}`);

if (!url || !key || /\s/.test(key)) {
  console.log('\n\x1b[1mStop here.\x1b[0m Fix .env.local first — nothing downstream can work.');
  process.exit(1);
}

// ── 2. Can we reach it with that key ───────────────────────────────────────
head('2. Reaching the server');

const base = url.replace(/\/$/, '');
const H = { apikey: key, 'Content-Type': 'application/json' };

async function call(path, init = {}) {
  const res = await fetch(`${base}${path}`, { ...init, headers: { ...H, ...(init.headers || {}) } });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = null; }
  return { status: res.status, text, json };
}

try {
  const r = await call('/auth/v1/settings');
  if (r.status === 200) {
    ok('auth endpoint answered');
    const s = r.json || {};
    // The setting that decides whether a new account can sign in immediately.
    const autoconfirm = s.mailer_autoconfirm ?? s.autoconfirm;
    info(`email sign-up enabled : ${s.external?.email !== false}`);
    info(`confirmation required : ${autoconfirm === true ? 'no' : 'YES — a new account cannot sign in until confirmed'}`);
  } else if (r.status === 401) {
    bad(`the server rejected the key (401). This key is not valid for ${base}`);
    info(r.text.slice(0, 200));
    process.exit(1);
  } else {
    bad(`unexpected status ${r.status}`);
    info(r.text.slice(0, 300));
  }
} catch (e) {
  bad(`could not reach ${base}: ${e.message}`);
  process.exit(1);
}

// ── 3. A real account, end to end ──────────────────────────────────────────
head('3. Creating a throwaway account');

const email = `ff-selftest-${Date.now()}@mailinator.com`;
const password = 'SelfTest!2468';
info(`${email}`);

const up = await call('/auth/v1/signup', {
  method: 'POST',
  body: JSON.stringify({ email, password, data: { account_type: 'personal', first_name: 'Self', last_name: 'Test' } }),
});

if (up.status !== 200) {
  bad(`sign-up failed (${up.status})`);
  info(up.json?.msg || up.json?.error_description || up.json?.message || up.text.slice(0, 400));
  console.log('\n\x1b[1mThis is the real error the app was hitting.\x1b[0m');
  process.exit(1);
}

ok('sign-up accepted');
const hasSession = !!up.json?.access_token;
info(hasSession ? 'signed in immediately (no confirmation required)' : 'no session returned — this project requires email confirmation');

head('4. Signing back in');

const inRes = await call('/auth/v1/token?grant_type=password', {
  method: 'POST',
  body: JSON.stringify({ email, password }),
});

if (inRes.status === 200 && inRes.json?.access_token) {
  ok('sign-in succeeded');
  console.log('\n\x1b[1;32mAuth works end to end.\x1b[0m If the app still fails, the app is not reading this .env.local — restart Expo with: npx expo start -c');
} else {
  bad(`sign-in failed (${inRes.status})`);
  info(inRes.json?.msg || inRes.json?.error_description || inRes.text.slice(0, 300));
  if (!hasSession) {
    console.log('\n\x1b[1mCause: email confirmation is on.\x1b[0m The account exists but cannot sign in until confirmed.');
    console.log('Supabase → Authentication → Sign In / Providers → Email → turn off "Confirm email" → Save.');
  }
}

console.log(`\nDelete the test account when you are done: Authentication → Users → ${email}`);
