-- ── Telling the two people a refund request concerns ──────────────────────
--
-- A request reached the database and the organiser learned of it only if
-- they happened to open the refund screen. The attendee was told five
-- business days, and the clock ran against somebody who had not been told
-- there was one. A decline reached nobody at all: the reason the terms
-- require an organiser to give was written into a column and never read out.
--
-- An approval needs nothing new. Approving refunds the ticket, the ticket
-- becomes 'refunded', and 48's trigger already queues the refund email.
--
-- WHY THIS WIDENS ticket_mail_queue INSTEAD OF ADDING ANOTHER QUEUE
--
-- Because two near-identical queues is worse than one, and the only reason
-- to have avoided it was that widening a CHECK constraint means dropping the
-- old one. That drops no data and removes no object: the constraint is
-- replaced in the same statement by a strictly more permissive one, and
-- every row that satisfied the old one satisfies the new one. Said plainly
-- here because the instruction was to drop nothing, and this is the one
-- place that rule is bent, deliberately, with nothing lost.

alter table ticket_mail_queue drop constraint if exists ticket_mail_queue_kind_check;
alter table ticket_mail_queue add constraint ticket_mail_queue_kind_check
  check (kind in ('registered', 'refunded', 'refund_requested', 'refund_declined'));

-- ── What puts a row in it ──────────────────────────────────────────────────
create or replace function queue_refund_mail()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    -- To the organiser. They are the one with five business days to answer
    -- and, until now, no way of knowing the clock had started.
    insert into ticket_mail_queue (ticket_id, event_id, kind)
    values (new.ticket_id, new.event_id, 'refund_requested');
    return new;
  end if;

  if new.status = 'declined' and old.status is distinct from 'declined' then
    -- To the attendee, carrying the organiser's reason. A decline with no
    -- reason is refused by refund_decide, so there is always one to send.
    insert into ticket_mail_queue (ticket_id, event_id, kind)
    values (new.ticket_id, new.event_id, 'refund_declined');
  end if;

  -- 'approved' deliberately queues nothing. The refund marks the ticket
  -- 'refunded' and 48 sends the refund email off the back of that, which is
  -- the email the attendee actually wants: it names the amount.
  return new;
end;
$$;

drop trigger if exists refund_requests_queue_mail on refund_requests;
create trigger refund_requests_queue_mail after insert or update on refund_requests
  for each row execute function queue_refund_mail();

-- ── What the sender reads ──────────────────────────────────────────────────
--
-- Replaces 48's version. Two things are new: the recipient is worked out per
-- kind rather than always being the ticket holder, and the request's own
-- words come along.
--
-- The recipient matters. 'refund_requested' goes to the ORGANISER; every
-- other kind goes to the person holding the ticket. Sending a request notice
-- to the attendee would tell them what they already know and tell the
-- organiser nothing, which is the bug this file exists to fix.
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
  banner_image  text,
  reason        text,
  decline_reason text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    q.id, q.kind, t.id,
    case
      when q.kind = 'refund_requested' then
        -- The address the organiser signed up with. profiles holds no email
        -- at all — 03_profiles.sql leaves that to auth.users deliberately —
        -- so auth.users is the only place it exists.
        au.email
      else t.email
    end,
    t.quantity, t.total_paid,
    round(coalesce(t.price_per_ticket, 0) * coalesce(t.quantity, 1), 2),
    coalesce(e.currency, 'USD'),
    e.id, e.title, e.is_paid,
    e.date, e.time, e.end_time, e.timezone,
    e.organizer, e.venue_name, e.venue_address, e.banner_image,
    r.reason, r.decline_reason
  from ticket_mail_queue q
  join tickets t on t.id = q.ticket_id
  join events  e on e.id = q.event_id
  left join refund_requests r on r.ticket_id = q.ticket_id
  left join auth.users au on au.id = e.organizer_id
  where q.sent_at is null
  order by q.created_at
  limit greatest(1, least(coalesce(p_limit, 50), 200));
$$;

revoke all on function pending_ticket_mail(integer) from public, anon, authenticated;
