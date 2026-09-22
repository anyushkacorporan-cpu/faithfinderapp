-- ============================================================================
-- FaithFinder — the Supabase Security Advisor errors
--
-- Three flagged. Two are worth acting on, one cannot be acted on at all, and
-- none of them is currently leaking anything. Taken in turn, because "fix the
-- linter" without knowing which of those you are doing is how a warning gets
-- silenced rather than answered.
--
--
-- 1. SECURITY DEFINER VIEW — public.churches_public
--
-- A view created without `security_invoker` runs as its owner, so it reads
-- straight past whatever row-level security applies to the person querying it.
--
-- Today that changes nothing: churches and church_profiles are both readable
-- by anyone (`for select using (true)` in 01_churches.sql), because a church
-- directory is public by design. The view can only show what those tables
-- would have shown anyway.
--
-- It is worth fixing regardless, and this is the reason: the day anyone
-- narrows the policy on either table — hiding unclaimed listings, holding a
-- church back while a claim is reviewed — the view would keep serving the rows
-- the new policy was written to withhold, and nothing would say so. The fix
-- has to happen before that day, because after it the leak is silent.
--
-- nearby_churches selects from this view and is itself security invoker
-- (`language sql stable`, no `security definer`), so it inherits the caller's
-- permissions either way and keeps working unchanged.

alter view churches_public set (security_invoker = on);


-- 2. RLS DISABLED — public.schema_migrations
--
-- Not ours. Some tool left it in the public schema, which means PostgREST
-- serves it: a stranger can read the list of migrations this project has run.
-- That is not a secret worth much, but it is a free description of the
-- database's shape to somebody looking for one, and there is no reason for the
-- API to answer questions about it at all.
--
-- Row-level security with no policy at all is exactly right here. Nothing in
-- the app reads this table; the service role ignores RLS, so anything of
-- Supabase's own that needs it is unaffected.
--
-- Wrapped, because this table belongs to whatever created it. If that is not
-- us, the alter is refused, and a migration that cannot fix one advisory
-- should not take the other two down with it.

do $$
begin
  if to_regclass('public.schema_migrations') is not null then
    execute 'alter table public.schema_migrations enable row level security';
    raise notice 'schema_migrations: row level security enabled';
  else
    raise notice 'schema_migrations: not present, nothing to do';
  end if;
exception
  when insufficient_privilege then
    raise notice 'schema_migrations: owned by another role, left alone';
end $$;


-- 3. RLS DISABLED — public.spatial_ref_sys
--
-- Deliberately not addressed, and it cannot be.
--
-- This is PostGIS's own table, installed by `create extension postgis` in
-- 01_churches.sql and owned by the extension. Enabling row-level security on
-- it requires owning it, which we do not, so the statement is refused — and
-- there would be no point if it succeeded. It holds roughly eight thousand
-- rows of coordinate-system definitions: the published parameters of things
-- like WGS 84. It is reference data, identical in every PostGIS database in
-- the world, and there is nothing in it about anybody.
--
-- Every Supabase project using PostGIS reports this error. It stays reported.
-- Leaving a note is the honest outcome; the alternative is somebody spending
-- an afternoon on it in six months because the dashboard says "error".
