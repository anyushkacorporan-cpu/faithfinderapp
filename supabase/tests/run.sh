#!/usr/bin/env bash
# Apply the migrations to a scratch Postgres and exercise the triggers.
set -euo pipefail

BIN=$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | tail -1 || true)
[ -n "$BIN" ] || { echo "No Postgres found. Install it, or run these files by hand."; exit 1; }

DIR=$(mktemp -d /var/lib/postgresql/fftest.XXXXXX)
SQL=$(cd "$(dirname "$0")/.." && pwd)
chown postgres:postgres "$DIR"
trap 'su postgres -c "$BIN/pg_ctl -D $DIR/data stop -m immediate" >/dev/null 2>&1 || true; rm -rf "$DIR"' EXIT

su postgres -c "$BIN/initdb -D $DIR/data -A trust" >/dev/null
su postgres -c "$BIN/pg_ctl -D $DIR/data -o '-k $DIR -p 5433 -c listen_addresses=' -l $DIR/log start" >/dev/null
su postgres -c "psql -h $DIR -p 5433 -d postgres -qc 'create database ff;'"

# The parts of Supabase a bare Postgres does not have. See README.md.
su postgres -c "psql -h $DIR -p 5433 -d ff -q" <<'SHIM'
create schema if not exists auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text unique,
  email_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz not null default now());
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid; $$;
create function auth.role() returns text language sql stable as $$ select 'authenticated'::text; $$;
create schema if not exists storage;
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
create table storage.buckets (id text primary key, name text, public boolean default false);
-- Supabase's own helper, used by the storage policies in 07_posts.sql and
-- 08_avatars.sql: the path parts of an object name, without the file itself.
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:greatest(array_length(string_to_array(name, '/'), 1) - 1, 0)]; $$;
-- 01_churches.sql needs PostGIS, which is not assumed here.
create table churches (id uuid primary key default gen_random_uuid(), name text);
SHIM

for f in 03_profiles 06_moderation 07_posts 09_connections 10_events 12_post_images \
         13_notifications 14_fix_like_counts; do
  printf '%-22s' "$f"
  out=$(su postgres -c "psql -h $DIR -p 5433 -d ff -qf $SQL/$f.sql" 2>&1 \
        | grep -v 'NOTICE\|role "authenticated" does not exist' || true)
  [ -z "$out" ] && echo "ok" || { echo "FAILED"; echo "$out" | head -5; }
done

echo
su postgres -c "psql -h $DIR -p 5433 -d ff -f $SQL/tests/notifications_test.sql" 2>&1 \
  | grep -v '^INSERT\|^UPDATE\|^DELETE\|^SET$\|^GRANT$\|^CREATE ROLE$'
