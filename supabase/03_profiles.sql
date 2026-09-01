-- ============================================================================
-- FaithFinder — accounts
--
-- Supabase owns `auth.users`: email, password hash, sessions, resets. We never
-- touch it. This adds the profile that hangs off it — the things the app shows
-- and the person edits.
--
-- Kept separate deliberately. auth.users is Supabase's, with its own rules and
-- its own migrations; profiles is ours. A row here is created automatically
-- when an account is created, so the app never has to remember to do it and a
-- profile can never be missing for a signed-in user.
-- ============================================================================

create table if not exists profiles (
  -- Same id as the auth user, so there is exactly one profile per account and
  -- no way to end up with two.
  id            uuid primary key references auth.users (id) on delete cascade,

  account_type  text not null default 'personal'
                  check (account_type in ('personal', 'church')),

  -- Personal
  first_name    text,
  last_name     text,
  bio           text,
  location      text,           -- free-text "City, ST", as the app already stores
  profile_photo text,
  cover_photo   text,
  life_verse    text,
  life_verse_ref text,

  -- Church
  church_name   text,
  phone         text,
  website       text,
  denomination  text,
  -- The church directory row this account claimed, if any.
  church_id     uuid references churches (id) on delete set null,

  -- Privacy, mirroring the toggles already in settings-privacy.tsx.
  public_profile   boolean not null default true,
  show_location    boolean not null default true,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists profiles_church_idx on profiles (church_id) where church_id is not null;

-- ── A profile exists the moment an account does ────────────────────────────
-- Doing this in the database rather than in the app means a profile cannot be
-- missing because a sign-up was interrupted, a network call failed, or a future
-- sign-up path forgot to create one.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, account_type, first_name, last_name, church_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'account_type', 'personal'),
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'church_name'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── Access ─────────────────────────────────────────────────────────────────
alter table profiles enable row level security;

-- A public profile is readable by anyone; a private one only by its owner.
-- This is the privacy toggle actually enforced, rather than a screen that hides
-- what the API would still hand over.
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles
  for select using (public_profile or auth.uid() = id);

drop policy if exists profiles_update_own on profiles;
create policy profiles_update_own on profiles
  for update using (auth.uid() = id);

-- No insert policy: the trigger creates the row, running as definer. Nobody
-- can manufacture a profile for an account that does not exist.

-- ── Deleting an account ────────────────────────────────────────────────────
-- Callable by the signed-in user only, and deletes their auth user — which
-- cascades to the profile. This is what makes the app's Delete Account button
-- true on the server rather than only on the device.
create or replace function delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function delete_own_account() from public;
grant execute on function delete_own_account() to authenticated;
