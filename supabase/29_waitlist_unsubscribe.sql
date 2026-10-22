-- ============================================================================
-- FourCircle — one click off the list
--
-- The welcome email's unsubscribe was a mailto. Clicking it opened a half
-- written message to support@ that the reader then had to actually send, and
-- that somebody then had to act on by hand. Two things wrong with that. It
-- asks for effort at the exact moment a person has decided they want less to
-- do with you, and the easier button right next to it is the one marked spam,
-- which costs the domain far more than one subscriber.
--
-- So: a link that removes them when they click it, and nothing else.
--
-- WHY A TOKEN AND NOT THE ADDRESS
--
-- A link carrying the address, like /unsubscribe?email=someone@example.com,
-- is a link anybody can type. Guess an address, remove that person, and they
-- never hear about the launch they signed up for. The token is a random uuid
-- per row, given out only inside the email that was sent to that address, and
-- unguessable in the sense that matters: there is nothing to guess from.
--
-- WHY IT DELETES RATHER THAN MARKS
--
-- A flag means every query that reads this table has to remember the flag,
-- and the one that will not remember it is the one written in a hurry on
-- launch day. Deleting keeps `select * from waitlist` honestly equal to the
-- list of people to write to, which is the only query anybody is going to
-- run. Somebody who changes their mind can sign up again, and the form will
-- treat them as new, which is correct.
-- ============================================================================

alter table waitlist
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid();

comment on column waitlist.unsubscribe_token is
  'Random per row, sent only inside that row''s own email. The one thing that proves a click came from the person who received it.';

/**
 * Take somebody off the list, given the token from their own email.
 *
 * Returns true if a row went, false if the token matches nothing, which is
 * also the answer for a token that has already been used. Both look the same
 * to whoever is clicking, and both mean the same thing to them: they are not
 * on this list.
 *
 * Callable by anon, which is the point. The token is the credential, and
 * nobody without the email has one.
 */
create or replace function unsubscribe_waitlist(p_token uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  gone boolean;
begin
  delete from waitlist where unsubscribe_token = p_token
  returning true into gone;

  return coalesce(gone, false);
end;
$$;

revoke all on function unsubscribe_waitlist(uuid) from public;
grant execute on function unsubscribe_waitlist(uuid) to anon, authenticated;

/**
 * The token for an address, for the function that sends the email.
 *
 * Separate from join_waitlist because that one answers a public web page and
 * must give nothing back; this one hands over the credential itself and is
 * therefore service_role only, called from inside the edge function that
 * already holds the Resend key.
 */
create or replace function waitlist_token(p_email text)
returns uuid
language sql
security definer
set search_path = public
as $$
  select unsubscribe_token from waitlist
   where email = lower(btrim(coalesce(p_email, '')));
$$;

revoke all on function waitlist_token(text) from public;
grant execute on function waitlist_token(text) to service_role;
