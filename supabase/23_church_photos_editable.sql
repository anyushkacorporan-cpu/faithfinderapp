-- ============================================================================
-- FaithFinder — a claimed church manages its own photos
--
-- WHAT WAS MISSING
--
-- The app had no way for a church to manage its photos, and the reason was
-- further back than the screen: nothing ever recorded which church a claim was
-- for. submitVerification() set verification_status on the claimant's own
-- profile and pushed the church's name and address there as text. No row was
-- ever written to church_profiles, so churches_public.is_claimed — defined as
-- `p.claimed_at is not null` — has never been true for any church in the
-- directory, and no query could answer "which church is this account's?".
--
-- Edit Church Profile looked like it worked. Its photo grid wrote to
-- userStore.photos, a field on the signed-in person, and its Save button was
-- setUser() and a toast. Nothing on that screen reached the server.
--
-- So this file builds the missing half: a claim names a church, approval turns
-- that into ownership, and an owner gets a gallery.
--
-- APPROVAL IS THE GATE, AND IT HAS TO BE
--
-- The directory holds 235,147 churches that belong to other people. Unlocking
-- photo editing on submission would let any signed-in account repoint any
-- church's pictures with no human in between. Ownership is therefore created by
-- the approval itself: the trigger below writes church_profiles.claimed_at when
-- verification_status becomes 'approved', and 17_more_notifications.sql's
-- guard_verification_status() already stops anyone approving themselves.
--
-- A PRE-EXISTING HOLE, CLOSED HERE
--
-- 01_churches.sql gave church_profiles these policies:
--
--     for insert with check (auth.uid() = claimed_by)
--     for update using      (auth.uid() = claimed_by)
--
-- Read them as an attacker: there is no check that the claim was ever granted.
-- Any authenticated account could insert a church_profiles row for any church
-- in the directory naming itself as claimed_by, and because churches_public
-- coalesces p.name over c.name, p.phone over c.phone and so on, that row
-- rewrites the public listing — name, address, phone, website, photo. For every
-- church, today, with no review.
--
-- Nothing in the app writes church_profiles, so nothing depends on the loose
-- version and tightening it breaks no caller. It is closed below rather than
-- left beside a new approval gate it would have made pointless.
-- ============================================================================

-- ── Which church a claim is for ─────────────────────────────────────────────

-- The claim screen has always known this and had nowhere to put it. Text in
-- profiles.church_name cannot be joined on; this can.
alter table profiles add column if not exists claimed_church_id uuid
  references churches (id) on delete set null;

-- ── Removing the imported photo ─────────────────────────────────────────────

-- A church cannot delete churches.photo_url, and should not be able to:
-- 01_churches.sql deliberately leaves `churches` with no write policy so a
-- leaked app key cannot alter the directory, and the photo is import-owned
-- anyway — the next re-import would put it back.
--
-- So "remove the photo that was already there" is recorded as an override on
-- the claim instead. The imported photo stays where it is and stops being
-- shown, which is also what makes the removal survive a re-import.
alter table church_profiles add column if not exists hide_imported_photo
  boolean not null default false;

-- ── The gallery ─────────────────────────────────────────────────────────────

create table if not exists church_photos (
  id         uuid primary key default gen_random_uuid(),
  church_id  uuid not null references churches (id) on delete cascade,
  -- Who put it there. Kept for moderation: a photo that has to come down needs
  -- to be traceable to an account, not just to a church.
  added_by   uuid references auth.users (id) on delete set null,
  url        text not null,
  -- Display order, lowest first. The first one is what the church cards show.
  sort       int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists church_photos_by_church
  on church_photos (church_id, sort, created_at);

-- ── Who owns a church ───────────────────────────────────────────────────────

/**
 * True when this account's claim on this church has been granted.
 *
 * Three conditions, and all three are load-bearing. The church_profiles row
 * proves a claim exists; claimed_at proves it was granted, because only the
 * trigger below ever sets it; and verification_status = 'approved' is checked
 * against profiles because that is the column guard_verification_status()
 * protects from self-approval. Any one of them alone is forgeable by the
 * claimant.
 */
create or replace function owns_church(in_church_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from church_profiles cp
    join profiles pr on pr.id = cp.claimed_by
    where cp.church_id = in_church_id
      and cp.claimed_by = auth.uid()
      and cp.claimed_at is not null
      and pr.verification_status = 'approved'
  );
$$;

-- ── Approval creates ownership ──────────────────────────────────────────────

/**
 * Turn an approved claim into a church_profiles row.
 *
 * Approving a claim is one column change in the SQL editor, which is how it is
 * done today. Everything that has to follow from it happens here, so an
 * approver does not have to remember to write the ownership row by hand and
 * cannot half-do it.
 *
 * Only ever adds. An approval that arrives for a church already claimed by
 * somebody else leaves the existing claim alone rather than transferring it —
 * a transfer is a decision, not a side effect of a status change.
 */
create or replace function grant_church_claim()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.verification_status = 'approved'
     and coalesce(old.verification_status, '') <> 'approved'
     and new.claimed_church_id is not null then

    insert into church_profiles (church_id, claimed_by, claimed_at)
    values (new.claimed_church_id, new.id, now())
    on conflict (church_id) do update
      set claimed_by = excluded.claimed_by,
          claimed_at = excluded.claimed_at
      where church_profiles.claimed_at is null;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_grant_church_claim on profiles;
create trigger profiles_grant_church_claim after update on profiles
  for each row execute function grant_church_claim();

-- ── Access ──────────────────────────────────────────────────────────────────

alter table church_photos enable row level security;

-- A church's photos are as public as the church. Anyone browsing the directory
-- sees them, signed in or not.
drop policy if exists church_photos_readable on church_photos;
create policy church_photos_readable on church_photos
  for select using (true);

-- Adding, reordering and removing belong to the approved owner and nobody else.
drop policy if exists church_photos_owner_insert on church_photos;
create policy church_photos_owner_insert on church_photos
  for insert with check (owns_church(church_id) and added_by = auth.uid());

drop policy if exists church_photos_owner_update on church_photos;
create policy church_photos_owner_update on church_photos
  for update using (owns_church(church_id)) with check (owns_church(church_id));

drop policy if exists church_photos_owner_delete on church_photos;
create policy church_photos_owner_delete on church_photos
  for delete using (owns_church(church_id));

-- The hole described at the top. Writing a church's public details now needs
-- the claim to have been granted, not merely asserted.
drop policy if exists profiles_owner_insert on church_profiles;
drop policy if exists profiles_owner_update on church_profiles;

-- No insert policy at all: the trigger above is security definer and creates
-- the row itself, so there is no longer any reason for a client to insert one,
-- and every reason it should not be able to.
--
-- The privilege goes too. 21_data_api_grants.sql granted insert on this table
-- and RLS with no insert policy already refuses every attempt, so this changes
-- nothing today — it is belt and braces. A privilege nothing can exercise is a
-- trap for whoever adds the next policy here and assumes the grant implies a
-- caller was meant to have it.
revoke insert on public.church_profiles from authenticated;
drop policy if exists church_profiles_owner_update on church_profiles;
create policy church_profiles_owner_update on church_profiles
  for update using (owns_church(church_id)) with check (owns_church(church_id));

-- ── Storage ─────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('church-photos', 'church-photos', true)
on conflict (id) do nothing;

drop policy if exists church_photos_read on storage.objects;
create policy church_photos_read on storage.objects
  for select using (bucket_id = 'church-photos');

-- Foldered by uploader, matching avatars and post-images, because that is what
-- the path check can express. Which church it belongs to is enforced on the
-- church_photos row, which is the thing that makes the file visible.
drop policy if exists church_photos_write_own on storage.objects;
create policy church_photos_write_own on storage.objects
  for insert with check (
    bucket_id = 'church-photos' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists church_photos_delete_own on storage.objects;
create policy church_photos_delete_own on storage.objects
  for delete using (
    bucket_id = 'church-photos' and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── The read model ──────────────────────────────────────────────────────────

-- Rebuilt, not replaced. 02_church_photos.sql explains why: `create or replace
-- view` can only append columns, and anything else reads to Postgres as
-- renaming them. nearby_churches selects from the view, so it goes first and
-- both come back below.
drop function if exists nearby_churches(double precision, double precision, integer, integer, text);
drop view if exists churches_public;

create view churches_public as
select
  c.id,
  c.source_id,
  coalesce(p.name, c.name)                 as name,
  coalesce(p.address, c.address)           as address,
  coalesce(p.city, c.city)                 as city,
  coalesce(p.state, c.state)               as state,
  coalesce(p.zip, c.zip)                   as zip,
  c.country,
  coalesce(p.denomination, c.denomination) as denomination,
  coalesce(p.phone, c.phone)               as phone,
  coalesce(p.website, c.website)           as website,
  p.description,
  p.service_times,
  -- One photo for the cards, in the order a church would expect: a gallery
  -- photo it added, then the single photo a claim could already set, then ours
  -- — and not ours if it asked for that one to go.
  coalesce(
    g.url,
    p.photo_url,
    case when coalesce(p.hide_imported_photo, false) then null else c.photo_url end
  )                                        as photo_url,
  -- Attribution belongs to the imported photo alone, so it appears only when
  -- that is what is being shown.
  case
    when g.url is null
     and p.photo_url is null
     and not coalesce(p.hide_imported_photo, false)
    then c.photo_credit
  end                                      as photo_credit,
  (p.claimed_at is not null)               as is_claimed,
  c.lat,
  c.lng,
  c.location
from churches c
left join church_profiles p on p.church_id = c.id
left join lateral (
  select cp.url from church_photos cp
  where cp.church_id = c.id
  order by cp.sort, cp.created_at
  limit 1
) g on true;

create function nearby_churches(
  in_lat    double precision,
  in_lng    double precision,
  radius_m  integer default 40000,
  max_rows  integer default 40,
  denom     text default null
)
returns table (
  id uuid, name text, address text, city text, state text, zip text,
  denomination text, phone text, website text, photo_url text, photo_credit text,
  is_claimed boolean, lat double precision, lng double precision,
  distance_m double precision
)
language sql
stable
-- 20_function_search_path.sql pins this for the same reason it pinned the
-- others; a re-created function does not inherit the setting.
set search_path = public
as $$
  select
    v.id, v.name, v.address, v.city, v.state, v.zip,
    v.denomination, v.phone, v.website, v.photo_url, v.photo_credit,
    v.is_claimed, v.lat, v.lng,
    st_distance(v.location, st_point(in_lng, in_lat)::geography) as distance_m
  from churches_public v
  where st_dwithin(v.location, st_point(in_lng, in_lat)::geography, radius_m)
    and (denom is null or v.denomination = denom)
  order by distance_m
  limit max_rows;
$$;

-- 21_data_api_grants.sql explains why these are written down rather than left
-- to Supabase. RLS above is the security boundary.
grant select, insert, update, delete on public.church_photos to authenticated;
grant select on public.church_photos to anon;

-- RE-GRANTING WHAT THE REBUILD ABOVE TOOK AWAY
--
-- Dropping a view or a function destroys the object, and its privileges go with
-- it. churches_public and nearby_churches were both dropped a few lines up to
-- change the view's columns, so 21_data_api_grants.sql's grants on them no
-- longer exist — and churches_public is what every church screen reads. Without
-- these two lines the Churches tab returns permission denied for everyone the
-- moment this file is applied.
--
-- Copied from 21 deliberately, including service_role, rather than trimmed to
-- what seems needed: a rebuild should leave access exactly as it found it.
grant select on public.churches_public to anon, authenticated, service_role;
grant execute on function nearby_churches(double precision, double precision, integer, integer, text)
  to anon, authenticated;
