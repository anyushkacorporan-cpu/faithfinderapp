-- ============================================================================
-- FourCircle — the owner's moderation powers
--
-- Run this once in the Supabase SQL editor, then run the INSERT at the very
-- bottom to make yourself an admin. It is safe to run more than once.
--
-- Until now there was no such thing as an owner. 06_moderation.sql says so in
-- as many words: "there is deliberately no moderator role in the app yet,
-- because there is no moderator." Reports went into a table only the person
-- who filed one could read, and acting on anything meant opening the SQL
-- editor with the service role.
--
-- That is not good enough once the app is public. App Store guideline 1.2
-- asks for reported content to be acted on within 24 hours, and a process
-- that runs through hand-written SQL is one nobody keeps up for a week.
--
-- WHY A TABLE AND NOT A COLUMN ON profiles
--
-- A column on a row the user themselves can update is a column the user can
-- set. profiles is writable by its owner by design, so `profiles.is_admin`
-- would be an account upgrade anyone could grant themselves. This table has
-- no insert or update policy at all: a row can only be put here from the SQL
-- editor or with the service role, which is exactly the property wanted.
-- ============================================================================

create table if not exists admins (
  user_id   uuid primary key references auth.users (id) on delete cascade,
  added_at  timestamptz not null default now(),
  -- Who this is, in words, so a list of uuids is still readable in a year.
  note      text
);

alter table admins enable row level security;

-- An admin may confirm they are one. Nobody may read the list of admins, and
-- nobody at all may write to this table through the API — the absence of an
-- insert policy is the point, not an oversight.
drop policy if exists admins_self on admins;
create policy admins_self on admins
  for select using (auth.uid() = user_id);

grant select on public.admins to authenticated;

-- ── The test every policy below is written against ─────────────────────────
--
-- security definer so it answers the same whatever the caller can see, and
-- with search_path pinned for the reason 20_function_search_path.sql gives:
-- a definer function that resolves `admins` through a caller-supplied path
-- resolves it to a table the caller made.
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

revoke all on function is_admin() from public;
grant execute on function is_admin() to authenticated;

-- ── The queue ──────────────────────────────────────────────────────────────
-- Reporters keep seeing only their own reports (reports_select_own, still in
-- place). An admin sees all of them, and is the only one who can close one.

drop policy if exists reports_select_admin on reports;
create policy reports_select_admin on reports
  for select using (is_admin());

drop policy if exists reports_update_admin on reports;
create policy reports_update_admin on reports
  for update using (is_admin()) with check (is_admin());

-- ── Taking content down ────────────────────────────────────────────────────
--
-- Delete rather than a hidden flag, deliberately. Every screen in the app
-- reads these tables directly, so a flag would mean teaching a dozen queries
-- about it and getting one wrong; and content removed for being abusive is
-- not content worth keeping a copy of. The report's snapshot already holds
-- what it said, which is the copy that matters.
--
-- The owner's own posts and events are already covered by the _own policies.
-- These are additions: a row is deletable by its author OR by an admin.

drop policy if exists posts_delete_admin on posts;
create policy posts_delete_admin on posts
  for delete using (is_admin());

drop policy if exists comments_delete_admin on comments;
create policy comments_delete_admin on comments
  for delete using (is_admin());

drop policy if exists events_delete_admin on events;
create policy events_delete_admin on events
  for delete using (is_admin());

-- An admin can also see a draft event, which is the only way to judge one
-- that was reported before it was published.
drop policy if exists events_select_admin on events;
create policy events_select_admin on events
  for select using (is_admin());

-- ── Revoking a church claim ────────────────────────────────────────────────
--
-- Not the same as approving one — claims are still granted the moment they
-- are made, and a queue for them is a separate change with its own decisions
-- about what a pending claim may show. This is the part that cannot wait:
-- somebody claiming a church that is not theirs can currently rewrite its
-- name, address and phone number in the directory, and until now nobody could
-- undo it.

drop policy if exists profiles_admin_update on church_profiles;
create policy profiles_admin_update on church_profiles
  for update using (is_admin()) with check (is_admin());

drop policy if exists profiles_admin_delete on church_profiles;
create policy profiles_admin_delete on church_profiles
  for delete using (is_admin());

-- ── Making yourself the admin ──────────────────────────────────────────────
--
-- Run this on its own, signed in to the SQL editor, with your own address.
-- The editor runs as the service role, which is why this works here and from
-- nowhere else:
--
--   insert into admins (user_id, note)
--   select id, 'Annie — owner'
--   from auth.users
--   where email = 'anyushka.corporan@gmail.com'
--   on conflict (user_id) do nothing;
--
-- And to check it took:
--
--   select u.email, a.added_at, a.note
--   from admins a join auth.users u on u.id = a.user_id;
