-- ── What the door is told ──────────────────────────────────────────────────
--
-- Two gaps, both about a person standing at a door with a queue behind them.
--
-- 1. A second scan answered "already", and nothing else. Not who, not when.
--    The one question that matters at that moment — is this the same person
--    coming back, or somebody holding a copy of their ticket — had no answer
--    on the screen.
--
-- 2. The attendee list said how MANY of a holder's seats were in, never when.
--    A row read "2 in" and the person on the door had no way to tell whether
--    that was a minute ago or at the door before lunch.
--
-- Additive. check_in_ticket keeps its name, arguments and return type, so
-- this is a replace of the body and not a drop. The times come from a NEW
-- function rather than by widening event_attendees, because widening a
-- set-returning function's column list requires dropping it first, and
-- nothing here is dropped.

-- ── A second scan says who, and when ───────────────────────────────────────
create or replace function check_in_ticket(p_code text, p_event_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  t           record;
  ev          record;
  seen        timestamptz;
  attendee    text;
  code_clean  text := upper(btrim(coalesce(p_code, '')));
begin
  select * into ev from events where id = p_event_id;
  if not found then return jsonb_build_object('status', 'not_found'); end if;

  -- The door belongs to whoever is running the event.
  if ev.organizer_id is distinct from auth.uid() and not is_admin() then
    return jsonb_build_object('status', 'forbidden');
  end if;

  if ev.lifecycle = 'cancelled' then
    return jsonb_build_object('status', 'cancelled');
  end if;

  select * into t from tickets where code_clean = any (ticket_codes);
  if not found then return jsonb_build_object('status', 'not_found'); end if;

  -- A real code, but not for this door. Said plainly, because at a venue
  -- running two events it is the likeliest mistake and "not found" would send
  -- somebody away who is holding a valid ticket.
  if t.event_id is distinct from p_event_id then
    return jsonb_build_object('status', 'wrong_event');
  end if;

  if t.status = 'refunded' then return jsonb_build_object('status', 'refunded'); end if;
  if t.status <> 'paid'   then return jsonb_build_object('status', 'not_found'); end if;

  -- Worked out before the branch rather than after it, because "already" now
  -- needs the name as much as "ok" does. The name on the ticket, falling back
  -- to the account's own: a ticket bought for somebody else carries the
  -- buyer's name, which is still who to ask for at the door.
  select coalesce(
           nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), ''),
           nullif(p.church_name, ''),
           t.email,
           'Guest')
    into attendee
    from profiles p where p.id = t.buyer_id;
  attendee := coalesce(attendee, coalesce(t.email, 'Guest'));

  select checked_in_at into seen from ticket_checkins where code = code_clean;
  if found then
    return jsonb_build_object(
      'status', 'already', 'at', seen,
      'name', attendee, 'seats', t.quantity, 'email', t.email);
  end if;

  begin
    insert into ticket_checkins (ticket_id, event_id, code, checked_in_by)
    values (t.id, t.event_id, code_clean, auth.uid());
  exception when unique_violation then
    -- Two doors, one code, same instant. The other one won.
    select checked_in_at into seen from ticket_checkins where code = code_clean;
    return jsonb_build_object(
      'status', 'already', 'at', seen,
      'name', attendee, 'seats', t.quantity, 'email', t.email);
  end;

  select checked_in_at into seen from ticket_checkins where code = code_clean;

  return jsonb_build_object(
    'status', 'ok',
    'name',   attendee,
    'seats',  t.quantity,
    'email',  t.email,
    'at',     seen
  );
end $$;

-- ── When each seat came in ─────────────────────────────────────────────────
-- One row per admitted code. The screen already knows which codes belong to
-- which holder, so it can put a time against a name without this having to
-- repeat the list.
--
-- Same door rule as everything else here: only the organiser of this event,
-- or an admin, sees it.
create or replace function event_checkins(p_event_id text)
returns table (
  code text,
  checked_in_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select ci.code, ci.checked_in_at
  from ticket_checkins ci
  join events e on e.id = ci.event_id
  where ci.event_id = p_event_id
    and (e.organizer_id = auth.uid() or is_admin())
  order by ci.checked_in_at;
$$;

revoke all on function event_checkins(text) from public, anon;
grant execute on function event_checkins(text) to authenticated;
