-- ============================================================================
-- FaithFinder — saved events and hidden posts, on the account
--
-- Both lived only on the phone. Saving an event and then signing in on another
-- device lost the list; hiding a post you would rather not see again hid it on
-- one device and nowhere else, so it came back the moment anything changed
-- phones. Neither is dramatic on its own, and both are the kind of thing
-- someone notices as the app quietly forgetting what they told it.
--
-- Deliberately no foreign key on either id.
--
-- An event can be a seeded demo event that lives only in the app, and a post
-- can be one written while offline that has not been uploaded yet. A foreign
-- key would refuse to save those — which is exactly how ticket purchases broke
-- (see 14_fix_like_counts.sql for the other half of that story). A row here
-- that points at something no longer present is harmless: it is filtered out
-- when the list is read, because the thing it names is simply not there.
-- ============================================================================

create table if not exists saved_events (
  user_id    uuid not null references auth.users (id) on delete cascade,
  event_id   text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

create table if not exists hidden_posts (
  user_id    uuid not null references auth.users (id) on delete cascade,
  post_id    text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

alter table saved_events enable row level security;
alter table hidden_posts enable row level security;

-- Yours alone, in both directions. What someone has saved is not public, and
-- what they have chosen not to see is nobody else's business at all.
drop policy if exists saved_events_own on saved_events;
create policy saved_events_own on saved_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists hidden_posts_own on hidden_posts;
create policy hidden_posts_own on hidden_posts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
