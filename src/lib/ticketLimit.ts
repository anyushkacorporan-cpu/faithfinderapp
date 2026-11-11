/**
 * How many tickets one person may hold for one event.
 *
 * The rule is six, counted across every order they have placed for that event
 * rather than per order — four this morning and three tonight is seven, and
 * seven is refused.
 *
 * This file is the screen's half of the rule. The half that enforces it is
 * supabase/46_tickets_per_user.sql, a trigger on the tickets table, because
 * the anon key ships inside the app and the table can be written to without
 * going near the checkout screen. What is here stops somebody picking a number
 * they cannot have; what is there stops them having it.
 *
 * No imports on purpose, so the rule can be tested without a React Native
 * runtime.
 */

/** Six, per person, per event, across all of their orders. */
export const MAX_TICKETS_PER_EVENT = 6;

/**
 * Does a ticket in this state still occupy part of the buyer's allowance?
 *
 * 'paid' is a seat they hold and 'pending' is a checkout in flight, which
 * counts or three open tabs buy eighteen. 'refunded' and 'failed' do not:
 * the seat went back to the event, so the allowance goes back to the person.
 *
 * An absent status is treated as held. Tickets written before the column
 * existed are real tickets, and guessing "not held" would hand out extras.
 */
export function holdsASeat(status: string | null | undefined): boolean {
  if (status === null || status === undefined || status === '') return true;
  return status === 'paid' || status === 'pending';
}

/** Seats this person already holds for one event, across every order. */
export function heldForEvent(
  tickets: { eventId: string; quantity: number; status?: string }[],
  eventId: string,
): number {
  return tickets
    .filter(t => t.eventId === eventId && holdsASeat(t.status))
    .reduce((sum, t) => sum + (Number(t.quantity) || 0), 0);
}

/**
 * The largest number the quantity picker may offer.
 *
 * Two ceilings, and the lower one wins: what is left of this person's six, and
 * what is left of the event. `seatsLeft` is null for an uncapped event — null
 * and zero mean opposite things there, so it cannot be treated as falsy.
 *
 * Can return 0, which is not a quantity anyone can buy: it means they are at
 * their limit, or the event is sold out. The caller decides which sentence
 * that deserves.
 */
export function maxAddable(held: number, seatsLeft: number | null): number {
  const mine = Math.max(0, MAX_TICKETS_PER_EVENT - Math.max(0, held));
  if (seatsLeft === null) return mine;
  return Math.max(0, Math.min(mine, seatsLeft));
}

/** Why the picker will not go higher, or null when it is not at a ceiling. */
export function limitReason(
  held: number,
  seatsLeft: number | null,
): 'atPersonalLimit' | 'soldOut' | 'fewSeatsLeft' | null {
  const mine = Math.max(0, MAX_TICKETS_PER_EVENT - Math.max(0, held));
  if (seatsLeft !== null && seatsLeft <= 0) return 'soldOut';
  if (mine <= 0) return 'atPersonalLimit';
  // Only when the event is the binding constraint, not the person: being told
  // "only 2 left" when you could have had 6 is information; being told it
  // when your own six is what stopped you is a lie about the reason.
  if (seatsLeft !== null && seatsLeft < mine) return 'fewSeatsLeft';
  return null;
}
