import { useState, useEffect } from 'react';
import { load, save } from './persist';
import { newId, newShortCode } from './ids';
import * as api from './eventsApi';

export type Ticket = {
  id: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  eventType: string;
  /**
   * Where the buyer wants their ticket sent. Collected and validated at
   * checkout today but nothing delivers it yet — storing it now means tickets
   * sold before the email service exists still have a reachable address.
   */
  email?: string;
  quantity: number;
  pricePerTicket: number;
  totalPaid: number;
  platformFee: number;
  purchasedAt: number;
  ticketIds: string[];
};

let tickets: Ticket[] = [];
const listeners: Array<() => void> = [];
/**
 * Notify subscribers over a copy of the list.
 *
 * A subscriber's setState can unmount a component, whose cleanup splices itself
 * out of `listeners` while forEach is still walking it — every listener after
 * the removed index is then skipped and silently misses that update. Iterating
 * a snapshot means the removal takes effect on the next notify instead of
 * halfway through this one.
 */
function notify() { [...listeners].forEach(fn => fn()); }

const STORAGE_KEY = 'faithfinder_tickets_v1';
function persist() { save(STORAGE_KEY, tickets); }
load<typeof tickets>(STORAGE_KEY, v => { tickets = v; notify(); });

export function getTickets() { return [...tickets]; }
export function getTicketForEvent(eventId: string) { return tickets.find(t => t.eventId === eventId); }

export function addTicket(ticket: Omit<Ticket, 'id' | 'purchasedAt' | 'ticketIds'>) {
  // Codes get read aloud at a door, so they avoid I/O/0/1. substr is also
  // deprecated; newShortCode replaces both concerns.
  const ticketIds = Array.from({length: ticket.quantity}, () => newShortCode('TKT'));
  const newTicket: Ticket = {
    ...ticket,
    id: newId(),
    purchasedAt: Date.now(),
    ticketIds,
  };
  tickets = [newTicket, ...tickets];
  persist(); notify();
  return newTicket;
}

/**
 * Buy, with the server deciding whether the seats were available.
 *
 * The old path issued the ticket and then told the event about it, checking
 * capacity against a count the app kept itself — so two people reaching the
 * last seat at the same moment both got one. The insert here runs the capacity
 * check inside the same transaction as the sale, which is the only place the
 * answer can be true, and nothing is stored locally unless it succeeded.
 */
export async function purchaseTicket(
  ticket: Omit<Ticket, 'id' | 'purchasedAt' | 'ticketIds'>,
): Promise<{ ticket: Ticket | null; error: string | null }> {
  const ticketIds = Array.from({ length: ticket.quantity }, () => newShortCode('TKT'));
  const newTicket: Ticket = { ...ticket, id: newId(), purchasedAt: Date.now(), ticketIds };

  const error = await api.createTicket(newTicket);
  if (error) return { ticket: null, error };

  tickets = [newTicket, ...tickets];
  persist(); notify();
  return { ticket: newTicket, error: null };
}

/**
 * Bring tickets in from the server at sign-in.
 *
 * A ticket that lives only on the phone that bought it is lost with the phone,
 * and cannot be shown on a second device at the door.
 */
export async function syncTicketsAfterSignIn(): Promise<void> {
  const remote = await api.fetchTickets();
  if (!remote) return;

  const remoteIds = new Set(remote.map(t => t.id));
  const localOnly = tickets.filter(t => !remoteIds.has(t.id));

  tickets = [...remote, ...localOnly].sort((a, b) => b.purchasedAt - a.purchasedAt);
  persist();
  notify();
}

export function useTickets() {
  const [state, setState] = useState(getTickets());
  useEffect(() => {
    const fn = () => setState(getTickets());
    // Re-read on subscribe: hydration from storage can land between the
    // useState initialiser above and this effect, and that notify would be
    // missed - leaving this component on the empty pre-hydration value until
    // something else happened to change the store.
    fn();
    listeners.push(fn);
    return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };
  }, []);
  return state;
}

/**
 * Return this store to a fresh-install state. Called only from
 * `deleteAccountAndData` — see src/lib/accountDeletion.ts for why clearing
 * storage alone is not enough.
 */
export function resetStore() {
  tickets = [];
  persist();
  notify();
}
