#!/usr/bin/env node
/**
 * Read the moderation queue.
 *
 * Reports used to be written to the reporter's own phone, so "we'll review
 * this" was not true of anything. They now land in the database — which only
 * matters if somebody looks. This is looking.
 *
 *   node scripts/reports.mjs            open reports, newest first
 *   node scripts/reports.mjs --all      including ones already handled
 *   node scripts/reports.mjs --close <id>   mark one reviewed
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
  console.error('\n  No DATABASE_URL in .env.local — see scripts/run-sql.mjs.\n');
  process.exit(1);
}

const args = process.argv.slice(2);
const all = args.includes('--all');
const closeIdx = args.indexOf('--close');
const closeId = closeIdx > -1 ? args[closeIdx + 1] : null;

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

if (closeId) {
  const { rowCount } = await client.query(
    `update reports set status = 'reviewed' where id = $1`, [closeId]);
  console.log(rowCount ? `\n  Marked reviewed.\n` : `\n  No report with that id.\n`);
  await client.end();
  process.exit(0);
}

const { rows } = await client.query(`
  select r.id, r.created_at, r.target_type, r.target_id, r.reason, r.details,
         r.target_author, r.snapshot, r.status,
         u.email as reporter,
         (select count(*) from reports x
           where x.target_type = r.target_type and x.target_id = r.target_id) as times_reported
  from reports r
  left join auth.users u on u.id = r.reporter_id
  ${all ? '' : `where r.status = 'open'`}
  order by r.created_at desc
  limit 100
`);

if (!rows.length) {
  console.log(all ? '\n  No reports.\n' : '\n  No open reports.\n');
} else {
  console.log(`\n  ${rows.length} report${rows.length === 1 ? '' : 's'}${all ? '' : ' open'}:\n`);
  for (const r of rows) {
    const when = new Date(r.created_at).toLocaleString();
    // More than one person reporting the same thing is the signal worth
    // reacting to, so say it rather than making someone count rows.
    const heat = Number(r.times_reported) > 1 ? `  \x1b[31m×${r.times_reported} reporters\x1b[0m` : '';
    console.log(`  \x1b[1m${r.reason}\x1b[0m on ${r.target_type}${heat}`);
    console.log(`      by       ${r.reporter || 'unknown'}   ${when}`);
    if (r.target_author) console.log(`      author   ${r.target_author}`);
    if (r.snapshot) {
      const text = r.snapshot.replace(/\s+/g, ' ').trim();
      console.log(`      content  "${text.length > 160 ? text.slice(0, 160) + '…' : text}"`);
    }
    if (r.details) console.log(`      note     ${r.details}`);
    if (all) console.log(`      status   ${r.status}`);
    console.log(`      close    node scripts/reports.mjs --close ${r.id}`);
    console.log('');
  }
}

await client.end();
