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
const FROM = 'FourCircle <hello@fourcircle.app>';
const REPLY_TO = 'support@fourcircle.app';
const EVENT_URL = (id: string) => `https://fourcircle.app/e/${encodeURIComponent(id)}`;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

const FIELD_NAME: Record<string, string> = {
  title: 'Event name',
  date: 'Date',
  time: 'Time',
  location: 'Location',
};

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
   .replace(/"/g, '&quot;');

type Change = { field: string; old: string | null; new: string | null };

function changedText(title: string, changes: Change[], url: string): string {
  const lines = changes.map(ch =>
    `${FIELD_NAME[ch.field] ?? ch.field}\n  was: ${ch.old ?? '—'}\n  now: ${ch.new ?? '—'}`);
  return [
    `${title} has been updated.`,
    '',
    ...lines,
    '',
    `See the event: ${url}`,
    '',
    'If you can no longer make it, you can cancel your registration in the app.',
    '',
    'FourCircle',
  ].join('\n');
}

function changedHtml(title: string, changes: Change[], url: string): string {
  const rows = changes.map(ch => `
    <tr>
      <td style="padding:8px 12px 8px 0;color:#6b6b6b;font-size:14px;white-space:nowrap">
        ${esc(FIELD_NAME[ch.field] ?? ch.field)}
      </td>
      <td style="padding:8px 0;font-size:14px;color:#1a1a1a">
        <span style="text-decoration:line-through;color:#9a9a9a">${esc(ch.old ?? '—')}</span>
        &nbsp;→&nbsp;
        <strong>${esc(ch.new ?? '—')}</strong>
      </td>
    </tr>`).join('');

  return `<!doctype html><html><body style="margin:0;background:#faf8f5;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
  <div style="max-width:520px;margin:0 auto;padding:28px 20px">
    <h1 style="font-size:19px;margin:0 0 4px;color:#1a1a1a">${esc(title)} has been updated</h1>
    <p style="margin:0 0 18px;color:#6b6b6b;font-size:14px">Here is what the organiser changed.</p>
    <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #ece7df;border-radius:10px;padding:4px 14px">
      ${rows}
    </table>
    <p style="margin:22px 0 0">
      <a href="${esc(url)}" style="background:#c9a96e;color:#1a1208;text-decoration:none;font-weight:600;padding:11px 20px;border-radius:9px;display:inline-block;font-size:15px">See the event</a>
    </p>
    <p style="margin:20px 0 0;color:#8a8a8a;font-size:12.5px">
      If you can no longer make it, you can cancel your registration in the app.
    </p>
  </div></body></html>`;
}

function cancelledText(title: string, url: string, paid: boolean): string {
  return [
    `${title} has been cancelled.`,
    '',
    paid
      ? 'Your ticket has been refunded in full, including fees. It goes back to the card you paid with, and your bank usually shows it within 5 to 10 days.'
      : 'Your registration was free, so there is nothing to refund.',
    '',
    `The event: ${url}`,
    '',
    'We are sorry about this one.',
    '',
    'FourCircle',
  ].join('\n');
}

function cancelledHtml(title: string, url: string, paid: boolean): string {
  return `<!doctype html><html><body style="margin:0;background:#faf8f5;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
  <div style="max-width:520px;margin:0 auto;padding:28px 20px">
    <h1 style="font-size:19px;margin:0 0 10px;color:#1a1a1a">${esc(title)} has been cancelled</h1>
    <p style="margin:0 0 16px;color:#3a3a3a;font-size:14.5px;line-height:1.55">${
      paid
        ? 'Your ticket has been <strong>refunded in full</strong>, including fees. It goes back to the card you paid with, and your bank usually shows it within 5 to 10 days.'
        : 'Your registration was free, so there is nothing to refund.'
    }</p>
    <p style="margin:0 0 20px;color:#6b6b6b;font-size:14px">We are sorry about this one.</p>
    <p style="margin:0">
      <a href="${esc(url)}" style="background:#c9a96e;color:#1a1208;text-decoration:none;font-weight:600;padding:11px 20px;border-radius:9px;display:inline-block;font-size:15px">See the event</a>
    </p>
  </div></body></html>`;
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

    const { data: event } = await admin.from('events')
      .select('id, title, is_paid').eq('id', row.event_id).maybeSingle();
    if (!event) continue;

    const { data: tickets } = await admin.from('tickets')
      .select('email').eq('event_id', row.event_id).eq('status', 'paid');

    // One message each, however many tickets they hold. A person who bought
    // four seats does not want four copies.
    const to = [...new Set(
      (tickets ?? []).map(t => String(t.email ?? '').trim().toLowerCase()).filter(Boolean),
    )];
    if (!to.length) {
      await admin.from('event_change_log')
        .update({ recipients: 0 }).eq('id', row.id);
      continue;
    }

    const title = String(event.title ?? 'Your event');
    const url = EVENT_URL(String(event.id));
    const cancelled = row.kind === 'cancelled';
    const paid = event.is_paid === true;

    const subject = cancelled ? `Cancelled: ${title}` : `Updated: ${title}`;
    const text = cancelled
      ? cancelledText(title, url, paid)
      : changedText(title, (row.changes ?? []) as Change[], url);
    const html = cancelled
      ? cancelledHtml(title, url, paid)
      : changedHtml(title, (row.changes ?? []) as Change[], url);

    try {
      // One request per address. Resend's `to` array puts everybody in the
      // same header, which would show every attendee each other's address.
      let delivered = 0;
      for (const address of to) {
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
