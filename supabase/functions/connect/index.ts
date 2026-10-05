/**
 * FaithFinder — connecting an organiser's own Stripe account.
 *
 * Runs on Supabase for the same reason the payments function does: everything
 * here needs the Stripe secret key, and anything shipped inside the app can be
 * read out of it.
 *
 * Three actions:
 *
 *   link     make the organiser a Stripe account if they have none, and hand
 *            back a one-time URL to Stripe's own onboarding form
 *   status   ask Stripe where that account stands, and cache the answer
 *   login    a link into their Stripe dashboard, once they have one
 *
 * STANDARD, NOT EXPRESS
 *
 * `type=standard` means the account belongs to the organiser, not to us. They
 * see Stripe's own branding, they get Stripe's own dashboard, and Stripe
 * handles their tax forms. We never hold their money and never file their
 * 1099-K. The cost is that they fill in Stripe's full form rather than a short
 * one — once, per organiser, which is the right place for that cost to land.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const STRIPE_SECRET = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// Where Stripe sends the organiser when their form is done or has expired.
// A deep link rather than a web page, because the journey started in the app
// and should end there; `scheme` in app.json is what makes this resolve.
//
// It must name a route that exists. These pointed at /payouts, which does not
// — the payouts screen is a tab inside /earnings — so finishing Stripe's form
// would have dropped the organiser on an unmatched route, at the end of
// handing over their bank details, with no way to tell whether it had worked.
const RETURN_URL = 'faithfinder://earnings?tab=Settings&connected=1';
const REFRESH_URL = 'faithfinder://earnings?tab=Settings&refresh=1';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

/** Stripe's API is form-encoded, and its errors are worth reading. */
async function stripe(path: string, method: 'GET' | 'POST', form?: Record<string, string>) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form ? new URLSearchParams(form).toString() : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Stripe ${res.status}`);
  return data;
}

/** Stripe's view of an account, written down as ours. */
type Snapshot = {
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  requirements_due: string[];
};

function snapshot(account: Record<string, unknown>): Snapshot {
  const req = (account.requirements ?? {}) as Record<string, unknown>;
  // `currently_due` is what Stripe is waiting on now; `past_due` is what it has
  // waited too long for. Both stop money moving, so both are worth showing.
  const due = [
    ...((req.currently_due as string[]) ?? []),
    ...((req.past_due as string[]) ?? []),
  ];
  return {
    charges_enabled: account.charges_enabled === true,
    payouts_enabled: account.payouts_enabled === true,
    details_submitted: account.details_submitted === true,
    requirements_due: [...new Set(due)],
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  if (!STRIPE_SECRET) {
    return json({ error: 'Payouts are not configured on the server yet.' }, 500);
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const asCaller = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await asCaller.auth.getUser();
  if (!user) return json({ error: 'You need to be signed in.' }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: 'Bad request.' }, 400); }
  const action = String(body.action ?? '');

  const { data: existing } = await admin
    .from('stripe_accounts')
    .select('stripe_account_id')
    .eq('user_id', user.id)
    .maybeSingle();

  // ── Start or resume onboarding ───────────────────────────────────────────
  if (action === 'link') {
    try {
      let accountId = existing?.stripe_account_id ?? '';

      if (!accountId) {
        // Created once and kept. Making a second account for someone who
        // abandoned the form halfway would strand the first one, and Stripe
        // counts both against the platform.
        const account = await stripe('accounts', 'POST', {
          type: 'standard',
          email: user.email ?? '',
          'business_profile[product_description]': 'Event tickets sold through FaithFinder',
          'metadata[user_id]': user.id,
        });
        accountId = String(account.id);

        const { error: insErr } = await admin.from('stripe_accounts').insert({
          user_id: user.id,
          stripe_account_id: accountId,
          ...snapshot(account),
        });
        // A failure here would lose the account id while Stripe keeps the
        // account, so it is worth saying so rather than carrying on and
        // creating another one on the next tap.
        if (insErr) return json({ error: 'Could not save the new account. Try again.' }, 500);
      }

      // Single use and short lived, by Stripe's design. This is why the app
      // asks for one each time rather than storing it.
      const link = await stripe('account_links', 'POST', {
        account: accountId,
        refresh_url: REFRESH_URL,
        return_url: RETURN_URL,
        type: 'account_onboarding',
      });

      return json({ url: link.url });
    } catch (err) {
      return json({ error: String((err as Error).message || 'Could not start setup.') }, 502);
    }
  }

  // ── Where does the account stand ─────────────────────────────────────────
  if (action === 'status') {
    if (!existing?.stripe_account_id) {
      return json({ connected: false, charges_enabled: false, payouts_enabled: false, requirements_due: [] });
    }
    try {
      const account = await stripe(`accounts/${existing.stripe_account_id}`, 'GET');
      const snap = snapshot(account);

      await admin.from('stripe_accounts')
        .update({ ...snap, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      return json({ connected: true, ...snap });
    } catch (err) {
      // Stripe is unreachable or the account is gone. Report the cached row
      // rather than nothing: a screen that says "we cannot tell right now"
      // beats one that says "not connected" to someone who is.
      const { data: cached } = await admin
        .from('stripe_accounts')
        .select('charges_enabled, payouts_enabled, details_submitted, requirements_due')
        .eq('user_id', user.id)
        .maybeSingle();
      return json({
        connected: true,
        stale: true,
        error: String((err as Error).message || 'Could not reach Stripe.'),
        ...(cached ?? { charges_enabled: false, payouts_enabled: false, requirements_due: [] }),
      });
    }
  }

  // ── A way into their own Stripe dashboard ────────────────────────────────
  if (action === 'login') {
    if (!existing?.stripe_account_id) return json({ error: 'No payout account yet.' }, 400);
    try {
      // Standard accounts own their dashboard, so this is just a signpost to
      // stripe.com rather than a session we create.
      return json({ url: 'https://dashboard.stripe.com/' });
    } catch (err) {
      return json({ error: String((err as Error).message || 'Could not open Stripe.') }, 502);
    }
  }

  return json({ error: 'Unknown action.' }, 400);
});
