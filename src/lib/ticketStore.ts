import { useState, useEffect } from 'react';

export type Ticket = {
  id: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  eventType: string;
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

export function getTickets() { return [...tickets]; }
export function getTicketForEvent(eventId: string) { return tickets.find(t => t.eventId === eventId); }

export function addTicket(ticket: Omit<Ticket, 'id' | 'purchasedAt' | 'ticketIds'>) {
  const ticketIds = Array.from({length: ticket.quantity}, () => 'TKT-' + Math.random().toString(36).substr(2,8).toUpperCase());
  const newTicket: Ticket = {
    ...ticket,
    id: Date.now().toString(),
    purchasedAt: Date.now(),
    ticketIds,
  };
  tickets = [newTicket, ...tickets];
  notify();
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
