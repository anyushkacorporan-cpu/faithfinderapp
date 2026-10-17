-- ============================================================================
-- Four Circle — one welcome email per address, ever
--
-- Signing up and receiving nothing is a worse experience than it looks. The
-- person has no record it happened, and a typed-wrong address fails silently:
-- it sits in the list looking exactly like a real one until launch day, when
-- it bounces and nobody is left to tell. An email sent while they are still
-- on the page is what turns that into a problem they can fix themselves.
--
-- It also matters months early. A domain that has never sent an email and
-- then sends four hundred in an afternoon is, to a spam filter, indis-
-- tinguishable from a domain that was bought to do exactly that. Sending a
-- trickle from today builds the reputation the launch email will need.
--
-- WHY A CLAIM RATHER THAN A FLAG
--
-- The function that sends the email has to be reachable from the public page,
-- and anything reachable from a public page is reachable by anyone. An
-- endpoint that takes an address and emails it is a way to send mail to
-- strangers using somebody else's domain.
--
-- claim_welcome() closes that. It will only ever return true once per address,
-- and only for an address already on the list, so the worst available to
-- somebody poking at it is causing one welcome email to be sent to a person
-- who genuinely signed up a moment ago. The update and the test are a single
-- statement, so two requests arriving together cannot both win it.
-- ============================================================================

alter table waitlist add column if not exists welcomed_at timestamptz;

comment on column waitlist.welcomed_at is
  'When the welcome email was sent. Null means it has not been. Set only by claim_welcome().';

/**
 * Take the right to send one welcome email to this address.
 *
 * Returns true exactly once per address, to whoever asks first, and false
 * forever after. False is also the answer for an address that is not on the
 * list, which is what keeps this from being a way to email strangers.
 *
 * The `and welcomed_at is null` in the WHERE is the whole mechanism: UPDATE
 * takes a row lock, so of two callers arriving at the same moment the second
 * one finds the column already set and matches nothing.
 */
create or replace function claim_welcome(p_email text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed boolean;
begin
  update waitlist
     set welcomed_at = now()
   where email = lower(btrim(coalesce(p_email, '')))
     and welcomed_at is null
  returning true into claimed;

  return coalesce(claimed, false);
end;
$$;

-- Postgres grants EXECUTE on a new function to PUBLIC, which would include
-- anon. That matters here: anyone able to call this could mark addresses as
-- welcomed and quietly stop those people ever getting their email. Only the
-- edge function, which runs as service_role and holds the Resend key, may.
revoke all on function claim_welcome(text) from public;
grant execute on function claim_welcome(text) to service_role;
