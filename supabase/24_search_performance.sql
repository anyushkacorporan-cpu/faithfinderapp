-- ============================================================================
-- FaithFinder — make searching the directory use its indexes
--
-- THE SYMPTOM
--
--   [db] could not read the church directory:
--   canceling statement due to statement timeout [57014]
--
-- Searching the Churches tab was timing out on the server, and it got worse
-- the more precisely you searched — which is exactly backwards.
--
-- WHY
--
-- Two reasons, and the first one has been true since the directory was
-- imported.
--
-- 01_churches.sql built a trigram index on churches.name and nothing else. The
-- search in churchesApi.ts matches four columns — name, city, address and
-- denomination — because the search box is one box and people type all four
-- into it. Three of those four had no index at all.
--
-- And the query runs against churches_public, where name is
-- `coalesce(p.name, c.name)`. A predicate on that expression cannot use an
-- index on c.name, so the one index that did exist was unusable too. Every
-- search was a sequential scan of all 235,147 rows, four times over, OR'd
-- together.
--
-- It only looked fine because LIMIT 40 let a common word stop early.
-- "Presbyterian" matches thousands, so the scan halted after 193 rows and
-- returned in under a millisecond. A specific name, or a typo, matches almost
-- nothing — so the scan had to read the whole table before it could report
-- nothing. Measured on 235,000 rows with a warm cache:
--
--   'Presbyterian'                 0.8 ms      193 rows read
--   'Fifth Avenue Presbyterian'  451   ms  235,000 rows read
--   'Zzzqqx'                     344   ms  235,000 rows read
--
-- On a shared instance with cold buffers that is where the timeout comes from.
--
-- THE FIX
--
-- Index the other three columns, and match against `churches` directly rather
-- than through the view, so the indexes are reachable. Same measurements after:
--
--   'Fifth Avenue Presbyterian'    1.4 ms
--   'Zzzqqx'                       0.16 ms
--
-- A search that finds nothing is now the fastest case rather than the slowest.
-- ============================================================================

-- name already has one, from 01_churches.sql.
create index if not exists churches_city_trgm    on churches using gin (city gin_trgm_ops);
create index if not exists churches_address_trgm on churches using gin (address gin_trgm_ops);
create index if not exists churches_denom_trgm   on churches using gin (denomination gin_trgm_ops);

/**
 * Free-text search over the directory.
 *
 * The matching happens against `churches`, where the trigram indexes are. The
 * view is then joined onto the rows that matched, so a claimed church still
 * comes back with its own name, phone and photo — the overrides are applied to
 * the result, not searched through.
 *
 * church_profiles is searched as well, and separately. A church that claimed
 * its listing and corrected its own name would otherwise be unfindable by the
 * name it actually goes by, since the imported spelling is what carries the
 * index. That table holds one row per claimed church and is tiny, so scanning
 * it costs nothing next to the saving above.
 *
 * The inner limit is deliberately looser than the outer one: the denomination
 * filter is applied after the join, so the match has to have room to return
 * more rows than the caller wants before that narrows them.
 *
 * A one or two character query cannot use a trigram index — trigrams need
 * three. It stays fast anyway, because any two letters match a great many of
 * 235,147 churches and LIMIT stops the scan early. It is the precise query
 * that was slow, and that is the one this fixes.
 */
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
-- 20_function_search_path.sql pins this on every function here; a new one does
-- not inherit it.
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

grant execute on function search_churches(text, text, integer) to anon, authenticated;
