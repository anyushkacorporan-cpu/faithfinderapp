-- ============================================================================
-- FourCircle — the platform fee is computed here, not sent from a phone
--
-- THE HOLE
--
-- events.platform_fee arrived from the client. eventsApi.createEvent sends it
-- (`platform_fee: e.platformFee`), the insert and update policies check only
-- `auth.uid() = organizer_id`, and nothing anywhere constrained the value.
--
-- The payments function then reads that column and bills on it:
--
--     const fee = Number(event.platform_fee) || 0;
--
-- So an organiser could set platform_fee to 0 on their own event -- at
-- creation, or by updating the row afterwards -- and FourCircle would earn
-- nothing on every ticket sold. On a $20 ticket:
--
--     honest fee (2% + 80c)     buyer pays $22.15   FourCircle nets $1.21
--     organiser sets it to 0    buyer pays $20.91   FourCircle nets $0.00
--
-- Across a hundred of those tickets: $120.00 becomes $0.01. And the buyer
-- pays less, so the organiser has a reason to do it beyond mischief.
--
-- The same gap in the other direction is worse than lost revenue: an inflated
-- platform_fee overcharges the buyer under FourCircle's name, on terms
-- FourCircle published and did not set.
--
-- THE FIX
--
-- The column stops being an input. A trigger computes it from ticket_price on
-- every insert and update, and whatever the client sent is overwritten. That
-- covers both routes at once, which an RLS check would not: a check can only
-- refuse a bad value, and refusing would break every existing client that
-- sends one.
--
-- creator_payout goes the same way. It is display-only -- the payments
-- function derives what an organiser is owed from ticket_price, not from this
-- column -- but a stale value here is what once showed $9.00 under a heading
-- that said $10.00, so it is computed rather than trusted too.
--
-- WHERE THE NUMBERS LIVE
--
-- Two places now: src/lib/ticketPricing.ts, which is what the app promises,
-- and this trigger, which is what gets billed. supabase/payout-hold.test.ts
-- asserts they agree, so moving one without the other fails the suite.
-- ============================================================================

create or replace function set_event_fees()
returns trigger
language plpgsql
as $$
begin
  -- Keep in step with PLATFORM_RATE and PLATFORM_FLAT in ticketPricing.ts.
  if coalesce(new.is_paid, false) and coalesce(new.ticket_price, 0) > 0 then
    new.platform_fee   := round(new.ticket_price * 0.02 + 0.80, 2);
    -- The organiser is paid exactly what they asked for: both fees are added
    -- on top for the buyer, never taken out of the price.
    new.creator_payout := round(new.ticket_price, 2);
  else
    -- Nothing is charged on a free ticket, so there is nothing to split.
    new.platform_fee   := 0;
    new.creator_payout := 0;
  end if;
  return new;
end $$;

drop trigger if exists events_set_fees on events;
create trigger events_set_fees before insert or update on events
  for each row execute function set_event_fees();

comment on function set_event_fees() is
  'Computes events.platform_fee and events.creator_payout from ticket_price. '
  'The columns are outputs, not inputs: whatever a client sends is replaced.';

-- Correct anything already stored with a client-sent figure. Only rows that
-- actually disagree, so this does not touch updated_at across the whole table.
update events
   set ticket_price = ticket_price   -- the trigger does the rest
 where platform_fee is distinct from
       (case when coalesce(is_paid, false) and coalesce(ticket_price, 0) > 0
             then round(ticket_price * 0.02 + 0.80, 2) else 0 end)
    or creator_payout is distinct from
       (case when coalesce(is_paid, false) and coalesce(ticket_price, 0) > 0
             then round(ticket_price, 2) else 0 end);

-- Tickets already sold are deliberately NOT rewritten. tickets.platform_fee
-- records what was actually charged at the time, and a receipt that changes
-- after the fact is not a receipt.
