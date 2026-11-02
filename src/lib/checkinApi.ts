import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

/**
 * The door.
 *
 * Built to work with no signal, because the places this runs — a church hall,
 * a camp, a basement — are exactly the places with no bars, and a scanner
 * that needs a connection fails at the only moment it is needed.
 *
 * So the attendee list is pulled down when the screen opens, every scan is
 * answered from that copy, and the check-ins are queued and sent when there
 * is something to send them over. The server decides in the end:
 * check_in_ticket() is what actually admits a code, and its unique index is
 * what makes a code single-use. Two doors scanning offline can both admit the
 * same seat; one of them loses on sync, and the count corrects itself. That
 * is the trade for working at all, and it is the right way round — letting
 * somebody in twice is recoverable, keeping a ticket holder outside is not.
 */

export type Attendee = {
  ticketId: string;
  name: string;
  email: string | null;
  seats: number;
  codes: string[];
  checkedIn: number;
};

export type ScanOutcome =
  | { status: 'ok'; name: string; seats: number }
  | { status: 'already'; name?: string; at?: string }
  | { status: 'wrong_event' }
  | { status: 'refunded' }
  | { status: 'cancelled' }
  | { status: 'forbidden' }
  | { status: 'not_found' }
  | { status: 'error'; message: string };

const QUEUE_KEY = 'fourcircle_checkin_queue_v1';

type Queued = { eventId: string; code: string; at: string };

async function readQueue(): Promise<Queued[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

async function writeQueue(q: Queued[]): Promise<void> {
  try { await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch {}
}

/** Everyone expected, with their codes, so scanning works without a signal. */
export async function fetchAttendees(eventId: string): Promise<Attendee[] | null> {
  const db = supabase();
  if (!db) return null;
  const { data, error } = await db.rpc('event_attendees', { p_event_id: eventId });
  if (error || !data) return null;
  return (data as any[]).map(r => ({
    ticketId: String(r.ticket_id),
    name: String(r.name ?? 'Guest'),
    email: r.email ?? null,
    seats: Number(r.seats) || 1,
    codes: Array.isArray(r.codes) ? r.codes.map(String) : [],
    checkedIn: Number(r.checked_in) || 0,
  }));
}

/**
 * Admit a code.
 *
 * Asks the server when it can, and answers from the downloaded list when it
 * cannot. An offline answer is provisional and says so to the caller only by
 * being queued — the person at the door sees the same green tick either way,
 * which is deliberate: they cannot act on "probably".
 */
export async function checkIn(
  eventId: string,
  rawCode: string,
  localList: Attendee[],
  localUsed: Set<string>,
): Promise<ScanOutcome> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { status: 'not_found' };

  const db = supabase();
  if (db) {
    try {
      const { data, error } = await db.rpc('check_in_ticket', {
        p_code: code, p_event_id: eventId,
      });
      if (!error && data) {
        const r = data as any;
        if (r.status === 'ok') {
          return { status: 'ok', name: String(r.name ?? 'Guest'), seats: Number(r.seats) || 1 };
        }
        return r as ScanOutcome;
      }
    } catch {
      // Fall through to the local list. A scanner that stops because the
      // network did is the failure this whole file exists to avoid.
    }
  }

  // ── Offline ──
  if (localUsed.has(code)) return { status: 'already' };
  const holder = localList.find(a => a.codes.includes(code));
  if (!holder) return { status: 'not_found' };

  const queue = await readQueue();
  queue.push({ eventId, code, at: new Date().toISOString() });
  await writeQueue(queue);

  return { status: 'ok', name: holder.name, seats: holder.seats };
}

/**
 * Send what was scanned offline.
 *
 * Each one is dropped from the queue whether the server said yes or no: a
 * code the server refuses — already used by the other door, refunded since —
 * will be refused every time, and keeping it would mean retrying forever.
 * What it was is already on the screen's count; what matters here is that the
 * server's record catches up.
 */
export async function flushCheckinQueue(): Promise<{ sent: number; left: number }> {
  const db = supabase();
  const queue = await readQueue();
  if (!db || !queue.length) return { sent: 0, left: queue.length };

  const left: Queued[] = [];
  let sent = 0;

  for (const item of queue) {
    try {
      const { error } = await db.rpc('check_in_ticket', {
        p_code: item.code, p_event_id: item.eventId,
      });
      if (error) { left.push(item); continue; }
      sent += 1;
    } catch {
      // Still no signal. Keep it for next time.
      left.push(item);
    }
  }

  await writeQueue(left);
  return { sent, left: left.length };
}

export async function queuedCount(): Promise<number> {
  return (await readQueue()).length;
}
