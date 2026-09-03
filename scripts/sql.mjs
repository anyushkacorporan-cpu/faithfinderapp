#!/usr/bin/env node
/**
 * Run one SQL statement from the terminal.
 *
 * The dashboard's SQL editor works, but switching between it and the shell
 * has cost this project more time than any single bug: SQL gets pasted into
 * zsh, shell commands get pasted into the editor, and each mix-up is a round
 * trip. run-sql.mjs takes a file, which is right for a migration and heavy for
 * one line.
 *
 *   node scripts/sql.mjs "select count(*) from posts"
 *   node scripts/sql.mjs "update posts set author_name = 'Anne' where author_name = 'You'"
 *
 * Quote the whole statement. Single quotes inside it are fine.
 */
import { readFileSync } from 'node:fs';
import pg from 'pg';

const sql = process.argv.slice(2).join(' ').trim();
if (!sql) {
  console.error('\n  Usage: node scripts/sql.mjs "select count(*) from posts"\n');
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
  console.error('\n  No DATABASE_URL in .env.local — see scripts/run-sql.mjs.\n');
  process.exit(1);
}

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

try {
  const res = await client.query(sql);
  if (res.rows?.length) {
    console.table(res.rows);
    console.log(`  ${res.rows.length} row${res.rows.length === 1 ? '' : 's'}\n`);
  } else {
    // A write reports what it touched. "Success" alone hides an update that
    // matched nothing, which looks identical to one that worked.
    console.log(`\n  ${res.command} — ${res.rowCount ?? 0} row${res.rowCount === 1 ? '' : 's'} affected\n`);
  }
} catch (err) {
  console.error(`\n  \x1b[31m${err.message}\x1b[0m\n`);
  process.exitCode = 1;
}

await client.end();
