/**
 * Put the database password into .env.local straight from the clipboard.
 *
 * Every way this goes wrong is a human step: selecting the text by hand and
 * clipping a character, or opening the file in TextEdit, which autocapitalises
 * and autocorrects and will quietly change a character of a pasted password.
 * Neither leaves a trace — the line looks perfect and the server just says the
 * password is wrong.
 *
 * So: copy the password in Supabase with its copy button, then run this. It
 * takes what is on the clipboard, writes it into the url correctly, and
 * connects to prove it worked. No editor, no selecting, no retyping.
 *
 *   node scripts/set-db-password.mjs
 *
 * The password is never printed, not even in part. The old file is kept at
 * .env.local.bak.
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import pg from 'pg';

const FILE = '.env.local';

if (!existsSync(FILE)) {
  console.error(`\n  No ${FILE} here. Run this from the project folder.\n`);
  process.exit(1);
}

let password = '';
if (process.argv.includes('--stdin')) {
  password = readFileSync(0, 'utf8');
} else {
  try {
    password = execFileSync('pbpaste', { encoding: 'utf8' });
  } catch {
    console.error(`
  Could not read the clipboard. On a Mac this should just work; if you are
  somewhere else, pipe the password in instead:

    node scripts/set-db-password.mjs --stdin
`);
    process.exit(1);
  }
}

// A copy button sometimes brings a newline with it, and a double-click can
// bring a trailing space. Neither is part of the password.
password = password.trim();

if (!password) {
  console.error('\n  The clipboard is empty. Copy the password in Supabase first.\n');
  process.exit(1);
}

if (password.includes('://')) {
  console.error(`
  That looks like a whole connection url, not a password. Copy just the
  password — the field in Supabase's reset dialog, using its copy button.
`);
  process.exit(1);
}

if (/\s/.test(password)) {
  console.error(`
  There is a space or line break inside what was copied, so it is not a
  password. Copy it again with the copy button rather than by selecting it.
`);
  process.exit(1);
}

const lines = readFileSync(FILE, 'utf8').split('\n');
const idx = lines.findIndex(l => /^\s*DATABASE_URL\s*=/.test(l));
if (idx < 0) {
  console.error(`\n  ${FILE} has no DATABASE_URL line to update.\n`);
  process.exit(1);
}

const value = lines[idx].replace(/^\s*DATABASE_URL\s*=/, '').trim().replace(/^["']|["']$/g, '');
const m = value.match(/^(postgres(?:ql)?:\/\/)(.*)$/);
if (!m) {
  console.error('\n  The DATABASE_URL line does not start with postgresql://\n');
  process.exit(1);
}

// Host begins after the LAST @ — the first one may belong to the old password.
const rest = m[2];
const at = rest.lastIndexOf('@');
if (at < 0) {
  console.error('\n  The DATABASE_URL line has no @, so it names no server.\n');
  process.exit(1);
}
const user = rest.slice(0, at).split(':')[0];
const host = rest.slice(at + 1);

// Encoded on the way in, so a password with symbols in it is never the thing
// that breaks the url.
const line = `DATABASE_URL=${m[1]}${user}:${encodeURIComponent(password)}@${host}`;

copyFileSync(FILE, FILE + '.bak');
lines[idx] = line;
writeFileSync(FILE, lines.join('\n'));

console.log(`\n  Written — ${password.length} characters, for ${user}`);
console.log(`  Previous file kept at ${FILE}.bak`);

process.stdout.write('\n  Connecting … ');
const client = new pg.Client({
  connectionString: line.replace(/^DATABASE_URL=/, ''),
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

try {
  await client.connect();
  const { rows } = await client.query('select count(*)::int as n from churches');
  console.log(`\x1b[32mconnected\x1b[0m — ${rows[0].n.toLocaleString()} churches.`);
  console.log('\n  Done. Put the same password in your locked note and you are finished.\n');
} catch (err) {
  console.log('\x1b[31mfailed\x1b[0m');
  if (err.code === '28P01') {
    console.log(`
  The url is right, so what was on the clipboard is not the password the
  server is expecting. Reset it once more in Supabase, press its copy button,
  and run this again straight away — nothing in between.
`);
  } else {
    console.log(`\n  ${err.message}\n`);
  }
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
