-- ============================================================================
-- FaithFinder — church directory
--
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- It is safe to run more than once.
--
-- Two tables, deliberately:
--
--   churches         what the import produces. Owned by the import. Every
--                    re-run may overwrite any row here.
--   church_profiles  what a church says about itself once it claims the
--                    listing. The import never touches this table.
--
-- Keeping them apart is what makes "a re-import must not clobber a claimed
-- church" true by construction rather than by remembering. Reads merge the two
-- with COALESCE, so a claimed value wins and an unclaimed one falls through to
-- the imported data.
-- ============================================================================

create extension if not exists postgis;

-- ── Imported source data ───────────────────────────────────────────────────
create table if not exists churches (
  id           uuid primary key default gen_random_uuid(),

  -- Natural key from the source, e.g. 'osm:node/123456'. Unique so a re-import
  -- updates the row it already created instead of adding a second one.
  source_id    text not null unique,
  source       text not null default 'osm',

  name         text not null,
  address      text,
  city         text,
  state        text,
  zip          text,
  country      text not null default 'US',
  denomination text,
  phone        text,
  website      text,

  lat          double precision not null,
  lng          double precision not null,
  -- Generated from lat/lng so the two can never drift apart. This is the
  -- column the distance search actually uses.
  location     geography(point, 4326)
                 generated always as (st_point(lng, lat)::geography) stored,

  imported_at  timestamptz not null default now()
);

-- The index that makes "churches near me" cost the same at 350,000 rows as at
-- 2,000: a GIST tree over the geography, so a radius search reads only the
-- rows in the right patch of the map.
create index if not exists churches_location_idx on churches using gist (location);
create index if not exists churches_state_idx    on churches (country, state);
-- Trigram index for name search, so 'grace comm' finds 'Grace Community Church'.
create extension if not exists pg_trgm;
create index if not exists churches_name_idx     on churches using gin (name gin_trgm_ops);

-- ── What a church says about itself ────────────────────────────────────────
create table if not exists church_profiles (
  church_id    uuid primary key references churches (id) on delete cascade,
  claimed_by   uuid references auth.users (id) on delete set null,
  claimed_at   timestamptz,

  -- Every column here overrides the imported one when it is not null. A church
  -- that only fixes its phone number keeps the imported name and address.
  name         text,
  address      text,
  city         text,
  state        text,
  zip          text,
  denomination text,
  phone        text,
  website      text,
  description  text,
  service_times text,
  photo_url    text,

  updated_at   timestamptz not null default now()
);

-- ── The read model ─────────────────────────────────────────────────────────
-- One view the app reads from, so no screen has to know that a church's name
-- might live in either of two tables.
create or replace view churches_public as
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
  p.photo_url,
  (p.claimed_at is not null)               as is_claimed,
  c.lat,
  c.lng,
  c.location
from churches c
left join church_profiles p on p.church_id = c.id;

-- ── Distance search ────────────────────────────────────────────────────────
-- Called from the app as a Supabase RPC. Returns nearest first with the
-- distance already computed, so the client does no geometry of its own.
create or replace function nearby_churches(
  in_lat    double precision,
  in_lng    double precision,
  radius_m  integer default 40000,   -- ~25 miles
  max_rows  integer default 40,
  denom     text default null
)
returns table (
  id uuid, name text, address text, city text, state text, zip text,
  denomination text, phone text, website text, photo_url text,
  is_claimed boolean, lat double precision, lng double precision,
  distance_m double precision
)
language sql
stable
as $$
  select
    v.id, v.name, v.address, v.city, v.state, v.zip,
    v.denomination, v.phone, v.website, v.photo_url,
    v.is_claimed, v.lat, v.lng,
    st_distance(v.location, st_point(in_lng, in_lat)::geography) as distance_m
  from churches_public v
  where st_dwithin(v.location, st_point(in_lng, in_lat)::geography, radius_m)
    and (denom is null or v.denomination = denom)
  order by distance_m
  limit max_rows;
$$;

-- ── Access ─────────────────────────────────────────────────────────────────
alter table churches        enable row level security;
alter table church_profiles enable row level security;

-- The directory is public. Anyone, signed in or not, can read it — that is the
-- whole point of the app's Churches tab.
drop policy if exists churches_readable on churches;
create policy churches_readable on churches
  for select using (true);

drop policy if exists profiles_readable on church_profiles;
create policy profiles_readable on church_profiles
  for select using (true);

-- Nobody writes to `churches` through the API. The import runs with the
-- service role, which bypasses RLS; leaving no write policy means an app key
-- cannot alter the directory even if it leaked.

-- A church edits only its own claim.
drop policy if exists profiles_owner_update on church_profiles;
create policy profiles_owner_update on church_profiles
  for update using (auth.uid() = claimed_by);

drop policy if exists profiles_owner_insert on church_profiles;
create policy profiles_owner_insert on church_profiles
  for insert with check (auth.uid() = claimed_by);
