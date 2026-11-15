import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  renderHtml, renderText, subjectFor, esc,
} from './functions/_shared/eventEmail.ts';

const here = dirname(fileURLToPath(import.meta.url));

const event = {
  id: 'ev_1',
  title: 'Women’s Conference',
  whenText: 'Saturday, 14 March 2026, 9:00 AM (EST)',
  venueName: 'Grace Community Church',
  venueAddress: '128 Faith Street, Glen Cove, NY',
  organizer: 'Grace Community Church',
  photoUrl: 'https://fourcircle.app/img/x.jpg',
  isPaid: true,
};
const ticket = { orderId: 'FC-8KQ2', quantity: 2 };

// ── The copy a deployed function has to match ─────────────────────────────

/**
 * The dashboard editor cannot reach outside a function's own folder, and the
 * Supabase CLI will not run on the machine this is deployed from, so each
 * function carries its own copy of the template instead of importing a
 * shared one. Copies drift. This is what stops them.
 */
test('both deployed copies are identical to the canonical template', () => {
  const canonical = readFileSync(join(here, 'functions/_shared/eventEmail.ts'), 'utf8');
  for (const fn of ['event-notify', 'payments']) {
    const copy = readFileSync(join(here, 'functions', fn, 'eventEmail.ts'), 'utf8');
    assert.equal(copy, canonical,
      `${fn}/eventEmail.ts has drifted from _shared/eventEmail.ts — copy it across`);
  }
});

// ── event-notify actually uses it ─────────────────────────────────────────

const notify = () => readFileSync(join(here, 'functions/event-notify/index.ts'), 'utf8');

test('event-notify sends the shared layout, not its own inline one', () => {
  const fn = notify();
  assert.match(fn, /from '\.\/eventEmail\.ts'/);
  assert.match(fn, /renderHtml\(kind, facts, ticket, changes\)/);
  assert.doesNotMatch(fn, /function changedHtml/,
    'the old inline template is back');
  assert.doesNotMatch(fn, /function cancelledHtml/,
    'the old inline template is back');
});

test('it reads the columns the details block needs', () => {
  // The email used to say the event's name and nothing else because this
  // select only asked for three columns.
  const fn = notify();
  for (const col of ['venue_name', 'venue_address', 'organizer', 'banner_image', 'timezone', 'end_time']) {
    assert.ok(fn.includes(col), `events select is missing ${col}`);
  }
});

test('two orders from one person become one email, with both counted', () => {
  // The old code deduplicated addresses and threw the orders away. The email
  // now names a ticket count, so they are folded instead.
  const fn = notify();
  assert.match(fn, /perAddress\.set\(address, \{/);
  assert.match(fn, /quantity: \(seen\?\.quantity \?\? 0\) \+/);
});

test('the time range never uses a dash', () => {
  // A dash in an email reads as a typo or a hyphen depending on the client's
  // font, which is why whenText joins with the word.
  const fn = notify();
  assert.match(fn, /\$\{time\} to \$\{end\}/);
});

// ── The confirmation and the refund actually get sent ─────────────────────

const sql48 = () => readFileSync(join(here, '48_ticket_mail_queue.sql'), 'utf8');

test('a free registration queues a confirmation too', () => {
  // A free ticket is INSERTed already paid by the phone; a paid one is
  // inserted pending by the server and UPDATEd when the card clears. A
  // trigger that only watched one road would email half the people.
  const sql = sql48();
  assert.match(sql, /tg_op = 'INSERT' and new\.status = 'paid'/);
  assert.match(sql, /tg_op = 'UPDATE' and new\.status = 'paid' and old\.status is distinct from 'paid'/);
});

test('cancelling an event does not also send everyone a refund email', () => {
  // Cancelling refunds every ticket, so without this an attendee gets two
  // emails a second apart. The cancellation already says the money is
  // coming back, and it says why.
  assert.match(sql48(), /if ev\.lifecycle is distinct from 'cancelled' then/);
});

test('the refund email quotes the ticket price, not what was paid', () => {
  // total_paid includes the platform and processing fees. The email says
  // fees are not returned, so the number beside it must not include them.
  assert.match(sql48(), /round\(coalesce\(t\.price_per_ticket, 0\) \* coalesce\(t\.quantity, 1\), 2\)/);
  const fn = notify();
  assert.match(fn, /amount: kind === 'refunded' \? money\(row\.price_paid/);
});

test('event-notify flushes the ticket queue as well as the change log', () => {
  const fn = notify();
  assert.match(fn, /rpc\('pending_ticket_mail'/);
  assert.match(fn, /from\('ticket_mail_queue'\)/);
});

test('a queued row is claimed before it is sent', () => {
  // Same bargain as the change log: a function that dies halfway has already
  // told the next caller not to repeat it.
  const fn = notify();
  const claim = /update\(\{ sent_at: new Date\(\)\.toISOString\(\) \}\)\s*\.eq\('id', row\.id\)\.is\('sent_at', null\)/;
  assert.ok(claim.test(fn), 'the ticket queue claim is missing');
});

test('buying a ticket flushes the queue', () => {
  // The queue was only ever flushed when an organiser edited or cancelled an
  // event, so a confirmation would have sat there until that happened to
  // somebody else's event. Checked on the checkout screen, which is the one
  // place both the free and the paid path pass through.
  const checkout = readFileSync(
    join(here, '..', 'app', 'event-checkout.tsx'), 'utf8');
  assert.match(checkout, /function goToTicket[\s\S]{0,800}flushEventNotices/,
    'nothing nudges the server after a purchase');
});

test('a queued row with no address is claimed, not retried forever', () => {
  assert.match(notify(), /if \(!address\) \{/);
});

// ── Subjects ──────────────────────────────────────────────────────────────

test('every subject names the event', () => {
  for (const kind of ['registered', 'changed', 'cancelled', 'refunded'] as const) {
    assert.match(subjectFor(kind, 'Women’s Conference'), /Women’s Conference/);
  }
});

test('the subjects are the ones that were asked for', () => {
  assert.equal(subjectFor('registered', 'X'), "You're registered: X");
  assert.equal(subjectFor('changed', 'X'), 'Update: X has changed');
  assert.equal(subjectFor('cancelled', 'X'), 'Cancelled: X');
});

// ── The layout contract ───────────────────────────────────────────────────

test('600px, white, and a serif heading', () => {
  const html = renderHtml('registered', event, ticket);
  assert.match(html, /width="600"/);
  assert.match(html, /background:#ffffff/);
  assert.match(html, /font-family:Georgia/);
});

test('the cover photo is there, full width, with alt text', () => {
  const html = renderHtml('registered', event, ticket);
  assert.match(html, /<img src="https:\/\/fourcircle\.app\/img\/x\.jpg"/);
  // A typographic apostrophe is not an ASCII one, so esc() leaves it alone.
  // Checking for &#39; here was a wrong assumption in this test, not a bug.
  assert.match(html, /alt="Women\u2019s Conference"/);
  assert.match(html, /width:100%/);
});

test('no photo leaves no broken image behind', () => {
  const html = renderHtml('registered', { ...event, photoUrl: null }, ticket);
  assert.doesNotMatch(html, /<img/);
});

test('an app-only path is not used as a photo', () => {
  // A relative path or a file:// URL renders as a broken image icon, which
  // is worse than no photo.
  for (const bad of ['/img/x.jpg', 'file:///x.jpg', 'http://x/y.jpg', 'x.jpg']) {
    assert.doesNotMatch(renderHtml('registered', { ...event, photoUrl: bad }, ticket), /<img/,
      `${bad} was used as a cover photo`);
  }
});

test('the details block carries what somebody needs at a door', () => {
  const html = renderHtml('registered', event, ticket);
  for (const want of [
    'Saturday, 14 March 2026, 9:00 AM (EST)',
    'Grace Community Church',
    '128 Faith Street, Glen Cove, NY',
    '2 tickets',
    'FC-8KQ2',
  ]) {
    assert.ok(html.includes(esc(want)), `details block is missing ${want}`);
  }
});

test('one ticket is not called tickets', () => {
  assert.match(renderHtml('registered', event, { quantity: 1 }), /1 ticket</);
});

test('there is a button and a footer', () => {
  const html = renderHtml('cancelled', event, ticket);
  assert.match(html, /View event in FourCircle/);
  assert.match(html, /support@fourcircle\.app/);
});

// ── What each email says ──────────────────────────────────────────────────

test('a cancelled paid event promises everything back, fees included', () => {
  // Checked on the text part, so an apostrophe escaped into &#39; in the HTML
  // cannot fail a test that is really about the promise being made.
  const text = renderText('cancelled', event, ticket);
  assert.match(text, /This event has been cancelled/);
  assert.match(text, /fees included/);
  assert.match(text, /5 to 10 business days/);
});

test('a cancelled free event does not promise a refund', () => {
  const html = renderHtml('cancelled', { ...event, isPaid: false }, ticket);
  assert.match(html, /This event has been cancelled/);
  assert.doesNotMatch(html, /refunded to/);
  assert.match(html, /nothing to refund/);
});

test('an approved refund says the fees are not coming back', () => {
  // The opposite of a cancellation, and the difference is the whole point:
  // cancelled gives everything back, an approved refund keeps the fees.
  const text = renderText('refunded', event, { ...ticket, amount: '$48.00' });
  assert.match(text, /Service fees/);
  assert.doesNotMatch(text, /fees included/);
  assert.match(renderHtml('refunded', event, { ...ticket, amount: '$48.00' }), /\$48\.00/);
});

test('only the fields that changed are listed', () => {
  const html = renderHtml('changed', event, ticket, [
    { field: 'time', old: '9:00 AM', new: '10:00 AM' },
  ]);
  assert.match(html, /9:00 AM/);
  assert.match(html, /10:00 AM/);
  assert.doesNotMatch(html, /Location/);
});

// ── Both parts, every time ────────────────────────────────────────────────

test('there is a plain text version of each', () => {
  for (const kind of ['registered', 'changed', 'cancelled', 'refunded'] as const) {
    const text = renderText(kind, event, ticket);
    assert.ok(text.length > 40, `${kind} has no text part`);
    assert.doesNotMatch(text, /</, `${kind} text part contains markup`);
    assert.match(text, /support@fourcircle\.app/);
  }
});

test('a name with a quote in it cannot break out of an attribute', () => {
  const html = renderHtml('registered', { ...event, title: '"><script>x</script>' }, ticket);
  assert.doesNotMatch(html, /<script>/);
});
