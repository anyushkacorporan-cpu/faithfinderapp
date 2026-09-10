# Testing the SQL without touching the real project

The migrations in `supabase/` used to be written, pushed, and found wrong in
the dashboard — `11_payments.sql` failed on a column that did not exist, and
`sync_like_count()` shipped a bug that made every like fail for weeks without
anyone seeing it. Both were reproducible in a throwaway database in under a
minute.

This runs the migrations against a local Postgres and exercises the triggers.
It needs `postgres` installed; it never connects to Supabase.

```
bash supabase/tests/run.sh
```

Expect every numbered check to print the value its `\echo` describes. Any
`ERROR` is a migration that would have failed in the dashboard.

## What is stubbed

Supabase supplies things a bare Postgres does not: the `auth` schema,
`auth.uid()`, the `authenticated` role, and PostGIS. `run.sh` creates minimal
stand-ins, so two things are **not** covered here and still need checking in
the dashboard:

- `01_churches.sql`, which needs PostGIS
- the `grant`s to `authenticated` in `03_profiles.sql`
- the storage buckets themselves — `storage.objects`, `storage.buckets` and
  `storage.foldername` are stand-ins, so the storage *policies* parse and apply
  here but are not proof that an upload is allowed

Everything else — table shapes, triggers, and the row-level security policies —
behaves the same locally as it does on Supabase.
