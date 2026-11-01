/**
 * The money math, pinned.
 *
 * Run with `npm test`. No framework, no dependencies: node's own test runner
 * reads the TypeScript directly.
 *
 * This file exists because every bug worth fixing in this project so far has
 * been in a pure function whose output quietly changed — a fee that moved, a
 * payout frozen under an old model, a date counted in the wrong timezone. None
 * of them would have been caught by a screen test. All of them would have been
 * caught here.
 *
 * The four rows in the comparison table are asserted as written, because that
 * table is a published claim about what a buyer pays. If the code and the
 * table ever disagree, one of them is lying to somebody.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PLATFORM_RATE, PLATFORM_FLAT, STRIPE_RATE, STRIPE_FLAT,
  platformFeePerTicket, priceBreakdown, organizerPayoutPerTicket,
} from './ticketPricing.ts';

test('the rates are the ones the terms and the comparison table claim', () => {
  // Changing any of these changes what every organiser is paid and what every
  // buyer is charged. If that is intended, update this test in the same commit
  // and the table in ticketPricing.ts with it.
  assert.equal(PLATFORM_RATE, 0.02);
  assert.equal(PLATFORM_FLAT, 0.80);
  assert.equal(STRIPE_RATE, 0.029);
  assert.equal(STRIPE_FLAT, 0.30);
});

test('platform fee is 2% of the ticket plus 80c', () => {
  assert.equal(platformFeePerTicket(10), 1.00);
  assert.equal(platformFeePerTicket(20), 1.20);
  assert.equal(platformFeePerTicket(100), 2.80);
});

test('nothing is charged on a free or nonsense price', () => {
  for (const p of [0, -5, NaN, Number.POSITIVE_INFINITY * 0]) {
    assert.equal(platformFeePerTicket(p), 0, `price ${p}`);
    const b = priceBreakdown(p, 1);
    assert.equal(b.free, true, `price ${p}`);
    assert.equal(b.total, 0);
    assert.equal(b.platformFee, 0);
    assert.equal(b.processingFee, 0);
    assert.equal(b.subtotal, 0);
  }
});

test('the published comparison table is what the code computes', () => {
  // ticket -> [what the buyer pays, what FourCircle keeps]
  const table: Record<number, [number, number]> = {
    5:   [6.39,   0.90],
    10:  [11.64,  1.00],
    25:  [27.40,  1.30],
    100: [106.18, 2.80],
  };
  for (const [priceStr, [buyerPays, weKeep]] of Object.entries(table)) {
    const b = priceBreakdown(Number(priceStr), 1);
    assert.equal(b.total, buyerPays, `$${priceStr} buyer pays`);
    assert.equal(b.platformFee, weKeep, `$${priceStr} we keep`);
  }
});

test('the total always covers Stripe, at every price', () => {
  // The invariant the solved-for formula exists to guarantee: after Stripe
  // takes 2.9% of the total plus 30c, what is left still covers the
  // organiser's subtotal and the platform fee in full. Adding 2.9% of the
  // subtotal instead would leave a shortfall on every sale.
  for (let cents = 100; cents <= 50000; cents += 7) {
    const price = cents / 100;
    const b = priceBreakdown(price, 1);
    const left = b.total - (b.total * STRIPE_RATE + STRIPE_FLAT);
    assert.ok(
      left >= b.subtotal + b.platformFee - 1e-9,
      `$${price}: short by ${(b.subtotal + b.platformFee - left).toFixed(4)}`,
    );
  }
});

test('every amount is a whole number of cents, and they sum to the total', () => {
  // Compared in integer cents on purpose. Adding the three parts as floats
  // gives 2.4699999999999998 where the total is 2.47 — the components are
  // right and the addition is what is lossy, so comparing the sums as floats
  // tests JavaScript rather than the pricing.
  const inCents = (n: number) => Math.round(n * 100);

  for (let cents = 100; cents <= 50000; cents += 13) {
    const price = cents / 100;
    const b = priceBreakdown(price, 1);

    for (const [name, v] of Object.entries(b)) {
      if (typeof v !== 'number') continue;
      assert.ok(Math.abs(v * 100 - inCents(v)) < 1e-6,
        `${name} is not a whole cent at $${price}: ${v}`);
    }

    assert.equal(
      inCents(b.total),
      inCents(b.subtotal) + inCents(b.platformFee) + inCents(b.processingFee),
      `the parts do not add up to the total at $${price}`,
    );
  }
});

test("Stripe's 30c is charged once per order, not once per ticket", () => {
  const one = priceBreakdown(10, 1);
  const three = priceBreakdown(10, 3);
  assert.equal(three.subtotal, 30.00);
  assert.equal(three.platformFee, 3.00);          // per ticket
  // Three tickets in one order must not carry three lots of 30c.
  assert.ok(three.processingFee < one.processingFee * 3,
    'processing fee scaled per ticket');
  assert.equal(three.total, 34.30);
});

test('quantity is coerced to at least one whole ticket', () => {
  for (const q of [0, -3, 0.4, NaN]) {
    assert.equal(priceBreakdown(10, q).subtotal, 10.00, `quantity ${q}`);
  }
  assert.equal(priceBreakdown(10, 2.9).subtotal, 20.00);
});

test('the organiser is paid exactly what they asked for', () => {
  for (const p of [1, 10, 10.5, 137.69, 999.99]) {
    assert.equal(organizerPayoutPerTicket(p), p);
    assert.equal(priceBreakdown(p, 1).subtotal, p);
  }
  assert.equal(organizerPayoutPerTicket(0), 0);
  assert.equal(organizerPayoutPerTicket(-1), 0);
});

test('we are cheaper than Eventbrite at every price, as claimed', () => {
  // The claim in ticketPricing.ts is that 2% + 80c is below Eventbrite's
  // 3.7% + $1.79 at every price, and that the gap widens rather than closes.
  // Stripe's 2.9% is on both sides, as the file says.
  const eventbrite = (p: number) =>
    Math.round((p * 1.037 + 1.79) * (1 + STRIPE_RATE) * 100) / 100;

  let previousGap = -Infinity;
  for (let cents = 100; cents <= 100000; cents += 11) {
    const price = cents / 100;
    const gap = eventbrite(price) - priceBreakdown(price, 1).total;
    assert.ok(gap > 0, `$${price}: we cost ${(-gap).toFixed(2)} more`);
    previousGap = gap;
  }
  // And it widens: the gap at $1000 is larger than at $1.
  assert.ok(
    eventbrite(1000) - priceBreakdown(1000, 1).total >
    eventbrite(1) - priceBreakdown(1, 1).total,
  );
  assert.ok(previousGap > 0);
});
