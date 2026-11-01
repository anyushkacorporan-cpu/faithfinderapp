/**
 * The payout hold, to the extent it can be tested without a database.
 *
 * add_business_days lives in SQL, so nothing here runs the real thing. Two
 * different jobs are done instead, and it is worth being clear which is which
 * because a test that looks like it is checking Postgres and is not would be
 * worse than no test at all.
 *
 *   1. THE RULE. A mirror of the day-counting logic in TypeScript, checked
 *      against the two invariants that matter: the answer always lands on a
 *      New York weekday, and there are always exactly N New York business days
 *      between the two dates. This verifies the rule is right. It does NOT
 *      verify that the database implements it.
 *
 *   2. DRIFT. The SQL text is pinned on the specific things that were wrong
 *      and got fixed — the timezone, the null guard, the volatility, the admin
 *      exemption. This is what stops the mirror above from quietly becoming a
 *      lie: edit the SQL's day logic and these assertions fail, which sends
 *      whoever did it back to the mirror.
 *
 * Both bugs these guard against were real and shipped in this file's history:
 * a day counted in UTC, which paid some organisers early, and a null input
 * that made the function loop forever.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const here = import.meta.dirname;
const sql = (name: string) => readFileSync(join(here, name), 'utf8');
// Whitespace-insensitive, so reformatting the SQL does not fail the test —
// only changing what it says.
const flat = (s: string) => s.replace(/\s+/g, ' ');

/**
 * Executable SQL only, with the `--` comments stripped out.
 *
 * Needed because these files explain the bugs they fix, so the header of
 * 34 contains both the words `extract(dow from result)` and `immutable` as
 * description. Asserting those are absent without stripping comments first
 * fails on the explanation rather than on the code — which is exactly what
 * happened when this test was written.
 *
 * Naive about `--` inside a string literal. None of these files has one, and a
 * false failure here is cheap: it points at the line.
 */
const code = (src: string) => flat(
  src.split('\n').map(line => line.replace(/--.*$/, '')).join('\n'),
);

const PAYOUTS = sql('34_payout_business_days.sql');
const CLAIMS = sql('35_claims.sql');

// ── 1. The rule ───────────────────────────────────────────────────────────

/** Mirrors add_business_days. Keep in step with 34_payout_business_days.sql. */
function addBusinessDays(from: Date | null, days: number): Date | null {
  if (from === null) return null;                       // the null guard
  let result = new Date(from);
  let added = 0;
  while (added < days) {
    result = new Date(result.getTime() + 86_400_000);
    if (!isWeekendInNewYork(result)) added += 1;
  }
  return result;
}

/** `extract(dow from ts at time zone 'America/New_York') in (0, 6)`. */
function isWeekendInNewYork(d: Date): boolean {
  const day = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', weekday: 'short',
  }).format(d);
  return day === 'Sat' || day === 'Sun';
}

test('the hold always ends on a New York weekday', () => {
  // Every hour of two weeks, both of them DST transition weeks.
  for (const start of ['2026-11-02T00:00:00-04:00', '2026-03-02T00:00:00-05:00']) {
    for (let h = 0; h < 7 * 24; h++) {
      const ends = new Date(Date.parse(start) + h * 3_600_000);
      const due = addBusinessDays(ends, 3)!;
      assert.ok(!isWeekendInNewYork(due),
        `${ends.toISOString()} -> ${due.toISOString()} is a weekend`);
    }
  }
});

test('the hold is exactly three New York business days, never two', () => {
  for (const start of ['2026-11-02T00:00:00-04:00', '2026-03-02T00:00:00-05:00']) {
    for (let h = 0; h < 7 * 24; h++) {
      const ends = new Date(Date.parse(start) + h * 3_600_000);
      const due = addBusinessDays(ends, 3)!;

      // Count New York weekdays after the event's own day, up to the due day.
      const dayIn = (d: Date) => new Intl.DateTimeFormat('en-CA',
        { timeZone: 'America/New_York', dateStyle: 'short' }).format(d);
      let cursor = new Date(ends);
      let counted = 0;
      while (dayIn(cursor) < dayIn(due)) {
        cursor = new Date(cursor.getTime() + 86_400_000);
        if (!isWeekendInNewYork(cursor)) counted += 1;
      }
      assert.equal(counted, 3,
        `${ends.toISOString()} -> ${due.toISOString()} spans ${counted}`);
    }
  }
});

test('a null date returns null instead of looping forever', () => {
  // Before the guard, every comparison against a null day-of-week was null
  // rather than true, `added` never advanced, and the query hung.
  assert.equal(addBusinessDays(null, 3), null);
  assert.equal(addBusinessDays(null, 5), null);
});

test('the five-day refund clock lands on a weekday too', () => {
  for (let h = 0; h < 7 * 24; h++) {
    const from = new Date(Date.parse('2026-11-02T00:00:00-04:00') + h * 3_600_000);
    assert.ok(!isWeekendInNewYork(addBusinessDays(from, 5)!));
  }
});

// ── 2. Drift ──────────────────────────────────────────────────────────────

test('the SQL still counts weekends in New York, not in UTC', () => {
  assert.match(code(PAYOUTS),
    /extract\(dow from result at time zone 'America\/New_York'\)/,
    'the timezone conversion is gone — the UTC bug is back');
  // A bare extract(dow from result) is the bug itself.
  assert.doesNotMatch(code(PAYOUTS), /extract\(dow from result\)/);
});

test('the SQL still guards against a null date', () => {
  assert.match(code(PAYOUTS), /if from_ts is null then return null; end if;/);
});

test('the SQL function is stable, not immutable', () => {
  // Converting to a named zone depends on the tz database, so immutable was a
  // promise it could not keep — and an immutable function may be folded to a
  // constant.
  assert.match(code(PAYOUTS), /returns timestamptz language plpgsql stable/);
  assert.doesNotMatch(code(PAYOUTS), /immutable/);
});

test('the claims view null-guards its own call', () => {
  assert.match(code(CLAIMS),
    /case when p\.verification_submitted_at is null then null else add_business_days/);
});

test('the verification guard still exempts admins and stamps the clock', () => {
  assert.match(code(CLAIMS), /and not is_admin\(\)/,
    'the admin exemption is gone — a reviewer is locked out again');
  assert.match(code(CLAIMS), /new\.verification_submitted_at := now\(\);/);
  // And the claimant is still stopped from approving themselves.
  assert.match(code(CLAIMS), /auth\.uid\(\) is not null/);
});

// ── The ticket insert policy ──────────────────────────────────────────────
// Same drift-pinning as above, on 36_free_tickets_only.sql. A client could
// once write itself a paid ticket for nothing; these assert the conditions
// that stop it are still in the policy.

const FREE_TICKETS = sql('36_free_tickets_only.sql');

test('a client insert still has to be for a free event', () => {
  const c = code(FREE_TICKETS);
  assert.match(c, /e\.is_paid = false/,
    'the free-event condition is gone — paid tickets can be forged again');
  assert.match(c, /e\.status <> 'draft'/);
  assert.match(c, /e\.lifecycle <> 'cancelled'/);
});

test('a client insert still has to claim no money', () => {
  const c = code(FREE_TICKETS);
  for (const column of
       ['total_paid', 'platform_fee', 'processing_fee', 'price_per_ticket']) {
    assert.match(c, new RegExp(`coalesce\\(${column}, 0\\) = 0`),
      `${column} is no longer forced to zero`);
  }
  assert.match(c, /payment_intent_id is null/);
});

test('the wide-open policy is dropped, not left beside the new one', () => {
  // Postgres ORs permissive policies together: leaving the old one in place
  // would make the new one decorative.
  assert.match(code(FREE_TICKETS), /drop policy if exists tickets_insert_own on tickets;/);
});

// ── The platform fee ──────────────────────────────────────────────────────
// events.platform_fee used to arrive from the client and the payments
// function billed on it, so an organiser could zero their own fee. It is
// computed by a trigger now. These assert the trigger is still there and
// still agrees with what the app promises.

const EVENT_FEES = sql('37_event_fees_server_side.sql');

test('the fee trigger still exists and fires on update as well as insert', () => {
  const c = code(EVENT_FEES);
  assert.match(c, /create trigger events_set_fees before insert or update on events/,
    'an update-only gap would let the fee be zeroed after the event is made');
});

test('the trigger computes the same fee the app promises', async () => {
  // The one place these two numbers can drift apart. ticketPricing.ts is what
  // the buyer is shown; the trigger is what gets billed.
  const { PLATFORM_RATE, PLATFORM_FLAT } =
    await import('../src/lib/ticketPricing.ts');
  const c = code(EVENT_FEES);
  assert.match(
    c,
    new RegExp(`new\\.ticket_price \\* ${PLATFORM_RATE} \\+ ${PLATFORM_FLAT.toFixed(2)}`),
    `the trigger no longer charges ${PLATFORM_RATE * 100}% + $${PLATFORM_FLAT.toFixed(2)}`,
  );
});

test('a free event carries no fee', () => {
  const c = code(EVENT_FEES);
  assert.match(c, /new\.platform_fee\s*:= 0;/);
  assert.match(c, /new\.creator_payout\s*:= 0;/);
});

test('the organiser is still paid the whole ticket price', () => {
  assert.match(code(EVENT_FEES), /new\.creator_payout := round\(new\.ticket_price, 2\)/);
});
