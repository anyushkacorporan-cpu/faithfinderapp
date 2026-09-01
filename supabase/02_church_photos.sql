-- ============================================================================
-- Photos on imported churches.
--
-- `church_profiles.photo_url` already holds the photo a church uploads when it
-- claims its listing. This adds the other kind: a freely-licensed photo found
-- for a church nobody has claimed yet.
--
-- It goes on `churches`, not `church_profiles`, because it is import-owned
-- data — a re-import may replace it. The view prefers the claimed photo, so a
-- church that uploads its own always wins over whatever we found.
-- ============================================================================

alter table churches add column if not exists photo_url    text;
alter table churches add column if not exists photo_credit text;

-- `create or replace view` can only append columns to the end of a view.
-- photo_credit goes in the middle, which shifts is_claimed, lat, lng and
-- location along one place — and Postgres reads that as renaming columns and
-- refuses ("cannot change name of view column"). The view has to be dropped
-- and rebuilt. nearby_churches selects from it, so that goes first; both are
-- recreated below.
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
  -- The church's own photo first; ours only when it has not supplied one.
  coalesce(p.photo_url, c.photo_url)       as photo_url,
  -- Null when the photo is the church's own, since that needs no attribution.
  case when p.photo_url is null then c.photo_credit end as photo_credit,
  (p.claimed_at is not null)               as is_claimed,
  c.lat,
  c.lng,
  c.location
from churches c
left join church_profiles p on p.church_id = c.id;

-- Recreated against the rebuilt view, returning the credit alongside the photo.
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
