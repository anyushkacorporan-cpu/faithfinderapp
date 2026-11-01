/**
 * When an event is over.
 *
 * Its own file because it is pure -- no store, no network, no React -- which
 * is what lets it be tested. eventsStore reaches for AsyncStorage and the
 * events API the moment it is imported, and node's test runner cannot load
 * that; the three-business-day payout hold reads from here, so being able to
 * check it matters more than keeping it beside the store.
 */
/**
 * Build an end instant from the text an organiser typed.
 *
 * create-event has date and time pickers and produces a real Date; edit-event
 * has two free-text boxes, so this is the only way back to an instant after
 * someone edits one. It reads what those screens write -- "Sun, Nov 8, 2026"
 * and "6:00 PM - 8:00 PM" -- and takes the END of a time range, since that is
 * what ends_at means.
 *
 * Returns null when the text does not parse, and callers must keep the stored
 * value in that case. Overwriting a good timestamp with a guess is worse than
 * leaving it: ends_at starts the payout clock.
 */
export function startsAtFromText(dateText: string, timeText: string): string | null {
  return instantFromText(dateText, timeText, 'start');
}

export function endsAtFromText(dateText: string, timeText: string): string | null {
  return instantFromText(dateText, timeText, 'end');
}

function instantFromText(dateText: string, timeText: string, which: 'start' | 'end'): string | null {
  const day = (dateText || '').trim();
  if (!day) return null;

  // "6:00 PM - 8:00 PM" and "6:00 PM – 8:00 PM" both mean the same thing, and
  // the app writes the en dash while a person typing writes the hyphen.
  const parts = (timeText || '').split(/\s*[-\u2013\u2014]\s*/);
  const clock = (which === 'start' ? parts[0] : parts[parts.length - 1])?.trim() || '';

  const at = new Date(`${day} ${clock}`.trim());
  if (!Number.isNaN(at.getTime())) {
    // A date with no usable time lands at midnight, which would end the event
    // before it started. An event with no end runs to the close of its day.
    if (!clock) setDefaultHour(at, which);
    return at.toISOString();
  }

  const dayOnly = new Date(day);
  if (Number.isNaN(dayOnly.getTime())) return null;
  setDefaultHour(dayOnly, which);
  return dayOnly.toISOString();
}

/** No usable time: a start is the beginning of its day, an end the close. */
function setDefaultHour(d: Date, which: 'start' | 'end') {
  if (which === 'start') d.setHours(0, 0, 0, 0);
  else d.setHours(23, 59, 0, 0);
}

/**
 * When registration stops.
 *
 * Paid closes at the start: somebody buying a $30 ticket at 7:30 for a six-to-
 * eight concert has paid full price for half an hour, and FourCircle is the
 * merchant of record when they dispute it. Free stays open to the end, because
 * walking in is the point — a worship night at six and somebody arrives at ten
 * past is not an edge case, and they are standing in the room.
 *
 * An organiser's own cutoff beats both.
 *
 * Null when the instant it needs was never recorded, which reads as "not
 * closed": refusing a real registration because nothing was written down is
 * worse than taking a late one.
 */
export function registrationClosesAt(
  e: { endsAt?: string | null; startsAt?: string | null;
       registrationClosesAt?: string | null; isPaid?: boolean },
): number | null {
  const own = parseInstant(e.registrationClosesAt);
  if (own !== null) return own;
  return e.isPaid ? parseInstant(e.startsAt) : parseInstant(e.endsAt);
}

export function registrationClosed(
  e: Parameters<typeof registrationClosesAt>[0],
  now: number = Date.now(),
): boolean {
  const closes = registrationClosesAt(e);
  return closes !== null && closes < now;
}

function parseInstant(v?: string | null): number | null {
  if (!v) return null;
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : t;
}

export function eventEndsAt(e: { endsAt?: string | null }): number | null {
  if (!e.endsAt) return null;
  const t = Date.parse(e.endsAt);
  return Number.isNaN(t) ? null : t;
}

/**
 * Whether the event is over.
 *
 * `status` has had a 'past' value since the first schema and NOTHING has ever
 * written it — not the app, not the server, not a migration. So the Past tab
 * was always empty and no event ever left the list; a date in November was
 * still being offered in January. It is worked out from the clock now instead
 * of waiting for something to come along and set a column.
 *
 * An event we cannot date is never treated as over. Hiding something because
 * its end time was never recorded would take real events off the list, which
 * is worse than leaving an old one on it.
 */
export function hasEnded(e: { endsAt?: string | null }, now: number = Date.now()): boolean {
  const end = eventEndsAt(e);
  return end !== null && end < now;
}
