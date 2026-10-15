-- ============================================================================
-- FaithFinder — the launch list
--
-- The app is not in the App Store yet, and the Instagram account is starting
-- before it is. A link in a bio needs somewhere to land, and "coming soon" on
-- its own wastes the visit: somebody interested today has no way to be told
-- when the thing they were interested in exists, and by launch they have
-- forgotten the name. This is where that address goes.
--
-- WHY THERE ARE NO POLICIES ON THIS TABLE
--
-- The page holding the form is public, so the key in it is public too, and
-- anyone who opens the page can read that key out of it. That is normal and
-- the publishable key is designed for it, but it means a policy letting `anon`
-- write to this table is a policy letting the whole internet write to it, and
-- a policy letting `anon` read it is a policy publishing everyone's email
-- address.
--
-- So row-level security is on and there are no policies at all, which denies
-- both roles everything. The only way in is join_waitlist() below, which takes
-- one address at a time, decides itself what gets stored, and returns nothing
-- about anybody else. Nothing can read this table through the Data API by any
-- route; the list is read in the Supabase dashboard, whose SQL editor runs as
-- the owner and is not subject to RLS:
--
--     select created_at::date, source, email from waitlist order by created_at;
--
-- WHAT IS STILL EXPOSED, HONESTLY
--
-- Anybody can call join_waitlist() as often as they like, so this table can be
-- filled with addresses that nobody typed. Dedupe by email makes that cost one
-- distinct address per row rather than one request per row, which is the usual
-- ceiling on a sign-up form and the reason mailing lists confirm by email
-- before they ever send anything. If it is ever actually abused the answer is
-- a captcha or Supabase's own rate limiting in front of the function, not a
-- different shape of table, so the shape is not bent around it in advance.
-- ============================================================================

create table if not exists waitlist (
  id          uuid primary key default gen_random_uuid(),

  -- Stored lowercase and trimmed, always, because join_waitlist() is the only
  -- thing that writes here and it normalises first. That is what makes a plain
  -- unique constraint enough: without it Annie@x.com and annie@x.com are two
  -- rows and one person gets two launch emails.
  email       text not null unique,

  -- Where the link was. Instagram today; a flyer, a bulletin or a second page
  -- later. Set by the page, so it says which link worked rather than guessing.
  source      text,

  created_at  timestamptz not null default now()
);

alter table waitlist enable row level security;

-- No policies, deliberately — see the header. And no Data API grants either,
-- so the table is not addressable at all rather than addressable and empty:
-- after 30 October a new public-schema table gets no automatic grant
-- (21_data_api_grants.sql), and these lines say so out loud instead of
-- depending on the default staying that way.
revoke all on public.waitlist from anon, authenticated;

/**
 * Add one address to the launch list.
 *
 * Returns true whether the address was new or already there. Telling somebody
 * "you are already on this list" is information about the list that a stranger
 * typing an address into a public form should not get: it turns the form into
 * a way to ask whether a given person signed up. Both answers look the same
 * from outside, and both are correct from the visitor's point of view, which
 * is that they will be emailed at launch.
 *
 * It deliberately does not return a position. A number is a nice touch at ten
 * thousand sign-ups and a bad one at six, and it would publish the size of the
 * list to anybody who asked.
 *
 * security definer because the table denies anon everything; this function is
 * the entire opening, which is why it validates rather than trusting what it
 * is handed, and why search_path is pinned (20_function_search_path.sql).
 */
create or replace function join_waitlist(
  p_email  text,
  p_source text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  clean text;
  src   text;
begin
  clean := lower(btrim(coalesce(p_email, '')));

  -- Not a validator so much as a refusal to store obvious rubbish. An address
  -- is only really checked by sending to it, so this catches the typo and the
  -- empty box and leaves the rest to the launch email bouncing.
  if clean !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]{2,}$' or length(clean) > 254 then
    raise exception 'Please check that email address.' using errcode = '22023';
  end if;

  -- Clamped rather than trusted: the caller is a public web page, so this is
  -- a label somebody can put anything in, and it is only ever read by a human
  -- looking at which link worked.
  src := nullif(left(btrim(coalesce(p_source, '')), 40), '');

  insert into waitlist (email, source)
  values (clean, src)
  on conflict (email) do nothing;

  return true;
end;
$$;

-- The page is public and has no session, so anon is the role that calls this.
-- authenticated too, because somebody signed into the app on another device is
-- still allowed to put an address in a form.
grant execute on function join_waitlist(text, text) to anon, authenticated;
