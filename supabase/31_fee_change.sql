-- ============================================================================
-- FourCircle — the platform fee becomes 2% + 80c
--
-- Run this in the Supabase SQL editor after deploying the app change.
--
-- WHY THERE IS SQL AT ALL FOR A CONSTANT
--
-- An event stores its platform fee per ticket in `events.platform_fee`,
-- written once when the event is created. The payments function reads that
-- column rather than recomputing, and deliberately: the fee an organiser was
-- shown when they created the event is the fee they agreed to, and a rate
-- change should not quietly rewrite the terms of an event already on sale.
--
-- The consequence is that changing the constant in src/lib/ticketPricing.ts
-- only affects events created from now on. Events already in the table keep
-- the old 5% figure, and nothing in the app would ever say so.
--
-- Before launch that distinction is not worth keeping: every row here is a
-- test event. The update below brings them in line so the table has one fee
-- model in it instead of two.
--
-- AFTER LAUNCH, DO NOT RUN THIS.
--
-- Once real organisers have real events on sale, rewriting their fee is
-- changing a price behind their back. New rates apply to new events.
-- ============================================================================

-- What is there now, before anything changes:
--
--   select id, title, ticket_price, platform_fee, tickets_sold
--   from events where is_paid order by created_at;
--
-- Stop here if any row has tickets_sold > 0. A sold ticket has the old fee
-- recorded against it in `tickets`, and moving the event's rate afterwards
-- leaves the two disagreeing about the same sale.

update events
   set platform_fee = round((ticket_price * 0.02 + 0.80)::numeric, 2)
 where is_paid
   and ticket_price > 0
   and tickets_sold = 0;

-- Free events keep a zero fee, which the `is_paid` test already protects.
--
-- Check it took:
--
--   select title, ticket_price, platform_fee from events where is_paid;
--
-- A $10 ticket should now read 1.00, and a $25 one 1.30.
