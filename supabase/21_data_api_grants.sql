-- ============================================================================
-- FaithFinder — explicit Data API grants
--
-- From 30 October, Supabase stops granting Data API access to new tables in
-- the public schema. A table created without grants is simply unreachable
-- through supabase-js: every read returns permission denied.
--
-- NOTHING IS BROKEN TODAY. Every table below was created while the automatic
-- grant still applied and keeps what it was given; the live project carries on
-- exactly as it is, and running this file changes nothing there. Granting a
-- privilege that is already held is a no-op.
--
-- What it fixes is reproducibility. These migrations are the definition of the
-- database, and they have been relying on a convenience that is going away:
-- replayed onto a new project, a preview branch, or after a local `supabase db
-- reset`, all sixteen tables would come up invisible to the app, with nothing
-- in the SQL to explain why. Writing the grants down makes the schema stand on
-- its own, and it has to happen before the first time somebody needs it rather
-- than during.
--
-- GRANTS ARE NOT THE SECURITY BOUNDARY
--
-- Row-level security is, and every table here has it enabled with policies
-- that name auth.uid(). A grant says which roles may address a table at all; a
-- policy says which rows they get. Handing `authenticated` select on posts
-- does not hand anyone a post they could not already read — the policy still
-- decides, and it has not changed.
--
-- WHY anon GETS ALMOST NOTHING
--
-- Only the church directory is meant to be readable signed out: churches and
-- church_profiles are `for select using (true)` because a directory nobody can
-- look at is not a directory. Everywhere else the policies test auth.uid(),
-- which is null for anon, so a grant would buy an anonymous caller a table
-- that answers with zero rows. Better to say no at the grant and mean it.
-- ============================================================================

-- ── The church directory: readable by anyone, signed in or not ─────────────

grant select on public.churches        to anon, authenticated, service_role;
grant select on public.church_profiles to anon, authenticated, service_role;
-- The view the app actually reads, and the earnings view. A view needs its own
-- grant: permission on the tables underneath is not permission on the view.
grant select on public.churches_public to anon, authenticated, service_role;
grant select on public.event_earnings  to authenticated, service_role;

-- church_profiles is written by the account that claimed the church.
grant insert, update on public.church_profiles to authenticated;

-- ── Everything else: signed in only ────────────────────────────────────────
--
-- Listed one per line rather than a loop over the schema. A loop would also
-- grant whatever lands in public next — which is exactly the automatic
-- behaviour being withdrawn, reimplemented by hand and no safer for it.

grant select, insert, update, delete on public.profiles      to authenticated;
grant select, insert, update, delete on public.posts         to authenticated;
grant select, insert, update, delete on public.comments      to authenticated;
grant select, insert, update, delete on public.post_likes    to authenticated;
grant select, insert, update, delete on public.comment_likes to authenticated;
grant select, insert, update, delete on public.connections   to authenticated;
grant select, insert, update, delete on public.blocked_users to authenticated;
grant select, insert, update, delete on public.reports       to authenticated;
grant select, insert, update, delete on public.events        to authenticated;
grant select, insert, update, delete on public.tickets       to authenticated;
grant select, insert, update, delete on public.notifications to authenticated;
grant select, insert, update, delete on public.saved_events  to authenticated;
grant select, insert, update, delete on public.hidden_posts  to authenticated;
grant select, insert, update, delete on public.event_invites to authenticated;

-- The service role bypasses row-level security and is what the payments
-- function writes tickets with. It needs the grant all the same: bypassing
-- policies is not bypassing privileges.
grant select, insert, update, delete on all tables in schema public to service_role;

-- ── Functions the app calls by name ────────────────────────────────────────
--
-- Postgres grants execute to PUBLIC by default, so these work already. Stated
-- anyway, for the same reason as the tables: a default that holds today is not
-- a decision the schema has recorded.

grant execute on function nearby_churches(double precision, double precision, integer, integer, text)
  to anon, authenticated;
grant execute on function delete_own_account() to authenticated;

-- release_seats and release_stale_holds are deliberately NOT here.
--
-- 11_payments.sql revokes both from public, anon and authenticated, and the
-- comment above the revoke says why: "Only the server may hand seats back. A
-- caller who could would be able to empty an event's count and oversell it at
-- will." They are called by the payments edge function, which connects as the
-- service role and is not subject to either grant.
--
-- Worth writing down because the obvious move when adding grants in bulk is to
-- sweep up every function the app calls, and `.rpc('release_seats')` does
-- appear in the codebase — in supabase/functions/payments/index.ts, on the
-- other side of the wire. Granting it here would have quietly undone that
-- revoke and handed every signed-in account the ability to oversell an event.

-- ── And for the tables that do not exist yet ───────────────────────────────
--
-- Every future migration that creates a table in public must grant on it in
-- the same file. There is deliberately no default-privileges rule here to do
-- it automatically: that would restore the very behaviour Supabase is removing,
-- and the point of removing it is that a table reaching the internet should be
-- a sentence somebody wrote on purpose.
