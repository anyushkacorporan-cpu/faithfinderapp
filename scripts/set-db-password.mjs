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

/** Why this cannot be a password — or '' if it can. */
function notAPassword(s) {
  if (!s) return 'it is empty';
  if (s.includes('://')) return 'it is a whole connection url, not a password';
  if (/\s/.test(s)) {
    const lines = s.split('\n').length;
    return lines > 1
      ? `it is ${s.length} characters across ${lines} lines, so it is some other text`
      : 'it has a space in it';
  }
  return '';
}

/**
 * Ask at the terminal, without echoing.
 *
 * The clipboard was meant to spare anyone retyping a generated password, but
 * it only holds one thing at a time and everything else in this process — a
 * git command, copying output to send on — overwrites it. Asking here does not
 * care what happened in between: copy the password whenever, come back, paste.
 *
 * Nothing is echoed, so it does not end up in the scrollback either.
 */
function askHidden(question) {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    if (!stdin.isTTY) { reject(new Error('not a terminal')); return; }
    process.stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let buf = '';
    const done = (value) => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener('data', onData);
      process.stdout.write('\n');
      resolve(value);
    };
    // A paste arrives as one chunk, not one keystroke at a time.
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n' || ch === '\u0004') { done(buf); return; }
        if (ch === '\u0003') { process.stdout.write('\n'); process.exit(130); }
        if (ch === '\u007f' || ch === '\b') buf = buf.slice(0, -1);
        else if (ch >= ' ') buf += ch;
      }
    };
    stdin.on('data', onData);
  });
}

let password = '';
if (process.argv.includes('--stdin')) {
  password = readFileSync(0, 'utf8').trim();
} else {
  try {
    password = execFileSync('pbpaste', { encoding: 'utf8' }).trim();
  } catch { /* no clipboard; the prompt below covers it */ }

  const why = notAPassword(password);
  if (why) {
    // Not an error. The clipboard is a convenience, and when it holds something
    // else there is no reason to send anyone back round the loop.
    if (password) console.log(`\n  The clipboard is not the password — ${why}.`);
    try {
      password = (await askHidden('\n  Paste the password here (it will not be shown): ')).trim();
    } catch {
      console.error(`
  Nothing to read the password from. Run this straight from Terminal, or pipe
  it in:   node scripts/set-db-password.mjs --stdin
`);
      process.exit(1);
    }
  }
}

const why = notAPassword(password);
if (why) {
  console.error(`\n  That is not a password — ${why}.\n`);
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
