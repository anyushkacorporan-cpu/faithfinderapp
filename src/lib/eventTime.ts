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
export function endsAtFromText(dateText: string, timeText: string): string | null {
  const day = (dateText || '').trim();
  if (!day) return null;

  // "6:00 PM - 8:00 PM" and "6:00 PM – 8:00 PM" both mean the same thing, and
  // the app writes the en dash while a person typing writes the hyphen.
  const clock = (timeText || '').split(/\s*[-\u2013\u2014]\s*/).pop()?.trim() || '';

  const at = new Date(`${day} ${clock}`.trim());
  if (!Number.isNaN(at.getTime())) {
    // A date with no usable time lands at midnight, which would end the event
    // before it started. An event with no end runs to the close of its day.
    if (!clock) at.setHours(23, 59, 0, 0);
    return at.toISOString();
  }

  const dayOnly = new Date(day);
  if (Number.isNaN(dayOnly.getTime())) return null;
  dayOnly.setHours(23, 59, 0, 0);
  return dayOnly.toISOString();
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
