-- ── Telling somebody their ticket exists ───────────────────────────────────
--
-- Buying a ticket sent no email at all. Neither did being refunded. The
-- layouts exist (_shared/eventEmail.ts) and nothing called them.
--
-- WHY A QUEUE AND NOT A CALL AT THE POINT OF SALE
--
-- Because tickets are written down two different roads and only one of them
-- is the server's. A paid ticket is inserted by the payments function; a FREE
-- registration is inserted by the phone, directly, through the RLS policy in
-- 36_free_tickets_only.sql. A confirmation hung off the payments function
-- would therefore reach everybody who paid and nobody who did not, which is
-- the larger half of a church's events.
--
-- The table is the one thing both roads go through, so the trigger lives
-- there, exactly like event_change_log in 43: the row is written in the same
-- transaction as the ticket, and event-notify sends whatever is unsent. If
-- the send never happens the row waits; a notice is late rather than lost.
--
-- Additive: one table, one function, one trigger. Nothing is dropped.

create table if not exists ticket_mail_queue (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   text not null references tickets (id) on delete cascade,
  event_id    text not null references events (id) on delete cascade,

  kind        text not null check (kind in ('registered', 'refunded')),
  created_at  timestamptz not null default now(),

  -- Null until it has gone. Claimed before the send, so a retry cannot mail
  -- the same person twice. Same bargain as event_change_log.
  sent_at     timestamptz,
  recipients  integer,
  send_error  text
);

create index if not exists ticket_mail_queue_unsent_idx
  on ticket_mail_queue (created_at) where sent_at is null;

alter table ticket_mail_queue enable row level security;

-- Nobody reads this but the server. It holds who bought what.
drop policy if exists ticket_mail_queue_admin on ticket_mail_queue;
create policy ticket_mail_queue_admin on ticket_mail_queue
  for all using (is_admin()) with check (is_admin());

-- ── What puts a row in it ──────────────────────────────────────────────────
create or replace function queue_ticket_mail()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ev record;
begin
  -- A confirmation is owed when a ticket becomes real, and a ticket becomes
  -- real down two roads: a free registration is INSERTed already 'paid' by
  -- the phone, while a paid one is inserted 'pending' by the payments
  -- function and UPDATEd to 'paid' once the card clears. Both land here.
  if (tg_op = 'INSERT' and new.status = 'paid')
     or (tg_op = 'UPDATE' and new.status = 'paid' and old.status is distinct from 'paid') then
    insert into ticket_mail_queue (ticket_id, event_id, kind)
    values (new.id, new.event_id, 'registered');
    return new;
  end if;

  if tg_op = 'UPDATE' and new.status = 'refunded' and old.status is distinct from 'refunded' then
    -- Not when the whole event was called off. Cancelling refunds every
    -- ticket, so without this check an attendee gets two emails a second
    -- apart: "this event has been cancelled, your money is coming back" and
    -- then "here is your refund". The cancellation already says it, and it
    -- says it better, because it explains why.
    select lifecycle into ev from events where id = new.event_id;
    if ev.lifecycle is distinct from 'cancelled' then
      insert into ticket_mail_queue (ticket_id, event_id, kind)
      values (new.id, new.event_id, 'refunded');
    end if;
  end if;

  return new;
end;
$$;

-- AFTER, not BEFORE: the row has to exist before anything references its id,
-- and the queue's foreign key does.
drop trigger if exists tickets_queue_mail on tickets;
create trigger tickets_queue_mail after insert or update on tickets
  for each row execute function queue_ticket_mail();

-- ── What the sender reads ──────────────────────────────────────────────────
-- Everything one email needs, in one row, so the function does not fetch the
-- ticket and then the event and then the profile for each of them.
create or replace function pending_ticket_mail(p_limit integer default 50)
returns table (
  id            uuid,
  kind          text,
  ticket_id     text,
  email         text,
  quantity      integer,
  total_paid    numeric,
  price_paid    numeric,
  currency      text,
  event_id      text,
  title         text,
  is_paid       boolean,
  event_date    text,
  event_time    text,
  end_time      text,
  timezone      text,
  organizer     text,
  venue_name    text,
  venue_address text,
  banner_image  text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    q.id, q.kind, t.id, t.email, t.quantity, t.total_paid,
    -- What a refund actually returns: the ticket price, never the fees.
    round(coalesce(t.price_per_ticket, 0) * coalesce(t.quantity, 1), 2),
    coalesce(e.currency, 'USD'),
    e.id, e.title, e.is_paid,
    e.date, e.time, e.end_time, e.timezone,
    e.organizer, e.venue_name, e.venue_address, e.banner_image
  from ticket_mail_queue q
  join tickets t on t.id = q.ticket_id
  join events  e on e.id = q.event_id
  where q.sent_at is null
  order by q.created_at
  limit greatest(1, least(coalesce(p_limit, 50), 200));
$$;

revoke all on function pending_ticket_mail(integer) from public, anon, authenticated;
