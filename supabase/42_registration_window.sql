-- ============================================================================
-- FourCircle — when registration closes
--
-- Two columns, because the rule needs an instant it did not have.
--
-- starts_at
--   The event has never had one. ends_at was added for the payout hold, and
--   the start existed only as `time`, free text an organiser typed. So "close
--   registration when the event starts" had nothing to compare against.
--
-- registration_closes_at
--   The organiser's own earlier cutoff, when they want one -- a door time,
--   catering numbers, badges to print. Null means use the default below.
--
-- THE RULE
--
--   paid   closes at starts_at
--   free   closes at ends_at
--   either closes at registration_closes_at when one is set
--
-- Paid closes at the start because somebody buying a $30 ticket at 7:30 for a
-- 6-to-8 concert has paid full price for half an hour, and FourCircle is the
-- merchant of record when they dispute it.
--
-- Free stays open to the end because walking in is the point. A worship night
-- at six, somebody arrives at ten past: they are standing in the room, and
-- refusing to register them helps nobody.
--
-- An event whose relevant instant is unknown is never treated as closed --
-- events made before these columns existed have neither. Refusing a real
-- registration because nothing was recorded is worse than accepting a late one.
-- ============================================================================

alter table events add column if not exists starts_at timestamptz;
alter table events add column if not exists registration_closes_at timestamptz;

comment on column events.starts_at is
  'When the event begins. Null on events created before this column existed, '
  'where only the free-text `time` says.';

comment on column events.registration_closes_at is
  'An organiser''s own cutoff, earlier than the default. Null means the '
  'default applies: the start for a paid event, the end for a free one.';

create index if not exists events_starts_at_idx on events (starts_at)
  where starts_at is not null;
