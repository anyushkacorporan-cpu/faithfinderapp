-- ============================================================================
-- FourCircle — what changed about an event, recorded where both halves exist
--
-- An organiser edits an event and everybody registered should hear about it.
-- Two things make that harder than it sounds.
--
-- 1. ONLY THE DATABASE SEES BOTH VALUES.
--
--    By the time anything else could ask, the row holds the new value and the
--    old one is gone. edit-event sends a whole row and does not know which
--    fields it changed; an edge function reading afterwards sees only the
--    result. A trigger sees OLD and NEW together, so the diff is captured
--    here and nowhere else.
--
-- 2. THERE IS NO SCHEDULER.
--
--    So the row is written here and sent by the event-notify function, which
--    the app calls after a save. If that call never happens -- no signal, app
--    killed, function not deployed -- the row stays with sent_at null and goes
--    out on the next flush. The notice is delayed rather than lost, and the
--    edit itself never depends on the email working.
--
-- WHAT COUNTS AS A CHANGE
--
-- title, date, time, location, starts_at, ends_at, and cancellation.
--
-- description is deliberately not in that list. Fixing a typo in the blurb is
-- not news, and a mail for every small edit teaches people to ignore the ones
-- that matter.
-- ============================================================================

create table if not exists event_change_log (
  id          uuid primary key default gen_random_uuid(),
  event_id    text not null references events (id) on delete cascade,

  kind        text not null check (kind in ('changed', 'cancelled')),
  -- [{"field":"date","old":"Sun, Nov 8, 2026","new":"Sun, Nov 15, 2026"}]
  changes     jsonb not null default '[]'::jsonb,

  created_at  timestamptz not null default now(),
  -- Null until it has actually gone. This is what stops a retry sending the
  -- same notice twice, and what lets a missed flush catch up later.
  sent_at     timestamptz,
  recipients  integer,
  send_error  text
);

create index if not exists event_change_log_unsent_idx
  on event_change_log (event_id) where sent_at is null;

alter table event_change_log enable row level security;

-- Nobody reads this through the API. The organiser sees their own event, the
-- attendee gets the mail, and the function that sends it uses the service
-- role, which does not consult policies. An admin can look.
drop policy if exists event_change_log_admin on event_change_log;
create policy event_change_log_admin on event_change_log
  for select using (is_admin());


-- ── The diff, caught where both values exist ───────────────────────────────
create or replace function log_event_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  diff jsonb := '[]'::jsonb;
begin
  -- Cancellation is its own kind of news and says something different, so it
  -- is reported on its own rather than as "lifecycle changed".
  if new.lifecycle = 'cancelled' and coalesce(old.lifecycle, '') <> 'cancelled' then
    insert into event_change_log (event_id, kind, changes)
    values (new.id, 'cancelled', '[]'::jsonb);
    return new;
  end if;

  if new.title is distinct from old.title then
    diff := diff || jsonb_build_array(jsonb_build_object(
      'field', 'title', 'old', old.title, 'new', new.title));
  end if;
  if new.date is distinct from old.date then
    diff := diff || jsonb_build_array(jsonb_build_object(
      'field', 'date', 'old', old.date, 'new', new.date));
  end if;
  if new.time is distinct from old.time then
    diff := diff || jsonb_build_array(jsonb_build_object(
      'field', 'time', 'old', old.time, 'new', new.time));
  end if;
  if new.location is distinct from old.location then
    diff := diff || jsonb_build_array(jsonb_build_object(
      'field', 'location', 'old', old.location, 'new', new.location));
  end if;

  -- Nothing to tell anybody.
  if jsonb_array_length(diff) = 0 then
    return new;
  end if;

  insert into event_change_log (event_id, kind, changes)
  values (new.id, 'changed', diff);
  return new;
end $$;

comment on function log_event_change() is
  'Records title, date, time and location changes, and cancellation, for '
  'event-notify to mail out. description is excluded on purpose: a typo fix '
  'is not news, and mailing every edit teaches people to ignore the ones '
  'that matter.';

drop trigger if exists events_log_change on events;
create trigger events_log_change after update on events
  for each row execute function log_event_change();
