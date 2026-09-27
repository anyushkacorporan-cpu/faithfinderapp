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
 *
 * And for a password nobody remembers, which is the case that stopped this
 * being useful the one time it was needed:
 *
 *   node scripts/set-password.mjs --reset you@example.com
 *
 * That route asks for the new password instead of taking it as an argument,
 * because an argument is written to ~/.zsh_history in plain text and stays
 * there. It needs DATABASE_URL, since it writes the hash itself rather than
 * proving it knows the old one.
 */
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const args = process.argv.slice(2).filter(a => a !== '--reset');
const reset = process.argv.includes('--reset');

/** Read a line without echoing it, so a password never appears on screen. */
async function askHidden(prompt) {
  stdout.write(prompt);
  const wasRaw = stdin.isRaw;
  if (stdin.isTTY) stdin.setRawMode(true);
  let out = '';
  await new Promise(resolve => {
    const onData = buf => {
      const s = buf.toString('utf8');
      for (const ch of s) {
        if (ch === '\r' || ch === '\n') { stdin.off('data', onData); stdout.write('\n'); return resolve(); }
        if (ch === '\u0003') { stdout.write('\n'); process.exit(130); }
        if (ch === '\u007f' || ch === '\b') { out = out.slice(0, -1); continue; }
        out += ch;
      }
    };
    stdin.on('data', onData);
  });
  if (stdin.isTTY) stdin.setRawMode(!!wasRaw);
  return out;
}

let [email, oldPassword, newPassword] = args;

if (reset) {
  if (!email) {
    console.error('\n  Usage: node scripts/set-password.mjs --reset you@example.com\n');
    process.exit(1);
  }
  newPassword = await askHidden(`    New password for ${email}: `);
  const again = await askHidden('    Type it again: ');
  if (newPassword !== again) {
    console.error('\n  Those did not match. Nothing was changed.\n');
    process.exit(1);
  }
} else if (!email || !oldPassword || !newPassword) {
  console.error('\n  Usage: node scripts/set-password.mjs you@example.com oldpassword newpassword');
  console.error('     or: node scripts/set-password.mjs --reset you@example.com\n');
  process.exit(1);
}
if (!newPassword || newPassword.length < 8) {
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

/**
 * Write the hash straight into auth.users.
 *
 * Supabase keeps a bcrypt hash in encrypted_password, so pgcrypto's crypt()
 * with gen_salt('bf') produces exactly what its own sign-in will check
 * against. pgcrypto lives in the extensions schema on Supabase and in public
 * on a plain Postgres, so where it is gets looked up rather than assumed.
 *
 * The cost is stated. gen_salt('bf') alone means cost 6, which bcrypt records
 * inside the hash — so sign-in would accept it and nothing would look wrong,
 * while the account sat behind a hash cheap enough to attack offline. Supabase
 * writes cost 10; a password reset should not quietly downgrade the account it
 * is meant to protect.
 *
 * Verified the same way the old-password route is, by signing in afterwards.
 * A hash in the wrong format writes cleanly and fails silently at the only
 * moment that matters, so the sign-in below is the test, not the update.
 */
if (reset) {
  const dbUrl = env.DATABASE_URL;
  if (!dbUrl) {
    console.error('\n  --reset needs DATABASE_URL in .env.local. Run: node scripts/setup-env.mjs\n');
    process.exit(1);
  }
  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const where = await client.query(
    `select n.nspname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where p.proname = 'gen_salt' limit 1`);
  if (!where.rows.length) {
    console.error('\n  pgcrypto is not installed, so the password cannot be hashed here.\n');
    await client.end();
    process.exit(1);
  }
  const schema = where.rows[0].nspname;

  const upd = await client.query(
    `update auth.users
        set encrypted_password = ${schema}.crypt($2, ${schema}.gen_salt('bf', 10)),
            updated_at = now()
      where lower(email) = lower($1)
      returning id, email_confirmed_at`,
    [email, newPassword]);
  await client.end();

  if (!upd.rowCount) {
    console.error(`\n  No account with that email. Run: node scripts/accounts.mjs\n`);
    process.exit(1);
  }
  if (!upd.rows[0].email_confirmed_at) {
    console.log('\n  \x1b[33mNote:\x1b[0m this account is not email-confirmed, so sign-in may still refuse it.');
  }

  const check = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: newPassword }),
  });
  const body = await check.json();
  if (body.access_token) {
    console.log('\n  \x1b[32m✓\x1b[0m password reset and verified — sign in with the new one\n');
    process.exit(0);
  }
  console.error(`\n  \x1b[31mThe hash was written but sign-in still refuses it:\x1b[0m ${body.msg || body.error_description || check.status}\n`);
  process.exit(1);
}

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
