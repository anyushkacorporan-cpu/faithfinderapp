/**
 * What a ticket costs, and who pays for what.
 *
 * One file, because the same three numbers are needed in four places — the
 * organiser's preview while creating an event, the buyer's order summary at
 * checkout, the amount actually charged, and the earnings screen — and four
 * copies of a fee calculation is four chances for the app to promise one
 * number and charge another. (It already did: checkout showed the buyer a
 * total with the platform fee added, and the server charged the base price
 * without it.)
 *
 * THE MODEL
 *
 * The organiser sets a price and receives exactly that. Both fees are added on
 * top at checkout and paid by the buyer, which is how Eventbrite and everyone
 * else does it, and it means the organiser never has to do arithmetic to work
 * out what a $10 ticket earns them. It earns them $10.
 *
 * Two fees, shown separately, because a fee a buyer cannot account for is a
 * fee they dispute:
 *
 *   Platform fee    ours, 5% capped at $5 a ticket
 *   Processing      Stripe's, 2.9% + 30c per order, passed through at cost
 *
 * WHY THE CAP
 *
 * Without it, a straight percentage eventually overtakes Eventbrite. Their
 * service fee is 3.7% plus a flat $1.79, and a flat component gets cheaper as
 * a share of the ticket the more expensive the ticket is — their effective
 * rate falls toward 3.7% while ours would stay at 5%. The lines cross around
 * $107. The cap means they never cross: this stays cheaper at every price,
 * with no asterisk.
 *
 * WHY NOTHING IS CHARGED ON A FREE TICKET
 *
 * No card is charged, so there is no processing cost to recover, and a fee on
 * a free event would be a fee on the majority of what this app is for.
 */

/** Ours. */
export const PLATFORM_RATE = 0.05;
/** Per ticket, so that an expensive ticket does not become the expensive option. */
export const PLATFORM_CAP = 5;

/**
 * Stripe's published US card rate. Passed through at cost rather than marked
 * up — it is not a source of margin, it is the floor everyone in this business
 * pays, Eventbrite included.
 *
 * Keep in step with the same constants in supabase/functions/payments/index.ts,
 * which is what actually charges the card. This file is what the app promises;
 * that file is what happens.
 */
export const STRIPE_RATE = 0.029;
export const STRIPE_FLAT = 0.30;

/** Cents, rounded up. See `total` below for why up rather than to nearest. */
function upToCents(n: number): number {
  return Math.ceil(n * 100 - 1e-9) / 100;
}

function toCents(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Our cut of one ticket at this price. Zero for a free ticket. */
export function platformFeePerTicket(price: number): number {
  if (!(price > 0)) return 0;
  return toCents(Math.min(price * PLATFORM_RATE, PLATFORM_CAP));
}

export type Breakdown = {
  /** What the organiser set, times how many. What they will be paid. */
  subtotal: number;
  /** Ours. */
  platformFee: number;
  /** Stripe's, recovered from the buyer. */
  processingFee: number;
  /** What the card is charged. */
  total: number;
  /** True when nothing is charged at all. */
  free: boolean;
};

/**
 * The whole order, from the price the organiser set.
 *
 * The processing fee is solved for rather than added, because Stripe takes its
 * percentage of the final total — including the part that is there to cover
 * Stripe. Adding 2.9% of the subtotal would leave the platform a few cents
 * short on every sale, which is the same mistake in a smaller font.
 *
 *   total = (subtotal + platformFee + 0.30) / (1 - 0.029)
 *
 * Rounded up to the cent: Stripe rounds its own fee its own way, and a
 * half-cent in the platform's favour is invisible to the buyer, while a
 * half-cent the other way is a shortfall on every single ticket.
 */
export function priceBreakdown(price: number, quantity: number): Breakdown {
  const qty = Math.max(1, Math.floor(quantity) || 1);

  if (!(price > 0)) {
    return { subtotal: 0, platformFee: 0, processingFee: 0, total: 0, free: true };
  }

  const subtotal = toCents(price * qty);
  const platformFee = toCents(platformFeePerTicket(price) * qty);

  // Per order, not per ticket: Stripe's 30c is charged once per card payment,
  // however many tickets that payment covers.
  const beforeProcessing = subtotal + platformFee;
  const total = upToCents((beforeProcessing + STRIPE_FLAT) / (1 - STRIPE_RATE));
  const processingFee = toCents(total - beforeProcessing);

  return { subtotal, platformFee, processingFee, total, free: false };
}

/** What the organiser is paid for one ticket: exactly what they asked for. */
export function organizerPayoutPerTicket(price: number): number {
  return price > 0 ? toCents(price) : 0;
}
