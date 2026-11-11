-- ── Six tickets per person, per event ──────────────────────────────────────
--
-- Nothing counted a buyer's tickets across their orders. Capacity was
-- enforced (claim_seats, 10_events.sql) and a single order was capped at 10 on
-- the screen, but one person could place order after order until the event was
-- gone. On a free event that costs nothing to do.
--
-- Additive: one function, one trigger, one read-only helper. Nothing is
-- dropped, renamed or altered, and no existing row is touched.
--
-- WHY A TRIGGER AND NOT A CHECK IN THE APP
--
-- The same reason claim_seats is a trigger. The anon key ships inside the app
-- by design, so the tickets table can be written to without going near the
-- checkout screen (36_free_tickets_only.sql has the long version). A limit
-- that lives on the screen is a suggestion. This one is on the table.
--
-- WHICH TICKETS COUNT
--
--   paid     — a seat they hold.
--   pending  — a checkout in flight. It counts, or three tabs open at once
--              buys eighteen.
--   refunded — does not count. The spot is given back (release_seats), so the
--              person is given their allowance back with it.
--   failed   — does not count. Nothing was ever held.
--
-- LOCKING
--
-- The count and the insert have to be one indivisible step, or two orders
-- placed at the same instant both read "4 held" and both add 2. Locking the
-- event row does it: claim_seats already takes that same lock on every ticket
-- insert, so every purchase for an event is serialised behind it whichever
-- trigger gets there first. Taking it twice in one transaction is free.

create or replace function enforce_tickets_per_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  held    integer;
  allowed constant integer := 6;
begin
  -- Serialise with any other purchase for this event, including the one
  -- claim_seats is about to make. Same row, same transaction, no deadlock.
  perform 1 from events where id = new.event_id for update;

  select coalesce(sum(quantity), 0) into held
  from tickets
  where event_id = new.event_id
    and buyer_id = new.buyer_id
    and status in ('pending', 'paid');

  if held + new.quantity > allowed then
    -- The remaining allowance is in the message because the screen shows it
    -- back to the person, and recomputing it there would be a second opinion
    -- about the same number.
    raise exception 'You can buy up to % tickets for this event. You already have %.',
      allowed, held
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

-- tickets_claim_seats and this one are both BEFORE INSERT, and Postgres fires
-- same-event triggers in name order: claim_seats comes first alphabetically
-- and takes the lock. This does not rely on that -- it takes the lock itself --
-- but the order is worth knowing when reading a failure: a purchase over
-- BOTH limits reports the capacity one.
drop trigger if exists tickets_enforce_per_user on tickets;
create trigger tickets_enforce_per_user before insert on tickets
  for each row execute function enforce_tickets_per_user();

-- ── What the screen asks ───────────────────────────────────────────────────
-- So the quantity picker can stop at the right number instead of letting
-- someone pick 6 and be refused at the end. Read-only, and it answers only
-- for the caller: p_event_id is the only argument, auth.uid() is the buyer.
create or replace function my_tickets_for_event(p_event_id text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(quantity), 0)::integer
  from tickets
  where event_id = p_event_id
    and buyer_id = auth.uid()
    and status in ('pending', 'paid');
$$;

grant execute on function my_tickets_for_event(text) to authenticated;
