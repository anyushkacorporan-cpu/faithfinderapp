-- ============================================================================
-- FourCircle — paying organisers, three business days after the event
--
-- Run this once in the Supabase SQL editor. It is safe to run more than once.
--
-- Money reaches an organiser's Stripe balance the moment a ticket sells, and
-- every connected account is held on a manual payout schedule so it stays
-- there. This file is what decides when it leaves: what is owed, when it is
-- due, and what has already gone.
--
-- WHY A REAL TIMESTAMP HAD TO BE ADDED
--
-- `events.date` is text, and deliberately so — 10_events.sql explains that
-- dates are typed by hand in several formats and a timestamptz would have to
-- guess a timezone the organiser never gave. That is fine for showing people
-- when to turn up and useless for "three business days after it ends", which
-- is arithmetic.
--
-- So `ends_at` is a separate column, written from the date and time pickers
-- the create-event form already holds as real Date objects. The text stays
-- exactly as it was. Events made before this have no ends_at and show as
-- needing a date rather than being given a guessed one: a payout released on
-- a parsed string is a payout released on a guess.
-- ============================================================================

alter table events add column if not exists ends_at timestamptz;

comment on column events.ends_at is
  'When the event actually finishes, for payout timing only. events.date and '
  'events.time remain the text the organiser typed and are what people read.';

create index if not exists events_ends_at_idx on events (ends_at)
  where ends_at is not null;

-- ── What has been released ─────────────────────────────────────────────────
--
-- One row per event, created the first time it is marked. An event with no
-- row here has not been touched, which reads as pending.
create table if not exists event_payouts (
  event_id      text primary key references events (id) on delete cascade,

  status        text not null default 'pending'
                  check (status in ('pending', 'held', 'released', 'failed')),

  -- Stripe's own payout id, so a number on this screen can be found on theirs.
  stripe_payout_id text,
  amount        numeric(10,2),
  released_at   timestamptz,

  -- Why it is held, or why it failed. Read by a person, written by a person.
  note          text,

  updated_at    timestamptz not null default now()
);

alter table event_payouts enable row level security;

-- Only the owner. An organiser learns where their payout stands from the
-- earnings view below, which does not need them to read this table directly.
drop policy if exists event_payouts_admin on event_payouts;
create policy event_payouts_admin on event_payouts
  for all using (is_admin()) with check (is_admin());

grant select, insert, update on public.event_payouts to authenticated;

drop trigger if exists event_payouts_touch on event_payouts;
create trigger event_payouts_touch before update on event_payouts
  for each row execute function touch_updated_at();

-- ── What each event owes its organiser ─────────────────────────────────────
--
-- One place both screens read from, so the number the owner releases and the
-- number the organiser was shown cannot disagree.
--
--   gross     the ticket price on every ticket still paid for. Fees are not
--             in it: they were added on top of the buyer's total and were
--             never the organiser's money.
--   refunded  what went back to buyers, for information. It is already out of
--             `gross`, because a refunded ticket is not a paid one.
--   owed      refunds we covered and could not reclaim, still outstanding.
--   payable   gross minus owed, floored at zero.
create or replace view event_payout_amounts as
  select
    e.id              as event_id,
    e.organizer_id,
    e.title,
    e.ends_at,
    e.lifecycle,
    case when e.ends_at is null then null
         else add_business_days(e.ends_at, 3) end as payout_due_at,

    coalesce(sum(t.price_per_ticket * t.quantity)
             filter (where t.status = 'paid'), 0)      as gross,
    coalesce(sum(t.refunded_amount)
             filter (where t.status = 'refunded'), 0)  as refunded,
    coalesce(sum(t.quantity) filter (where t.status = 'paid'), 0) as tickets_paid,

    coalesce((select sum(o.amount - o.recovered)
                from organizer_owed o
               where o.event_id = e.id and o.settled_at is null), 0) as owed,

    greatest(
      coalesce(sum(t.price_per_ticket * t.quantity)
               filter (where t.status = 'paid'), 0)
      - coalesce((select sum(o.amount - o.recovered)
                    from organizer_owed o
                   where o.event_id = e.id and o.settled_at is null), 0),
      0
    ) as payable
  from events e
  left join tickets t on t.event_id = e.id
  where e.is_paid
  group by e.id, e.organizer_id, e.title, e.ends_at, e.lifecycle;

-- Runs as the caller, so the tickets policy already keeps an organiser to
-- their own events. The owner's screen uses the view below instead, which
-- needs to see everybody's.
alter view event_payout_amounts set (security_invoker = on);

grant select on public.event_payout_amounts to authenticated;

-- ── The owner's list ───────────────────────────────────────────────────────
--
-- SECURITY DEFINER, which is unusual here and deliberate: this has to read
-- every organiser's tickets, and the alternative is an admin policy on the
-- tickets table itself — a far wider grant, left in place forever, to solve
-- one screen. The `where is_admin()` is what stands in for it, and a
-- non-admin selecting from this gets no rows rather than an error.
create or replace view payouts_due as
  select
    a.event_id,
    a.title,
    a.organizer_id,
    -- Whichever name this account goes by: a church's name, or a person's.
    coalesce(nullif(p.church_name, ''),
             nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ''))
                      as organizer_name,
    s.stripe_account_id,
    a.ends_at,
    a.payout_due_at,
    a.lifecycle,
    a.tickets_paid,
    a.gross,
    a.refunded,
    a.owed,
    a.payable,

    coalesce(ep.status, 'pending')                     as status,
    ep.stripe_payout_id,
    ep.released_at,
    ep.note,

    -- What the owner sorts on. An event whose money is due and not yet sent
    -- is the only kind that needs doing today.
    (coalesce(ep.status, 'pending') = 'pending'
       and a.payout_due_at is not null
       and a.payout_due_at <= now()
       and a.payable > 0)                              as is_due,

    (select count(*) from disputes d
      where d.event_id = a.event_id
        and d.status not in ('won', 'warning_closed')) as open_disputes
  from event_payout_amounts a
  left join event_payouts  ep on ep.event_id = a.event_id
  left join stripe_accounts s on s.user_id   = a.organizer_id
  left join profiles       p  on p.id        = a.organizer_id
  where is_admin();

grant select on public.payouts_due to authenticated;

-- ── Reading it ─────────────────────────────────────────────────────────────
--
-- Everything waiting to be paid, soonest first:
--
--   select title, organizer_name, payout_due_at, payable, stripe_account_id
--   from payouts_due where is_due order by payout_due_at;
--
-- And after paying one out in Stripe, record it:
--
--   insert into event_payouts (event_id, status, stripe_payout_id, amount, released_at)
--   values ('<event id>', 'released', 'po_...', 20.00, now())
--   on conflict (event_id) do update
--     set status = 'released', stripe_payout_id = excluded.stripe_payout_id,
--         amount = excluded.amount, released_at = excluded.released_at;
--
-- To hold one instead:
--
--   insert into event_payouts (event_id, status, note)
--   values ('<event id>', 'held', 'reviewing a dispute')
--   on conflict (event_id) do update
--     set status = 'held', note = excluded.note;
