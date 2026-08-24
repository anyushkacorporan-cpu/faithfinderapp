import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EVENTS as SEED_EVENTS, EVENT_DETAILS as SEED_EVENT_DETAILS } from './constants';

const EVENTS_KEY = 'faithfinder_events_v1';

export type AgendaItem = { time: string; activity: string };
export type Speaker = { name: string; role: string; initials: string; color: string };
export type VenueType = 'in-person' | 'online' | 'hybrid';
export type RecurrenceType = 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
export type EventStatus = 'upcoming' | 'active' | 'past' | 'draft';

export type AppEvent = {
  id: string;
  status: EventStatus;
  title: string;
  description: string;
  summary: string;
  organizer: string;
  date: string;
  time: string;
  endTime: string;
  location: string;
  city: string;
  state: string;
  zip: string;
  type: string;
  price: string;
  isPaid: boolean;
  ticketPrice: number;
  platformFee: number;
  creatorPayout: number;
  ticketsSold: number;
  bannerImage?: string;
  venueLayoutImage?: string;
  bannerColor: [string, string];
  speakers: Speaker[];
  agenda: AgendaItem[];
  experience: string[];
  audience: string;
  venueType: VenueType;
  venueName: string;
  venueAddress: string;
  venueInstructions: string;
  parking: string;
  liveStreamUrl: string;
  meetingUrl: string;
  platform: string;
  hasLiveStream: boolean;
  recurrence: RecurrenceType;
  notes: string;
  attending: number;
  createdAt: number;
};

const GRADIENTS: [string,string][] = [
  ['#667eea','#764ba2'],
  ['#f093fb','#f5576c'],
  ['#4facfe','#00f2fe'],
  ['#43e97b','#38f9d7'],
  ['#fa709a','#fee140'],
  ['#c9a96e','#1a1a2e'],
];

// Seed the real events store with the demo/discovery events too, so they're
// uniformly findable by ID the same way user-created events are (matching
// how postsStore.ts already seeds INITIAL_POSTS). Without this, sharing a
// demo event produced a broken lookup since it existed only as route params,
// never as a real stored record.
const INITIAL_EVENTS: AppEvent[] = SEED_EVENTS.map((e: any, idx: number) => {
  const details = (SEED_EVENT_DETAILS as any)[e.id] || {};
  const isPaid = e.price !== 'Free';
  const ticketPrice = isPaid ? parseFloat(String(e.price).replace('$','')) || 0 : 0;
  return {
    id: e.id,
    status: 'upcoming',
    title: e.title,
    description: e.description || details.summary || '',
    summary: details.summary || e.description || '',
    organizer: '',
    date: e.date,
    time: '',
    endTime: '',
    location: e.location,
    city: '',
    state: '',
    zip: '',
    type: e.type,
    price: e.price,
    isPaid,
    ticketPrice,
    platformFee: 0,
    creatorPayout: 0,
    ticketsSold: 0,
    bannerColor: details.bannerColor || GRADIENTS[idx % GRADIENTS.length],
    speakers: details.speakers || [],
    agenda: [],
    experience: details.experience || [],
    audience: details.audience || '',
    venueType: 'in-person',
    venueName: '',
    venueAddress: '',
    venueInstructions: '',
    parking: '',
    liveStreamUrl: '',
    meetingUrl: '',
    platform: '',
    hasLiveStream: false,
    recurrence: 'once',
    notes: '',
    attending: e.attending || 0,
    createdAt: Date.now() - (SEED_EVENTS.length - idx) * 1000,
  };
});

let events: AppEvent[] = INITIAL_EVENTS;
let hydrated = false;
const listeners: Array<() => void> = [];
function notify() { listeners.forEach(fn => fn()); }

async function persist() {
  try { await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(events)); } catch {}
}

async function hydrate() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = await AsyncStorage.getItem(EVENTS_KEY);
    let stored: AppEvent[] = [];
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) stored = parsed;
    }
    // Merge: keep any real stored events, and backfill seed/demo events for
    // any IDs not already present, so demo events stay findable even for
    // users who already had (possibly empty) event data saved.
    const storedIds = new Set(stored.map(e => e.id));
    const missingSeed = INITIAL_EVENTS.filter(e => !storedIds.has(e.id));
    events = [...stored, ...missingSeed];
    notify();
  } catch {}
}
hydrate();

export function getEvents() { return [...events]; }
export function getUpcomingEvents() { return events.filter(e => e.status !== 'past' && e.status !== 'draft'); }
export function getUserEvents() { return [...events].sort((a,b) => b.createdAt - a.createdAt); }

export function addEvent(event: Omit<AppEvent, 'id' | 'createdAt' | 'bannerColor' | 'platformFee' | 'creatorPayout' | 'ticketsSold' | 'attending'>) {
  const idx = events.length % GRADIENTS.length;
  const platformFee = event.isPaid ? parseFloat((event.ticketPrice * 0.015).toFixed(2)) : 0;
  const creatorPayout = event.isPaid ? parseFloat((event.ticketPrice - platformFee).toFixed(2)) : 0;
  const newEvent: AppEvent = {
    ...event,
    id: 'user_' + Date.now().toString(),
    createdAt: Date.now(),
    bannerColor: GRADIENTS[idx],
    platformFee,
    creatorPayout,
    ticketsSold: 0,
    attending: 0,
  };
  events = [newEvent, ...events];
  persist();
  notify();
  return newEvent;
}

export function updateEvent(id: string, updates: Partial<AppEvent>) {
  events = events.map(e => e.id === id ? { ...e, ...updates } : e);
  persist();
  notify();
}

/**
 * Record a completed ticket purchase against the event.
 *
 * ticketsSold was set to 0 at creation and never touched again, so every
 * earnings figure — gross, fees, net, pending payout — was derived from zero
 * and stayed at $0.00 no matter how many tickets were bought. Attendance was
 * tracked, the ticket itself was stored, but the event never learned it had
 * sold anything.
 *
 * Called from checkout once payment completes. When a real payment processor
 * exists this becomes the webhook handler's job, so the count reflects money
 * that actually settled rather than a checkout screen being dismissed.
 */
export function recordTicketSale(eventId: string, quantity: number) {
  if (!eventId || quantity <= 0) return;
  events = events.map(e =>
    e.id === eventId ? { ...e, ticketsSold: (e.ticketsSold || 0) + quantity } : e
  );
  persist();
  notify();
}

export function deleteEvent(id: string) {
  events = events.filter(e => e.id !== id);
  persist();
  notify();
}

export function useEvents() {
  const [state, setState] = useState(getEvents());
  useEffect(() => {
    const fn = () => setState(getEvents());
    listeners.push(fn);
    if (!hydrated) hydrate();
    return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };
  }, []);
  return state;
}

export function useUserEvents() {
  const [state, setState] = useState(getUserEvents());
  useEffect(() => {
    const fn = () => setState(getUserEvents());
    listeners.push(fn);
    if (!hydrated) hydrate();
    return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };
  }, []);
  return state;
}

// Earnings calculations
export function getEarnings() {
  const paidEvents = events.filter(e => e.isPaid);
  const grossRevenue = paidEvents.reduce((sum, e) => sum + (e.ticketPrice * e.ticketsSold), 0);
  const totalFees = paidEvents.reduce((sum, e) => sum + (e.platformFee * e.ticketsSold), 0);
  const netRevenue = grossRevenue - totalFees;
  const totalTickets = events.reduce((sum, e) => sum + e.ticketsSold, 0);
  const totalAttendees = events.reduce((sum, e) => sum + e.attending, 0);
  // Everything earned is owed until a transfer actually happens. These used to
  // be netRevenue * 0.7 and * 0.3 — placeholder numbers from before earnings
  // were wired to real ticket sales, which survived the wiring and turned into
  // a second cut on top of the platform fee. Worse, pendingPayout is the
  // withdrawable balance on the earnings screen, so 30% of real money was
  // reported as already paid out and could not be withdrawn.
  //
  // completedPayout stays at zero until there are real transfers to count.
  // Stripe Connect owns that ledger — what moved, when, and to which account —
  // so this is where its payout total is read in, not something to model here.
  return { grossRevenue, totalFees, netRevenue, totalTickets, totalAttendees, pendingPayout: netRevenue, completedPayout: 0 };
}
