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
  /**
   * When this holder's most recent seat was admitted, or null if none were.
   *
   * The list used to say how many of someone's seats were in and never when,
   * so a row reading "2 in" could mean a minute ago or the door before lunch.
   */
  lastCheckedInAt: string | null;
  /**
   * Which of this holder's codes have actually been admitted.
   *
   * The screen used to stand in the first `checkedIn` codes for these, which
   * was right about the count and wrong about which seat — so the button
   * could offer a code that was already spent while a free one sat beside it.
   * Empty until 47_checkin_detail.sql has been run, and the old
   * approximation covers that case.
   */
  usedCodes: string[];
};

export type ScanOutcome =
  | { status: 'ok'; name: string; seats: number; at?: string }
  | { status: 'already'; name?: string; seats?: number; at?: string }
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

  // When each seat came in, as a second call rather than extra columns on the
  // first: widening a set-returning function means dropping it, and this
  // schema does not drop things. Failure here is not failure of the list —
  // the door still works without the times, so a null just means no time
  // shown. 47_checkin_detail.sql; absent until that file has been run.
  const times = new Map<string, string>();
  try {
    const { data: rows } = await db.rpc('event_checkins', { p_event_id: eventId });
    for (const r of (rows as any[] | null) ?? []) {
      if (r?.code && r?.checked_in_at) times.set(String(r.code), String(r.checked_in_at));
    }
  } catch { /* no times, same list */ }

  return (data as any[]).map(r => {
    const codes = Array.isArray(r.codes) ? r.codes.map(String) : [];
    const seen = codes.map((code: string) => times.get(code)).filter(Boolean) as string[];
    return {
      ticketId: String(r.ticket_id),
      name: String(r.name ?? 'Guest'),
      email: r.email ?? null,
      seats: Number(r.seats) || 1,
      codes,
      checkedIn: Number(r.checked_in) || 0,
      // The latest, not the first: a party of four arriving separately is one
      // row, and what the door wants to know is when it last saw them.
      lastCheckedInAt: seen.length ? seen.sort()[seen.length - 1] : null,
      usedCodes: codes.filter((code: string) => times.has(code)),
    };
  });
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
  // The holder is looked up before the already-check, so a second scan with
  // no signal names the person too. It used to answer with nothing at all,
  // and the screen fell back to printing the raw code.
  const holder = localList.find(a => a.codes.includes(code));
  if (localUsed.has(code)) {
    return holder
      ? { status: 'already', name: holder.name, seats: holder.seats,
          at: holder.lastCheckedInAt ?? undefined }
      : { status: 'already' };
  }
  if (!holder) return { status: 'not_found' };

  const queue = await readQueue();
  queue.push({ eventId, code, at: new Date().toISOString() });
  await writeQueue(queue);

  return { status: 'ok', name: holder.name, seats: holder.seats,
           at: new Date().toISOString() };
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
