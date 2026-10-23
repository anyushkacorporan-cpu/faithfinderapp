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
