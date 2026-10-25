/**
 * FourCircle — connecting an organiser's own Stripe account.
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
 * CONTROLLER PROPERTIES, NOT `type`
 *
 * This said `type: 'standard'`, which is a shorthand for four separate
 * decisions. Three of them were the ones we wanted and the fourth was not, and
 * a shorthand cannot be half-taken, so the four are now stated one by one:
 *
 *   stripe_dashboard.type  = express      the organiser gets Stripe's Express
 *                                         page rather than the full dashboard.
 *   requirement_collection = stripe       Stripe asks for their documents and
 *                                         decides when they are verified.
 *   losses.payments        = application  FourCircle is liable for a negative
 *                                         balance on their account.
 *   fees.payer             = application  FourCircle pays Stripe's processing
 *                                         fees.
 *
 * WHY EXPRESS, AFTER TWO ATTEMPTS AT STANDARD
 *
 * This was `type=standard`, then controller properties shaped like it. Both
 * were refused, and the two refusals together say why the shape is
 * impossible:
 *
 *     When `losses[payments]=application`, the Connect application must also
 *     control fees.
 *
 *     `fees[payer]=application` is not supported when creating an account
 *     with the full dashboard.
 *
 * Full dashboard forces fees.payer=account; pausing payouts forces
 * fees.payer=application. They cannot both be true, so a full-dashboard
 * account can never have its payouts paused. Stripe's own support said twice
 * that this combination was fine. It is not, and the API is the thing that
 * knows.
 *
 * So it is the Express dashboard or no payout hold, and the hold is the
 * arrangement: ticket money stays put until three business days after the
 * event. Without it an organiser can withdraw on the day tickets go on sale
 * and cancel the week after, and the buyers get refunded out of our balance.
 *
 * WHAT IT COSTS
 *
 * The organiser sees Stripe's simpler Express page instead of the full
 * dashboard — and fills in a shorter form to get there, which suits a church
 * secretary better than the long one did. And the 1099-K becomes ours to
 * issue rather than Stripe's, because fees.payer is no longer `account`. That
 * is a form, not a tax return: it reports what we paid them, they file their
 * own return with it, Stripe generates and e-files it for about $3, and it is
 * only required at all once an organiser passes $20,000 and 200 transactions
 * in a year.
 *
 * NONE OF THIS CAN BE CHANGED LATER
 *
 * `stripe_dashboard.type` is fixed at creation; converting an account means
 * creating a different one. So an account made before this commit cannot be
 * brought forward, and there are none — checked, the table was empty.
 *
 * MANUAL PAYOUTS
 *
 * Ticket money reaches the organiser's balance at the moment of sale, because
 * these are destination charges. It must not leave that balance until three
 * business days after the event, or a cancelled event would have nothing left
 * to refund from.
 *
 * Platform controls are what let us hold it, and on a Standard account they
 * are on by default: an account with full Dashboard access under our platform
 * can have its payout schedule set by us and its payouts created by us.
 * Confirmed with Stripe support, October 2026. There is no parameter to
 * enable them.
 *
 * WHAT THIS DOES NOT DO
 *
 * It does not stop an organiser paying themselves out. A manual schedule
 * stops Stripe's automatic payouts, but an account with full Dashboard access
 * can still press Pay out on its own Balances page, and platform controls do
 * not take that away — Stripe was explicit about this. So the balance we are
 * relying on for a refund can be emptied by the person we would be reclaiming
 * it from.
 *
 * That is a risk to carry rather than a bug to fix, and the terms carry it:
 * FourCircle refunds the buyer regardless and recovers from the organiser's
 * later payouts. Worth knowing before somebody assumes the money is locked.
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
const RETURN_URL = 'fourcircle://earnings?tab=Settings&connected=1';
const REFRESH_URL = 'fourcircle://earnings?tab=Settings&refresh=1';

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
          // No `type`. It and `controller` are two ways of saying the same
          // thing and Stripe takes one or the other.
          'controller[stripe_dashboard][type]': 'express',
          'controller[requirement_collection]': 'stripe',
          'controller[fees][payer]': 'application',
          'controller[losses][payments]': 'application',
          email: user.email ?? '',
          'business_profile[product_description]': 'Event tickets sold through FourCircle',
          'metadata[user_id]': user.id,
          // Set at creation rather than afterwards, so there is no window in
          // which an account exists on Stripe's daily rolling default and
          // pays an event out before we ever meant to.
          'settings[payouts][schedule][interval]': 'manual',
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
      let account = await stripe(`accounts/${existing.stripe_account_id}`, 'GET');

      // A safety net, not the main mechanism: accounts are created on a
      // manual schedule above. This catches one created before that was
      // true, and one an organiser has switched back to automatic from their
      // own Dashboard — which they can do, and which would quietly start
      // paying out events we have not been paid for yet.
      //
      // Read before write so the common case costs nothing, and failure here
      // never fails the status call: an organiser should still see where
      // their onboarding stands even if this could not be set.
      const schedule = ((account.settings as Record<string, unknown> | undefined)
        ?.payouts as Record<string, unknown> | undefined)
        ?.schedule as Record<string, unknown> | undefined;
      if (schedule && schedule.interval !== 'manual') {
        try {
          account = await stripe(`accounts/${existing.stripe_account_id}`, 'POST', {
            'settings[payouts][schedule][interval]': 'manual',
          });
        } catch (_) {
          // Left alone deliberately. Worth a log, not a failed screen.
          console.error('could not set manual payouts', existing.stripe_account_id);
        }
      }

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
      // This pointed at dashboard.stripe.com, which was right for a Standard
      // account — those own their dashboard and sign in there themselves. An
      // Express account cannot: it has no password of its own, and the only
      // way in is a single-use link the platform mints for it.
      const link = await stripe(`accounts/${existing.stripe_account_id}/login_links`, 'POST');
      return json({ url: String(link.url) });
    } catch (err) {
      return json({ error: String((err as Error).message || 'Could not open Stripe.') }, 502);
    }
  }

  return json({ error: 'Unknown action.' }, 400);
});
