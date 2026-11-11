import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_TICKETS_PER_EVENT, holdsASeat, heldForEvent, maxAddable, limitReason,
} from './ticketLimit.ts';

const t = (eventId: string, quantity: number, status?: string) =>
  ({ eventId, quantity, status });

test('the limit is six', () => {
  assert.equal(MAX_TICKETS_PER_EVENT, 6);
});

// ── Which tickets use up the allowance ────────────────────────────────────

test('paid and pending hold a seat; refunded and failed do not', () => {
  assert.equal(holdsASeat('paid'), true);
  assert.equal(holdsASeat('pending'), true);
  assert.equal(holdsASeat('refunded'), false);
  assert.equal(holdsASeat('failed'), false);
});

test('a ticket with no status is treated as held', () => {
  // Rows written before the column existed are real tickets. Guessing the
  // other way hands out extras.
  assert.equal(holdsASeat(undefined), true);
  assert.equal(holdsASeat(null), true);
  assert.equal(holdsASeat(''), true);
});

// ── Counting across orders, which is the whole point ──────────────────────

test('seats are summed across every order for that event', () => {
  const tickets = [t('e1', 4), t('e1', 2), t('e2', 5)];
  assert.equal(heldForEvent(tickets, 'e1'), 6);
});

test('another event does not use up this one allowance', () => {
  assert.equal(heldForEvent([t('e2', 6)], 'e1'), 0);
});

test('a refunded order gives the allowance back', () => {
  const tickets = [t('e1', 4, 'paid'), t('e1', 2, 'refunded')];
  assert.equal(heldForEvent(tickets, 'e1'), 4);
  assert.equal(maxAddable(heldForEvent(tickets, 'e1'), null), 2);
});

// ── The number the picker may offer ───────────────────────────────────────

test('a new buyer on an uncapped event may take six', () => {
  assert.equal(maxAddable(0, null), 6);
});

test('four held leaves two', () => {
  assert.equal(maxAddable(4, null), 2);
});

test('six held leaves none', () => {
  assert.equal(maxAddable(6, null), 0);
});

test('somehow over the limit still leaves none, never a negative', () => {
  assert.equal(maxAddable(9, null), 0);
});

test('the event ceiling wins when it is the lower one', () => {
  // Capacity 3, nothing held: three, not six.
  assert.equal(maxAddable(0, 3), 3);
});

test('the personal ceiling wins when it is the lower one', () => {
  // Four held, ten seats free: two, not ten.
  assert.equal(maxAddable(4, 10), 2);
});

test('sold out leaves none however much allowance is unused', () => {
  assert.equal(maxAddable(0, 0), 0);
});

test('null seatsLeft is uncapped, not sold out', () => {
  // The two are opposite meanings and a falsy test confuses them.
  assert.notEqual(maxAddable(0, null), maxAddable(0, 0));
});

// ── What the screen says about it ─────────────────────────────────────────

test('nothing is said while neither ceiling is close', () => {
  assert.equal(limitReason(0, null), null);
  assert.equal(limitReason(0, 40), null);
});

test('at six, the reason is the person, not the event', () => {
  assert.equal(limitReason(6, 100), 'atPersonalLimit');
});

test('sold out is reported as sold out even at the personal limit', () => {
  assert.equal(limitReason(6, 0), 'soldOut');
});

test('few seats left is only said when the event is what stopped them', () => {
  // Two seats left and six allowance: the event is the constraint.
  assert.equal(limitReason(0, 2), 'fewSeatsLeft');
  // Two seats left and two allowance: both land on 2, and the person is not
  // owed a sentence about the event.
  assert.equal(limitReason(4, 2), null);
});
