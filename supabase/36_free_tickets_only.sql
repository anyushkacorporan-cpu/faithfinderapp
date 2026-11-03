-- ============================================================================
-- FourCircle — a ticket bought from the phone must be a free one
--
-- THE HOLE
--
-- Tickets had one insert policy:
--
--     create policy tickets_insert_own on tickets
--       for insert with check (auth.uid() = buyer_id);
--
-- which checks exactly one thing: that you are writing a ticket for yourself.
-- Not that the event is free. Not that anything was paid. And tickets.status
-- defaults to 'paid' (11_payments.sql).
--
-- So any signed-in account could write a row naming a PAID event, with
-- total_paid of zero, and hold a fully valid paid ticket having paid nothing.
-- The claim_seats trigger would decrement the organiser's capacity for them,
-- so it also took a seat away from somebody who would have paid for it.
--
-- This needed no unusual access. The anon key ships inside the app by design —
-- that is fine, RLS is what protects the data — but it means the table can be
-- written to directly, without going anywhere near the checkout screen.
--
-- WHY THE POLICY WAS EVER THIS WIDE
--
-- Because free and paid tickets take two different roads, and only one of them
-- was being guarded. A paid ticket is written by the payments function using
-- the service role, which bypasses RLS entirely. A free registration is
-- written by the phone, through this policy. The policy had to be wide enough
-- for the free case and was never narrowed to it.
--
-- THE FIX
--
-- Insert from a client is allowed only where it is genuinely a free
-- registration: the event says so, and every money column is zero. Paid
-- tickets are untouched — the payments function does not consult RLS.
--
-- The event must also be published and not cancelled, which closes two
-- smaller gaps of the same shape: you could register for somebody's draft, or
-- for an event that had already been called off.
-- ============================================================================

drop policy if exists tickets_insert_own on tickets;
drop policy if exists tickets_insert_free_only on tickets;

create policy tickets_insert_free_only on tickets
  for insert with check (
    auth.uid() = buyer_id

    -- Nothing here may claim money changed hands. A free registration that
    -- could name its own total_paid is the hole again in a smaller font.
    and coalesce(total_paid, 0) = 0
    and coalesce(platform_fee, 0) = 0
    and coalesce(processing_fee, 0) = 0
    and coalesce(price_per_ticket, 0) = 0
    and coalesce(refunded_amount, 0) = 0
    and payment_intent_id is null

    -- A sanity bound, not a mirror of the UI. Checkout offers up to 10 and the
    -- payments function allows up to 20; 20 here means raising the picker does
    -- not fail with a policy error nobody can read, while still stopping one
    -- request from claiming ten thousand seats of a capped free event.
    and quantity between 1 and 20

    -- The event itself has to agree that it is free. This subquery runs as the
    -- caller, so events' own RLS applies to it: a draft belonging to someone
    -- else is invisible here and the insert fails, which is the intended
    -- answer rather than an accident of it.
    and exists (
      select 1 from events e
      where e.id = tickets.event_id
        and e.is_paid = false
        and e.status <> 'draft'
        and e.lifecycle <> 'cancelled'
    )
  );

comment on policy tickets_insert_free_only on tickets is
  'A client may insert only a genuinely free registration, for a published, '
  'uncancelled, free event, with every money column zero. Paid tickets are '
  'written by the payments function with the service role, which does not '
  'consult this policy.';
