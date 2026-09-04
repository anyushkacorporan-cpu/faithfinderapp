import { supabase } from './supabase';

/**
 * Card payments, through the server.
 *
 * Nothing here decides what anything costs. The app says which event and how
 * many; the amount comes back from the server, computed from the event's own
 * price. A client that could name its own price would eventually be made to.
 *
 * Two round trips on purpose. The first holds the seats and opens a payment;
 * the second asks Stripe whether that payment actually succeeded. The app is
 * the one party in this exchange with a motive to misreport the answer, so it
 * is not the one asked.
 */

export type StartedPayment = {
  clientSecret: string;
  ticketId: string;
  amount: number;
  currency: string;
  ticketCodes: string[];
};

async function call(body: Record<string, unknown>): Promise<{ data?: any; error?: string }> {
  const db = supabase();
  if (!db) return { error: 'The app is not connected to its server yet.' };

  const { data, error } = await db.functions.invoke('payments', { body });

  if (error) {
    // The function returns a readable message in the body for the failures
    // people actually hit — sold out, event gone, card declined. Reaching for
    // that first means the person is told what happened rather than that
    // something went wrong.
    const fromBody = (data as any)?.error;
    if (fromBody) return { error: String(fromBody) };
    try {
      const parsed = await (error as any).context?.json?.();
      if (parsed?.error) return { error: String(parsed.error) };
    } catch { /* fall through to the generic message */ }
    return { error: 'Could not reach the payment service. Please try again.' };
  }

  if (data?.error) return { error: String(data.error) };
  return { data };
}

/** Hold the seats and open a payment. */
export async function startPayment(
  eventId: string,
  quantity: number,
  email: string,
): Promise<{ payment?: StartedPayment; error?: string }> {
  const { data, error } = await call({ action: 'create', eventId, quantity, email });
  if (error) return { error };
  return { payment: data as StartedPayment };
}

/**
 * Ask Stripe whether it went through, and keep the ticket only if it did.
 * A failure here releases the seats rather than leaving them held.
 */
export async function confirmPayment(ticketId: string): Promise<string | null> {
  const { error } = await call({ action: 'confirm', ticketId });
  return error ?? null;
}
