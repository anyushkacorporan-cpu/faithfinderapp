-- ============================================================================
-- FaithFinder — a claimed church's profile photo and cover photo
--
-- 23_church_photos_editable.sql gave a claimed church a gallery. It did not
-- give it the two single photos every profile in this app has: the square
-- beside the name, and the wide one behind it.
--
-- The profile photo had a column already — church_profiles.photo_url, there
-- since 01_churches.sql — and nothing ever wrote to it. The picker on Edit
-- Church Profile called setUser({ avatar }), which is the signed-in person's
-- avatar on their own device: not uploaded, not attached to the church, and
-- invisible to everyone including the person who set it. That is the "photo
-- changes are not sticking" report, and it was never sticking anywhere.
--
-- The cover had nothing at all. `profiles` carries profile_photo and
-- cover_photo for people; church_profiles carried neither for churches.
--
-- WHICH PHOTO A CARD SHOWS
--
-- Three kinds of photo can now exist for one church, so the view has to choose,
-- and the order is about intent. A profile photo is the one a church picked to
-- represent itself, so it wins. A gallery photo is something it added, so it
-- comes next. Ours is a guess from an import, so it goes last — and not at all
-- when the church has asked for it to go.
--
-- 23 put the gallery first, because a gallery was all there was to prefer. This
-- moves it behind the deliberate choice.
-- ============================================================================

alter table church_profiles add column if not exists cover_url text;

-- Rebuilt rather than replaced: `create or replace view` can only append
-- columns, and cover_url belongs beside photo_url rather than at the end.
-- 02_church_photos.sql explains the failure mode. nearby_churches selects from
-- the view, so it goes first and both come back below.
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
  -- Chosen, then added, then guessed.
  coalesce(
    p.photo_url,
    g.url,
    case when coalesce(p.hide_imported_photo, false) then null else c.photo_url end
  )                                        as photo_url,
  -- Attribution belongs to the imported photo alone, so it shows only when that
  -- is what is being shown.
  case
    when p.photo_url is null
     and g.url is null
     and not coalesce(p.hide_imported_photo, false)
    then c.photo_credit
  end                                      as photo_credit,
  p.cover_url,
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

-- search_churches selects a fixed column list from the view, so it survives the
-- rebuild — but it is dropped and recreated anyway, because a function whose
-- source table was replaced underneath it is exactly the thing that fails on
-- the next deploy rather than now. 24_search_performance.sql explains the
-- indexes it depends on.
create or replace function search_churches(
  q        text,
  denom    text default null,
  max_rows int  default 40
)
returns table (
  id uuid, name text, address text, city text, state text, zip text,
  denomination text, phone text, website text,
  photo_url text, photo_credit text, is_claimed boolean
)
language sql
stable
set search_path = public
as $$
  with pat as (select '%' || q || '%' as p),
  from_import as (
    select c.id from churches c, pat
    where c.name ilike pat.p
       or c.city ilike pat.p
       or c.address ilike pat.p
       or c.denomination ilike pat.p
    limit greatest(max_rows * 4, 40)
  ),
  from_claims as (
    select cp.church_id as id from church_profiles cp, pat
    where cp.name ilike pat.p
       or cp.city ilike pat.p
       or cp.address ilike pat.p
       or cp.denomination ilike pat.p
    limit max_rows
  ),
  hits as (select id from from_import union select id from from_claims)
  select v.id, v.name, v.address, v.city, v.state, v.zip,
         v.denomination, v.phone, v.website,
         v.photo_url, v.photo_credit, v.is_claimed
  from churches_public v
  join hits h on h.id = v.id
  where denom is null or v.denomination = denom
  limit max_rows;
$$;

-- Dropping the view and the function destroys their privileges along with
-- them. 23_church_photos_editable.sql learned this the hard way: without these
-- the Churches tab returns permission denied for every user the moment this
-- file is applied.
grant select on public.churches_public to anon, authenticated, service_role;
grant execute on function nearby_churches(double precision, double precision, integer, integer, text)
  to anon, authenticated;
grant execute on function search_churches(text, text, integer) to anon, authenticated;
