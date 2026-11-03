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
  tabForEvent, hasStarted,
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

// ── The My Events tabs: the ten cases, one per test ───────────────────────
// Against the real tabForEvent, at fixed instants, so "today" and "next week"
// mean the same thing every time this runs.

// A Thursday. Events below are built around it in New York time.
const NOW = Date.parse('2026-11-05T19:00:00-05:00');   // Thu 5 Nov, 7:00 PM ET
const ny = (iso: string) => new Date(iso).toISOString();

const published = (startsAt: string, endsAt: string) =>
  ({ status: 'upcoming', startsAt: ny(startsAt), endsAt: ny(endsAt) });

test('1. a published event next week is Upcoming', () => {
  const e = published('2026-11-12T18:00:00-05:00', '2026-11-12T20:00:00-05:00');
  assert.equal(tabForEvent(e, NOW), 'Upcoming');
});

test('2. a published event today is Active before, at and after its start', () => {
  const e = published('2026-11-05T18:00:00-05:00', '2026-11-05T22:00:00-05:00');
  // Before it starts it is still to come.
  assert.equal(tabForEvent(e, Date.parse('2026-11-05T17:00:00-05:00')), 'Upcoming');
  // On the hour, and an hour in: Active, not Past.
  assert.equal(tabForEvent(e, Date.parse('2026-11-05T18:00:00-05:00')), 'Active');
  assert.equal(tabForEvent(e, NOW), 'Active');
});

test('3. a published event today whose end time has passed is Past', () => {
  const e = published('2026-11-05T14:00:00-05:00', '2026-11-05T16:00:00-05:00');
  assert.equal(tabForEvent(e, NOW), 'Past');
});

test('4. no end time: Active until the end of the day, Past the next', () => {
  // create-event writes 23:59 of the day when no end time is given.
  const e = published('2026-11-05T18:00:00-05:00', '2026-11-05T23:59:00-05:00');
  assert.equal(tabForEvent(e, Date.parse('2026-11-05T23:50:00-05:00')), 'Active');
  assert.equal(tabForEvent(e, Date.parse('2026-11-06T00:30:00-05:00')), 'Past');
});

test('5. a published event dated yesterday is Past', () => {
  const e = published('2026-11-04T18:00:00-05:00', '2026-11-04T23:59:00-05:00');
  assert.equal(tabForEvent(e, NOW), 'Past');
});

test('6. a draft is only ever in Drafts, future or past', () => {
  const future = { status: 'draft', startsAt: ny('2026-12-01T18:00:00-05:00'),
                   endsAt: ny('2026-12-01T20:00:00-05:00') };
  const past   = { status: 'draft', startsAt: ny('2026-10-01T18:00:00-05:00'),
                   endsAt: ny('2026-10-01T20:00:00-05:00') };
  assert.equal(tabForEvent(future, NOW), 'Drafts');
  // This is the one that was in two tabs at once: Past and Drafts.
  assert.equal(tabForEvent(past, NOW), 'Drafts');
});

test('7. a multi-day event mid-run is Active', () => {
  const e = published('2026-11-03T09:00:00-05:00', '2026-11-08T17:00:00-05:00');
  assert.equal(tabForEvent(e, NOW), 'Active');
  // And on its last day, before the end.
  assert.equal(tabForEvent(e, Date.parse('2026-11-08T12:00:00-05:00')), 'Active');
});

test('8. publishing a draft moves it to Upcoming, or Active if it has begun', () => {
  const dates = { startsAt: ny('2026-11-12T18:00:00-05:00'),
                  endsAt: ny('2026-11-12T20:00:00-05:00') };
  assert.equal(tabForEvent({ status: 'draft', ...dates }, NOW), 'Drafts');
  assert.equal(tabForEvent({ status: 'upcoming', ...dates }, NOW), 'Upcoming');

  const running = { startsAt: ny('2026-11-05T18:00:00-05:00'),
                    endsAt: ny('2026-11-05T22:00:00-05:00') };
  assert.equal(tabForEvent({ status: 'upcoming', ...running }, NOW), 'Active');
});

test('10. every event lands in exactly one tab, and never none', () => {
  // Case 9 is a deletion, which removes the row and is not this function's
  // to answer. This is the invariant the whole thing exists for.
  const samples = [
    published('2026-11-12T18:00:00-05:00', '2026-11-12T20:00:00-05:00'),
    published('2026-11-05T18:00:00-05:00', '2026-11-05T22:00:00-05:00'),
    published('2026-11-04T18:00:00-05:00', '2026-11-04T23:59:00-05:00'),
    { status: 'draft', startsAt: ny('2026-10-01T18:00:00-05:00'), endsAt: ny('2026-10-01T20:00:00-05:00') },
    { status: 'upcoming', lifecycle: 'cancelled', startsAt: ny('2026-11-12T18:00:00-05:00'), endsAt: ny('2026-11-12T20:00:00-05:00') },
    { status: 'upcoming' },                                   // no dates at all
    { status: 'upcoming', startsAt: null, endsAt: 'nonsense' },
  ];
  const tabs = ['Upcoming', 'Active', 'Past', 'Drafts'];
  for (const e of samples) {
    const landed = tabs.filter(tab => tabForEvent(e as never, NOW) === tab);
    assert.equal(landed.length, 1, `${JSON.stringify(e)} landed in ${landed.length} tabs`);
  }
});

test('a cancelled event is not Upcoming', () => {
  // It was. The app told you an event was going ahead after it was called off.
  const e = { status: 'upcoming', lifecycle: 'cancelled',
              startsAt: ny('2026-11-12T18:00:00-05:00'),
              endsAt: ny('2026-11-12T20:00:00-05:00') };
  assert.equal(tabForEvent(e, NOW), 'Past');
});

test('an event with no dates stays visible rather than disappearing', () => {
  assert.equal(tabForEvent({ status: 'upcoming' }, NOW), 'Upcoming');
  assert.equal(hasStarted({ startsAt: undefined }, NOW), false);
});
