-- ============================================================================
-- FourCircle — checking people in at the door
--
-- A ticket row can hold several seats: ticket_codes is an array, one code per
-- seat, because somebody buying four tickets gets four codes on one purchase.
-- So checking in is per CODE, not per row -- a family of four can arrive in
-- twos, and marking the row would let the other two walk in on a code already
-- used, or stop them coming in at all.
--
-- One row here per person through the door.
-- ============================================================================

create table if not exists ticket_checkins (
  id            uuid primary key default gen_random_uuid(),
  ticket_id     text not null references tickets (id) on delete cascade,
  event_id      text not null references events (id) on delete cascade,
  -- The seat. Unique across the table, which is what makes a code single-use:
  -- the second scan loses the insert rather than being allowed by a check
  -- that read the table a moment earlier.
  code          text not null unique,
  checked_in_at timestamptz not null default now(),
  checked_in_by uuid references auth.users (id) on delete set null
);

create index if not exists ticket_checkins_event_idx on ticket_checkins (event_id);

alter table ticket_checkins enable row level security;

-- Only the organiser of that event, and an admin. Nothing writes through the
-- API anyway -- check_in_ticket() below does it -- but a door list is an
-- attendance record and should not be readable by the people on it.
drop policy if exists ticket_checkins_organizer on ticket_checkins;
create policy ticket_checkins_organizer on ticket_checkins
  for select using (
    is_admin()
    or exists (select 1 from events e
                where e.id = ticket_checkins.event_id and e.organizer_id = auth.uid())
  );


-- ── The door ───────────────────────────────────────────────────────────────
/**
 * Admit one code, and say what happened.
 *
 * Every answer a door needs, in one call, because the alternative is three
 * round trips while somebody stands in the rain:
 *
 *   ok          let them in. name and seats say who and how many.
 *   already     this code has been through. `at` says when.
 *   wrong_event a real code, for a different event.
 *   refunded    bought and given back.
 *   cancelled   the event is off.
 *   not_found   no such code.
 *
 * Single-use is enforced by the unique index rather than by looking first:
 * two phones scanning the same code at the same instant both pass a check and
 * only one survives the insert, which is the point.
 */
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

  select checked_in_at into seen from ticket_checkins where code = code_clean;
  if found then
    return jsonb_build_object('status', 'already', 'at', seen);
  end if;

  begin
    insert into ticket_checkins (ticket_id, event_id, code, checked_in_by)
    values (t.id, t.event_id, code_clean, auth.uid());
  exception when unique_violation then
    -- Two doors, one code, same instant. The other one won.
    select checked_in_at into seen from ticket_checkins where code = code_clean;
    return jsonb_build_object('status', 'already', 'at', seen);
  end;

  -- The name on the ticket, falling back to the account's own. A ticket
  -- bought for somebody else carries the buyer's name, which is still who to
  -- ask for at the door.
  select coalesce(
           nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), ''),
           nullif(p.church_name, ''),
           t.email,
           'Guest')
    into attendee
    from profiles p where p.id = t.buyer_id;

  return jsonb_build_object(
    'status', 'ok',
    'name',   coalesce(attendee, coalesce(t.email, 'Guest')),
    'seats',  t.quantity,
    'email',  t.email
  );
end $$;

revoke all on function check_in_ticket(text, text) from public;
grant execute on function check_in_ticket(text, text) to authenticated;


-- ── The list, and the running count ────────────────────────────────────────
-- What the organiser sees beside the scanner: who is expected, who is in, and
-- the codes, so a phone can keep scanning when the venue has no signal.
create or replace function event_attendees(p_event_id text)
returns table (
  ticket_id text,
  name text,
  email text,
  seats integer,
  codes text[],
  checked_in integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.id,
    coalesce(
      nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), ''),
      nullif(p.church_name, ''),
      t.email,
      'Guest'),
    t.email,
    t.quantity,
    t.ticket_codes,
    (select count(*)::int from ticket_checkins ci
      where ci.code = any (t.ticket_codes))
  from tickets t
  left join profiles p on p.id = t.buyer_id
  join events e on e.id = t.event_id
  where t.event_id = p_event_id
    and t.status = 'paid'
    and (e.organizer_id = auth.uid() or is_admin())
  order by 2;
$$;

revoke all on function event_attendees(text) from public;
grant execute on function event_attendees(text) to authenticated;
