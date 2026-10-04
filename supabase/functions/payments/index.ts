/**
 * FaithFinder — card payments.
 *
 * Runs on Supabase, not in the app, because creating a charge needs the Stripe
 * secret key and anything shipped in a bundle can be read out of it.
 *
 * Two actions, one function, so there is one thing to deploy:
 *
 *   create   hold the seats, make a PaymentIntent, hand back a client secret
 *   confirm  ask Stripe whether that intent actually succeeded, then mark paid
 *
 * The two rules that matter:
 *
 * 1. The amount comes from the event row, never from the request. A client
 *    that could name its own price would name a penny.
 * 2. "Payment succeeded" is asked of Stripe, not believed from the app. The
 *    app is the one party with a reason to lie about it.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const STRIPE_SECRET = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  if (!STRIPE_SECRET) {
    return json({ error: 'Payments are not configured on the server yet.' }, 500);
  }

  // Who is asking. The anon client reads the caller's own JWT; the service
  // client does the writing, because holding a seat has to work regardless of
  // what the caller's own policies allow.
  const authHeader = req.headers.get('Authorization') ?? '';
  const asCaller = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await asCaller.auth.getUser();
  if (!user) return json({ error: 'You need to be signed in to buy a ticket.' }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: 'Bad request.' }, 400); }
  const action = String(body.action ?? '');

  // ── Hold the seats and start a payment ───────────────────────────────────
  if (action === 'create') {
    const eventId = String(body.eventId ?? '');
    const quantity = Math.floor(Number(body.quantity ?? 0));
    const email = body.email ? String(body.email) : null;

    if (!eventId) return json({ error: 'Missing event.' }, 400);
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 20) {
      return json({ error: 'Choose between 1 and 20 tickets.' }, 400);
    }

    // Sweep abandoned holds before reading the count. Someone who opened
    // checkout and walked away should not keep a seat off sale, and this is
    // the only moment the answer matters — there is no scheduler here, so the
    // next person trying to buy is what triggers the cleanup.
    await admin.rpc('release_stale_holds');

    const { data: event, error: eventErr } = await admin
      .from('events')
      .select('id, title, date, location, type, ticket_price, platform_fee, currency, is_paid, organizer_id')
      .eq('id', eventId)
      .single();
    if (eventErr || !event) return json({ error: 'That event no longer exists.' }, 404);
    if (!event.is_paid) return json({ error: 'That event is free — no payment needed.' }, 400);

    // Where this organiser's money goes.
    //
    // Nothing is charged until there is somewhere for it to land. The
    // alternative — take the card now and sort the payout out later — means
    // the platform holding a stranger's money with no instruction for passing
    // it on, which is both a tax position nobody wants and a promise made to a
    // buyer on behalf of someone who never agreed to it.
    const { data: payee } = await admin
      .from('stripe_accounts')
      .select('stripe_account_id, charges_enabled')
      .eq('user_id', event.organizer_id)
      .maybeSingle();

    if (!payee?.stripe_account_id || !payee.charges_enabled) {
      return json({
        error: 'This event cannot take payments yet — the organiser has not finished setting up payouts.',
      }, 409);
    }

    // The price the organiser set, times how many. Nothing here came from the
    // request except the count, and that is bounded above.
    const unit = Number(event.ticket_price) || 0;
    const fee = Number(event.platform_fee) || 0;
    const subtotal = +(unit * quantity).toFixed(2);
    const totalFee = +(fee * quantity).toFixed(2);
    if (subtotal <= 0) return json({ error: 'That event has no ticket price set.' }, 400);

    // What the card is actually charged: the organiser's price, our fee, and
    // Stripe's own cut recovered from the buyer.
    //
    // This used to charge `subtotal` alone while the checkout screen showed a
    // total with the platform fee added — the app quoted one number and the
    // card was debited another, and the difference came out of the platform.
    // Stripe takes its percentage of the final total, including the part that
    // is there to pay Stripe, so the figure is solved for rather than added.
    //
    // Keep these two constants and this formula in step with
    // src/lib/ticketPricing.ts, which is what the buyer was shown.
    const STRIPE_RATE = 0.029;
    const STRIPE_FLAT = 0.30;
    const total = Math.ceil(((subtotal + totalFee + STRIPE_FLAT) / (1 - STRIPE_RATE)) * 100 - 1e-9) / 100;
    const processingFee = +(total - subtotal - totalFee).toFixed(2);

    const ticketId = crypto.randomUUID();
    const codes = Array.from({ length: quantity }, () =>
      'TKT-' + crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase());

    // Insert first: the capacity trigger runs here and refuses if the seats
    // are gone. Charging someone and then discovering the event is full is
    // the one outcome worth writing extra code to avoid.
    const { error: holdErr } = await admin.from('tickets').insert({
      id: ticketId,
      event_id: event.id,
      buyer_id: user.id,
      event_title: event.title,
      event_date: event.date,
      event_location: event.location,
      event_type: event.type,
      email,
      quantity,
      price_per_ticket: unit,
      total_paid: total,
      platform_fee: totalFee,
      processing_fee: processingFee,
      currency: event.currency ?? 'USD',
      ticket_codes: codes,
      status: 'pending',
    });

    if (holdErr) {
      const soldOut = /ticket\(s\) left/i.test(holdErr.message);
      return json({ error: soldOut ? holdErr.message : 'Could not hold those seats.' }, 409);
    }

    try {
      // The split, in one place.
      //
      // The card is charged `total`. The organiser is owed `subtotal` — the
      // price they set, nothing more. Everything above that is the platform
      // fee plus the recovered Stripe cost, and it is what the platform keeps
      // as the application fee. Stripe then takes its own percentage out of
      // the platform's share, which is exactly what the recovered cost is for.
      //
      // Expressed as a fee retained rather than an amount forwarded, because
      // then the organiser's figure can never drift: whatever rounding happens
      // above, they are owed the ticket price times the quantity, and this
      // subtraction is what guarantees it.
      const applicationFee = Math.round(total * 100) - Math.round(subtotal * 100);

      const intent = await stripe('payment_intents', 'POST', {
        // Stripe counts in the smallest unit, so dollars must become cents
        // exactly once. Rounding here rather than earlier keeps the float
        // arithmetic to a single place.
        amount: String(Math.round(total * 100)),
        currency: (event.currency ?? 'USD').toLowerCase(),
        'automatic_payment_methods[enabled]': 'true',
        // A destination charge: the money moves to the organiser's own Stripe
        // account, less the fee above. It never sits in a platform balance
        // waiting to be forwarded by hand.
        'transfer_data[destination]': payee.stripe_account_id,
        application_fee_amount: String(applicationFee),
        'metadata[ticket_id]': ticketId,
        'metadata[event_id]': event.id,
        'metadata[buyer_id]': user.id,
        'metadata[organizer_id]': String(event.organizer_id ?? ''),
      });

      await admin.from('tickets')
        .update({ payment_intent_id: intent.id })
        .eq('id', ticketId);

      return json({
        clientSecret: intent.client_secret,
        ticketId,
        amount: total,
        currency: event.currency ?? 'USD',
        ticketCodes: codes,
      });
    } catch (err) {
      // Stripe refused. Give the seats back rather than leaving them held by
      // a payment that will never happen.
      await admin.from('tickets').delete().eq('id', ticketId);
      await admin.rpc('release_seats', { p_event_id: event.id, p_quantity: quantity });
      return json({ error: String((err as Error).message || 'Could not start the payment.') }, 502);
    }
  }

  // ── Confirm, by asking Stripe rather than the app ────────────────────────
  if (action === 'confirm') {
    const ticketId = String(body.ticketId ?? '');
    if (!ticketId) return json({ error: 'Missing ticket.' }, 400);

    const { data: ticket } = await admin
      .from('tickets')
      .select('id, buyer_id, payment_intent_id, status, event_id, quantity')
      .eq('id', ticketId)
      .single();

    if (!ticket) return json({ error: 'That ticket no longer exists.' }, 404);
    if (ticket.buyer_id !== user.id) return json({ error: 'That is not your ticket.' }, 403);
    if (ticket.status === 'paid') return json({ ok: true });
    if (!ticket.payment_intent_id) return json({ error: 'No payment was started.' }, 400);

    const intent = await stripe(`payment_intents/${ticket.payment_intent_id}`, 'GET');

    if (intent.status === 'succeeded') {
      await admin.from('tickets').update({ status: 'paid' }).eq('id', ticketId);
      return json({ ok: true });
    }

    // Not paid. Release the hold so the seat goes back on sale.
    await admin.from('tickets').delete().eq('id', ticketId);
    await admin.rpc('release_seats', { p_event_id: ticket.event_id, p_quantity: ticket.quantity });
    return json({ error: `Payment did not complete (${intent.status}).` }, 402);
  }

  return json({ error: 'Unknown action.' }, 400);
});
