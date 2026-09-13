-- ============================================================================
-- FaithFinder — the other five notifications
--
-- Settings → Notification Preferences offers eight switches. Three of them —
-- Likes, Comments, Announcements — governed something real. The other five
-- governed nothing at all: Shares, Church Updates, Events, Invitations and
-- Verification Updates saved their position, pushed it to the server, and
-- filtered a list that never had a row of that type in it, because no code
-- anywhere created one. A switch that does nothing is worse than a missing
-- switch. It is a promise the app keeps making and quietly not keeping.
--
-- So this file makes the five kinds of notification those switches name, and
-- wires each to the same preference gate as the first three.
--
-- Three of them need somewhere to put the thing being announced:
--
--   event_invites          an invitation is a fact about two people and an
--                          event, and until now it existed only as text in an
--                          iMessage. The share sheet still opens — that is how
--                          you invite someone who has no account — but a person
--                          who does have one now gets it in the app as well.
--
--   notifications.event_id which event. Deliberately no foreign key, for the
--                          same reason as 16_saved_and_hidden.sql: an event can
--                          be a seeded one that lives only in the app, and a
--                          foreign key would refuse the row rather than let the
--                          notification through.
--
--   verification_status    the claim flow set "pending" in AsyncStorage and
--                          nothing ever moved it, so no church has ever been
--                          told anything about its claim. It lives on the
--                          profile now. Review is a person reading the claim
--                          and setting the column; the telling is automatic.
-- ============================================================================

-- ── Room for the new kinds ──────────────────────────────────────────────────

alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in ('like', 'comment', 'reply', 'follow', 'announcement',
                  'share', 'church_post', 'event', 'invite', 'verification'));

alter table notifications add column if not exists event_id text;

-- One notification per person per event, whichever way it was earned. An event
-- published, unpublished and published again is the same event; so is an event
-- you are invited to twice.
create unique index if not exists notifications_event_once
  on notifications (user_id, event_id, type)
  where event_id is not null;

-- ── Shares ──────────────────────────────────────────────────────────────────
--
-- A repost carries the original inside repost_of, so the author to tell is
-- found by looking up the id it names rather than trusting a name copied into
-- the json. Reposting a repost stores the original (see repostPost in
-- postsStore.ts), so the person told is always the one who wrote the words.

create or replace function notify_repost()
returns trigger language plpgsql security definer set search_path = public as $$
declare original_author uuid; snippet text;
begin
  if new.repost_of is null then return new; end if;

  select author_id, left(content, 120) into original_author, snippet
    from posts where id = new.repost_of ->> 'id';

  if original_author is null or original_author = new.author_id then return new; end if;
  if not wants_notification(original_author, 'shares') then return new; end if;

  insert into notifications (user_id, actor_id, actor_name, type, body, post_id)
  values (original_author, new.author_id, display_name_of(new.author_id),
          'share', snippet, new.id)
  on conflict do nothing;
  return new;
end $$;

drop trigger if exists posts_notify_repost on posts;
create trigger posts_notify_repost after insert on posts
  for each row execute function notify_repost();

-- ── Church updates ──────────────────────────────────────────────────────────
--
-- An ordinary post by a church you follow. Announcements are excluded because
-- they have their own switch and their own trigger; a post cannot be both, so
-- nobody is told twice about one post.
--
-- Followers are found by the two keys a church can be followed under — the
-- account, and the directory listing it claimed — exactly as announcements do
-- it. Somebody who followed it both ways is one person, hence the distinct.

create or replace function notify_church_post()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.author_type <> 'church' or new.is_announcement then return new; end if;

  insert into notifications (user_id, actor_id, actor_name, type, body, post_id)
  select distinct c.follower_id, new.author_id, new.author_name, 'church_post',
         left(coalesce(nullif(new.content, ''), new.repost_comment, ''), 120), new.id
    from connections c
   where (c.target_id = new.author_id::text
          or (new.church_place_id is not null and c.target_id = new.church_place_id))
     and c.follower_id <> new.author_id
     and wants_notification(c.follower_id, 'churchPosts')
  on conflict do nothing;

  return new;
end $$;

drop trigger if exists posts_notify_church_post on posts;
create trigger posts_notify_church_post after insert on posts
  for each row execute function notify_church_post();

-- ── Events ──────────────────────────────────────────────────────────────────
--
-- Two ways to be interested in a new event: you follow whoever is putting it
-- on, or it is happening where you live. Both are one notification, not two —
-- the unique index above collapses somebody who is both.
--
-- "Where you live" is profiles.location against the event's city and state.
-- The profile stores it as free text ("Austin, TX"), which is what the edit
-- screen has always asked for, so the comparison splits on the comma rather
-- than pretending there are two columns. State is checked only when the event
-- names one: an event with a city and no state should still reach that city.
--
-- Drafts tell nobody. Publishing one later does, which is why this fires on
-- update as well — an event written over a week and published on Friday is new
-- to everyone else on Friday.

create or replace function notify_new_event()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'draft' then return new; end if;
  if new.organizer_id is null then return new; end if;

  insert into notifications (user_id, actor_id, actor_name, type, body, event_id)
  select distinct u.id, new.organizer_id, display_name_of(new.organizer_id),
         'event', left(new.title, 120), new.id
    from (
      -- People who follow the organiser's account.
      select c.follower_id as id
        from connections c
       where c.target_id = new.organizer_id::text

      union

      -- People whose profile says they live where this is happening.
      select p.id
        from profiles p
       where coalesce(btrim(new.city), '') <> ''
         and lower(btrim(split_part(coalesce(p.location, ''), ',', 1))) = lower(btrim(new.city))
         and (coalesce(btrim(new.state), '') = ''
              or lower(btrim(split_part(coalesce(p.location, ''), ',', 2))) = lower(btrim(new.state)))
    ) u
   where u.id <> new.organizer_id
     and wants_notification(u.id, 'events')
  on conflict do nothing;

  return new;
end $$;

drop trigger if exists events_notify_new on events;
create trigger events_notify_new after insert on events
  for each row execute function notify_new_event();

drop trigger if exists events_notify_published on events;
create trigger events_notify_published after update on events
  for each row when (old.status = 'draft' and new.status <> 'draft')
  execute function notify_new_event();

-- ── Invitations ─────────────────────────────────────────────────────────────

create table if not exists event_invites (
  -- No foreign key on the event, same as 16_saved_and_hidden.sql.
  event_id    text not null,
  event_title text,
  inviter_id  uuid not null references auth.users (id) on delete cascade,
  invitee_id  uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (event_id, inviter_id, invitee_id)
);

create index if not exists event_invites_invitee_idx on event_invites (invitee_id);

alter table event_invites enable row level security;

-- You can see an invitation you sent or one you were sent, and you can only
-- send one as yourself. Nobody can invite on someone else's behalf.
drop policy if exists event_invites_visible on event_invites;
create policy event_invites_visible on event_invites
  for select using (auth.uid() = inviter_id or auth.uid() = invitee_id);

drop policy if exists event_invites_send on event_invites;
create policy event_invites_send on event_invites
  for insert with check (auth.uid() = inviter_id);

drop policy if exists event_invites_withdraw on event_invites;
create policy event_invites_withdraw on event_invites
  for delete using (auth.uid() = inviter_id);

create or replace function notify_invite()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.invitee_id = new.inviter_id then return new; end if;
  if not wants_notification(new.invitee_id, 'invites') then return new; end if;

  insert into notifications (user_id, actor_id, actor_name, type, body, event_id)
  values (new.invitee_id, new.inviter_id, display_name_of(new.inviter_id),
          'invite', left(coalesce(new.event_title, ''), 120), new.event_id)
  on conflict do nothing;
  return new;
end $$;

drop trigger if exists event_invites_notify on event_invites;
create trigger event_invites_notify after insert on event_invites
  for each row execute function notify_invite();

-- ── Verification ────────────────────────────────────────────────────────────

alter table profiles add column if not exists verification_status text not null default 'none';

alter table profiles drop constraint if exists profiles_verification_status_check;
alter table profiles add constraint profiles_verification_status_check
  check (verification_status in ('none', 'pending', 'approved', 'rejected'));

-- A church cannot verify itself.
--
-- The profile update policy is "your own row", which is right for a bio and
-- wrong for this: without a guard, anyone could set approved on themselves and
-- wear the badge. A signed-in account may only move its own claim to pending —
-- that is what submitting the claim form means. Anything else is put back.
--
-- auth.uid() is null for the service role and in the SQL editor, which is where
-- the review actually happens: reading the claim and setting the column.
create or replace function guard_verification_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.verification_status is distinct from old.verification_status
     and auth.uid() is not null
     and not (old.verification_status in ('none', 'rejected')
              and new.verification_status = 'pending')
  then
    new.verification_status := old.verification_status;
  end if;
  return new;
end $$;

drop trigger if exists profiles_guard_verification on profiles;
create trigger profiles_guard_verification before update on profiles
  for each row execute function guard_verification_status();

-- Only the answers are worth a notification. "Pending" is something the church
-- just did itself and is already looking at; approved and rejected are news.
--
-- The status goes in body rather than a sentence: the app writes the words, so
-- a church reading in Spanish gets a Spanish one.
create or replace function notify_verification()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.verification_status is not distinct from old.verification_status then return new; end if;
  if new.verification_status not in ('approved', 'rejected') then return new; end if;
  if not wants_notification(new.id, 'verification') then return new; end if;

  insert into notifications (user_id, type, body)
  values (new.id, 'verification', new.verification_status);
  return new;
end $$;

drop trigger if exists profiles_notify_verification on profiles;
create trigger profiles_notify_verification after update on profiles
  for each row execute function notify_verification();
