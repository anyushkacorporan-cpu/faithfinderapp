-- ============================================================================
-- FourCircle — a byline comes from the account, not from the request
--
-- posts and comments both store the author twice: author_id, which is checked,
-- and author_name / author_type / author_initials, which were sent by the
-- client and checked by nothing.
--
--     create policy posts_insert_own on posts
--       for insert with check (auth.uid() = author_id);
--
-- That asks one question -- is this your own account -- and the feed renders
-- the name, not the id. So a post could carry a true account id and the name
-- "Grace Community Church" with author_type 'church', and appear in the feed
-- as an announcement from a church that never wrote it and cannot take it
-- down. The app's own screens never do this, but the app is not the boundary:
-- the anon key ships inside it by design, so the table can be written to
-- directly.
--
-- The byline is derived here now, from the author's own profile, and whatever
-- was sent is overwritten. Honest posts are unaffected: the app already builds
-- the name from the same profile, so the values come out identical.
--
-- author_color is deliberately left alone. It is decoration -- a wrong colour
-- impersonates nobody -- and freezing it would mean rewriting every avatar
-- that has one.
-- ============================================================================

-- ── The name an account posts under ────────────────────────────────────────
-- Mirrors displayName() in src/lib/userStore.ts, including its fallbacks:
-- a church posts as its church name, anyone else as their own name, and an
-- account with neither falls back to the readable part of its email, because
-- "anyushka.corporan" identifies somebody and "Member" does not.
create or replace function profile_display_name(p_user uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  acct   text;
  first  text;
  last   text;
  church text;
  full_n text;
  localp text;
begin
  select account_type, first_name, last_name, church_name
    into acct, first, last, church
    from profiles where id = p_user;

  if not found then return 'Member'; end if;

  if acct = 'church' then
    return coalesce(nullif(btrim(church), ''), 'Church');
  end if;

  full_n := btrim(concat_ws(' ', nullif(btrim(first), ''), nullif(btrim(last), '')));
  if full_n <> '' then return full_n; end if;

  select split_part(coalesce(email, ''), '@', 1) into localp
    from auth.users where id = p_user;

  if coalesce(localp, '') <> '' then
    -- "anyushka.corporan" -> "Anyushka Corporan". Ordered explicitly: without
    -- `with ordinality` the pieces may come back in any order, which would
    -- reverse somebody's name at random.
    return (
      select string_agg(upper(left(part, 1)) || substr(part, 2), ' ' order by ord)
      from regexp_split_to_table(localp, '[._+-]+') with ordinality as t(part, ord)
      where part <> ''
    );
  end if;

  return 'Member';
end $$;

-- Mirrors displayInitials(): the first letter of the first two words.
create or replace function profile_initials(p_name text)
returns text
language sql
immutable
as $$
  select coalesce(nullif(upper(
      coalesce(left(split_part(btrim(p_name), ' ', 1), 1), '') ||
      coalesce(left(split_part(btrim(p_name), ' ', 2), 1), '')
    ), ''), 'M');
$$;

-- ── Applied on the way in ──────────────────────────────────────────────────

create or replace function set_post_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  acct text;
  photo text;
  nm    text;
begin
  select account_type, profile_photo into acct, photo
    from profiles where id = new.author_id;

  nm := profile_display_name(new.author_id);
  new.author_name     := nm;
  new.author_initials := profile_initials(nm);
  new.author_type     := case when acct = 'church' then 'church' else 'personal' end;
  new.author_photo    := photo;
  return new;
end $$;

create or replace function set_comment_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  nm text;
begin
  nm := profile_display_name(new.author_id);
  new.author_name     := nm;
  new.author_initials := profile_initials(nm);
  return new;
end $$;

-- On update as well as insert: without it the byline could simply be rewritten
-- after the post was made, which is the same hole one step later.
drop trigger if exists posts_set_author on posts;
create trigger posts_set_author before insert or update on posts
  for each row execute function set_post_author();

drop trigger if exists comments_set_author on comments;
create trigger comments_set_author before insert or update on comments
  for each row execute function set_comment_author();

comment on function set_post_author() is
  'author_name, author_type, author_initials and author_photo are outputs, '
  'not inputs: they are derived from the author profile and whatever a client '
  'sends is replaced.';

-- Existing rows are deliberately NOT rewritten. Nothing here has run in front
-- of real users yet, and a pass over every post would also quietly correct
-- anybody whose display name has legitimately changed since they wrote it,
-- which is a different decision from closing this.
