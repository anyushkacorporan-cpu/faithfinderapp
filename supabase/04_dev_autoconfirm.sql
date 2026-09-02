-- ============================================================================
-- FaithFinder — DEVELOPMENT ONLY: confirm new accounts automatically
--
-- REMOVE THIS BEFORE LAUNCH. Instructions at the bottom.
--
-- Why this exists
-- ---------------
-- The project requires email confirmation, and Supabase's built-in sender is
-- rate-limited to a handful of messages an hour and frequently does not
-- deliver at all. So sign-up succeeds, no email arrives, and sign-in fails
-- with "Invalid login credentials" — the same message a wrong password gives.
-- Nobody can get into the app, including us.
--
-- The dashboard toggle that turns confirmation off is not where the docs say
-- it is in this dashboard version. This does the same thing from the database,
-- where we can see exactly what it does.
--
-- What it does
-- ------------
-- Stamps email_confirmed_at on every new account as it is inserted, which is
-- precisely what clicking a confirmation link would do. Nothing else changes:
-- passwords are still hashed by Supabase, sessions still expire, RLS still
-- applies.
--
-- Why it must not ship
-- --------------------
-- Confirmation is what proves the person signing up owns the address they
-- typed. Without it anyone can create an account as anyone else's email, and
-- password reset then sends a reset link to a stranger's inbox. That is fine
-- while you are the only user; it is not fine in the App Store.
-- ============================================================================

create or replace function dev_auto_confirm_email()
returns trigger
language plpgsql
security definer
set search_path = auth
as $$
begin
  -- coalesce, so an account confirmed some other way keeps its real timestamp.
  new.email_confirmed_at := coalesce(new.email_confirmed_at, now());
  return new;
end;
$$;

drop trigger if exists dev_auto_confirm on auth.users;
create trigger dev_auto_confirm
  before insert on auth.users
  for each row execute function dev_auto_confirm_email();

-- Existing accounts created before this ran are still stuck. Free them too.
update auth.users set email_confirmed_at = now() where email_confirmed_at is null;

-- ── Removing it, when real email is set up ─────────────────────────────────
--   drop trigger if exists dev_auto_confirm on auth.users;
--   drop function if exists dev_auto_confirm_email();
-- Then configure SMTP (Project Settings → Authentication → SMTP) so the
-- confirmation emails Supabase sends actually arrive.
