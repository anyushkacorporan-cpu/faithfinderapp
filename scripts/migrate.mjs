#!/usr/bin/env node
/**
 * Apply every schema file that has not been applied yet.
 *
 * Until now each new .sql file meant remembering which ones had already been
 * run and typing another run-sql command. That is fine for the person who
 * wrote them and hopeless a week later — and it gets worse with every file.
 *
 *   node scripts/migrate.mjs           apply anything outstanding
 *   node scripts/migrate.mjs --status  say what is applied, change nothing
 *
 * Every file here is written to be safe to run twice (create if not exists,
 * drop policy before create), but a record of what ran is still worth having:
 * it makes "is my database up to date" a question with an answer.
 */
import { readFileSync, readdirSync } from 'node:fs';
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
  console.error('\n  No DATABASE_URL in .env.local — see scripts/run-sql.mjs.\n');
  process.exit(1);
}

const statusOnly = process.argv.includes('--status');

const files = readdirSync('supabase')
  .filter(f => f.endsWith('.sql'))
  .sort();  // 01_, 02_, … — the numbering is the order

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

await client.query(`
  create table if not exists schema_migrations (
    filename   text primary key,
    applied_at timestamptz not null default now()
  )
`);

const { rows } = await client.query('select filename from schema_migrations');
const done = new Set(rows.map(r => r.filename));

const pending = files.filter(f => !done.has(f));

if (statusOnly) {
  console.log('');
  for (const f of files) console.log(`  ${done.has(f) ? '\x1b[32m✓\x1b[0m' : '\x1b[33m·\x1b[0m'} ${f}`);
  console.log(pending.length ? `\n  ${pending.length} outstanding — run without --status to apply.\n` : '\n  Up to date.\n');
  await client.end();
  process.exit(0);
}

if (!pending.length) {
  console.log('\n  Up to date — nothing to apply.\n');
  await client.end();
  process.exit(0);
}

console.log('');
for (const f of pending) {
  const sql = readFileSync(`supabase/${f}`, 'utf8');
  process.stdout.write(`  ${f} … `);
  try {
    // Each file in its own transaction, so a failure half way through one
    // leaves the database on the last good state rather than somewhere in
    // between with no record of which half ran.
    await client.query('begin');
    await client.query(sql);
    await client.query('insert into schema_migrations (filename) values ($1)', [f]);
    await client.query('commit');
    console.log('\x1b[32mapplied\x1b[0m');
  } catch (err) {
    await client.query('rollback').catch(() => {});
    console.log('\x1b[31mfailed\x1b[0m');
    console.error(`\n  ${err.message}\n`);
    console.error('  Nothing from this file was applied. Later files were not attempted.\n');
    await client.end();
    process.exit(1);
  }
}
console.log('');

await client.end();
