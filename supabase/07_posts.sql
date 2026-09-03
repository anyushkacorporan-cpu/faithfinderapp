-- ============================================================================
-- FaithFinder — posts
--
-- Until now every post lived in AsyncStorage on the phone that wrote it. The
-- community feed was therefore not a community: you saw your own posts and the
-- seeded demo ones, and nothing you wrote ever reached another person. The
-- screens were all real; there was simply nowhere for the content to go.
--
-- Stage 1 of the move: the posts themselves. Comments, replies and likes stay
-- on the device for now and follow in later stages, which is why the counts
-- below are plain numbers rather than derived from tables that do not exist
-- yet.
-- ============================================================================

create table if not exists posts (
  -- Text, not uuid, and supplied by the app rather than generated here.
  -- A post is written and rendered locally before the insert returns, and
  -- reports already reference posts by that id — issuing a second id server
  -- side would mean two names for one post and a mapping to keep in step.
  id            text primary key,

  author_id     uuid not null references auth.users (id) on delete cascade,

  -- Denormalised author details, copied at write time.
  --
  -- A post should read the way it did when it was written: renaming an account
  -- or changing its colour should not silently rewrite history in everyone
  -- else's feed. Joining to profiles instead would do exactly that, and would
  -- also make every feed read a join for data that never changes.
  author_name     text not null,
  author_initials text,
  author_type     text not null default 'personal'
                    check (author_type in ('personal', 'church')),
  author_color    text,
  author_photo    text,

  content       text not null default '',
  -- A local file path today, meaning nothing on anyone else's phone. Stage 4
  -- uploads these and replaces the value with a URL; until then a post with a
  -- photo shows text to everybody but its author.
  image         text,

  city          text,
  state         text,
  show_location boolean not null default true,

  feed          text not null default 'both'
                  check (feed in ('foryou', 'discover', 'both')),
  visibility    text not null default 'public'
                  check (visibility in ('public', 'connections')),
  is_announcement boolean not null default false,

  church_place_id text,
  church_name     text,

  -- Cards embedded in a post: a shared event, a shared church, a link
  -- preview, the post being reposted. Held as json rather than columns
  -- because they are rendered whole and never queried into.
  event_share    jsonb,
  church_share   jsonb,
  link_url       text,
  link_preview   jsonb,
  repost_of      jsonb,
  repost_comment text,

  likes_count    integer not null default 0,
  reposts_count  integer not null default 0,
  edited         boolean not null default false,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- The feed is "newest first", always. Without this it is a sequential scan
-- that stays fast until the day it does not.
create index if not exists posts_created_idx on posts (created_at desc);
create index if not exists posts_author_idx  on posts (author_id);
create index if not exists posts_church_idx  on posts (church_place_id)
  where church_place_id is not null;

alter table posts enable row level security;

-- Public posts are readable by anyone signed in; your own are always readable.
--
-- 'connections' visibility is deliberately restrictive rather than
-- approximately right: connections are still device-local, so this database
-- cannot yet tell who is connected to whom. Showing a connections-only post to
-- everyone would be a privacy failure; showing it to nobody but its author is
-- merely incomplete. It opens up when connections move here.
drop policy if exists posts_select on posts;
create policy posts_select on posts
  for select using (visibility = 'public' or auth.uid() = author_id);

drop policy if exists posts_insert_own on posts;
create policy posts_insert_own on posts
  for insert with check (auth.uid() = author_id);

drop policy if exists posts_update_own on posts;
create policy posts_update_own on posts
  for update using (auth.uid() = author_id);

drop policy if exists posts_delete_own on posts;
create policy posts_delete_own on posts
  for delete using (auth.uid() = author_id);

-- Keep updated_at honest without asking every caller to remember.
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists posts_touch on posts;
create trigger posts_touch before update on posts
  for each row execute function touch_updated_at();

-- ── Comments and replies ───────────────────────────────────────────────────
-- One table, not two. A reply is a comment with a parent; giving replies their
-- own table duplicates every column and forbids the third level the day it is
-- wanted.
create table if not exists comments (
  id            text primary key,
  post_id       text not null references posts (id) on delete cascade,
  parent_id     text references comments (id) on delete cascade,

  author_id     uuid not null references auth.users (id) on delete cascade,
  author_name     text not null,
  author_initials text,
  author_color    text,

  text          text not null default '',
  image         text,
  city          text,
  state         text,

  likes_count   integer not null default 0,
  edited        boolean not null default false,
  -- The post's author may pin one comment. Enforced in the app rather than by
  -- a constraint: "at most one pinned per post" as a partial unique index
  -- would make pinning a second comment fail instead of moving the pin.
  pinned        boolean not null default false,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists comments_post_idx on comments (post_id, created_at);

alter table comments enable row level security;

-- Readable exactly when the post is. Repeating the post's rule here rather
-- than assuming it: a comment on a private post must not be public because
-- nobody thought about comments.
drop policy if exists comments_select on comments;
create policy comments_select on comments
  for select using (exists (
    select 1 from posts p
    where p.id = comments.post_id
      and (p.visibility = 'public' or p.author_id = auth.uid())
  ));

drop policy if exists comments_insert_own on comments;
create policy comments_insert_own on comments
  for insert with check (auth.uid() = author_id);

drop policy if exists comments_update_own on comments;
create policy comments_update_own on comments
  for update using (auth.uid() = author_id);

-- A post's author can remove comments on their own post; anyone can remove
-- their own. Moderating your own thread is not the same as deleting someone
-- else's words elsewhere.
drop policy if exists comments_delete on comments;
create policy comments_delete on comments
  for delete using (
    auth.uid() = author_id
    or exists (select 1 from posts p where p.id = comments.post_id and p.author_id = auth.uid())
  );

drop trigger if exists comments_touch on comments;
create trigger comments_touch before update on comments
  for each row execute function touch_updated_at();

-- ── Likes ──────────────────────────────────────────────────────────────────
-- A row per person per thing, so "did I like this" is a fact rather than a
-- number the client has to remember. The counts on posts and comments are
-- kept in step by trigger, because reading a count is a thousand times more
-- common than changing one.
create table if not exists post_likes (
  post_id  text not null references posts (id) on delete cascade,
  user_id  uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists comment_likes (
  comment_id text not null references comments (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

alter table post_likes enable row level security;
alter table comment_likes enable row level security;

-- Who liked something is not a secret — the count is public either way.
drop policy if exists post_likes_select on post_likes;
create policy post_likes_select on post_likes for select using (true);
drop policy if exists post_likes_write_own on post_likes;
create policy post_likes_write_own on post_likes
  for insert with check (auth.uid() = user_id);
drop policy if exists post_likes_delete_own on post_likes;
create policy post_likes_delete_own on post_likes
  for delete using (auth.uid() = user_id);

drop policy if exists comment_likes_select on comment_likes;
create policy comment_likes_select on comment_likes for select using (true);
drop policy if exists comment_likes_write_own on comment_likes;
create policy comment_likes_write_own on comment_likes
  for insert with check (auth.uid() = user_id);
drop policy if exists comment_likes_delete_own on comment_likes;
create policy comment_likes_delete_own on comment_likes
  for delete using (auth.uid() = user_id);

create or replace function sync_like_count()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  delta int := case tg_op when 'INSERT' then 1 else -1 end;
  row_id text := case tg_op when 'INSERT' then
    coalesce(new.post_id, new.comment_id) else coalesce(old.post_id, old.comment_id) end;
begin
  if tg_table_name = 'post_likes' then
    update posts set likes_count = greatest(0, likes_count + delta) where id = row_id;
  else
    update comments set likes_count = greatest(0, likes_count + delta) where id = row_id;
  end if;
  return null;
end;
$$;

drop trigger if exists post_likes_count on post_likes;
create trigger post_likes_count after insert or delete on post_likes
  for each row execute function sync_like_count();

drop trigger if exists comment_likes_count on comment_likes;
create trigger comment_likes_count after insert or delete on comment_likes
  for each row execute function sync_like_count();

-- ── Images ─────────────────────────────────────────────────────────────────
-- Posts carry a local file path today — meaningful only on the phone that
-- took the photo, and a broken image to everyone else. This is where they go
-- instead.
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

drop policy if exists post_images_read on storage.objects;
create policy post_images_read on storage.objects
  for select using (bucket_id = 'post-images');

-- Uploads land under a folder named for the uploader, which is what makes
-- "delete your own" expressible at all.
drop policy if exists post_images_write_own on storage.objects;
create policy post_images_write_own on storage.objects
  for insert with check (
    bucket_id = 'post-images' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists post_images_delete_own on storage.objects;
create policy post_images_delete_own on storage.objects
  for delete using (
    bucket_id = 'post-images' and auth.uid()::text = (storage.foldername(name))[1]
  );
