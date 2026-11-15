#!/usr/bin/env node
/**
 * Write every event email to a file you can open in a browser.
 *
 * Checking an email by sending one means a round trip through Resend and an
 * inbox for every comma moved. These render the same functions the server
 * runs, with made-up but realistic content, straight to disk.
 *
 *   node --experimental-strip-types scripts/email-previews.mjs
 *
 * Two versions of each: one with a cover photo and one without, because the
 * layout has to be right either way and "without" is the one nobody checks.
 *
 * The plain-text part is written too. A message with no text part is scored
 * as spam by most filters, so it is not decoration.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  renderHtml, renderText, subjectFor,
} from '../supabase/functions/_shared/eventEmail.ts';

const OUT = 'email-previews';
mkdirSync(OUT, { recursive: true });

/** A real-shaped event. The photo is a public https URL, as the real one must be. */
const event = {
  id: 'user_1794420965664',
  title: 'Women’s Conference 2026',
  whenText: 'Saturday, 14 March 2026, 9:00 AM to 4:00 PM (EST)',
  venueName: 'Grace Community Church',
  venueAddress: '128 Faith Street, Glen Cove, NY 11542',
  organizer: 'Grace Community Church',
  photoUrl: 'https://fourcircle.app/img/example-event.jpg',
  isPaid: true,
};

const ticket = { orderId: 'FC-8KQ2-4N7P', quantity: 2 };
const refund = { ...ticket, amount: '$48.00' };

const changes = [
  { field: 'date', old: 'Saturday, 14 March 2026', new: 'Saturday, 21 March 2026' },
  { field: 'time', old: '9:00 AM', new: '10:00 AM' },
  { field: 'venue_name', old: 'Grace Community Church', new: 'Glen Cove Community Hall' },
];

// The changed email shows the details AFTER the change, which is what the
// server sends: it reads the event row once the edit has landed. A preview
// showing the old date under a list saying the date moved would be a lie
// about the email.
const movedEvent = {
  ...event,
  whenText: 'Saturday, 21 March 2026, 10:00 AM to 4:00 PM (EST)',
  venueName: 'Glen Cove Community Hall',
};

const cases = [
  ['registered', event, ticket, []],
  ['changed', movedEvent, ticket, changes],
  ['cancelled', event, ticket, []],
  ['refunded', event, refund, []],
];

const index = [];

for (const [kind, ev, tk, ch] of cases) {
  for (const withPhoto of [true, false]) {
    const e = withPhoto ? ev : { ...ev, photoUrl: null };
    const name = `${kind}${withPhoto ? '' : '-no-photo'}`;
    writeFileSync(join(OUT, `${name}.html`), renderHtml(kind, e, tk, ch));
    writeFileSync(join(OUT, `${name}.txt`),
      `Subject: ${subjectFor(kind, e.title)}\n\n${renderText(kind, e, tk, ch)}\n`);
    index.push({ name, kind, withPhoto, subject: subjectFor(kind, e.title) });
  }
}

// One page that links to the rest, so there is a single file to open.
writeFileSync(join(OUT, 'index.html'), `<!doctype html><html><head><meta charset="utf-8">
<title>FourCircle event emails</title>
<style>
 body{font:15px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;margin:40px auto;max-width:640px;color:#1a1a2e}
 h1{font-family:Georgia,serif;font-weight:400}
 li{margin:10px 0} code{color:#6b6b76}
</style></head><body>
<h1>FourCircle event emails</h1>
<p>Rendered from the same code the server sends. Open each one to check it.</p>
<ul>
${index.map(i => `  <li><a href="${i.name}.html">${i.subject}</a>${i.withPhoto ? '' : ' <code>(no cover photo)</code>'} &middot; <a href="${i.name}.txt">text</a></li>`).join('\n')}
</ul>
</body></html>`);

console.log(`  ${index.length * 2} files written to ${OUT}/`);
console.log(`  open ${OUT}/index.html`);
