/**
 * Run a .sql file straight against the database from this machine.
 *
 * The Supabase SQL editor works fine, but getting a 165-line file into a
 * browser textarea means the clipboard, and the clipboard is shared with
 * everything else you copy. One stray copy in between and you paste the wrong
 * thing — which is exactly what kept happening. This reads the file and sends
 * it over a database connection, so nothing is ever "in transit" somewhere it
 * can be replaced.
 *
 *   node scripts/run-sql.mjs supabase/01_churches.sql
 *
 * Needs, in .env.local:
 *   DATABASE_URL=postgresql://postgres.xxxx:PASSWORD@aws-0-....pooler.supabase.com:5432/postgres
 *
 * Supabase dashboard → Connect (green button, top) → copy the connection
 * string, and put your database password where it says [YOUR-PASSWORD].
 */
import { readFileSync } from 'node:fs';
import pg from 'pg';

const file = process.argv[2];
if (!file) {
  console.error('\n  Usage: node scripts/run-sql.mjs supabase/01_churches.sql\n');
  process.exit(1);
}

let env = {};
try {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* fall through to process.env */ }

const url = env.DATABASE_URL || process.env.DATABASE_URL;
if (!url) {
  console.error(`
  No DATABASE_URL found.

  In Supabase, click the green "Connect" button at the top of the page and
  copy the connection string. Then add it to .env.local as one line:

    DATABASE_URL=postgresql://postgres.xxxx:YOURPASSWORD@aws-0-...pooler.supabase.com:5432/postgres

  Replace [YOUR-PASSWORD] with the database password you set when you created
  the project.
`);
  process.exit(1);
}

let sql;
try {
  sql = readFileSync(file, 'utf8');
} catch (err) {
  console.error(`\n  Cannot read ${file} — ${err.code === 'ENOENT' ? 'no such file' : err.message}\n`);
  process.exit(1);
}

console.log(`\n  Running ${file} (${sql.split('\n').length} lines) …`);

// Supabase's pooler terminates TLS with its own certificate chain, which Node
// will not trust by default. This is a direct connection to a host you named
// yourself, not an untrusted endpoint.
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  await client.query(sql);
  console.log('  Success.\n');

  const { rows } = await client.query(`
    select table_name from information_schema.tables
    where table_schema = 'public' order by table_name
  `);
  console.log('  Tables now in your database:');
  for (const r of rows) console.log(`    ${r.table_name}`);
  console.log();
} catch (err) {
  console.error(`\n  Failed: ${err.message}\n`);
  if (err.message.includes('password') || err.message.includes('auth')) {
    console.error('  That looks like a wrong database password in DATABASE_URL.\n');
  }
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
