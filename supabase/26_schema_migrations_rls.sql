-- ============================================================================
-- FaithFinder — row-level security on schema_migrations
--
-- Supabase flagged this on 27 September:
--
--   CRITICAL  Table publicly accessible  [rls_disabled_in_public]
--   Anyone with your project URL can read, edit, and delete all data in this
--   table because Row-Level Security is not enabled.
--
-- 19_security_advisor.sql already handles this table, and still let it happen,
-- for a reason worth writing down.
--
-- That file was applied by hand in the SQL editor, before scripts/migrate.mjs
-- existed. Its guard asks `if to_regclass('public.schema_migrations') is not
-- null` — and at that moment the table genuinely did not exist, so the block
-- took its else branch and reported "not present, nothing to do". Correct, and
-- useless, because migrate.mjs created the table later, without RLS, and 19 was
-- by then recorded as applied and never ran again.
--
-- A guarded fix that runs before the thing it guards against is a fix that
-- never happened. This one runs after.
--
-- WHY THIS IS WORTH FIXING EVEN THOUGH IT HOLDS NO USER DATA
--
-- The rows are filenames and timestamps. Nobody's name, nobody's email. But the
-- advisory says edit and delete, not just read, and this table is what
-- migrate.mjs trusts to decide what has already run:
--
--   deleting a row  makes a migration run again
--   inserting one   makes a migration be skipped for ever
--
-- The files are written to be safe to re-run, so the first is survivable. The
-- second is not: a forged row for a migration that never ran leaves the
-- database permanently missing a table or a policy, with the ledger insisting
-- everything is fine. It also lists the schema file names to anyone who asks.
--
-- No policy is added, deliberately. Nothing in the app reads this table, and
-- migrate.mjs connects as the database owner over DATABASE_URL, which is not
-- subject to RLS. Enabled with no policy means the app key can do nothing at
-- all here, which is exactly right.
-- ============================================================================

do $$
begin
  if to_regclass('public.schema_migrations') is not null then
    execute 'alter table public.schema_migrations enable row level security';
    raise notice 'schema_migrations: row level security enabled';
  else
    -- Genuinely impossible from migrate.mjs, which creates the table before it
    -- applies anything. Kept for a hand-applied run, where it is the same
    -- no-op that caused this in the first place — hence scripts/migrate.mjs now
    -- enables RLS at creation time rather than relying on this file.
    raise notice 'schema_migrations: not present, nothing to do';
  end if;
exception
  when insufficient_privilege then
    raise notice 'schema_migrations: owned by another role, left alone';
end $$;

-- Revoke as well as deny. RLS decides which rows a role may touch; the grant
-- decides whether it may address the table at all, and there is no reason for
-- either app role to hold one on the migration ledger.
revoke all on public.schema_migrations from anon, authenticated;
