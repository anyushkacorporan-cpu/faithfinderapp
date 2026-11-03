-- ============================================================================
-- FourCircle — refund policies, the event lifecycle, and what a refund leaves
-- behind
--
-- Run this once in the Supabase SQL editor. It is safe to run more than once.
--
-- Until now a ticket could not be given back. `tickets.status` has accepted
-- 'refunded' since 11_payments.sql and nothing has ever written it, which is
-- the honest shape of "no refunds exist": a column waiting for a feature.
--
-- Four things are added here, and they are separate on purpose.
--
--   the policy      what an organiser promised when they published
--   the lifecycle   whether the event is still happening
--   the request     one attendee asking, and what was decided
--   the shortfall   money we refunded that the organiser still owes us
--
-- The last one exists because a refund is not a transaction that can be
-- rolled back. We refund the buyer from our own balance whatever happens, and
-- reclaiming it from the organiser can fail — their balance may be empty
-- because they already paid themselves out. A refund that silently did not
-- reclaim is a loss nobody recorded, so it gets a row.
-- ============================================================================

-- ── Business days ──────────────────────────────────────────────────────────
-- Used by the five-day response clock, and by the payout date in Phase 4.
-- Weekends only: public holidays differ by state, and a date that is wrong by
-- a day in one direction is better than one that is secretly wrong in several.
create or replace function add_business_days(from_ts timestamptz, days integer)
returns timestamptz
language plpgsql
immutable
as $$
declare
  result timestamptz := from_ts;
  added  integer := 0;
begin
  while added < days loop
    result := result + interval '1 day';
    -- 6 = Saturday, 0 = Sunday
    if extract(dow from result) not in (0, 6) then
      added := added + 1;
    end if;
  end loop;
  return result;
end;
$$;

-- ── What the organiser promised ────────────────────────────────────────────
alter table events add column if not exists refund_policy text not null default 'standard'
  check (refund_policy in ('flexible', 'standard', 'none'));

comment on column events.refund_policy is
  'flexible: full ticket price up to 7 days before. standard: up to 48 hours '
  'before. none: only cancelled or significantly changed events.';

-- Copied onto the ticket at purchase, because the promise a buyer relied on
-- is the one that was showing when they paid. An organiser loosening their
-- policy later should help the people who already bought; an organiser who
-- somehow tightened it must not reach backwards.
alter table tickets add column if not exists refund_policy text;

alter table tickets add column if not exists refunded_amount numeric(10,2) not null default 0;
alter table tickets add column if not exists refunded_at timestamptz;

-- ── The policy may only loosen ─────────────────────────────────────────────
-- A draft is not published, so it may change freely. After that, 'none' can
-- become 'standard' or 'flexible' and never the other way.
create or replace function policy_rank(p text) returns integer
language sql immutable as $$
  select case p when 'none' then 0 when 'standard' then 1 when 'flexible' then 2 else 1 end;
$$;

create or replace function enforce_policy_loosening()
returns trigger
language plpgsql
as $$
begin
  if old.status <> 'draft'
     and policy_rank(new.refund_policy) < policy_rank(old.refund_policy) then
    raise exception
      'A published event''s refund policy can only become more flexible (was %, tried %)',
      old.refund_policy, new.refund_policy
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists events_policy_loosening on events;
create trigger events_policy_loosening before update of refund_policy on events
  for each row execute function enforce_policy_loosening();

-- ── Whether the event is still happening ───────────────────────────────────
-- A separate column from `status`, which says where the event sits in time
-- (upcoming, active, past, draft). These two answer different questions and
-- an event can be past and cancelled at once.
alter table events add column if not exists lifecycle text not null default 'scheduled'
  check (lifecycle in ('scheduled', 'postponed', 'rescheduled', 'cancelled'));

alter table events add column if not exists lifecycle_changed_at timestamptz;
-- What the organiser told attendees. Shown with the notification.
alter table events add column if not exists lifecycle_note text;

comment on column events.lifecycle is
  'cancelled: full refunds of everything paid, automatically. postponed: no '
  'date yet, tickets stay valid, refundable after 90 days for 45 days. '
  'rescheduled: new date shown, refundable within 14 days of the change.';

create index if not exists events_lifecycle_idx on events (lifecycle)
  where lifecycle <> 'scheduled';

-- ── One attendee asking ────────────────────────────────────────────────────
create table if not exists refund_requests (
  id            uuid primary key default gen_random_uuid(),

  ticket_id     text not null references tickets (id) on delete cascade,
  event_id      text not null references events (id) on delete cascade,
  requester_id  uuid not null references auth.users (id) on delete cascade,

  reason        text,

  status        text not null default 'requested'
                  check (status in ('requested', 'approved', 'declined', 'refunded')),

  -- Set when declined, and shown to the attendee. The terms require a reason;
  -- a decline with none is not a decline anybody can escalate against.
  decline_reason text,

  decided_by    uuid references auth.users (id) on delete set null,
  decided_at    timestamptz,

  -- Five business days from the request. Nothing enforces it automatically —
  -- it is what the escalation route is measured against.
  respond_by    timestamptz not null,

  escalated_at  timestamptz,
  -- True when FourCircle, not the organiser, settled it.
  settled_by_platform boolean not null default false,

  created_at    timestamptz not null default now(),

  -- One open request per ticket. Asking twice is asking once.
  unique (ticket_id)
);

create index if not exists refund_requests_event_idx on refund_requests (event_id);
create index if not exists refund_requests_open_idx on refund_requests (respond_by)
  where status = 'requested';

alter table refund_requests enable row level security;

-- The attendee who asked, and the organiser of that event, each see it. The
-- owner sees everything, for escalations.
drop policy if exists refund_requests_select on refund_requests;
create policy refund_requests_select on refund_requests
  for select using (
    auth.uid() = requester_id
    or exists (select 1 from events e where e.id = refund_requests.event_id
                 and e.organizer_id = auth.uid())
    or is_admin()
  );

-- Filed by the buyer, against their own ticket. Every other write goes
-- through the payments function with the service role, because approving one
-- moves money and must not be a row an app can set by itself.
drop policy if exists refund_requests_insert_own on refund_requests;
create policy refund_requests_insert_own on refund_requests
  for insert with check (
    auth.uid() = requester_id
    and exists (select 1 from tickets t where t.id = ticket_id and t.buyer_id = auth.uid())
  );

grant select, insert on public.refund_requests to authenticated;

-- ── What the organiser still owes us ───────────────────────────────────────
create table if not exists organizer_owed (
  id            uuid primary key default gen_random_uuid(),
  organizer_id  uuid not null references auth.users (id) on delete cascade,
  event_id      text references events (id) on delete set null,
  ticket_id     text references tickets (id) on delete set null,

  amount        numeric(10,2) not null check (amount > 0),
  recovered     numeric(10,2) not null default 0,

  -- 'refund_shortfall' when a transfer reversal failed for want of balance,
  -- 'chargeback' when a buyer's bank took it back.
  reason        text not null,
  note          text,

  created_at    timestamptz not null default now(),
  settled_at    timestamptz
);

create index if not exists organizer_owed_open_idx on organizer_owed (organizer_id)
  where settled_at is null;

alter table organizer_owed enable row level security;

-- An organiser sees what they owe. Only the service role writes it.
drop policy if exists organizer_owed_select on organizer_owed;
create policy organizer_owed_select on organizer_owed
  for select using (auth.uid() = organizer_id or is_admin());

grant select on public.organizer_owed to authenticated;

-- ── Chargebacks ────────────────────────────────────────────────────────────
-- Recorded rather than acted on. A dispute is a decision for a person: the
-- amount may be worth reversing from the organiser, or the event may be one
-- where that would be unjust. Phase 4's payouts list is where that decision
-- gets made.
create table if not exists disputes (
  -- Stripe's own dispute id, so a webhook that fires twice writes one row.
  id            text primary key,
  ticket_id     text references tickets (id) on delete set null,
  event_id      text references events (id) on delete set null,
  organizer_id  uuid references auth.users (id) on delete set null,

  amount        numeric(10,2) not null,
  currency      text not null default 'USD',
  reason        text,
  status        text not null,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists disputes_event_idx on disputes (event_id);

alter table disputes enable row level security;

drop policy if exists disputes_select on disputes;
create policy disputes_select on disputes
  for select using (auth.uid() = organizer_id or is_admin());

grant select on public.disputes to authenticated;

-- ── Telling the attendee ───────────────────────────────────────────────────
-- A cancellation needs its own notification type rather than reusing 'event'.
-- 17_more_notifications.sql puts a unique index on (user_id, event_id, type),
-- so a buyer who already had an 'event' notice for this one — an invite, or
-- the event being published — would have had the cancellation silently
-- dropped. The one notice that must arrive would have been the one that did
-- not.
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in ('like', 'comment', 'reply', 'follow', 'announcement',
                  'share', 'church_post', 'event', 'invite', 'verification',
                  'event_cancelled'));

-- ── Backfill ───────────────────────────────────────────────────────────────
-- Tickets sold before this file existed have no policy recorded. They get the
-- policy their event carries now, which for every existing row is the default.
update tickets t
   set refund_policy = e.refund_policy
  from events e
 where e.id = t.event_id
   and t.refund_policy is null;
