-- ============================================================================
-- FaithFinder — saved churches, on the account
--
-- 16_saved_and_hidden.sql moved saved events and hidden posts onto the account
-- and left saved churches behind on the phone. Nothing marked the omission, so
-- the heart on a church card has been the one save in the app that does not
-- survive a reinstall: saved events come back when you sign in on a new phone
-- and the churches do not, which reads as the app losing them rather than as a
-- feature that was never finished.
--
-- WHY THE WHOLE CHURCH AND NOT JUST ITS ID
--
-- saved_events stores an event_id and the screen resolves it. That was tried
-- here and is the bug this table exists after: a saved church was an id, the
-- Saved tab rebuilt each one by looking the id up in whatever happened to be on
-- screen, and the tab button cleared the search results in the same tap that
-- opened the tab. The list came back empty under a heading that still counted
-- it.
--
-- An id is only enough when the thing behind it can always be fetched again. A
-- church here can come from the directory, from Google, or from the seeded demo
-- list, and two of those three cannot be looked up by us at all. So the row
-- carries the church.
--
-- The snapshot is what gets drawn, which means a church that is renamed or
-- gains a photo keeps the older version in somebody's saved list until they
-- save it again. That is the trade for a list that is never empty when it
-- should not be, and it is the right way round: stale is a smaller wrong than
-- missing. Refreshing the directory-backed ones on read is a later change and
-- does not need this file to be different.
--
-- No foreign key, for the reason 16_saved_and_hidden.sql gives: church_id can
-- name a Google place or a seeded church that exists in no table here, and a
-- foreign key would refuse exactly the saves people make most.
-- ============================================================================

create table if not exists saved_churches (
  user_id    uuid not null references auth.users (id) on delete cascade,
  church_id  text not null,
  -- The church as the app holds it. Shapes differ by source, so this is not
  -- pinned to a column list that the next source would not fit.
  church     jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, church_id)
);

alter table saved_churches enable row level security;

-- Yours alone, in both directions. Which churches someone is considering is
-- not public, and on the church's side it is not an endorsement to publish.
drop policy if exists saved_churches_own on saved_churches;
create policy saved_churches_own on saved_churches
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 21_data_api_grants.sql explains why this is written down rather than left to
-- Supabase: from 30 October a new table in the public schema gets no automatic
-- Data API grant, and without one every read returns permission denied with
-- nothing in the schema to say why. RLS above is the security boundary; this
-- only says the role may address the table.
grant select, insert, update, delete on public.saved_churches to authenticated;
