-- ============================================================================
-- FourCircle — recording which clock an event's time was read off
--
-- ends_at is a real instant, built from the date and time pickers on the
-- organiser's phone and converted to UTC. What is not recorded anywhere is
-- which zone that phone was in. An organiser in Los Angeles creating an event
-- in New York produces an instant three hours out, and nothing in the row says
-- so or lets it be corrected.
--
-- Three hours is small: it is nothing against a three-business-day payout
-- hold, and it means an event leaves the list slightly early. The reason this
-- goes in now anyway is that it cannot be reconstructed later. Every event
-- taken without it loses which clock it meant, permanently -- the same shape
-- as verification_submitted_at, and the same reason for doing it before launch
-- rather than with the feature that eventually uses it.
--
-- Written from the device, with no picker. An organiser creates an event where
-- they are, so the phone is right almost every time, and for an online event
-- there is no venue zone at all -- the organiser's own is the correct answer
-- rather than a compromise. A field asking everybody to choose would add
-- friction for all of them to fix a case few of them have.
--
-- Nothing reads this yet, deliberately. Converting the date logic to use it is
-- the expensive half, it only helps the out-of-town case, and it can be done
-- at any point once the column is being filled.
-- ============================================================================

alter table events add column if not exists timezone text;

comment on column events.timezone is
  'IANA zone of the device that set this event''s date and time, e.g. '
  'America/New_York. Recorded so ends_at can be corrected later; nothing '
  'reads it yet. Null on events created before this column existed.';
