import { supabase } from './supabase';

/**
 * Nudge the server to send whatever notices an event has waiting.
 *
 * Never awaited by the screen that calls it, and its failure is never shown.
 * The notice itself is already safe: a trigger wrote it into
 * event_change_log when the edit landed, so if this call does not happen the
 * row simply goes out on the next flush by anybody. Blocking a save on an
 * email, or telling an organiser their edit failed because Resend was down,
 * would both be worse than a notice arriving late.
 */
export async function flushEventNotices(eventId: string): Promise<void> {
  const db = supabase();
  if (!db || !eventId) return;
  try {
    await db.functions.invoke('event-notify', { body: { eventId } });
  } catch {
    // Deliberately silent. See above: the row is already recorded.
  }
}
