import { useState, useEffect } from 'react';
import { load, save } from './persist';
import { newId, newShortCode } from './ids';

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
function notify() { listeners.forEach(fn => fn()); }

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

export function useTickets() {
  const [state, setState] = useState(getTickets());
  useEffect(() => {
    const fn = () => setState(getTickets());
    listeners.push(fn);
    return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };
  }, []);
  return state;
}
