/**
 * FourCircle — what Stripe tells us, rather than what we ask it.
 *
 * Everything else in this project asks Stripe a question and waits for the
 * answer. A dispute is the one thing that happens without anybody in the app
 * doing anything: a buyer rings their bank weeks later, the bank takes the
 * money back, and the first we would know of it is a balance that does not
 * add up. This is where Stripe gets to start the conversation.
 *
 * It records and does not act. Whether to take a disputed ticket's money back
 * out of the organiser's balance is a judgement — a church whose event ran
 * fine and whose attendee simply forgot the charge is not the same as an
 * organiser who never held the event — and it belongs to a person looking at
 * the payouts list, not to a webhook at four in the morning.
 *
 * THIS FUNCTION MUST BE DEPLOYED WITH JWT VERIFICATION OFF
 *
 * Stripe is not a signed-in user and cannot send a Supabase token. The
 * signature below is what authenticates the request instead, and it is
 * stronger than a JWT would be here: it proves the body came from Stripe
 * unaltered. With JWT verification left on, every delivery is rejected before
 * this code runs and the disputes table silently stays empty.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

/** Stripe's tolerance for clock drift, in seconds. Theirs is five minutes. */
const TOLERANCE = 300;

function hex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Check the signature Stripe sent.
 *
 * Written out rather than taken from the Stripe SDK, which pulls in Node
 * APIs that Deno Deploy does not have. The scheme is small and documented:
 * HMAC-SHA256 over "timestamp.body", keyed with the endpoint's signing
 * secret, compared against the v1 signature in the header.
 *
 * The timestamp check is not decoration. Without it a request captured once
 * could be replayed forever, and every replay would record the dispute again.
 */
async function verify(body: string, header: string): Promise<boolean> {
  if (!header || !WEBHOOK_SECRET) return false;

  let timestamp = '';
  const signatures: string[] = [];
  for (const part of header.split(',')) {
    const [k, v] = part.split('=');
    if (k?.trim() === 't') timestamp = v?.trim() ?? '';
    if (k?.trim() === 'v1' && v) signatures.push(v.trim());
  }
  if (!timestamp || signatures.length === 0) return false;

  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(age) || age > TOLERANCE) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = hex(await crypto.subtle.sign(
    'HMAC', key, new TextEncoder().encode(`${timestamp}.${body}`),
  ));

  // Constant time over the whole string: a comparison that stops at the first
  // wrong character leaks how much of a guess was right.
  return signatures.some(sig => {
    if (sig.length !== mac.length) return false;
    let diff = 0;
    for (let i = 0; i < mac.length; i++) diff |= mac.charCodeAt(i) ^ sig.charCodeAt(i);
    return diff === 0;
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const body = await req.text();
  const signature = req.headers.get('stripe-signature') ?? '';

  if (!await verify(body, signature)) {
    // Deliberately uninformative. Anybody probing this endpoint learns only
    // that it refused them.
    return new Response('Bad signature', { status: 400 });
  }

  let event: Record<string, any>;
  try { event = JSON.parse(body); } catch { return new Response('Bad body', { status: 400 }); }

  const type = String(event.type ?? '');
  // Disputes only, for now. Stripe sends whatever the endpoint is subscribed
  // to, and a 200 on everything else means an endpoint subscribed to more by
  // accident does not fill the logs with failures.
  if (!type.startsWith('charge.dispute.')) {
    return new Response(JSON.stringify({ ignored: type }), { status: 200 });
  }

  const dispute = event.data?.object ?? {};
  const disputeId = String(dispute.id ?? '');
  if (!disputeId) return new Response('No dispute id', { status: 400 });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // Which ticket this was. The PaymentIntent is the link: it is on the
  // dispute, and tickets have stored it since the payment was made.
  const intentId = typeof dispute.payment_intent === 'string' ? dispute.payment_intent : '';
  let ticketId: string | null = null;
  let eventId: string | null = null;
  let organizerId: string | null = null;

  if (intentId) {
    const { data: ticket } = await admin
      .from('tickets')
      .select('id, event_id')
      .eq('payment_intent_id', intentId)
      .maybeSingle();

    if (ticket) {
      ticketId = ticket.id;
      eventId = ticket.event_id;
      const { data: ev } = await admin
        .from('events').select('organizer_id').eq('id', ticket.event_id).maybeSingle();
      organizerId = ev?.organizer_id ?? null;
    }
  }

  // Upsert, because Stripe sends created, updated and closed for the same
  // dispute and may redeliver any of them. The id is Stripe's own, so the
  // second delivery of an event updates the row the first one wrote.
  const { error } = await admin.from('disputes').upsert({
    id: disputeId,
    ticket_id: ticketId,
    event_id: eventId,
    organizer_id: organizerId,
    amount: (Number(dispute.amount) || 0) / 100,
    currency: String(dispute.currency ?? 'usd').toUpperCase(),
    reason: dispute.reason ? String(dispute.reason) : null,
    status: String(dispute.status ?? 'unknown'),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });

  if (error) {
    // A 500 asks Stripe to try again, which is what we want: the row not
    // being written is the whole failure, and Stripe retries for days.
    console.error('could not record dispute', disputeId, error.message);
    return new Response('Could not record it', { status: 500 });
  }

  // An unmatched dispute is worth saying out loud. It means a charge exists
  // that no ticket of ours points at, which is either a ticket deleted since
  // or something stranger.
  if (!ticketId) console.error('dispute with no matching ticket', disputeId, intentId);

  return new Response(JSON.stringify({ recorded: disputeId, type }), { status: 200 });
});
