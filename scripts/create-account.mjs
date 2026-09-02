#!/usr/bin/env node
/**
 * Create an account from the terminal.
 *
 * The app's sign-up screen is not producing accounts and we have not yet
 * found why. This does the same thing the app does — the same endpoint, the
 * same key out of the same .env.local — so that having an account does not
 * depend on that being solved first. The self-test creates accounts this way
 * reliably, so this path is known to work.
 *
 *   node scripts/create-account.mjs you@example.com yourpassword
 *
 * Afterwards, sign in normally in the app.
 */
import { readFileSync } from 'node:fs';

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error('\n  Usage: node scripts/create-account.mjs you@example.com yourpassword');
  console.error('  Password must be at least 6 characters.\n');
  process.exit(1);
}
if (password.length < 6) {
  console.error('\n  Password must be at least 6 characters.\n');
  process.exit(1);
}

let env = {};
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const eq = line.indexOf('=');
  if (eq > 0) env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
}
const url = (env.EXPO_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const key = env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
if (!url || !key) {
  console.error('\n  EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY missing from .env.local\n');
  process.exit(1);
}

const H = { apikey: key, 'Content-Type': 'application/json' };

async function post(path, body) {
  const res = await fetch(`${url}${path}`, { method: 'POST', headers: H, body: JSON.stringify(body) });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = null; }
  return { status: res.status, json, text };
}

console.log(`\n  Creating ${email} …`);

const up = await post('/auth/v1/signup', {
  email,
  password,
  data: { account_type: 'personal', first_name: null, last_name: null, church_name: null },
});

if (up.status !== 200) {
  const msg = up.json?.msg || up.json?.error_description || up.json?.message || up.text.slice(0, 300);
  // An address already taken is not a failure worth stopping on — the point
  // is to end up with an account you can sign into, and it may already exist.
  if (/already|registered|exists/i.test(msg)) {
    console.log(`  An account already exists for ${email}.`);
    console.log(`  If you cannot sign in, the password differs from the one you just gave.\n`);
  } else {
    console.error(`\n  \x1b[31mSign-up failed (${up.status})\x1b[0m`);
    console.error(`  ${msg}\n`);
    process.exit(1);
  }
} else {
  console.log('  \x1b[32m✓\x1b[0m account created');
}

const inRes = await post('/auth/v1/token?grant_type=password', { email, password });
if (inRes.status === 200 && inRes.json?.access_token) {
  console.log('  \x1b[32m✓\x1b[0m password verified — sign in with these details in the app\n');
} else {
  const msg = inRes.json?.msg || inRes.json?.error_description || inRes.text.slice(0, 300);
  console.error(`\n  \x1b[31mThe account exists but this password does not sign in:\x1b[0m ${msg}\n`);
  process.exit(1);
}
