#!/usr/bin/env node
/**
 * What is actually in the feed, on the server.
 *
 * Posts used to live only on the phone that wrote them, so "my post is still
 * there after signing out" proved nothing — it had never left. This reads the
 * database directly, which is the only way to tell the difference.
 *
 *   node scripts/posts.mjs
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

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

const { rows } = await client.query(`
  select p.id, p.author_name, p.content, p.image, p.likes_count, p.created_at,
         p.visibility, p.feed,
         (select count(*) from comments c where c.post_id = p.id) as comment_count
  from posts p
  order by p.created_at desc
  limit 30
`);

if (!rows.length) {
  console.log('\n  No posts on the server yet.\n');
  console.log('  Write one in the app. If it does not appear here, it never left the phone.\n');
} else {
  console.log(`\n  ${rows.length} post${rows.length === 1 ? '' : 's'} on the server:\n`);
  for (const r of rows) {
    const text = (r.content || '').replace(/\s+/g, ' ').trim();
    console.log(`  \x1b[1m${r.author_name}\x1b[0m  ${new Date(r.created_at).toLocaleString()}`);
    console.log(`      "${text.length > 120 ? text.slice(0, 120) + '…' : text || '(no text)'}"`);
    // A local path here means the upload did not happen, and the photo is
    // invisible to everyone but its author — worth seeing at a glance.
    if (r.image) {
      const shared = r.image.startsWith('http');
      console.log(`      photo    ${shared ? 'uploaded' : `\x1b[31mstill local — ${r.image.slice(0, 50)}…\x1b[0m`}`);
    }
    console.log(`      ${r.likes_count} like${r.likes_count === 1 ? '' : 's'}, ${r.comment_count} comment${r.comment_count === '1' ? '' : 's'}${r.visibility !== 'public' ? `, ${r.visibility}` : ''}`);
    console.log('');
  }
}

await client.end();
