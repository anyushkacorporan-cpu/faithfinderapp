-- ============================================================================
-- FaithFinder — real payments
--
-- Checkout waited two seconds and issued a ticket. Seats were claimed,
-- earnings were counted, and no money moved. An organiser would have seen a
-- payout owed against a sale that never happened.
--
-- A card charge cannot be created from the app: it needs the Stripe secret
-- key, and anything in the bundle can be read out of it. So the amount is
-- computed on the server from the event's own price — never sent by the
-- client, which could otherwise offer to pay a penny.
-- ============================================================================

-- A ticket now has a lifecycle. It exists from the moment the seat is held,
-- which is before payment, so 'pending' has to be a state rather than an
-- absence of a row.
alter table tickets add column if not exists status text not null default 'paid'
  check (status in ('pending', 'paid', 'failed', 'refunded'));

alter table tickets add column if not exists payment_intent_id text;
alter table tickets add column if not exists currency text not null default 'USD';

-- Existing rows predate payments entirely; they are free or test tickets and
-- calling them 'paid' is the honest reading.
-- purchased_at, not created_at: this table records when a ticket was bought,
-- and has no separate row-creation timestamp.
create index if not exists tickets_pending_idx on tickets (purchased_at)
  where status = 'pending';

-- A held seat that was never paid for must not be held forever. Someone
-- abandoning checkout should not cost the organiser a seat.
create or replace function release_stale_holds()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  t record;
begin
  for t in
    select id, event_id, quantity from tickets
    where status = 'pending' and purchased_at < now() - interval '20 minutes'
  loop
    update events set tickets_sold = greatest(0, tickets_sold - t.quantity)
    where id = t.event_id;
    delete from tickets where id = t.id;
    -- greatest() rather than a plain subtraction: a count that has already
    -- been corrected elsewhere must not be driven negative by this sweep.
  end loop;
end;
$$;

-- ── Giving a seat back ─────────────────────────────────────────────────────
-- Deleting a held ticket does not undo the count: the capacity trigger runs on
-- insert, so nothing decrements on the way out. This is how an abandoned or
-- refused payment returns its seats to sale.
create or replace function release_seats(p_event_id text, p_quantity integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update events
  set tickets_sold = greatest(0, tickets_sold - greatest(0, p_quantity))
  where id = p_event_id;
end;
$$;

-- Only the server may hand seats back. A caller who could would be able to
-- empty an event's count and oversell it at will.
revoke all on function release_seats(text, integer) from public, anon, authenticated;

-- ── Earnings count settled money only ──────────────────────────────────────
-- tickets_sold gates capacity and includes held seats, deliberately: a seat
-- being paid for is not available. Money is a different question, and mixing
-- the two is how an organiser ends up looking at a payout for a sale that
-- never completed.
create or replace view event_earnings as
  select
    e.id as event_id,
    e.organizer_id,
    e.title,
    e.currency,
    coalesce(sum(t.quantity)      filter (where t.status = 'paid'), 0) as tickets_paid,
    coalesce(sum(t.total_paid)    filter (where t.status = 'paid'), 0) as gross,
    coalesce(sum(t.platform_fee)  filter (where t.status = 'paid'), 0) as fees,
    coalesce(sum(t.total_paid - t.platform_fee)
                                  filter (where t.status = 'paid'), 0) as net
  from events e
  left join tickets t on t.event_id = e.id
  group by e.id, e.organizer_id, e.title, e.currency;

-- The view runs as its caller, so the tickets policy already restricts each
-- organiser to their own event's rows.
alter view event_earnings set (security_invoker = true);
