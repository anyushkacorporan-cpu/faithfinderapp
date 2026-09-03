-- ============================================================================
-- FaithFinder — blocks and reports
--
-- Both of these were kept in AsyncStorage on the phone, which made them look
-- like features while being neither.
--
-- A block survived only until the app was reinstalled or the person got a new
-- phone, at which point everyone they had blocked came back. A report was
-- written to the reporter's own device and read by nobody — the person filing
-- it was told it had been submitted, and nothing had been.
--
-- App Store review asks for both to work for real on apps carrying
-- user-generated content, and the second one is the difference between having
-- moderation and appearing to.
-- ============================================================================

-- ── Blocks ─────────────────────────────────────────────────────────────────
create table if not exists blocked_users (
  id           uuid primary key default gen_random_uuid(),
  blocker_id   uuid not null references auth.users (id) on delete cascade,

  -- Identity is stored twice, matching the app. Posts written before accounts
  -- had ids carry only a display name, so a block recorded against an id would
  -- silently fail to match them. Once every post carries an author id the name
  -- half can go.
  blocked_id   uuid references auth.users (id) on delete cascade,
  blocked_name text not null,

  created_at   timestamptz not null default now(),

  -- One block per person per target. Blocking twice is not an error worth
  -- surfacing; it just should not create a second row.
  unique (blocker_id, blocked_name)
);

create index if not exists blocked_users_blocker_idx on blocked_users (blocker_id);

alter table blocked_users enable row level security;

-- Your block list is yours: nobody else can read who you have blocked, and
-- nobody can add one on your behalf.
drop policy if exists blocked_select_own on blocked_users;
create policy blocked_select_own on blocked_users
  for select using (auth.uid() = blocker_id);

drop policy if exists blocked_insert_own on blocked_users;
create policy blocked_insert_own on blocked_users
  for insert with check (auth.uid() = blocker_id);

drop policy if exists blocked_delete_own on blocked_users;
create policy blocked_delete_own on blocked_users
  for delete using (auth.uid() = blocker_id);

-- ── Reports ────────────────────────────────────────────────────────────────
create table if not exists reports (
  id            uuid primary key default gen_random_uuid(),
  reporter_id   uuid not null references auth.users (id) on delete cascade,

  target_type   text not null check (target_type in ('post', 'comment', 'user', 'event')),
  -- Not a foreign key: posts still live on the reporter's device, so the id
  -- points at something this database cannot see yet. It becomes a real
  -- reference when posts move here.
  target_id     text not null,

  target_author      text,
  target_author_id   uuid,

  reason        text not null,
  details       text,

  -- The reported text, copied at the moment of reporting.
  --
  -- Without this a report names content nobody but the reporter can read, and
  -- an author who deletes a post erases the evidence against it. A snapshot
  -- means a report is still actionable after the fact — which is the entire
  -- point of filing one.
  snapshot      text,

  status        text not null default 'open'
                  check (status in ('open', 'reviewed', 'actioned', 'dismissed')),
  created_at    timestamptz not null default now(),

  -- The same person reporting the same thing twice is a double-tap, not two
  -- reports. Different people reporting it are separate rows, and the count
  -- of them is the signal worth acting on.
  unique (reporter_id, target_type, target_id)
);

create index if not exists reports_open_idx on reports (created_at desc) where status = 'open';
create index if not exists reports_target_idx on reports (target_type, target_id);

alter table reports enable row level security;

-- Anyone signed in can file one, on their own behalf only.
drop policy if exists reports_insert_own on reports;
create policy reports_insert_own on reports
  for insert with check (auth.uid() = reporter_id);

-- A reporter can see what they filed, and nothing else. Reviewing reports is
-- done from the dashboard with the service role, which bypasses this — there
-- is deliberately no "moderator" role in the app yet, because there is no
-- moderator.
drop policy if exists reports_select_own on reports;
create policy reports_select_own on reports
  for select using (auth.uid() = reporter_id);

-- ── Reading the queue ──────────────────────────────────────────────────────
-- Run in the SQL editor to see what has come in:
--
--   select created_at, target_type, reason, target_author, snapshot
--   from reports where status = 'open'
--   order by created_at desc;
--
-- And to close one out:
--
--   update reports set status = 'reviewed' where id = '…';
