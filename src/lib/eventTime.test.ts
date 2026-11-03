/**
 * The end instant, rebuilt from typed text.
 *
 * edit-event has two free-text boxes where create-event has pickers, so this
 * is the only route back to a real instant after an edit. It feeds the
 * three-business-day payout hold, which is why a wrong answer matters more
 * than no answer: null means "keep what is stored".
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  endsAtFromText, hasEnded, eventEndsAt,
  startsAtFromText, registrationClosesAt, registrationClosed,
} from './eventTime.ts';

const local = (iso: string | null) => (iso === null ? null : new Date(iso).toString());

test('it reads what create-event writes', () => {
  // formatDate() -> "Sun, Nov 8, 2026", displayTime() -> "6:00 PM - 8:00 PM".
  const got = endsAtFromText('Sun, Nov 8, 2026', '6:00 PM - 8:00 PM');
  assert.ok(got, 'did not parse the app’s own format');
  const d = new Date(got!);
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 10);          // November
  assert.equal(d.getDate(), 8);
  assert.equal(d.getHours(), 20);          // the END of the range, not the start
  assert.equal(d.getMinutes(), 0);
});

test('an en dash works as well as a hyphen', () => {
  assert.equal(
    local(endsAtFromText('Sun, Nov 8, 2026', '6:00 PM – 8:00 PM')),
    local(endsAtFromText('Sun, Nov 8, 2026', '6:00 PM - 8:00 PM')),
  );
});

test('a single time is the end, not the start of a range', () => {
  const d = new Date(endsAtFromText('Nov 8, 2026', '7:00 PM')!);
  assert.equal(d.getHours(), 19);
});

test('no time means the end of that day, never midnight at the start of it', () => {
  const d = new Date(endsAtFromText('Jan 15, 2026', '')!);
  assert.equal(d.getDate(), 15);
  assert.equal(d.getHours(), 23);
  assert.equal(d.getMinutes(), 59);
});

test('the placeholder format a person is shown parses', () => {
  // edit-event's placeholders: "e.g. Jan 15, 2026" and "e.g. 3:00 PM".
  const d = new Date(endsAtFromText('Jan 15, 2026', '3:00 PM')!);
  assert.equal(d.getDate(), 15);
  assert.equal(d.getHours(), 15);
});

test('nonsense returns null so the stored instant is kept', () => {
  for (const [day, clock] of [['', '6:00 PM'], ['next Tuesday-ish', '6:00 PM'],
                              ['   ', ''], ['not a date', 'not a time']]) {
    assert.equal(endsAtFromText(day, clock), null, `${day} / ${clock}`);
  }
});

test('an unparseable time still gives the right day', () => {
  const d = new Date(endsAtFromText('Nov 8, 2026', 'doors at sevenish')!);
  assert.equal(d.getDate(), 8);
  assert.equal(d.getHours(), 23);
});

test('an event is over only once its end has passed', () => {
  const past = { endsAt: new Date('2020-01-01T12:00:00Z').toISOString() };
  const soon = { endsAt: new Date(Date.now() + 3_600_000).toISOString() };
  assert.equal(hasEnded(past), true);
  assert.equal(hasEnded(soon), false);
});

test('an event nobody can date is never treated as over', () => {
  // Events made before ends_at existed. Hiding them would take real events
  // off the list, which is worse than leaving an old one on it.
  assert.equal(hasEnded({ endsAt: undefined }), false);
  assert.equal(hasEnded({ endsAt: '' }), false);
  assert.equal(hasEnded({ endsAt: 'not a timestamp' }), false);
  assert.equal(eventEndsAt({ endsAt: 'not a timestamp' }), null);
});

// ── When registration closes ──────────────────────────────────────────────

const at = (iso: string) => Date.parse(iso);
const EVENING = {
  startsAt: '2026-11-08T23:00:00Z',   // 6pm ET
  endsAt:   '2026-11-09T01:00:00Z',   // 8pm ET
};

test('a paid event closes at its start', () => {
  const e = { ...EVENING, isPaid: true };
  assert.equal(registrationClosesAt(e), at(EVENING.startsAt));
  // Ten minutes in: shut.
  assert.equal(registrationClosed(e, at('2026-11-08T23:10:00Z')), true);
  // Ten minutes before: open.
  assert.equal(registrationClosed(e, at('2026-11-08T22:50:00Z')), false);
});

test('a free event stays open until it ends', () => {
  const e = { ...EVENING, isPaid: false };
  assert.equal(registrationClosesAt(e), at(EVENING.endsAt));
  // Ten past six, somebody walks in. Still open.
  assert.equal(registrationClosed(e, at('2026-11-08T23:10:00Z')), false);
  // After eight, done.
  assert.equal(registrationClosed(e, at('2026-11-09T01:30:00Z')), true);
});

test("the organiser's own cutoff beats both defaults", () => {
  const cutoff = '2026-11-08T20:00:00Z';   // 3pm ET, doors at six
  for (const isPaid of [true, false]) {
    const e = { ...EVENING, isPaid, registrationClosesAt: cutoff };
    assert.equal(registrationClosesAt(e), at(cutoff), `isPaid ${isPaid}`);
    assert.equal(registrationClosed(e, at('2026-11-08T21:00:00Z')), true);
    assert.equal(registrationClosed(e, at('2026-11-08T19:00:00Z')), false);
  }
});

test('an event nobody can time is never closed', () => {
  // Events made before these columns existed. Refusing a real registration
  // because nothing was recorded is worse than taking a late one.
  assert.equal(registrationClosesAt({ isPaid: true }), null);
  assert.equal(registrationClosed({ isPaid: true }), false);
  assert.equal(registrationClosed({ isPaid: false, endsAt: 'nonsense' }), false);
  // A paid event with no start falls through to nothing, not to its end.
  assert.equal(registrationClosesAt({ isPaid: true, endsAt: EVENING.endsAt }), null);
});

test('a start is parsed from the beginning of a range, not the end', () => {
  const d = new Date(startsAtFromText('Sun, Nov 8, 2026', '6:00 PM - 8:00 PM')!);
  assert.equal(d.getHours(), 18);
  assert.equal(d.getDate(), 8);
});

test('a start with no time is the beginning of its day, not the close', () => {
  const d = new Date(startsAtFromText('Nov 8, 2026', '')!);
  assert.equal(d.getHours(), 0);
  assert.equal(d.getMinutes(), 0);
});
