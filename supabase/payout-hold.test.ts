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
import { readFileSync, readdirSync } from 'node:fs';
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

// ── Update policies ───────────────────────────────────────────────────────
// Six update policies had `using` without `with check`, so a row you own
// could be turned into one you do not. Two of those were takeovers rather
// than giveaways; these pin all of it.

const UPDATES = sql('38_update_policies.sql');

test('every update policy here states what the row may become', () => {
  const c = code(UPDATES);
  // Each `for update using (...)` must be followed by a with check before the
  // next statement ends.
  const policies = c.match(/create policy [^;]+ for update [^;]+;/g) ?? [];
  assert.ok(policies.length >= 5, `expected the update policies, found ${policies.length}`);
  for (const p of policies) {
    assert.match(p, /with check/, `no with check: ${p.slice(0, 70)}…`);
  }
});

test('a church profile cannot be moved to another church', () => {
  const c = code(UPDATES);
  assert.match(c, /new\.church_id is distinct from old\.church_id/,
    'the primary key is unfrozen — any unclaimed church can be taken again');
  assert.match(c, /create trigger church_profiles_freeze_id before update on church_profiles/);
});

test('which church is being claimed is frozen once submitted', () => {
  const c = code(UPDATES);
  assert.match(c, /new\.claimed_church_id := old\.claimed_church_id;/,
    'claimed_church_id is writable again — an approval can be switched after review');
  // And only the submitting update may set it.
  assert.match(c, /new\.verification_status = 'pending' and coalesce\(old\.verification_status, 'none'\) in \('none', 'rejected'\)/);
});

test('the verification guard keeps everything 35 gave it', () => {
  const c = code(UPDATES);
  assert.match(c, /new\.verification_status := old\.verification_status;/); // no self-approval
  assert.match(c, /and not is_admin\(\)/);                                   // reviewers still work
  assert.match(c, /new\.verification_submitted_at := now\(\);/);             // clock still stamped
});

// ── Author identity ───────────────────────────────────────────────────────
// posts.author_name and comments.author_name were sent by the client, so a
// post could carry a real account id and a church's name. They are derived
// from the profile now. Same two halves as the payout hold: the rule mirrored
// here, the SQL pinned below.
//
// displayName() in userStore.ts cannot be imported into a test -- it reaches
// for React and AsyncStorage -- so these cases are transcribed from it. The
// pinning assertions are what catch the SQL drifting away from them.

const AUTHOR = sql('39_author_identity.sql');

/** Mirrors profile_display_name(). Keep in step with 39_author_identity.sql. */
function displayNameMirror(p: {
  accountType?: string; churchName?: string;
  firstName?: string; lastName?: string; email?: string;
}): string {
  if (p.accountType === 'church') return (p.churchName ?? '').trim() || 'Church';
  const full = [p.firstName, p.lastName]
    .map(s => (s ?? '').trim()).filter(Boolean).join(' ').trim();
  if (full) return full;
  const local = (p.email ?? '').split('@')[0];
  if (local) {
    const words = local.split(/[._+-]+/).filter(Boolean);
    if (words.length) return words.map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
  }
  return 'Member';
}

/** Mirrors profile_initials(). */
const initialsMirror = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'M';
};

test('a church posts under its church name', () => {
  assert.equal(displayNameMirror(
    { accountType: 'church', churchName: 'Grace Community Church' }),
    'Grace Community Church');
  // A church account that never filled the name in still is not a person.
  assert.equal(displayNameMirror({ accountType: 'church' }), 'Church');
  assert.equal(displayNameMirror({ accountType: 'church', churchName: '   ' }), 'Church');
});

test('a person posts under their own name', () => {
  assert.equal(displayNameMirror(
    { accountType: 'personal', firstName: 'Anyushka', lastName: 'Corporan' }),
    'Anyushka Corporan');
  assert.equal(displayNameMirror({ accountType: 'personal', firstName: 'Anyushka' }),
    'Anyushka');
});

test('an account with no name falls back to the readable part of its email', () => {
  assert.equal(displayNameMirror({ email: 'anyushka.corporan@gmail.com' }),
    'Anyushka Corporan');
  assert.equal(displayNameMirror({ email: 'pastor_mike@example.org' }), 'Pastor Mike');
  assert.equal(displayNameMirror({ email: 'jo@example.org' }), 'Jo');
  assert.equal(displayNameMirror({}), 'Member');
});

test('initials come from the same name the post carries', () => {
  assert.equal(initialsMirror('Anyushka Corporan'), 'AC');
  assert.equal(initialsMirror('Grace Community Church'), 'GC');
  assert.equal(initialsMirror('Madonna'), 'M');
  assert.equal(initialsMirror(''), 'M');
});

test('the byline is overwritten on posts and on comments', () => {
  const c = code(AUTHOR);
  for (const t of ['posts', 'comments']) {
    assert.match(
      c,
      new RegExp(`create trigger ${t}_set_author before insert or update on ${t}`),
      `${t} can have its byline set by the client again`,
    );
  }
  assert.match(c, /new\.author_name\s*:= nm;/);
  assert.match(c, /new\.author_initials := profile_initials\(nm\)/);
});

test('the account type is derived, so nobody wears the church badge', () => {
  assert.match(code(AUTHOR),
    /new\.author_type\s*:= case when acct = 'church' then 'church' else 'personal' end/);
});

test('the email fallback keeps the name in order', () => {
  // Without `with ordinality` the pieces can come back in any order, which
  // would reverse somebody's name at random.
  assert.match(code(AUTHOR), /with ordinality as t\(part, ord\)/);
  assert.match(code(AUTHOR), /order by ord/);
});

// ── A gate that was closed, reopened, and closed again ────────────────────
// 23 dropped profiles_owner_update on purpose and replaced it with an
// approval-gated policy. 38 recreated it from the original definition in 01,
// which put the gate back to sleep, because permissive policies are ORed and
// the weaker one wins. 40 drops it again.

test('the loose church_profiles update policy ends up dropped', () => {
  // The net effect across every migration, in the order they run, rather than
  // whether any single file mentions it. 38 does recreate it -- that is the
  // mistake -- and 40 drops it again; an applied migration is a record of what
  // happened, so it is corrected by a later one rather than edited.
  const files = readdirSync(here).filter(f => /^\d+_.*\.sql$/.test(f)).sort();
  const timeline: { file: string; verb: string }[] = [];

  for (const f of files) {
    const stmts = code(sql(f))
      .match(/(drop|create) policy (if exists )?profiles_owner_update on church_profiles/g) ?? [];
    for (const stmt of stmts) {
      timeline.push({ file: f, verb: stmt.startsWith('drop') ? 'drop' : 'create' });
    }
  }

  assert.ok(timeline.length > 0, 'the policy is not referenced anywhere');
  const last = timeline[timeline.length - 1];
  assert.equal(
    last.verb, 'drop',
    `the last word on profiles_owner_update is a create, in ${last.file} — ` +
    'the approval gate in 23 is back to sleep',
  );
});

test('the approval-gated policy is the one left standing', () => {
  const c = code(sql('23_church_photos_editable.sql'));
  assert.match(c,
    /create policy church_profiles_owner_update on church_profiles for update using \(owns_church\(church_id\)\) with check \(owns_church\(church_id\)\);/,
    'the approval gate on church listings is gone');
});

// ── The event timezone ────────────────────────────────────────────────────
// Recorded, not yet read. The point of the column is that which clock an
// event's time was read off cannot be reconstructed after the fact, so these
// check it is being filled and that nothing has quietly started depending on
// it before the display logic is ready.

test('the timezone column exists and says what it is for', () => {
  const c = code(sql('41_event_timezone.sql'));
  assert.match(c, /alter table events add column if not exists timezone text;/);
});

test('new events record the device zone', () => {
  const screen = readFileSync(join(here, '..', 'app', 'create-event.tsx'), 'utf8');
  assert.match(screen, /Intl\.DateTimeFormat\(\)\.resolvedOptions\(\)\.timeZone/,
    'create-event no longer records which clock the times were read off');
  // And it must not be able to take the save down with it.
  assert.match(flat(screen), /try \{ return Intl\.DateTimeFormat\(\)\.resolvedOptions\(\)\.timeZone \|\| undefined; \} catch/);
});

test('the zone survives a round trip through the API', () => {
  const api = readFileSync(join(here, '..', 'src', 'lib', 'eventsApi.ts'), 'utf8');
  assert.match(api, /timezone: e\.timezone \?\? null,/, 'not sent to the server');
  assert.match(api, /timezone: r\.timezone \?\? undefined,/, 'not read back');
});

// ── Event change notices ──────────────────────────────────────────────────
// The diff is captured by a trigger because only the database sees the old
// value and the new one at the same moment. These pin which fields count,
// which deliberately do not, and the claim-before-send that stops a retry
// mailing everyone twice.

const CHANGES = sql('43_event_change_log.sql');

test('the fields worth telling people about are watched', () => {
  const c = code(CHANGES);
  for (const field of ['title', 'date', 'time', 'location']) {
    assert.match(c, new RegExp(`new\\.${field} is distinct from old\\.${field}`),
      `${field} changes would go unreported`);
  }
});

test('a description edit is not news', () => {
  // Mailing everybody about a typo fix teaches them to ignore the mails that
  // matter. If this ever becomes wanted it should be a deliberate change.
  assert.doesNotMatch(code(CHANGES), /new\.description is distinct from old\.description/);
});

test('cancellation is reported as cancellation, not as a field change', () => {
  const c = code(CHANGES);
  assert.match(c, /new\.lifecycle = 'cancelled' and coalesce\(old\.lifecycle, ''\) <> 'cancelled'/);
  assert.match(c, /values \(new\.id, 'cancelled', '\[\]'::jsonb\);/);
});

test('an edit that changed nothing watched writes no row', () => {
  assert.match(code(CHANGES), /if jsonb_array_length\(diff\) = 0 then return new; end if;/);
});

test('a notice is claimed before it is sent, so a retry cannot repeat it', () => {
  const fn = readFileSync(
    join(here, 'functions', 'event-notify', 'index.ts'), 'utf8');
  const c = flat(fn);
  assert.match(c, /\.update\(\{ sent_at: new Date\(\)\.toISOString\(\) \}\) \.eq\('id', row\.id\)\.is\('sent_at', null\)/,
    'the claim is gone — a second flush would mail everybody again');
});

test('attendees are not shown each other addresses', () => {
  const fn = readFileSync(
    join(here, 'functions', 'event-notify', 'index.ts'), 'utf8');
  // One request per address. Resend's `to` array puts them all in one header.
  assert.match(flat(fn), /for \(const address of to\)/);
  assert.match(flat(fn), /to: \[address\]/);
  assert.doesNotMatch(flat(fn), /to: to,/);
});

test('a cancellation still reaches people whose ticket was just refunded', () => {
  const fn = readFileSync(
    join(here, 'functions', 'event-notify', 'index.ts'), 'utf8');
  const c = flat(fn);
  // Cancelling refunds every paid ticket before this runs, so a plain
  // .eq('status', 'paid') here finds nobody and the cancellation notice goes
  // to no one while reporting success. This is that bug, pinned.
  assert.match(c, /row\.kind === 'cancelled' \? \['paid', 'refunded'\] : \['paid'\]/,
    'the cancellation notice is back to paid-only — it would reach nobody');
  assert.doesNotMatch(c, /\.eq\('event_id', row\.event_id\)\.eq\('status', 'paid'\)/,
    'recipients are filtered to paid only, whatever the notice is');
});

test('one message each, however many tickets they hold', () => {
  const fn = readFileSync(
    join(here, 'functions', 'event-notify', 'index.ts'), 'utf8');
  assert.match(flat(fn), /const to = \[\.\.\.new Set\(/);
});

test('it sends from the right address, with replies going somewhere answered', () => {
  const fn = readFileSync(
    join(here, 'functions', 'event-notify', 'index.ts'), 'utf8');
  assert.match(fn, /const FROM = 'FourCircle <hello@fourcircle\.app>';/);
  assert.match(fn, /const REPLY_TO = 'support@fourcircle\.app';/);
});

// ── The door ──────────────────────────────────────────────────────────────
// A code admits somebody to a room, so these pin the three things that make
// it safe: it is single-use, it belongs to the organiser's own event, and it
// cannot be guessed.

const CHECKIN = sql('44_checkin.sql');

test('a code can only be used once, by the database rather than by a check', () => {
  const c = code(CHECKIN);
  // Two doors scanning the same code at the same instant both pass a check
  // that read the table a moment earlier. Only the unique index is true.
  assert.match(c, /code\s+text not null unique/);
  assert.match(c, /exception when unique_violation then/);
});

test('only the organiser can work their own door', () => {
  const c = code(CHECKIN);
  assert.match(c, /if ev\.organizer_id is distinct from auth\.uid\(\) and not is_admin\(\) then/);
  assert.match(c, /'status', 'forbidden'/);
  // And the attendee list is an attendance record, not public.
  assert.match(c, /create policy ticket_checkins_organizer on ticket_checkins/);
});

test('a real code for another event says so, rather than "not found"', () => {
  // At a venue running two events this is the likeliest mistake, and turning
  // away somebody holding a valid ticket is the worst way to handle it.
  assert.match(code(CHECKIN), /'status', 'wrong_event'/);
});

test('a refunded ticket does not open a door', () => {
  const c = code(CHECKIN);
  assert.match(c, /if t\.status = 'refunded' then return jsonb_build_object\('status', 'refunded'\); end if;/);
  assert.match(c, /if t\.status <> 'paid'\s+then/);
});

test('paid ticket codes are no weaker than free ones', () => {
  const fn = readFileSync(
    join(here, 'functions', 'payments', 'index.ts'), 'utf8');
  // Was six hex characters -- 16.7 million -- while a free registration
  // already used eight from a 32-letter alphabet. The paid ticket, the one
  // worth forging, had the weaker code by a factor of sixty thousand.
  assert.doesNotMatch(flat(fn), /crypto\.randomUUID\(\)\.replace\(\/-\/g, ''\)\.slice\(0, 6\)/,
    'the weak six-character ticket code is back');
  assert.match(fn, /const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';/);
  assert.match(fn, /crypto\.getRandomValues\(new Uint8Array\(8\)\)/,
    'ticket codes authorise entry and must not come from Math.random');
});

test('the readable alphabet has nothing ambiguous in it', () => {
  const fn = readFileSync(
    join(here, 'functions', 'payments', 'index.ts'), 'utf8');
  const m = fn.match(/const alphabet = '([A-Z0-9]+)';/);
  assert.ok(m, 'no alphabet found');
  for (const ch of ['I', 'O', '0', '1']) {
    assert.ok(!m![1].includes(ch), `${ch} is in the alphabet and gets misread aloud`);
  }
  assert.equal(m![1].length, 32, 'a byte % 32 is only unbiased for exactly 32');
});
