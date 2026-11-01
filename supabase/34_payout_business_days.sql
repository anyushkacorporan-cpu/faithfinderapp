-- ============================================================================
-- FourCircle — business days are counted where the business is
--
-- add_business_days decided whether a day was a weekend with
--
--     extract(dow from result)
--
-- on a timestamptz. That reads the day-of-week in whatever the session's
-- TimeZone happens to be, which on this database is UTC. An evening event is
-- already the next day in UTC — a Friday 8:00 PM ET event ends Saturday 01:00
-- UTC — so the loop skipped the wrong days and the three-day hold came out
-- wrong by one.
--
-- Wrong in both directions, depending on the weekday:
--
--   event ends                     before            after
--   Fri 8:00 PM ET                 Tue 10 Nov        Wed 11 Nov   (was a day early)
--   Tue 7:00 PM ET                 Sun  8 Nov        Fri  6 Nov   (was on a SUNDAY)
--   Sun 6:00 PM ET                 Wed 11 Nov        Wed 11 Nov   (unchanged)
--   Wed 11:00 AM ET                Mon 30 Nov        Mon 30 Nov   (unchanged)
--
-- Daytime events were always right, which is why this did not show up sooner.
-- Evening events are most of them — worship nights, concerts, game nights.
--
-- Checked over every hour of two full weeks, both of them DST transition weeks
-- (336 start times). The old function put the payout on a New York weekend 9
-- times, paid up to a day early 18 times, and up to three days late 12 times.
-- Early is the one that costs: the hold is what covers a chargeback or a late
-- refund request, so a day early is a day of cover given away.
--
-- The replacement holds two invariants across all 336: the due date always
-- falls on a New York weekday, and there are always exactly three New York
-- business days between the end of the event and the payout.
--
-- Fixed by naming the zone instead of inheriting one. America/New_York is
-- where FourCircle is, and business days are the business's own.
--
-- Also now `stable`, not `immutable`. Converting a timestamptz to a named zone
-- depends on the tz database, which gets updated, so the old declaration was a
-- promise the function could not keep — and an immutable function is one
-- Postgres may fold to a constant. Nothing indexes it, so this costs nothing.
-- ============================================================================

create or replace function add_business_days(from_ts timestamptz, days integer)
returns timestamptz
language plpgsql
stable
as $$
declare
  result timestamptz := from_ts;
  added  integer := 0;
begin
  -- Null in, null out. Without this the loop never terminates: every
  -- comparison against a null day-of-week is null rather than true, so `added`
  -- is never incremented and the query hangs. Callers in 33_payouts.sql guard
  -- their own nulls with a case expression; this makes the function safe even
  -- where one forgets.
  if from_ts is null then
    return null;
  end if;

  while added < days loop
    result := result + interval '1 day';
    -- `at time zone` makes this a wall-clock timestamp in New York, so the
    -- day-of-week is the one a person there would name. 6 = Saturday,
    -- 0 = Sunday.
    if extract(dow from result at time zone 'America/New_York') not in (0, 6) then
      added := added + 1;
    end if;
  end loop;
  return result;
end;
$$;

comment on function add_business_days(timestamptz, integer) is
  'Adds N business days, counting weekends in America/New_York. Used by the '
  'five-day refund response clock and the three-day payout hold.';

-- Nothing else to do. event_payout_amounts and payouts_due call this function
-- by reference, not by a copy of its body, so replacing it is enough and they
-- return the corrected dates on the next query. They are deliberately NOT
-- dropped and recreated here: that would take their grants with them.
--
-- Already-stored payout rows are not touched. event_payouts records what was
-- actually sent, and the due date is computed on read, so every event that has
-- not been paid out yet picks up the corrected date by itself.
