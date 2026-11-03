-- ============================================================================
-- FourCircle — when a church claim arrived, and who may answer it
--
-- The claim pipeline is otherwise complete: submitting sets
-- verification_status to 'pending' and records claimed_church_id, approving
-- grants ownership through grant_church_claim(), and the decision notifies the
-- church through notify_verification(). What was missing is smaller and, in one
-- case, unrecoverable.
--
-- 1. NOTHING RECORDED WHEN A CLAIM ARRIVED.
--
--    The app tells every claimant, in four places, that FourCircle reviews
--    submissions "within 3-5 business days". There was no column saying when a
--    claim came in, so the promise could not be measured, let alone kept -- and
--    a timestamp cannot be recovered after the fact. This is the part that had
--    to go in before launch rather than with the review screen: every claim
--    taken without it loses its arrival time permanently.
--
-- 2. THE GUARD LOCKED OUT THE REVIEWER AS WELL AS THE CLAIMANT.
--
--    guard_verification_status() reverts any status change made while
--    auth.uid() is not null -- correctly, because profiles is self-writable and
--    nobody may approve themselves. But that is every signed-in session,
--    including an admin's. Its own comment conceded the consequence: "auth.uid()
--    is null for the service role and in the SQL editor, which is where the
--    review actually happens." Review by hand-written SQL, forever.
--
--    Admins are now exempt. This changes nothing today -- an admin still has no
--    update policy on anybody else's profile row, and the SQL editor was always
--    allowed through -- but the function has to be replaced for the timestamp
--    anyway, and replacing it twice is worse than once. It means a review
--    screen, when there is one, is not dead on arrival.
--
-- No review UI here. With no users there are no claims, and reviewing the first
-- handful from the pending_claims view below costs less than building a screen
-- for them.
-- ============================================================================

alter table profiles add column if not exists verification_submitted_at timestamptz;

comment on column profiles.verification_submitted_at is
  'When this account last submitted a church claim. Set by '
  'guard_verification_status() on the move into pending; untouched by the '
  'decision, so an approved claim still says when it was asked for.';

-- Anything already pending predates the column. now() is wrong but bounded:
-- it reads as "waiting since the migration", which is honest about not knowing,
-- where null would have read as waiting since forever.
update profiles
   set verification_submitted_at = now()
 where verification_status = 'pending'
   and verification_submitted_at is null;


-- ── The guard, with a reviewer exemption and a clock ───────────────────────
create or replace function guard_verification_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.verification_status is distinct from old.verification_status
     and auth.uid() is not null
     and not is_admin()
     and not (old.verification_status in ('none', 'rejected')
              and new.verification_status = 'pending')
  then
    new.verification_status := old.verification_status;
  end if;

  -- Stamped on the way into pending, after the revert above: a status change
  -- that was just put back is not a submission and must not look like one.
  if new.verification_status = 'pending'
     and coalesce(old.verification_status, '') <> 'pending' then
    new.verification_submitted_at := now();
  end if;

  return new;
end $$;


-- ── The queue ──────────────────────────────────────────────────────────────
-- Admin-only, by the same shape as payouts_due: the body carries `where
-- is_admin()`, so a non-admin selecting from it gets no rows rather than an
-- error. Read it in the SQL editor until there is a screen.
create or replace view pending_claims as
  select
    p.id                                           as profile_id,
    trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, ''))
                                                   as claimant_name,
    u.email                                        as claimant_email,
    p.church_name                                  as claimed_name_typed,
    p.phone,
    p.website,
    p.denomination,
    p.claimed_church_id,
    -- What the directory already knows, to check the claim against.
    c.name                                         as directory_name,
    c.address                                      as directory_address,
    c.state                                        as directory_state,
    -- Null means the claim names no row in our directory: a Google result or
    -- a hand-typed church. Still reviewable, but approving it confers nothing,
    -- because grant_church_claim() has no church to grant.
    (p.claimed_church_id is null)                  as unmatched,
    -- Already owned by somebody else, so approving will NOT transfer it --
    -- grant_church_claim() leaves an existing claim alone on purpose.
    (cp.claimed_at is not null and cp.claimed_by <> p.id)
                                                   as already_claimed_by_other,
    p.verification_submitted_at                    as submitted_at,
    -- 5, the outer edge of the "3-5 business days" the app promises, so this
    -- is the date the promise is actually measured against. Null-guarded the
    -- same way 33_payouts.sql guards ends_at.
    case when p.verification_submitted_at is null then null
         else add_business_days(p.verification_submitted_at, 5) end
                                                   as answer_due_at
  from profiles p
  join auth.users u            on u.id = p.id
  left join churches c         on c.id = p.claimed_church_id
  left join church_profiles cp on cp.church_id = p.claimed_church_id
  where p.verification_status = 'pending'
    and is_admin()
  order by p.verification_submitted_at nulls first;

grant select on public.pending_claims to authenticated;

-- How to review one, until there is a screen. In the SQL editor auth.uid() is
-- null, so the guard allows the change and the triggers do the rest -- ownership
-- through grant_church_claim(), the notification through notify_verification().
--
--   select * from pending_claims;
--
--   update profiles set verification_status = 'approved' where id = '<profile_id>';
--   update profiles set verification_status = 'rejected' where id = '<profile_id>';
