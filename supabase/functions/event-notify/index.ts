/**
 * FourCircle — telling attendees an event moved, or is off.
 *
 * Sends whatever event_change_log is holding and has not sent. The diff was
 * captured by a trigger, because only the database ever sees the old value
 * and the new one at the same moment (43_event_change_log.sql).
 *
 * WHY IT IS A FLUSH RATHER THAN A SEND
 *
 * There is no scheduler on this project. The app calls this after a save, and
 * if that call never lands -- no signal, app killed, function not deployed --
 * the row sits with sent_at null and goes out on the next flush by anybody.
 * The edit never depends on the mail working, and a missed notice is late
 * rather than lost.
 *
 * sent_at is also what stops a retry mailing the same people twice. It is set
 * before the send rather than after: a function that dies mid-send has
 * already told the next caller not to repeat it, and sending nothing is a
 * better failure than sending it three times. send_error records what went
 * wrong so a silent nothing is still findable.
 *
 * WHO GETS MAIL
 *
 * Only addresses on a ticket for that event. There is no recipient list in
 * the request, so this cannot be pointed at anybody: the worst a caller can
 * do is make FourCircle tell its own attendees something true about an event
 * they registered for, slightly sooner.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import {
  FROM, REPLY_TO, renderHtml, renderText, subjectFor,
  type Change, type EventFacts, type TicketFacts,
} from './eventEmail.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const RESEND_KEY = Deno.env.get('RESEND_API_KEY') ?? '';

/** See waitlist-welcome for why both names have to be tried. */
function serviceKey(): string {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacy) return legacy;
  try {
    const raw = Deno.env.get('SUPABASE_SECRET_KEYS');
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'string') return parsed;
    const found = Object.values(parsed).find(v => typeof v === 'string' && v);
    return typeof found === 'string' ? found : '';
  } catch { return ''; }
}

const SERVICE_KEY = serviceKey();
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

/**
 * When the event is, in words a reader can act on.
 *
 * Built from the columns the event already carries rather than reformatted
 * from a timestamp: date and time are what the organiser typed, and the
 * timezone is what 41_event_timezone.sql recorded at creation. An event at
 * 9am in New York has to say so to somebody reading in Los Angeles.
 */
function whenText(ev: Record<string, unknown>): string {
  const date = String(ev.date ?? '').trim();
  const time = String(ev.time ?? '').trim();
  const end = String(ev.end_time ?? '').trim();
  const zone = String(ev.timezone ?? '').trim();
  if (!date && !time) return '';
  // "to", never a dash: a dash in an email reads as a typo or a hyphenated
  // word depending on the client's font.
  const clock = time && end ? `${time} to ${end}` : time;
  const zoneShort = zone ? ` (${zone.split('/').pop()?.replace(/_/g, ' ')})` : '';
  return [date, clock].filter(Boolean).join(', ') + (clock ? zoneShort : '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: 'Not configured.' }, 500);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* a bare flush is fine */ }
  const only = body.eventId ? String(body.eventId) : null;

  let q = admin.from('event_change_log')
    .select('id, event_id, kind, changes')
    .is('sent_at', null)
    .order('created_at', { ascending: true })
    .limit(50);
  if (only) q = q.eq('event_id', only);

  const { data: pending, error: readErr } = await q;
  if (readErr) return json({ error: readErr.message }, 500);
  if (!pending?.length) return json({ ok: true, sent: 0 });

  let sent = 0, recipients = 0;

  for (const row of pending) {
    // Claimed before the send, not after: a function that dies halfway has
    // already told the next caller not to repeat it. Sending nothing beats
    // sending it three times.
    const { error: claimErr } = await admin.from('event_change_log')
      .update({ sent_at: new Date().toISOString() })
      .eq('id', row.id).is('sent_at', null);
    if (claimErr) continue;

    // Everything the email's details block needs. It used to read three
    // columns and the email said the event's name and nothing else: a
    // cancellation that never mentioned when the event had been, or where.
    const { data: event } = await admin.from('events')
      .select('id, title, is_paid, date, time, end_time, timezone, organizer, venue_name, venue_address, banner_image')
      .eq('id', row.event_id).maybeSingle();
    if (!event) continue;

    // Who to tell. A change goes to the people who still hold a ticket.
    //
    // A cancellation has to include refunded ones, and this is why: cancelling
    // an event refunds every paid ticket FIRST (payments/index.ts marks each
    // one 'refunded', free registrations included), and only then does this
    // run. Filtering to 'paid' therefore found nobody at all — the single
    // notice that matters most went to no one, counted 0 recipients, recorded
    // no error, and reported success. Caught by cancelling a real event with a
    // real attendee; nothing short of that would have shown it.
    const statuses = row.kind === 'cancelled' ? ['paid', 'refunded'] : ['paid'];
    const { data: tickets } = await admin.from('tickets')
      .select('id, email, quantity').eq('event_id', row.event_id).in('status', statuses);

    // One message each, however many tickets they hold. A person who bought
    // four seats does not want four copies — but the one they get now has to
    // name their own order, so the orders are folded together per address
    // rather than thrown away. Two separate orders become "3 tickets" and
    // the most recent order number, which is the one they will quote.
    const perAddress = new Map<string, { quantity: number; orderId: string }>();
    for (const tk of tickets ?? []) {
      const address = String(tk.email ?? '').trim().toLowerCase();
      if (!address) continue;
      const seen = perAddress.get(address);
      perAddress.set(address, {
        quantity: (seen?.quantity ?? 0) + (Number(tk.quantity) || 0),
        orderId: String(tk.id ?? seen?.orderId ?? ''),
      });
    }
    if (!perAddress.size) {
      await admin.from('event_change_log')
        .update({ recipients: 0 }).eq('id', row.id);
      continue;
    }

    const title = String(event.title ?? 'Your event');
    const kind = row.kind === 'cancelled' ? 'cancelled' as const : 'changed' as const;
    const changes = (row.changes ?? []) as Change[];

    const facts: EventFacts = {
      id: String(event.id),
      title,
      whenText: whenText(event as Record<string, unknown>),
      venueName: (event as any).venue_name ?? null,
      venueAddress: (event as any).venue_address ?? null,
      organizer: (event as any).organizer ?? null,
      photoUrl: (event as any).banner_image ?? null,
      isPaid: event.is_paid === true,
    };
    const subject = subjectFor(kind, title);

    try {
      // One request per address. Resend's `to` array puts everybody in the
      // same header, which would show every attendee each other's address.
      let delivered = 0;
      for (const [address, order] of perAddress) {
        // Each person's own ticket count and order number, so the details
        // block is about them rather than about the event in general.
        const ticket: TicketFacts = { quantity: order.quantity, orderId: order.orderId };
        const html = renderHtml(kind, facts, ticket, changes);
        const text = renderText(kind, facts, ticket, changes);
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${RESEND_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: FROM, to: [address], reply_to: REPLY_TO, subject, text, html,
          }),
        });
        if (res.ok) delivered += 1;
        else console.error('resend refused', res.status, await res.text());
      }
      await admin.from('event_change_log')
        .update({ recipients: delivered }).eq('id', row.id);
      sent += 1;
      recipients += delivered;
    } catch (err) {
      await admin.from('event_change_log')
        .update({ send_error: String((err as Error).message).slice(0, 500) })
        .eq('id', row.id);
    }
  }

  return json({ ok: true, sent, recipients });
});
