/**
 * Why DATABASE_URL will not connect — without ever printing the password.
 *
 * A connection string is a URL, so a password containing `@`, `/`, `:`, `#`,
 * `?` or a space does not mean what it looks like it means. `@` is the worst:
 * everything after the last one is read as the server address, so the password
 * sent is whatever came before it, and Postgres answers "password
 * authentication failed" — which sends you off checking a password that was
 * actually correct.
 *
 * This reports the shape of the line and the character classes in the
 * password. It prints its length and which kinds of character it contains,
 * never the password itself, so the output is safe to paste anywhere.
 *
 *   node scripts/check-db-url.mjs          see what is wrong
 *   node scripts/check-db-url.mjs --fix    percent-encode the password in place
 *
 * --fix keeps a copy at .env.local.bak first.
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import pg from 'pg';

const FIX = process.argv.includes('--fix');
const FILE = '.env.local';

if (!existsSync(FILE)) {
  console.error(`\n  No ${FILE} here. Run this from the project folder.\n`);
  process.exit(1);
}

const text = readFileSync(FILE, 'utf8');
const lines = text.split('\n');
const idx = lines.findIndex(l => /^\s*DATABASE_URL\s*=/.test(l));

if (idx < 0) {
  console.error(`\n  ${FILE} has no DATABASE_URL line.\n`);
  process.exit(1);
}

const rawValue = lines[idx].replace(/^\s*DATABASE_URL\s*=/, '');
const value = rawValue.trim().replace(/^["']|["']$/g, '');

console.log('\n  DATABASE_URL');

const notes = [];
if (rawValue !== rawValue.trimEnd()) notes.push('there is trailing whitespace after the url');
if (/^\s/.test(rawValue)) notes.push('there is a space after the = sign');
if (/^["']/.test(rawValue.trim())) notes.push('the value is wrapped in quotes');

if (!/^postgres(ql)?:\/\//.test(value)) {
  console.log('\n  \x1b[31mThis does not start with postgresql://\x1b[0m');
  console.log('  The whole line should look like:');
  console.log('    DATABASE_URL=postgresql://postgres.PROJECT:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres\n');
  process.exit(1);
}

// The host begins after the LAST `@`, not the first. Splitting on the first
// one is exactly the mistake a password containing `@` provokes.
const afterScheme = value.replace(/^postgres(ql)?:\/\//, '');
const at = afterScheme.lastIndexOf('@');
if (at < 0) {
  console.log('\n  \x1b[31mThere is no @ in the url\x1b[0m, so it names no server.\n');
  process.exit(1);
}

const creds = afterScheme.slice(0, at);
const hostPart = afterScheme.slice(at + 1);
const colon = creds.indexOf(':');
const user = colon < 0 ? creds : creds.slice(0, colon);
const password = colon < 0 ? '' : creds.slice(colon + 1);

console.log(`    user      ${user}`);
console.log(`    server    ${hostPart}`);
console.log(`    password  ${password.length} characters`);

// Named rather than shown. Knowing a `@` is in there is enough to act on;
// seeing which one it is would put the password in the terminal scrollback.
const RESERVED = { '@': 'at sign', '/': 'slash', ':': 'colon', '#': 'hash', '?': 'question mark', '[': 'bracket', ']': 'bracket', ' ': 'space', '%': 'percent sign' };
const present = [...new Set([...password].filter(ch => RESERVED[ch]))];

if (!user.includes('.')) {
  notes.push(`the user is "${user}" — a pooler connection usually wants postgres.YOUR-PROJECT-REF`);
}
if (password.length === 0) {
  notes.push('there is no password between the : and the @');
}

if (present.length) {
  const names = [...new Set(present.map(ch => RESERVED[ch]))].join(', ');
  console.log(`\n  \x1b[31mThe password contains: ${names}\x1b[0m`);
  console.log('  Characters like these have their own meaning inside a url, so the');
  console.log('  password being sent is not the password you pasted.');
  if (password.includes('%')) {
    console.log('\n  A percent sign may mean this was already encoded once. Encoding it');
    console.log('  twice would break it the other way, so this will not touch it —');
    console.log('  reset the password in Supabase and take one without symbols.');
  } else if (FIX) {
    copyFileSync(FILE, FILE + '.bak');
    const safe = encodeURIComponent(password);
    lines[idx] = `DATABASE_URL=postgres${/^postgresql/.test(value) ? 'ql' : ''}://${user}:${safe}@${hostPart}`;
    writeFileSync(FILE, lines.join('\n'));
    console.log(`\n  Rewritten. The old file is at ${FILE}.bak`);
    console.log('  The password itself is unchanged — only how it is spelled in the url.');
  } else {
    console.log('\n  To fix it in place:  node scripts/check-db-url.mjs --fix');
  }
} else {
  console.log('\n  No awkward characters in the password.');
}

for (const n of notes) console.log(`  Note: ${n}`);

// The only answer that settles it.
process.stdout.write('\n  Connecting … ');
const client = new pg.Client({
  connectionString: readFileSync(FILE, 'utf8')
    .split('\n').find(l => /^\s*DATABASE_URL\s*=/.test(l))
    .replace(/^\s*DATABASE_URL\s*=/, '').trim().replace(/^["']|["']$/g, ''),
  ssl: { rejectUnauthorized: false },
  // A wrong host does not refuse the connection, it just never answers, and a
  // diagnostic that hangs is worse than no diagnostic. Ten seconds is far
  // longer than this ever legitimately takes.
  connectionTimeoutMillis: 10000,
});

try {
  await client.connect();
  const { rows } = await client.query('select count(*)::int as n from churches');
  console.log(`\x1b[32mconnected\x1b[0m — ${rows[0].n.toLocaleString()} churches.\n`);
} catch (err) {
  console.log('\x1b[31mfailed\x1b[0m');
  if (err.code === '28P01') {
    console.log('\n  The server says the password is wrong.');

    // The same password, by other routes to the same database. Supabase offers
    // three, and they do not all authenticate through the same machinery: the
    // session pooler, the transaction pooler, and a direct connection, which
    // takes the plain `postgres` user rather than postgres.PROJECT.
    //
    // This distinguishes the two explanations that otherwise look identical. If
    // another route accepts the password, the password was right all along and
    // the pooler is holding stale credentials — which it does for a few minutes
    // after a reset. If every route refuses it, the password really is not the
    // one the account has, and nothing in this file can fix that.
    const ref = (user.split('.')[1] || '').trim();
    const pw = password;
    const routes = [];
    if (/:\d+$/.test(hostPart.split('/')[0]) || hostPart.includes(':')) {
      const [hostOnly] = hostPart.split('/');
      const bare = hostOnly.replace(/:\d+$/, '');
      routes.push({ name: 'transaction pooler (port 6543)', user, host: `${bare}:6543`, db: 'postgres' });
    }
    if (ref) {
      routes.push({ name: 'direct connection', user: 'postgres', host: `db.${ref}.supabase.co:5432`, db: 'postgres' });
    }

    let worked = null;
    for (const r of routes) {
      process.stdout.write(`  Trying the ${r.name} … `);
      const alt = new pg.Client({
        connectionString: `postgresql://${r.user}:${encodeURIComponent(pw)}@${r.host}/${r.db}`,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
      });
      try {
        await alt.connect();
        await alt.query('select 1');
        console.log('\x1b[32mworks\x1b[0m');
        worked = r;
        await alt.end().catch(() => {});
        break;
      } catch (e) {
        console.log(e.code === '28P01' ? 'password refused here too' : `no (${e.code || e.message})`);
        await alt.end().catch(() => {});
      }
    }

    if (worked) {
      console.log(`\n  So the password is correct. The ${worked.name} accepts it and the`);
      console.log('  one in your file does not, which means that pooler is still holding');
      console.log('  the old credentials — it does that for a few minutes after a reset.');
      console.log('  Either wait and run this again, or use the route that works:');
      console.log(`\n    DATABASE_URL=postgresql://${worked.user}:YOUR-PASSWORD@${worked.host}/${worked.db}\n`);
    } else {
      console.log('\n  Every route refuses it, so the password really is not the one this');
      console.log('  account has. Nothing in this file can fix that — reset it in Supabase');
      console.log('  once more, or ask Supabase support if a reset will not take.\n');
    }
  } else if (err.code === 'ENOTFOUND') {
    console.log('\n  The server address could not be found. If the password contains an');
    console.log('  @, the part after it is being read as the address — run --fix.\n');
  } else {
    console.log(`\n  ${err.message}\n`);
  }
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
