-- ============================================================================
-- FaithFinder — what the buyer paid, split into its parts
--
-- A ticket recorded the total and the platform's share of it. Card processing
-- was not recorded anywhere, because until now it was not charged to anyone:
-- checkout showed the buyer a total with the platform fee added and the server
-- billed the base price without it, so the difference — and the whole of
-- Stripe's cut — came quietly out of the platform on every sale.
--
-- Both are charged now, both are shown to the buyer as separate lines, and
-- both are stored here. Stored rather than recalculated, because a rate is a
-- fact about today and a receipt is a fact about the day it was issued: a
-- ticket sold under one fee schedule must keep saying what was actually taken
-- from the card, however the rates move afterwards.
-- ============================================================================

alter table tickets add column if not exists processing_fee numeric(10,2) not null default 0;
