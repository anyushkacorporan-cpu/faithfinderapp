# Turning on real payments

Checkout used to wait two seconds and issue a ticket. Seats were claimed,
earnings were counted, and no money moved — an organiser would have seen a
payout owed against a sale that never happened.

This is what makes it real. Roughly 30 minutes, mostly waiting on Stripe's
signup form.

## Why there is a server involved

Creating a charge requires your Stripe **secret** key. Anything shipped inside
an app can be read out of it, so the secret key can never go there. The app
asks a Supabase Edge Function to start a payment; the function holds the seats,
prices the sale from the event's own row, and hands back a one-time client
secret that is useless for anything else.

Two consequences worth knowing:

- **The app never says what anything costs.** It sends an event id and a
  quantity. A client that could name its own price would eventually be made to
  name a penny.
- **"Payment succeeded" is asked of Stripe, not believed from the app.** The
  app is the one party in the exchange with a motive to misreport it.

## 1. A Stripe account

stripe.com → sign up. Test mode is on by default and needs no bank details.

**Developers → API keys**, and take both:

- **Publishable key** (`pk_test_…`) — safe in the app
- **Secret key** (`sk_test_…`) — server only, never in this repo

## 2. Give the server the secret key

```
npx supabase login
npx supabase link --project-ref mmhpfiabbpzaizkjozjq
npx supabase secrets set STRIPE_SECRET_KEY=sk_test_your_key_here
```

`secrets set` stores it in Supabase, not in any file here. It is the one value
in this system that must never be committed.

## 3. Deploy the function

```
npx supabase functions deploy payments
```

Re-run this whenever `supabase/functions/payments/index.ts` changes.

## 4. Give the app the publishable key

In `.env.local`:

```
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
```

Then restart with `npx expo start -c` — environment variables are read when
the bundler starts, so a plain restart keeps the old value.

## 5. Test it

Buy a ticket for a paid event. Stripe's sheet opens; use their test card:

```
4242 4242 4242 4242    any future expiry    any CVC    any postcode
```

Then check what actually happened:

```
node scripts/sql.mjs "select status, total_paid, payment_intent_id from tickets order by purchased_at desc limit 3"
```

A completed purchase reads `paid` with a `pi_…` id. `pending` means the seats
were held but the payment never finished — those release themselves.

## Going live

Test mode charges nothing and is the right place to stay until launch. Real
money needs Stripe's account activation (business details, bank account), then
swapping both keys for their `pk_live_` / `sk_live_` versions.

## What is still missing

**A webhook.** Right now a payment is confirmed when the app comes back and
asks. If someone's phone dies between paying and that call, the charge exists
and the ticket sits `pending` until it expires — money taken, no ticket. It is
a narrow window, and it is real. The fix is a Stripe webhook that marks tickets
paid from Stripe's side, independent of whether the app is still running. Worth
doing before real money, not before testing.

**Refunds.** Nothing in the app issues one. A cancelled event currently means
contacting people by hand.

**Payouts.** Organisers' earnings are counted, but nothing pays them out.
Stripe Connect is the mechanism, and it is its own project.
