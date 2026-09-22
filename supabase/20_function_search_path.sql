-- ============================================================================
-- FaithFinder — the two functions with an unpinned search_path
--
-- The Security Advisor's warning list is long, and almost none of it is ours:
-- PostGIS installs its own machinery into the public schema and gets counted.
-- Of the 22 functions these migrations define, 20 already pin search_path and
-- these are the two that do not.
--
-- WHAT THE WARNING IS ABOUT
--
-- A function without a pinned search_path resolves unqualified names using
-- whatever search_path the caller happens to have set. Someone who can create
-- a table or a function in a schema that sits earlier on that path can put
-- their own `now()` or their own `churches` in front of the real one, and the
-- function will use it without noticing.
--
-- That matters most on a security definer function, because it runs with the
-- definer's privileges and the substituted code inherits them. Neither of
-- these is security definer — nearby_churches and touch_updated_at both run as
-- whoever called them — so the ceiling here is low: an attacker could confuse
-- a function into reading their own table using their own permissions, which
-- they could have read anyway.
--
-- Low is not none, and the fix costs a line each.
--
-- ALTER rather than CREATE OR REPLACE, deliberately: the setting is all that
-- is changing, and restating a function body in a later migration is how the
-- body in the later migration drifts from the one everybody is reading.

alter function nearby_churches(double precision, double precision, integer, integer, text)
  set search_path = public;

alter function touch_updated_at()
  set search_path = public;

-- public alone, not public + extensions: PostGIS is installed into public here
-- (01_churches.sql calls `create extension postgis` with no schema, which is
-- also why the advisor reports public.spatial_ref_sys), so st_dwithin and
-- st_distance are found on this path. If PostGIS is ever moved to its own
-- schema, this line moves with it or nearby_churches stops resolving them.
