/**
 * Every email FourCircle sends about an event, built in one place.
 *
 * There were two of them — changed and cancelled — written inline in
 * event-notify, 520px wide on cream, with the event's name and nothing else.
 * A cancellation told somebody an event was off without saying when it had
 * been, where, or which of their tickets it concerned. There was no
 * registration confirmation at all: you bought a ticket and nothing arrived.
 *
 * Four now, from one layout: registered, changed, cancelled, refunded.
 *
 * WHY TABLES AND INLINE STYLES
 *
 * Mail clients are not browsers. Outlook renders with Word, Gmail strips
 * <style> blocks, and flexbox is not available in any of them. Nested tables
 * with inline styles is the one layout that survives the lot, and it is why
 * this file looks like 2004.
 *
 * WHAT IS DELIBERATELY ABSENT
 *
 * No web fonts: a mail client that cannot fetch one falls back mid-sentence,
 * so the serif is a stack of fonts that are already on the machine. No
 * background images: Outlook drops them. No external CSS. The only remote
 * asset is the event's own cover photo, and the layout is correct without it.
 */

export const FROM = 'FourCircle <hello@fourcircle.app>';
export const REPLY_TO = 'support@fourcircle.app';
export const SUPPORT = 'support@fourcircle.app';
export const EVENT_URL = (id: string) =>
  `https://fourcircle.app/e/${encodeURIComponent(id)}`;

// The app's own three colours, and nothing else.
const NAVY = '#1a1a2e';
const GOLD = '#c9a96e';
const INK = '#3a3a46';
const MUTED = '#6b6b76';
const RULE = '#ece8e0';
const WHITE = '#ffffff';

/** Already on every Mac, iPhone, Windows machine and Android handset. */
const SERIF = `Georgia,'Times New Roman',Times,serif`;
const SANS = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`;

export function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** What an email needs to know about the event it is about. */
export type EventFacts = {
  id: string;
  title: string;
  /** Already formatted for a reader, with its timezone if there is one. */
  whenText?: string | null;
  venueName?: string | null;
  venueAddress?: string | null;
  organizer?: string | null;
  /** Must be a public https URL. An app-only path shows as a broken image. */
  photoUrl?: string | null;
  isPaid?: boolean;
};

/** What it needs to know about the reader's own ticket. */
export type TicketFacts = {
  /** The order number people quote at a door or in an email to support. */
  orderId?: string | null;
  quantity?: number | null;
  /** Formatted with its currency, e.g. "$24.00". Refunds only. */
  amount?: string | null;
};

export type EmailKind = 'registered' | 'changed' | 'cancelled' | 'refunded';

export type Change = { field: string; old?: string | null; new?: string | null };

export const FIELD_NAME: Record<string, string> = {
  date: 'Date',
  time: 'Time',
  location: 'Location',
  title: 'Name',
  venue_name: 'Venue',
  venue_address: 'Address',
};

// ── The words ──────────────────────────────────────────────────────────────
//
// Subject lines name the event, because an inbox shows the subject and
// nothing else. "Update" rather than "Updated": it reads as a noun at the
// front of a line, which is where it will be.

export function subjectFor(kind: EmailKind, title: string): string {
  switch (kind) {
    case 'registered': return `You're registered: ${title}`;
    case 'changed':    return `Update: ${title} has changed`;
    case 'cancelled':  return `Cancelled: ${title}`;
    case 'refunded':   return `Refunded: ${title}`;
  }
}

/** The line under the event's name, saying what this email is. */
function statusLine(kind: EmailKind, paid: boolean): string {
  switch (kind) {
    case 'registered': return "You're registered for this event.";
    case 'changed':    return 'Details have changed.';
    case 'cancelled':  return 'This event has been cancelled.';
    case 'refunded':   return paid
      ? 'Your refund is on its way.'
      : 'Your registration has been cancelled.';
  }
}

/** The paragraph under the status line, where one is owed. */
function bodyLine(kind: EmailKind, paid: boolean): string {
  switch (kind) {
    case 'registered': return 'Your ticket details are below. Bring the QR code in the app to the door.';
    case 'changed':    return 'Here is what the organiser changed.';
    case 'cancelled':  return paid
      ? 'You will be refunded in full — everything you paid, including fees — to the card you used. Refunds usually arrive within 5 to 10 business days.'
      : 'Nothing was paid for this event, so there is nothing to refund.';
    case 'refunded':   return paid
      ? 'The ticket price has been returned to the card you used. It usually arrives within 5 to 10 business days. Platform and processing fees are not refunded.'
      : 'Your spot has been given back. Nothing was paid, so there is nothing to refund.';
  }
}

// ── The layout ─────────────────────────────────────────────────────────────

function photoBlock(ev: EventFacts): string {
  // Only an absolute https URL. A relative path or an app-only scheme renders
  // as a broken image icon, which looks worse than no photo at all.
  const url = String(ev.photoUrl ?? '');
  if (!/^https:\/\//i.test(url)) return '';
  return `
  <tr><td style="padding:0">
    <img src="${esc(url)}" width="600" alt="${esc(ev.title)}"
         style="display:block;width:100%;max-width:600px;height:auto;border:0;outline:none;text-decoration:none">
  </td></tr>`;
}

function detailRow(label: string, value: string): string {
  if (!value) return '';
  return `
    <tr>
      <td style="padding:7px 14px 7px 0;font-family:${SANS};font-size:13px;color:${MUTED};white-space:nowrap;vertical-align:top">${esc(label)}</td>
      <td style="padding:7px 0;font-family:${SANS};font-size:14px;color:${INK};vertical-align:top">${esc(value)}</td>
    </tr>`;
}

function detailsBlock(ev: EventFacts, ticket: TicketFacts): string {
  const venue = [ev.venueName, ev.venueAddress].filter(Boolean).join(' · ');
  const qty = ticket.quantity && ticket.quantity > 0
    ? `${ticket.quantity} ${ticket.quantity === 1 ? 'ticket' : 'tickets'}`
    : '';
  const rows = [
    detailRow('When', String(ev.whenText ?? '')),
    detailRow('Where', venue),
    detailRow('Organiser', String(ev.organizer ?? '')),
    detailRow('Tickets', qty),
    detailRow('Order', String(ticket.orderId ?? '')),
    detailRow('Refunded', String(ticket.amount ?? '')),
  ].join('');
  if (!rows.trim()) return '';
  return `
  <tr><td style="padding:0 28px">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
           style="border-collapse:collapse;border-top:1px solid ${RULE};border-bottom:1px solid ${RULE};margin:4px 0">
      ${rows}
    </table>
  </td></tr>`;
}

function changesBlock(changes: Change[]): string {
  if (!changes.length) return '';
  const rows = changes.map(ch => `
    <tr>
      <td style="padding:7px 14px 7px 0;font-family:${SANS};font-size:13px;color:${MUTED};white-space:nowrap;vertical-align:top">${esc(FIELD_NAME[ch.field] ?? ch.field)}</td>
      <td style="padding:7px 0;font-family:${SANS};font-size:14px;color:${INK};vertical-align:top">
        <span style="color:${MUTED};text-decoration:line-through">${esc(ch.old ?? '—')}</span>
        <span style="color:${MUTED}">&nbsp;&rarr;&nbsp;</span>
        <strong style="color:${NAVY}">${esc(ch.new ?? '—')}</strong>
      </td>
    </tr>`).join('');
  return `
  <tr><td style="padding:18px 28px 0">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse">
      ${rows}
    </table>
  </td></tr>`;
}

/**
 * One email.
 *
 * 600px, white, navy text, a gold rule and a gold button. Centred by a table
 * rather than by margin:auto, which Outlook ignores.
 */
export function renderHtml(
  kind: EmailKind,
  ev: EventFacts,
  ticket: TicketFacts = {},
  changes: Change[] = [],
): string {
  const paid = ev.isPaid === true;
  const url = EVENT_URL(ev.id);
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(subjectFor(kind, ev.title))}</title>
</head>
<body style="margin:0;padding:0;background:${WHITE}">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${WHITE};border-collapse:collapse">
<tr><td align="center" style="padding:0">

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600"
         style="width:600px;max-width:600px;border-collapse:collapse;background:${WHITE}">
${photoBlock(ev)}
    <tr><td style="padding:28px 28px 0">
      <h1 style="margin:0;font-family:${SERIF};font-size:26px;line-height:1.25;font-weight:normal;color:${NAVY}">${esc(ev.title)}</h1>
      <p style="margin:8px 0 0;font-family:${SANS};font-size:15px;font-weight:600;color:${GOLD}">${esc(statusLine(kind, paid))}</p>
      <p style="margin:12px 0 18px;font-family:${SANS};font-size:14px;line-height:1.55;color:${INK}">${esc(bodyLine(kind, paid))}</p>
    </td></tr>
${changesBlock(changes)}
${detailsBlock(ev, ticket)}
    <tr><td style="padding:22px 28px 0">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td
        style="background:${GOLD};border-radius:8px">
        <a href="${esc(url)}" style="display:inline-block;padding:12px 22px;font-family:${SANS};font-size:15px;font-weight:700;color:${NAVY};text-decoration:none">View event in FourCircle</a>
      </td></tr></table>
    </td></tr>

    <tr><td style="padding:26px 28px 30px">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse">
        <tr><td style="border-top:1px solid ${RULE};padding-top:16px;font-family:${SANS};font-size:12px;line-height:1.6;color:${MUTED}">
          FourCircle<br>
          <a href="mailto:${SUPPORT}" style="color:${MUTED};text-decoration:underline">${SUPPORT}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>

</td></tr>
</table>
</body></html>`;
}

/**
 * The same email as text.
 *
 * Not a fallback nobody reads: a message with no text part is scored as spam
 * by most filters, and some people genuinely read mail this way.
 */
export function renderText(
  kind: EmailKind,
  ev: EventFacts,
  ticket: TicketFacts = {},
  changes: Change[] = [],
): string {
  const paid = ev.isPaid === true;
  const lines: string[] = [
    ev.title,
    statusLine(kind, paid),
    '',
    bodyLine(kind, paid),
  ];

  if (changes.length) {
    lines.push('');
    for (const ch of changes) {
      lines.push(`${FIELD_NAME[ch.field] ?? ch.field}: ${ch.old ?? '—'} -> ${ch.new ?? '—'}`);
    }
  }

  const venue = [ev.venueName, ev.venueAddress].filter(Boolean).join(' · ');
  const qty = ticket.quantity && ticket.quantity > 0
    ? `${ticket.quantity} ${ticket.quantity === 1 ? 'ticket' : 'tickets'}`
    : '';
  const details: [string, string][] = [
    ['When', String(ev.whenText ?? '')],
    ['Where', venue],
    ['Organiser', String(ev.organizer ?? '')],
    ['Tickets', qty],
    ['Order', String(ticket.orderId ?? '')],
    ['Refunded', String(ticket.amount ?? '')],
  ];
  const shown = details.filter(([, v]) => !!v);
  if (shown.length) {
    lines.push('');
    for (const [k, v] of shown) lines.push(`${k}: ${v}`);
  }

  lines.push('', `View event in FourCircle: ${EVENT_URL(ev.id)}`, '', 'FourCircle', SUPPORT);
  return lines.join('\n');
}
