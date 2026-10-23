import { supabase } from './supabase';
import { getAuthUser } from './auth';

/**
 * Asking for money back, and finding out what happened.
 *
 * Reads come straight from `refund_requests`, which the policies in
 * 32_refunds.sql already narrow to the person who asked and the organiser of
 * that event. Writes go through the payments function, because approving one
 * moves money and must not be a row the app can set for itself.
 */

export type RefundStatus = 'requested' | 'approved' | 'declined' | 'refunded';

export type RefundRequest = {
  id: string;
  ticketId: string;
  eventId: string;
  status: RefundStatus;
  reason?: string;
  declineReason?: string;
  /** Five business days from when it was filed. */
  respondBy: string;
  escalatedAt?: string;
  createdAt: string;
};

function shape(r: any): RefundRequest {
  return {
    id: r.id,
    ticketId: r.ticket_id,
    eventId: r.event_id,
    status: r.status,
    reason: r.reason || undefined,
    declineReason: r.decline_reason || undefined,
    respondBy: r.respond_by,
    escalatedAt: r.escalated_at || undefined,
    createdAt: r.created_at,
  };
}

/** Every refund this person has asked for. Null when it could not be read. */
export async function fetchMyRefundRequests(): Promise<RefundRequest[] | null> {
  const db = supabase();
  const me = getAuthUser();
  if (!db || !me) return null;

  const { data, error } = await db
    .from('refund_requests')
    .select('*')
    .eq('requester_id', me.id)
    .order('created_at', { ascending: false });

  if (error || !data) return null;
  return data.map(shape);
}

async function call(body: Record<string, unknown>): Promise<{ data?: any; error?: string }> {
  const db = supabase();
  if (!db) return { error: 'The app is not connected to its server yet.' };

  const { data, error } = await db.functions.invoke('payments', { body });

  if (error) {
    // Same reasoning as paymentsApi: the function puts a readable sentence in
    // the body for the failures people actually hit, and that is the one
    // worth showing.
    const fromBody = (data as any)?.error;
    if (fromBody) return { error: String(fromBody) };
    try {
      const parsed = await (error as any).context?.json?.();
      if (parsed?.error) return { error: String(parsed.error) };
    } catch { /* fall through */ }
    return { error: 'Could not reach the refund service. Please try again.' };
  }

  if (data?.error) return { error: String(data.error) };
  return { data };
}

/**
 * File one.
 *
 * `policyRequires` comes back saying whether the event's own policy makes
 * this refund required rather than merely possible. It is not a decision —
 * the organiser answers either way — but it is the difference between "they
 * should say yes" and "they may say yes", and the person asking deserves to
 * know which one they are in.
 */
export async function requestRefund(
  ticketId: string,
  reason: string,
): Promise<{ ok?: true; policyRequires?: boolean; respondBy?: string; error?: string }> {
  const { data, error } = await call({ action: 'refund_request', ticketId, reason });
  if (error) return { error };
  return { ok: true, policyRequires: !!data?.policyRequires, respondBy: data?.respondBy };
}

/** Put it in front of FourCircle, after a decline or after the five days. */
export async function escalateRefund(requestId: string): Promise<{ ok?: true; error?: string }> {
  const { data, error } = await call({ action: 'refund_escalate', requestId });
  if (error) return { error };
  return data?.ok ? { ok: true } : { error: 'Could not escalate that request.' };
}

// ── The organiser's side ───────────────────────────────────────────────────

export type OrganizerRefundRequest = RefundRequest & {
  eventTitle: string;
  eventDate: string;
  eventCancelled: boolean;
  quantity: number;
  /** What a refund would return to the buyer: the ticket price, or all of it
   *  when the event was cancelled. */
  refundAmount: number;
  ticketPolicy: string;
  buyerEmail?: string;
};

/**
 * Requests against this organiser's own events.
 *
 * Narrowed by event id rather than by "not me": an organiser can buy a ticket
 * to their own event, and a request they filed as a buyer should not vanish
 * from the list they answer as the host — nor should their own ticket be the
 * one request they cannot see.
 */
export async function fetchOrganizerRefundRequests(
  eventIds: string[],
): Promise<OrganizerRefundRequest[] | null> {
  const db = supabase();
  if (!db || eventIds.length === 0) return eventIds.length === 0 ? [] : null;

  const { data, error } = await db
    .from('refund_requests')
    .select('*, tickets(quantity, price_per_ticket, total_paid, refund_policy, email), events(title, date, lifecycle)')
    .in('event_id', eventIds)
    .order('created_at', { ascending: false });

  if (error || !data) return null;

  return data.map((r: any) => {
    const ticket = r.tickets ?? {};
    const event = r.events ?? {};
    const cancelled = event.lifecycle === 'cancelled';
    const ticketPrice = (Number(ticket.price_per_ticket) || 0) * (Number(ticket.quantity) || 1);
    return {
      ...shape(r),
      eventTitle: event.title || '',
      eventDate: event.date || '',
      eventCancelled: cancelled,
      quantity: Number(ticket.quantity) || 1,
      // A cancelled event returns everything paid, fees included. Everything
      // else returns the ticket price alone. The organiser sees which, before
      // they decide, because the two are different amounts of their money.
      refundAmount: cancelled ? (Number(ticket.total_paid) || 0) : +ticketPrice.toFixed(2),
      ticketPolicy: ticket.refund_policy || 'standard',
      buyerEmail: ticket.email || undefined,
    };
  });
}

/**
 * Answer one.
 *
 * A decline without a reason is refused by the server, because a decline
 * nobody can escalate against is not a decline. Approving moves money: the
 * buyer is refunded and the amount comes back out of this organiser's Stripe
 * balance, so it is the server that does it and not the app.
 */
export async function decideRefund(
  requestId: string,
  approve: boolean,
  declineReason = '',
): Promise<{ ok?: true; status?: string; error?: string }> {
  const { data, error } = await call({
    action: 'refund_decide', requestId, approve, declineReason,
  });
  if (error) return { error };
  return { ok: true, status: data?.status };
}

/**
 * Call the event off.
 *
 * Every attendee is refunded everything they paid, fees included, without
 * being asked — that is what the terms promise, and an automatic refund is
 * the only kind that reaches somebody who has stopped opening the app. The
 * server does it one ticket at a time and a failure on one does not stop the
 * rest, so what comes back says how many went through and how many did not.
 *
 * `owed` is money we refunded that could not be reclaimed from the
 * organiser's balance, usually because they had already paid themselves out.
 * The buyer is refunded regardless; the shortfall is recorded against the
 * organiser and comes off a later payout.
 */
export async function cancelEvent(
  eventId: string,
  note: string,
): Promise<{ ok?: true; refunded?: number; failed?: number; owed?: number; error?: string }> {
  const { data, error } = await call({ action: 'event_cancel', eventId, note });
  if (error) return { error };
  return {
    ok: true,
    refunded: Number(data?.refunded) || 0,
    failed: Number(data?.failed) || 0,
    owed: Number(data?.owed) || 0,
  };
}

// ── Earnings, from the records rather than from the phone ──────────────────

export type EventEarnings = {
  eventId: string;
  title: string;
  endsAt?: string;
  payoutDueAt?: string;
  lifecycle: string;
  ticketsPaid: number;
  /** Ticket price collected on tickets still paid for. Fees are not in it. */
  gross: number;
  refunded: number;
  /** Refunds we covered that this organiser has not repaid yet. */
  owed: number;
  /** What they will actually be sent: gross minus owed. */
  payable: number;
};

/**
 * Every paid event this organiser has, with the real figures.
 *
 * The earnings screen used to compute these on the phone from the local
 * events list: gross was price times a ticket count, pending payout was
 * simply all of it, and completed payout was the number zero. None of it had
 * met a refund or a payout.
 */
export async function fetchEventEarnings(): Promise<EventEarnings[] | null> {
  const db = supabase();
  const me = getAuthUser();
  if (!db || !me) return null;

  const { data, error } = await db
    .from('event_payout_amounts')
    .select('*')
    .eq('organizer_id', me.id);

  if (error || !data) return null;

  return data.map((r: any) => ({
    eventId: r.event_id,
    title: r.title || '',
    endsAt: r.ends_at || undefined,
    payoutDueAt: r.payout_due_at || undefined,
    lifecycle: r.lifecycle || 'scheduled',
    ticketsPaid: Number(r.tickets_paid) || 0,
    gross: Number(r.gross) || 0,
    refunded: Number(r.refunded) || 0,
    owed: Number(r.owed) || 0,
    payable: Number(r.payable) || 0,
  }));
}

// ── The owner's payouts list ───────────────────────────────────────────────

export type PayoutDue = {
  eventId: string;
  title: string;
  organizerId: string;
  organizerName?: string;
  stripeAccountId?: string;
  endsAt?: string;
  payoutDueAt?: string;
  lifecycle: string;
  ticketsPaid: number;
  gross: number;
  refunded: number;
  owed: number;
  payable: number;
  status: 'pending' | 'held' | 'released' | 'failed';
  stripePayoutId?: string;
  releasedAt?: string;
  note?: string;
  isDue: boolean;
  openDisputes: number;
};

/** Am I an admin? Answered by the database, not by anything on this phone. */
export async function amIAdmin(): Promise<boolean> {
  const db = supabase();
  if (!db) return false;
  const { data, error } = await db.rpc('is_admin');
  return !error && data === true;
}

/**
 * Every paid event and where its payout stands.
 *
 * The view answers with no rows for anybody who is not an admin, so there is
 * nothing to check here beyond what comes back.
 */
export async function fetchPayoutsDue(): Promise<PayoutDue[] | null> {
  const db = supabase();
  if (!db) return null;

  const { data, error } = await db
    .from('payouts_due')
    .select('*')
    .order('payout_due_at', { ascending: true, nullsFirst: false });

  if (error || !data) return null;

  return data.map((r: any) => ({
    eventId: r.event_id,
    title: r.title || '',
    organizerId: r.organizer_id,
    organizerName: r.organizer_name || undefined,
    stripeAccountId: r.stripe_account_id || undefined,
    endsAt: r.ends_at || undefined,
    payoutDueAt: r.payout_due_at || undefined,
    lifecycle: r.lifecycle || 'scheduled',
    ticketsPaid: Number(r.tickets_paid) || 0,
    gross: Number(r.gross) || 0,
    refunded: Number(r.refunded) || 0,
    owed: Number(r.owed) || 0,
    payable: Number(r.payable) || 0,
    status: r.status,
    stripePayoutId: r.stripe_payout_id || undefined,
    releasedAt: r.released_at || undefined,
    note: r.note || undefined,
    isDue: !!r.is_due,
    openDisputes: Number(r.open_disputes) || 0,
  }));
}

/**
 * Record what was done about a payout.
 *
 * Nothing here moves money. Releasing a payout happens in Stripe, by hand,
 * because the account has to be unpaused first and there is no API for that
 * — so this is the note that says it was done, and the Stripe payout id is
 * what ties the note to the money.
 */
export async function markPayout(
  eventId: string,
  status: 'pending' | 'held' | 'released' | 'failed',
  extra: { stripePayoutId?: string; amount?: number; note?: string } = {},
): Promise<{ ok?: true; error?: string }> {
  const db = supabase();
  if (!db) return { error: 'The app is not connected to its server yet.' };

  const { error } = await db.from('event_payouts').upsert({
    event_id: eventId,
    status,
    stripe_payout_id: extra.stripePayoutId ?? null,
    amount: extra.amount ?? null,
    released_at: status === 'released' ? new Date().toISOString() : null,
    note: extra.note ?? null,
  }, { onConflict: 'event_id' });

  if (error) return { error: error.message };
  return { ok: true };
}
