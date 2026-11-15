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
