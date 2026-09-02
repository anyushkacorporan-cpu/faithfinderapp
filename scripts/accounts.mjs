#!/usr/bin/env node
/**
 * List the accounts, from the terminal.
 *
 * Answering "did that sign-up actually work?" meant switching to the browser,
 * clearing the SQL editor, pasting a query, and reading a table — and pasted
 * SQL kept ending up in the shell and shell commands in the SQL editor. This
 * asks the same question without leaving the terminal.
 *
 *   node scripts/accounts.mjs
 */
import { readFileSync } from 'node:fs';
import pg from 'pg';

let env = {};
try {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* fall through to process.env */ }

const url = env.DATABASE_URL || process.env.DATABASE_URL;
if (!url) {
  console.error('\n  No DATABASE_URL in .env.local — see scripts/run-sql.mjs for how to add it.\n');
  process.exit(1);
}

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

const { rows } = await client.query(`
  select u.email,
         u.email_confirmed_at is not null as confirmed,
         u.created_at,
         p.id is not null as has_profile,
         p.account_type
  from auth.users u
  left join public.profiles p on p.id = u.id
  order by u.created_at desc
`);

if (!rows.length) {
  console.log('\n  No accounts exist yet.\n');
  console.log('  A sign-up that appeared to work but left nothing here failed on the way out.');
  console.log('  The error shown on the sign-up screen is the one that matters.\n');
} else {
  console.log(`\n  ${rows.length} account${rows.length === 1 ? '' : 's'}:\n`);
  for (const r of rows) {
    const when = new Date(r.created_at).toLocaleString();
    console.log(`  ${r.confirmed ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${r.email}`);
    console.log(`      created  ${when}`);
    console.log(`      confirmed ${r.confirmed ? 'yes' : 'NO — cannot sign in until confirmed'}`);
    console.log(`      profile  ${r.has_profile ? `yes (${r.account_type})` : 'MISSING — the handle_new_user trigger did not run'}`);
  }
  console.log('');
}

await client.end();
