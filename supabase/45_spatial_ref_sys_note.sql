-- ============================================================================
-- FourCircle — the spatial_ref_sys warning, and the part the old note missed
--
-- 19_security_advisor.sql already explains why Supabase's advisor reports
-- `rls_disabled_in_public` on public.spatial_ref_sys and why it cannot be
-- turned off: PostGIS owns the table, enabling RLS requires owning it, and
-- every Supabase project using PostGIS reports the same thing forever.
--
-- That note argued there is nothing in the table about anybody, which is
-- true. It holds about eight thousand rows of published coordinate-system
-- constants, identical in every PostGIS database in the world.
--
-- WHAT IT MISSED
--
-- Nothing to steal is not the same as nothing to break. Checked 3 November
-- 2026:
--
--     grantee         can
--     anon            DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
--     authenticated   DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
--
-- churches.location is geography(point, 4326) and st_dwithin reads that
-- SRID's spheroid parameters out of this table, so emptying it stops church
-- search for everybody. One statement, from any signed-in account, for no
-- gain -- vandalism rather than theft, and recoverable from a backup or by
-- reloading PostGIS's own data, which is why this is a note and not an alarm.
--
-- THE REVOKE BELOW DOES NOT WORK, AND IS HERE ANYWAY
--
-- It was run on 3 November 2026 and succeeded silently while changing
-- nothing. A role may only revoke what it granted, and supabase_admin
-- granted these; the SQL editor does not run as supabase_admin. Supabase's
-- own troubleshooting pages say to expect exactly this.
--
-- Left in because it is harmless, idempotent, and correct on any database
-- where the owner runs it -- a self-hosted copy, or a future project where
-- these grants are ours. Somewhere the statement is not a no-op.
--
-- WHAT WAS DELIBERATELY NOT DONE
--
-- Moving PostGIS out of `public`, which is Supabase's official fix. It means
-- dropping and recreating the extension, and that cascades to geometry and
-- geography columns -- churches.location, generated across 235,147 rows.
-- Risking the directory to quiet a warning about reference data is the wrong
-- trade. If this is ever worth doing properly it is a support ticket, not a
-- migration.
-- ============================================================================

do $$
begin
  revoke insert, update, delete, truncate, references, trigger
    on public.spatial_ref_sys from anon, authenticated;
exception when others then
  -- Not ours to revoke on a hosted project. Expected; see above.
  raise notice 'spatial_ref_sys grants unchanged: %', sqlerrm;
end $$;
