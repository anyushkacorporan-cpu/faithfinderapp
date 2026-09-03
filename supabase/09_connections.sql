-- ============================================================================
-- FaithFinder — connections
--
-- Following someone lived on the phone, so the "For You" feed was built from a
-- list nobody else could see, connection counts were per-device, and posts set
-- to "connections only" had to be hidden from everyone including the people
-- they were meant for — this database could not tell who was connected to whom.
-- ============================================================================

create table if not exists connections (
  follower_id  uuid not null references auth.users (id) on delete cascade,

  -- Text, because the thing being followed is not always an account: a church
  -- followed from the directory is a Google Place ID, and connections made
  -- before accounts had ids are stored under a display name. All three have to
  -- live in one column or the same church becomes two connections.
  target_id    text not null,

  target_name     text not null,
  target_type     text not null default 'user' check (target_type in ('user', 'church')),
  target_color    text,
  target_initials text,
  address         text,
  place_id        text,

  created_at   timestamptz not null default now(),
  primary key (follower_id, target_id)
);

create index if not exists connections_target_idx on connections (target_id);

alter table connections enable row level security;

-- Your own list, plus the rows that point at you — the second half is what
-- lets a profile say how many people follow it without exposing everyone
-- else's following list.
drop policy if exists connections_select on connections;
create policy connections_select on connections
  for select using (
    auth.uid() = follower_id or target_id = auth.uid()::text
  );

drop policy if exists connections_insert_own on connections;
create policy connections_insert_own on connections
  for insert with check (auth.uid() = follower_id);

drop policy if exists connections_delete_own on connections;
create policy connections_delete_own on connections
  for delete using (auth.uid() = follower_id);

-- ── Connections-only posts ─────────────────────────────────────────────────
-- Until now these resolved to author-only, because nothing here knew who was
-- connected to whom.
--
-- The rule is that the AUTHOR must be connected to the viewer, not the other
-- way round. Following is one-directional in this app, so if the viewer's own
-- follow were enough, anyone could read a connections-only post by following
-- its author first — the restriction would grant exactly the access it exists
-- to withhold. "My connections" has to mean the list the author chose.
drop policy if exists posts_select on posts;
create policy posts_select on posts
  for select using (
    visibility = 'public'
    or auth.uid() = author_id
    or exists (
      select 1 from connections c
      where c.follower_id = posts.author_id
        and c.target_id = auth.uid()::text
    )
  );
