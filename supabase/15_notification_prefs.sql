-- ============================================================================
-- FaithFinder — notification preferences the database can see
--
-- Settings → Notification Preferences has eight switches, and every one of them
-- saved its position correctly and changed nothing else. Notifications are made
-- by triggers (13_notifications.sql), and a trigger cannot read a preference
-- that lives in AsyncStorage on somebody's phone. The switches filtered the
-- list after the fact: the row was still written, still counted toward the
-- badge until the filter ran, and turning a switch back on revealed everything
-- that had happened while it was off.
--
-- The preference now travels with the account, so the row is never written.
--
-- Absent means on. A profile that has never saved preferences gets everything,
-- which is what the app defaults to, and a new preference added later defaults
-- to on for everyone rather than silently off.
-- ============================================================================

alter table profiles add column if not exists notification_prefs jsonb not null default '{}'::jsonb;

create or replace function wants_notification(uid uuid, kind text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select (p.notification_prefs ->> kind)::boolean from profiles p where p.id = uid),
    true);
$$;

-- ── Likes ───────────────────────────────────────────────────────────────────

create or replace function notify_post_like()
returns trigger language plpgsql security definer set search_path = public as $$
declare author uuid; snippet text;
begin
  select author_id, left(content, 120) into author, snippet
    from posts where id = new.post_id;

  if author is null or author = new.user_id then return new; end if;
  if not wants_notification(author, 'likes') then return new; end if;

  insert into notifications (user_id, actor_id, actor_name, type, body, post_id)
  values (author, new.user_id, display_name_of(new.user_id), 'like', snippet, new.post_id)
  on conflict do nothing;
  return new;
end $$;

-- ── Comments and replies ────────────────────────────────────────────────────
--
-- Both answer to the Comments switch. A reply is a comment with a parent, and
-- the app already folds the two together when it reads them back.

create or replace function notify_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare post_author uuid; parent_author uuid; who text;
begin
  select author_id into post_author from posts where id = new.post_id;
  who := display_name_of(new.author_id);

  if post_author is not null and post_author <> new.author_id
     and wants_notification(post_author, 'comments') then
    insert into notifications (user_id, actor_id, actor_name, type, body, post_id, comment_id)
    values (post_author, new.author_id, who, 'comment',
            left(new.text, 120), new.post_id, new.id);
  end if;

  if new.parent_id is not null then
    select author_id into parent_author from comments where id = new.parent_id;
    if parent_author is not null
       and parent_author <> new.author_id
       and parent_author is distinct from post_author
       and wants_notification(parent_author, 'comments') then
      insert into notifications (user_id, actor_id, actor_name, type, body, post_id, comment_id)
      values (parent_author, new.author_id, who, 'reply',
              left(new.text, 120), new.post_id, new.id);
    end if;
  end if;

  return new;
end $$;

-- ── Follows ─────────────────────────────────────────────────────────────────
--
-- No switch for this one. Settings offers eight and a follow is not among them,
-- so it stays on — which is the honest reading of a preference nobody has been
-- given the chance to express.

create or replace function notify_connection()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.target_type <> 'user' then return new; end if;
  if new.target_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then return new; end if;
  if new.target_id::uuid = new.follower_id then return new; end if;

  insert into notifications (user_id, actor_id, actor_name, type)
  values (new.target_id::uuid, new.follower_id,
          display_name_of(new.follower_id), 'follow');
  return new;
end $$;

-- ── Church announcements ────────────────────────────────────────────────────
--
-- Filtered in the select rather than after it, so a follower who has the switch
-- off is never written a row at all.

create or replace function notify_announcement()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not new.is_announcement then return new; end if;

  insert into notifications (user_id, actor_id, actor_name, type, body, post_id)
  select c.follower_id, new.author_id, new.author_name, 'announcement',
         left(new.content, 120), new.id
    from connections c
   where (c.target_id = new.author_id::text
          or (new.church_place_id is not null and c.target_id = new.church_place_id))
     and c.follower_id <> new.author_id
     and wants_notification(c.follower_id, 'announcements');

  return new;
end $$;
