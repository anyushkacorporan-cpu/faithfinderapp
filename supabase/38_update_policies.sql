-- ============================================================================
-- FourCircle — an update may not turn a row into something you do not own
--
-- Six update policies were written as `using (...)` with no `with check`.
-- Those two clauses answer different questions and only the first was being
-- asked:
--
--     using       which rows may I touch          (the row as it is)
--     with check  what may I turn them into       (the row as it becomes)
--
-- Without the second, the only thing stopping you rewriting the ownership
-- column of a row you own is that nobody tried.
--
-- ── 1. Any approved church could take any unclaimed one ───────────────────
--
-- church_profiles.church_id is the PRIMARY KEY, and the policy was
-- `using (auth.uid() = claimed_by)`. So an organiser approved for one church
-- could update their own row's church_id to any other church's id. The using
-- clause passes, because it is still their row. Nothing looked at what the row
-- had become.
--
-- They would then control that church's public listing -- name, address,
-- phone, photos -- having never claimed it. Any of the ~235,000 unclaimed
-- churches, and the whole verification flow stepped around.
--
-- A `with check` alone does NOT fix this: after the change claimed_by is still
-- them, so it passes. The primary key has to be frozen outright, which is a
-- trigger's job.
--
-- ── 2. A claim could be switched after it was approved ────────────────────
--
-- profiles.claimed_church_id had no guard at all -- only verification_status
-- did. grant_church_claim() reads claimed_church_id at the moment of
-- approval, so:
--
--     the claimant submits for St Mary's
--     the reviewer opens the queue, sees St Mary's, approves
--     the claimant changed it to another church seconds earlier
--     the trigger grants the other church
--
-- The reviewer's yes applied to a church they never looked at. It is now
-- settable only in the same update that submits the claim, which is exactly
-- what submitVerification() does, and frozen from then until a decision.
--
-- ── 3. The rest ───────────────────────────────────────────────────────────
--
-- The remaining four get the missing clause. The exposure there is smaller --
-- changing your own row's owner gives your thing away rather than taking
-- somebody else's -- but a post that can be reattributed to another account
-- is a byline nobody wrote, and that is worth closing on its own.
-- ============================================================================

-- ── 1. church_profiles ─────────────────────────────────────────────────────

create or replace function freeze_claimed_church()
returns trigger language plpgsql as $$
begin
  if new.church_id is distinct from old.church_id then
    raise exception 'A church profile cannot be moved to a different church'
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

comment on function freeze_claimed_church() is
  'church_profiles.church_id is the primary key and the identity of the claim. '
  'Moving it would be claiming a different church without being approved for it.';

-- grant_church_claim() writes here with INSERT ... ON CONFLICT (church_id) DO
-- UPDATE, where church_id is the conflict key and therefore unchanged, so an
-- approval does not trip this.
drop trigger if exists church_profiles_freeze_id on church_profiles;
create trigger church_profiles_freeze_id before update on church_profiles
  for each row execute function freeze_claimed_church();

drop policy if exists profiles_owner_update on church_profiles;
create policy profiles_owner_update on church_profiles
  for update using (auth.uid() = claimed_by)
         with check (auth.uid() = claimed_by);


-- ── 2. profiles.claimed_church_id ──────────────────────────────────────────
-- Replaces the version in 35_claims.sql, keeping everything it did: the
-- self-approval revert, the admin exemption, and the submitted-at stamp.

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

  -- Which church is being claimed may be set only in the same update that
  -- submits the claim. Checked after the revert above on purpose: a status
  -- change that was just put back is not a submission and must not open this.
  if new.claimed_church_id is distinct from old.claimed_church_id
     and auth.uid() is not null
     and not is_admin()
     and not (new.verification_status = 'pending'
              and coalesce(old.verification_status, 'none') in ('none', 'rejected'))
  then
    new.claimed_church_id := old.claimed_church_id;
  end if;

  if new.verification_status = 'pending'
     and coalesce(old.verification_status, '') <> 'pending' then
    new.verification_submitted_at := now();
  end if;

  return new;
end $$;


-- ── 3. The missing clause, everywhere else ─────────────────────────────────

drop policy if exists profiles_update_own on profiles;
create policy profiles_update_own on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists posts_update_own on posts;
create policy posts_update_own on posts
  for update using (auth.uid() = author_id) with check (auth.uid() = author_id);

drop policy if exists comments_update_own on comments;
create policy comments_update_own on comments
  for update using (auth.uid() = author_id) with check (auth.uid() = author_id);

drop policy if exists events_update_own on events;
create policy events_update_own on events
  for update using (auth.uid() = organizer_id) with check (auth.uid() = organizer_id);

-- Storage: stops a file being moved into somebody else's folder, or out of
-- the avatars bucket entirely, by an update rather than an upload.
drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects
  for update using (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  ) with check (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );
