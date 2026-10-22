/**
 * FourCircle — card payments.
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

/**
 * Put the event on the transfer as well as on the charge.
 *
 * A destination charge creates its transfer itself, and Stripe takes no
 * metadata for it when the PaymentIntent is made — the only way to label it
 * is to update it afterwards, which is why this runs on confirmation rather
 * than at creation.
 *
 * It matters because the transfer is the organiser's side of the sale. On
 * their dashboard, and on ours when a refund has to reverse one, an untagged
 * transfer is a sum of money with no event attached to it.
 *
 * Failure here is logged and swallowed. The ticket is paid and the money has
 * moved; a missing label is not worth telling a buyer their payment failed.
 */
async function tagTransfer(
  intent: Record<string, unknown>,
  eventId: string,
  eventName: string,
): Promise<void> {
  try {
    const charge = intent.latest_charge as Record<string, unknown> | null;
    const transferId = typeof charge?.transfer === 'string' ? charge.transfer : '';
    if (!transferId) return;
    await stripe(`transfers/${transferId}`, 'POST', {
      'metadata[event_id]': eventId,
      'metadata[event_name]': String(eventName).slice(0, 500),
    });
  } catch (err) {
    console.error('could not tag transfer', eventId, String((err as Error).message));
  }
}

/**
 * Give a ticket's money back.
 *
 * TWO SHAPES, AND WHY THEY ARE NOT ONE
 *
 * A cancelled event returns everything the buyer paid — ticket, platform fee
 * and the card processing fee. Every other approved refund returns the ticket
 * price alone and the two fees are kept. The terms say so, and the reason is
 * that a cancelled event is our failure to deliver while a change of mind is
 * not, and the work of taking the payment was done either way.
 *
 * `full` is Stripe's easy case: refund the whole charge with
 * reverse_transfer, and the entire transfer comes back — which is exactly the
 * ticket price, because that is all the transfer ever was. refund_application
 * _fee gives up our own fee at the same time, which is what "including both
 * fees" means from our side.
 *
 * `ticket_only` cannot use reverse_transfer at all. On a partial refund
 * Stripe reverses a share of the transfer proportional to the refund, so
 * refunding $20 of a $22.15 charge would claw back about $18.06 from an
 * organiser who was paid $20, leaving them $1.94 ahead and us short. So the
 * refund and the reversal are made separately, and the reversal names the
 * ticket price exactly.
 *
 * WHAT STRIPE KEEPS EITHER WAY
 *
 * Its processing fee. A refunded charge does not return it, so a cancelled
 * event costs FourCircle that fee per ticket — about 95c on a $20 ticket.
 * That is the price of the promise in the terms, and it is deliberate.
 *
 * WHEN THE REVERSAL FAILS
 *
 * The buyer has already been refunded and that is not undone. An organiser
 * whose balance is empty — because they paid themselves out, which they can
 * still do — leaves us holding it, so the amount goes in organizer_owed and
 * comes off a later payout. The refund succeeds; the debt is recorded.
 */
async function refundTicket(
  admin: ReturnType<typeof createClient>,
  ticket: Record<string, unknown>,
  kind: 'full' | 'ticket_only',
  eventName: string,
): Promise<{ ok: true; refunded: number; owed: number } | { ok: false; error: string }> {
  const intentId = String(ticket.payment_intent_id ?? '');
  if (!intentId) return { ok: false, error: 'That ticket has no payment to refund.' };
  if (ticket.status === 'refunded') return { ok: true, refunded: 0, owed: 0 };
  if (ticket.status !== 'paid') return { ok: false, error: 'That ticket was never paid.' };

  const eventId = String(ticket.event_id ?? '');
  const meta = {
    'metadata[event_id]': eventId,
    'metadata[event_name]': eventName.slice(0, 500),
  };

  const ticketPrice = +(Number(ticket.price_per_ticket ?? 0) * Number(ticket.quantity ?? 1)).toFixed(2);
  const everything = Number(ticket.total_paid ?? 0);
  const amount = kind === 'full' ? everything : ticketPrice;
  if (!(amount > 0)) return { ok: false, error: 'Nothing to refund.' };

  let owed = 0;

  if (kind === 'full') {
    await stripe('refunds', 'POST', {
      payment_intent: intentId,
      amount: String(Math.round(amount * 100)),
      reverse_transfer: 'true',
      refund_application_fee: 'true',
      ...meta,
    });
  } else {
    // Order matters. The buyer is refunded first and unconditionally; the
    // reversal is the part allowed to fail.
    await stripe('refunds', 'POST', {
      payment_intent: intentId,
      amount: String(Math.round(amount * 100)),
      ...meta,
    });

    try {
      const intent = await stripe(`payment_intents/${intentId}?expand[]=latest_charge`, 'GET');
      const charge = intent.latest_charge as Record<string, unknown> | null;
      const transferId = typeof charge?.transfer === 'string' ? charge.transfer : '';
      if (!transferId) throw new Error('no transfer on that charge');

      await stripe(`transfers/${transferId}/reversals`, 'POST', {
        amount: String(Math.round(ticketPrice * 100)),
        ...meta,
      });
    } catch (err) {
      owed = ticketPrice;
      console.error('reversal failed, recording a debt', eventId, String((err as Error).message));
      await admin.from('organizer_owed').insert({
        organizer_id: ticket.organizer_id ?? null,
        event_id: eventId,
        ticket_id: ticket.id,
        amount: ticketPrice,
        reason: 'refund_shortfall',
        note: String((err as Error).message).slice(0, 500),
      });
    }
  }

  await admin.from('tickets').update({
    status: 'refunded',
    refunded_amount: amount,
    refunded_at: new Date().toISOString(),
  }).eq('id', ticket.id);

  // The seat goes back on sale unless the whole event is off.
  if (kind === 'ticket_only') {
    await admin.rpc('release_seats', {
      p_event_id: eventId,
      p_quantity: Number(ticket.quantity ?? 1),
    });
  }

  return { ok: true, refunded: amount, owed };
}

/**
 * Whether the policy on this ticket allows a refund right now.
 *
 * Returns true only for the clear cases. An organiser may approve anything at
 * any time — the terms say so — so this is what makes a refund *required*,
 * not what makes one possible. The difference matters at escalation: it is
 * the test FourCircle applies when deciding against an organiser who said no.
 */
function policyAllows(
  policy: string,
  eventDateIso: string | null,
  lifecycle: string,
): boolean {
  if (lifecycle === 'cancelled') return true;
  if (policy === 'none') return false;
  if (!eventDateIso) return false;

  const start = Date.parse(eventDateIso);
  if (!Number.isFinite(start)) return false;

  const hoursLeft = (start - Date.now()) / 36e5;
  if (policy === 'flexible') return hoursLeft >= 24 * 7;
  if (policy === 'standard') return hoursLeft >= 48;
  return false;
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
      .select('id, title, date, location, type, ticket_price, platform_fee, currency, is_paid, organizer_id, refund_policy, lifecycle')
      .eq('id', eventId)
      .single();
    if (eventErr || !event) return json({ error: 'That event no longer exists.' }, 404);
    if (!event.is_paid) return json({ error: 'That event is free — no payment needed.' }, 400);
    if (event.lifecycle === 'cancelled') {
      return json({ error: 'That event has been cancelled.' }, 409);
    }

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

    // charges_enabled, and deliberately not payouts_enabled.
    //
    // The two look interchangeable and are not. We hold every organiser's
    // account on a manual payout schedule, and may pause its payouts
    // outright; a paused account reports payouts_enabled false with
    // disabled_reason 'platform_paused'. Gating sales on it would mean the
    // act of holding an organiser's money also stopped them selling, which
    // is the opposite of the arrangement.
    //
    // charges_enabled is the right question here: can this account receive
    // the money. Whether it can then move it to a bank is ours to decide and
    // ours to time.
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
      // The promise that was on the screen when they paid. An organiser may
      // loosen it later and that should reach the people who already bought,
      // but the ticket records what they actually relied on.
      refund_policy: event.refund_policy ?? 'standard',
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
        // What a line in the Stripe dashboard has to be readable as, months
        // later, by somebody reconciling a payout or answering a dispute.
        //
        // event_id is ours and matches `events.id` exactly; event_name is
        // there so the dashboard does not read as a column of identifiers.
        // Stripe copies a PaymentIntent's metadata onto the charge, so both
        // appear there too without being sent twice.
        //
        // The buyer's id used to be here and is not any more: who bought a
        // ticket is in our own tickets table, and the payment processor is
        // not the place to keep a list of which person attended which church
        // event. Stripe already has their card and their email.
        'metadata[ticket_id]': ticketId,
        'metadata[event_id]': event.id,
        'metadata[event_name]': String(event.title ?? '').slice(0, 500),
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
      .select('id, buyer_id, payment_intent_id, status, event_id, event_title, quantity')
      .eq('id', ticketId)
      .single();

    if (!ticket) return json({ error: 'That ticket no longer exists.' }, 404);
    if (ticket.buyer_id !== user.id) return json({ error: 'That is not your ticket.' }, 403);
    if (ticket.status === 'paid') return json({ ok: true });
    if (!ticket.payment_intent_id) return json({ error: 'No payment was started.' }, 400);

    // The charge comes back with it so the transfer can be found below.
    const intent = await stripe(
      `payment_intents/${ticket.payment_intent_id}?expand[]=latest_charge`, 'GET');

    if (intent.status === 'succeeded') {
      await admin.from('tickets').update({ status: 'paid' }).eq('id', ticketId);
      await tagTransfer(intent, ticket.event_id, ticket.event_title ?? '');
      return json({ ok: true });
    }

    // Not paid. Release the hold so the seat goes back on sale.
    await admin.from('tickets').delete().eq('id', ticketId);
    await admin.rpc('release_seats', { p_event_id: ticket.event_id, p_quantity: ticket.quantity });
    return json({ error: `Payment did not complete (${intent.status}).` }, 402);
  }

  // ── An attendee asks for their money back ────────────────────────────────
  if (action === 'refund_request') {
    const ticketId = String(body.ticketId ?? '');
    const reason = String(body.reason ?? '').slice(0, 1000);
    if (!ticketId) return json({ error: 'Missing ticket.' }, 400);

    const { data: ticket } = await admin
      .from('tickets')
      .select('id, buyer_id, event_id, status, refund_policy')
      .eq('id', ticketId)
      .single();

    if (!ticket) return json({ error: 'That ticket no longer exists.' }, 404);
    if (ticket.buyer_id !== user.id) return json({ error: 'That is not your ticket.' }, 403);
    if (ticket.status !== 'paid') return json({ error: 'That ticket cannot be refunded.' }, 409);

    // Whether the policy on this ticket makes the refund required rather than
    // merely possible. Returned, not enforced: an organiser may approve
    // anything at any time, and this is the test FourCircle applies if the
    // request is escalated against one who said no.
    const { data: eventRow } = await admin
      .from('events')
      .select('date, lifecycle')
      .eq('id', ticket.event_id)
      .single();
    const policyRequires = policyAllows(
      String(ticket.refund_policy ?? 'standard'),
      eventRow?.date ? String(eventRow.date) : null,
      String(eventRow?.lifecycle ?? 'scheduled'),
    );

    // Five business days, computed in the database so the clock and the
    // payout dates in Phase 4 agree about what a business day is.
    const { data: respondBy } = await admin.rpc('add_business_days', {
      from_ts: new Date().toISOString(), days: 5,
    });

    const { error: insErr } = await admin.from('refund_requests').insert({
      ticket_id: ticketId,
      event_id: ticket.event_id,
      requester_id: user.id,
      reason,
      respond_by: respondBy,
    });
    // The unique constraint on ticket_id is what makes asking twice harmless.
    if (insErr) {
      return json({ error: 'You have already asked for a refund on that ticket.' }, 409);
    }

    return json({ ok: true, respondBy, policyRequires });
  }

  // ── The organiser answers ────────────────────────────────────────────────
  if (action === 'refund_decide') {
    const requestId = String(body.requestId ?? '');
    const approve = body.approve === true;
    const declineReason = String(body.declineReason ?? '').slice(0, 1000);
    if (!requestId) return json({ error: 'Missing request.' }, 400);

    const { data: request } = await admin
      .from('refund_requests')
      .select('id, ticket_id, event_id, status')
      .eq('id', requestId)
      .single();
    if (!request) return json({ error: 'That request no longer exists.' }, 404);
    if (request.status !== 'requested') {
      return json({ error: 'That request has already been answered.' }, 409);
    }

    const { data: event } = await admin
      .from('events')
      .select('id, title, organizer_id, lifecycle')
      .eq('id', request.event_id)
      .single();

    // The organiser decides, or the owner does when it has been escalated.
    const isOrganiser = event?.organizer_id === user.id;
    const { data: amAdmin } = await asCaller.rpc('is_admin');
    if (!isOrganiser && amAdmin !== true) {
      return json({ error: 'That is not your event.' }, 403);
    }

    if (!approve) {
      // A decline without a reason is not a decline anybody can escalate
      // against, so the terms require one and so does this.
      if (!declineReason) return json({ error: 'Give a reason for declining.' }, 400);
      await admin.from('refund_requests').update({
        status: 'declined',
        decline_reason: declineReason,
        decided_by: user.id,
        decided_at: new Date().toISOString(),
        settled_by_platform: amAdmin === true && !isOrganiser,
      }).eq('id', requestId);
      return json({ ok: true, status: 'declined' });
    }

    const { data: ticket } = await admin
      .from('tickets')
      .select('id, event_id, status, quantity, price_per_ticket, total_paid, payment_intent_id')
      .eq('id', request.ticket_id)
      .single();
    if (!ticket) return json({ error: 'That ticket no longer exists.' }, 404);

    // An approved request on a cancelled event returns everything; any other
    // approval returns the ticket price. The organiser does not get to choose
    // which, because the fees are not theirs to give back.
    const kind = event?.lifecycle === 'cancelled' ? 'full' : 'ticket_only';
    const result = await refundTicket(
      admin,
      { ...ticket, organizer_id: event?.organizer_id },
      kind,
      String(event?.title ?? ''),
    );
    if (!result.ok) return json({ error: result.error }, 502);

    await admin.from('refund_requests').update({
      status: 'refunded',
      decided_by: user.id,
      decided_at: new Date().toISOString(),
      settled_by_platform: amAdmin === true && !isOrganiser,
    }).eq('id', requestId);

    return json({ ok: true, status: 'refunded', refunded: result.refunded, owed: result.owed });
  }

  // ── The attendee escalates ───────────────────────────────────────────────
  // Allowed when the organiser declined, or when five business days went by
  // without an answer. It does not decide anything: it puts the request in
  // front of FourCircle, which answers through refund_decide.
  if (action === 'refund_escalate') {
    const requestId = String(body.requestId ?? '');
    if (!requestId) return json({ error: 'Missing request.' }, 400);

    const { data: request } = await admin
      .from('refund_requests')
      .select('id, requester_id, status, respond_by, escalated_at')
      .eq('id', requestId)
      .single();
    if (!request) return json({ error: 'That request no longer exists.' }, 404);
    if (request.requester_id !== user.id) return json({ error: 'That is not your request.' }, 403);
    if (request.escalated_at) return json({ ok: true, alreadyEscalated: true });

    const overdue = Date.parse(String(request.respond_by)) < Date.now();
    if (request.status !== 'declined' && !(request.status === 'requested' && overdue)) {
      return json({
        error: 'The organiser still has time to answer. You can escalate after that.',
      }, 409);
    }

    await admin.from('refund_requests')
      .update({ escalated_at: new Date().toISOString() })
      .eq('id', requestId);

    return json({ ok: true });
  }

  // ── The organiser calls the event off ────────────────────────────────────
  // Every attendee is refunded everything, without being asked, because that
  // is what the terms promise and because an automatic refund is the only
  // kind that reaches somebody who has stopped opening the app.
  if (action === 'event_cancel') {
    const eventId = String(body.eventId ?? '');
    const note = String(body.note ?? '').slice(0, 1000);
    if (!eventId) return json({ error: 'Missing event.' }, 400);

    const { data: event } = await admin
      .from('events')
      .select('id, title, organizer_id, lifecycle')
      .eq('id', eventId)
      .single();
    if (!event) return json({ error: 'That event no longer exists.' }, 404);

    const { data: amAdmin } = await asCaller.rpc('is_admin');
    if (event.organizer_id !== user.id && amAdmin !== true) {
      return json({ error: 'That is not your event.' }, 403);
    }
    if (event.lifecycle === 'cancelled') return json({ ok: true, alreadyCancelled: true });

    await admin.from('events').update({
      lifecycle: 'cancelled',
      lifecycle_changed_at: new Date().toISOString(),
      lifecycle_note: note || null,
    }).eq('id', eventId);

    const { data: tickets } = await admin
      .from('tickets')
      .select('id, buyer_id, event_id, status, quantity, price_per_ticket, total_paid, payment_intent_id')
      .eq('event_id', eventId)
      .eq('status', 'paid');

    let refunded = 0, failed = 0, owed = 0;
    for (const ticket of tickets ?? []) {
      // One at a time, and a failure does not stop the rest: twenty buyers
      // refunded and one error is a better outcome than one error and twenty
      // people still out of pocket.
      const result = await refundTicket(
        admin, { ...ticket, organizer_id: event.organizer_id }, 'full', String(event.title ?? ''),
      );
      if (result.ok) {
        refunded += 1;
        owed += result.owed;
        await admin.from('notifications').insert({
          user_id: ticket.buyer_id,
          type: 'event_cancelled',
          // No actor: the sentence is written on the screen, and `body` is
          // the organiser's own words where they left any.
          body: note || '',
          event_id: eventId,
        }).then(({ error }) => {
          if (error) console.error('cancel notice failed', ticket.buyer_id, error.message);
        });
      } else {
        failed += 1;
        console.error('cancel refund failed', ticket.id, result.error);
      }
    }

    return json({ ok: true, refunded, failed, owed: +owed.toFixed(2) });
  }

  return json({ error: 'Unknown action.' }, 400);
});
