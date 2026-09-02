#!/usr/bin/env node
/**
 * Change an account's password from the terminal.
 *
 * The first working password was chosen in a chat message, which is a poor
 * place for one to live. The app has no change-password screen yet, and
 * password reset needs email delivery that is not set up, so this closes the
 * gap: sign in with the old password, then update the user with the session
 * that returns.
 *
 *   node scripts/set-password.mjs you@example.com oldpassword newpassword
 */
import { readFileSync } from 'node:fs';

const [email, oldPassword, newPassword] = process.argv.slice(2);
if (!email || !oldPassword || !newPassword) {
  console.error('\n  Usage: node scripts/set-password.mjs you@example.com oldpassword newpassword\n');
  process.exit(1);
}
if (newPassword.length < 8) {
  console.error('\n  New password must be at least 8 characters.\n');
  process.exit(1);
}

let env = {};
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const eq = line.indexOf('=');
  if (eq > 0) env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
}
const url = (env.EXPO_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const key = env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const signin = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: key, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password: oldPassword }),
});
const session = await signin.json();
if (!session.access_token) {
  console.error(`\n  \x1b[31mCould not sign in with the old password:\x1b[0m ${session.msg || session.error_description || signin.status}\n`);
  process.exit(1);
}

const update = await fetch(`${url}/auth/v1/user`, {
  method: 'PUT',
  headers: { apikey: key, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ password: newPassword }),
});

if (!update.ok) {
  const body = await update.text();
  console.error(`\n  \x1b[31mCould not change the password (${update.status}):\x1b[0m ${body.slice(0, 300)}\n`);
  process.exit(1);
}

// Prove it, rather than trusting a 200.
const check = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: key, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password: newPassword }),
});
const ok = (await check.json()).access_token;
console.log(ok
  ? '\n  \x1b[32m✓\x1b[0m password changed and verified — sign in with the new one\n'
  : '\n  \x1b[31mThe change reported success but the new password does not sign in.\x1b[0m\n');
process.exit(ok ? 0 : 1);
