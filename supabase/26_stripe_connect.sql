-- ============================================================================
-- FaithFinder — organisers get paid directly
--
-- Ticket money currently lands in the platform's Stripe account and stops
-- there. There is no payout system, so the Payouts tab shows a balance nobody
-- can withdraw, and every dollar an organiser earns sits in an account
-- belonging to someone else.
--
-- That is worse than an unfinished feature. It makes the platform the
-- recipient of other people's income: a 1099-K arrives for the whole volume,
-- most of which was never the platform's money, and paying each organiser out
-- becomes a manual job done by hand, by one person, with a spreadsheet.
--
-- WHY STANDARD ACCOUNTS
--
-- Stripe Connect offers Standard, Express and Custom. Standard means the
-- organiser owns their own Stripe account: they sign up with Stripe directly,
-- Stripe knows who they are, and Stripe — not us — files their 1099-K and
-- handles their tax identity. Express and Custom put all of that on the
-- platform, which for a one-person company means becoming a payments business
-- on top of being a church directory.
--
-- The cost of Standard is a longer sign-up for the organiser, since they fill
-- in Stripe's own form rather than a trimmed one. That is the right trade: it
-- happens once per church, and what it buys is never holding anyone else's
-- money or filing anyone else's taxes.
--
-- WHAT THIS TABLE IS NOT
--
-- It is not the source of truth. Stripe is. Whether an account can take
-- charges depends on identity checks that continue after onboarding finishes
-- and can be withdrawn later, so these columns are a cache of Stripe's answer,
-- refreshed when the organiser looks at the screen. Code deciding whether to
-- route money reads it, but a stale `true` here is corrected by Stripe
-- refusing the charge rather than by money going astray.
-- ============================================================================

create table if not exists stripe_accounts (
  -- One account per person, not per church: Stripe's account belongs to the
  -- human or organisation that signed up for it, and someone running two
  -- churches' events is still one payee.
  user_id            uuid primary key references auth.users (id) on delete cascade,
  stripe_account_id  text not null unique,

  -- Stripe's answers, cached. `charges_enabled` is the one that gates money.
  charges_enabled    boolean not null default false,
  payouts_enabled    boolean not null default false,
  details_submitted  boolean not null default false,

  -- When Stripe is waiting on something — a document, a bank account — this
  -- is why, so the screen can say what is missing instead of "pending".
  requirements_due   text[] not null default '{}',

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table stripe_accounts enable row level security;

-- Readable by its owner, and by nobody else: whether a given person has
-- finished Stripe's identity checks is their business.
--
-- Deliberately read-only. Every write goes through the edge function holding
-- the Stripe secret key, because these columns only mean anything if they came
-- from Stripe. A client that could set charges_enabled itself could route
-- money to an account Stripe has not approved.
drop policy if exists stripe_accounts_read_own on stripe_accounts;
create policy stripe_accounts_read_own on stripe_accounts
  for select using (auth.uid() = user_id);

-- 21_data_api_grants.sql explains why this is spelled out: from 30 October a
-- new table in the public schema gets no automatic Data API grant, and without
-- one every read returns permission denied with nothing in the schema to say
-- why. The policy above is the security boundary; this only says the role may
-- address the table. No insert, update or delete — see the policy comment.
grant select on public.stripe_accounts to authenticated;

-- There is deliberately no event_payouts_ready() here.
--
-- One was written, to let a buyer's screen ask whether an event could take
-- money before offering to sell them a ticket. It turned out to have no
-- caller: the checkout screen asks the server to start a payment before it
-- shows a card form at all, so an event with no payout account is refused with
-- a readable sentence and nothing is ever charged.
--
-- A security definer function exists to let callers read past their own
-- permissions. One with no callers is that power granted for nothing, and the
-- next person to read this file would reasonably assume something depends on
-- it. The payments function does the check directly, with the service key it
-- already holds.
