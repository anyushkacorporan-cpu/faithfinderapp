-- ============================================================================
-- FaithFinder — notifications
--
-- The bell showed a hardcoded list. Every account saw the same "John Smith
-- liked your post" on first run, and nothing anyone actually did ever produced
-- a notification: liking, commenting and following notified no one, because
-- the only code that could create one ran on the phone of the person doing it,
-- and that phone is not the one that should hear about it.
--
-- So notifications are made here, by the same statement that makes the thing
-- being announced. A like and its notification are one transaction: there is
-- no window where the like landed and the notification did not, and no way for
-- a client to skip the notification for a like it would rather stayed quiet.
--
-- Nothing readable is stored. The row holds who did what to which post; the
-- app writes the sentence. That keeps notifications translatable — the Spanish
-- reader gets a Spanish sentence for a notification created while they were
-- offline — and stops a name being frozen into text that outlives the rename.
-- ============================================================================

create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),

  -- Who hears about it. Every policy on this table is about this column.
  user_id     uuid not null references auth.users (id) on delete cascade,

  -- Who did it. Null once their account is gone, which is why the name is
  -- copied alongside: "Someone liked your post" beats a blank.
  actor_id    uuid references auth.users (id) on delete set null,
  actor_name  text,

  type        text not null check (type in ('like', 'comment', 'reply', 'follow', 'announcement')),

  -- A snippet of the post or comment, for the second line. Not the sentence.
  body        text,

  post_id     text references posts (id) on delete cascade,
  comment_id  text references comments (id) on delete cascade,

  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on notifications (user_id, created_at desc);

-- Liking, unliking and liking again is one notification, not three. Paired
-- with the delete on unlike below, so the bell follows the current state
-- rather than accumulating a history of someone's indecision.
create unique index if not exists notifications_like_once
  on notifications (user_id, actor_id, post_id) where type = 'like';

alter table notifications enable row level security;

-- Yours and only yours. There is deliberately no insert policy: rows are made
-- by the triggers below, which run as the definer. A client cannot post a
-- notification into someone else's bell.
drop policy if exists notifications_select_own on notifications;
create policy notifications_select_own on notifications
  for select using (auth.uid() = user_id);

drop policy if exists notifications_update_own on notifications;
create policy notifications_update_own on notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists notifications_delete_own on notifications;
create policy notifications_delete_own on notifications
  for delete using (auth.uid() = user_id);

-- ── Who did it ──────────────────────────────────────────────────────────────

-- A church account is its church name; a personal account is its two names.
-- Falls back rather than returning null: a notification with no actor still
-- reads as a sentence.
create or replace function display_name_of(uid uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    (select coalesce(
       nullif(btrim(coalesce(p.church_name, '')), ''),
       nullif(btrim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ''))
     from profiles p where p.id = uid),
    'Someone');
$$;

-- ── Likes ───────────────────────────────────────────────────────────────────

create or replace function notify_post_like()
returns trigger language plpgsql security definer set search_path = public as $$
declare author uuid; snippet text;
begin
  select author_id, left(content, 120) into author, snippet
    from posts where id = new.post_id;

  -- Liking your own post is not news.
  if author is null or author = new.user_id then return new; end if;

  insert into notifications (user_id, actor_id, actor_name, type, body, post_id)
  values (author, new.user_id, display_name_of(new.user_id), 'like', snippet, new.post_id)
  on conflict do nothing;
  return new;
end $$;

drop trigger if exists post_likes_notify on post_likes;
create trigger post_likes_notify after insert on post_likes
  for each row execute function notify_post_like();

create or replace function unnotify_post_like()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from notifications
   where type = 'like' and post_id = old.post_id and actor_id = old.user_id;
  return old;
end $$;

drop trigger if exists post_likes_unnotify on post_likes;
create trigger post_likes_unnotify after delete on post_likes
  for each row execute function unnotify_post_like();

-- ── Comments and replies ────────────────────────────────────────────────────

create or replace function notify_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare post_author uuid; parent_author uuid; who text;
begin
  select author_id into post_author from posts where id = new.post_id;
  who := display_name_of(new.author_id);

  if post_author is not null and post_author <> new.author_id then
    insert into notifications (user_id, actor_id, actor_name, type, body, post_id, comment_id)
    values (post_author, new.author_id, who, 'comment',
            left(new.text, 120), new.post_id, new.id);
  end if;

  -- A reply also reaches the person being replied to — unless that is the post
  -- author, who has just been told, or the replier themselves.
  if new.parent_id is not null then
    select author_id into parent_author from comments where id = new.parent_id;
    if parent_author is not null
       and parent_author <> new.author_id
       and parent_author is distinct from post_author then
      insert into notifications (user_id, actor_id, actor_name, type, body, post_id, comment_id)
      values (parent_author, new.author_id, who, 'reply',
              left(new.text, 120), new.post_id, new.id);
    end if;
  end if;

  return new;
end $$;

drop trigger if exists comments_notify on comments;
create trigger comments_notify after insert on comments
  for each row execute function notify_comment();

-- ── Follows ─────────────────────────────────────────────────────────────────

create or replace function notify_connection()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- target_id holds three kinds of thing (see 09_connections.sql): an account
  -- id, a Google Place ID, or a bare display name. Only the first names
  -- somebody with a bell to ring, so anything that is not a uuid is skipped
  -- rather than cast — a cast would raise and take the follow down with it.
  if new.target_type <> 'user' then return new; end if;
  if new.target_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then return new; end if;
  if new.target_id::uuid = new.follower_id then return new; end if;

  insert into notifications (user_id, actor_id, actor_name, type)
  values (new.target_id::uuid, new.follower_id,
          display_name_of(new.follower_id), 'follow');
  return new;
end $$;

drop trigger if exists connections_notify on connections;
create trigger connections_notify after insert on connections
  for each row execute function notify_connection();

-- ── Church announcements ────────────────────────────────────────────────────

create or replace function notify_announcement()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not new.is_announcement then return new; end if;

  -- Followers reach a church by two different keys: people who followed the
  -- account, and people who followed the directory listing before it was ever
  -- claimed. Both are the same church to the person who followed it.
  insert into notifications (user_id, actor_id, actor_name, type, body, post_id)
  select c.follower_id, new.author_id, new.author_name, 'announcement',
         left(new.content, 120), new.id
    from connections c
   where (c.target_id = new.author_id::text
          or (new.church_place_id is not null and c.target_id = new.church_place_id))
     and c.follower_id <> new.author_id;

  return new;
end $$;

drop trigger if exists posts_notify_announcement on posts;
create trigger posts_notify_announcement after insert on posts
  for each row execute function notify_announcement();
