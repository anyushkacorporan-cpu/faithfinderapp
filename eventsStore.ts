import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

let events: AppEvent[] = [];
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
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        events = parsed;
        notify();
      }
    }
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
  return { grossRevenue, totalFees, netRevenue, totalTickets, totalAttendees, pendingPayout: netRevenue * 0.7, completedPayout: netRevenue * 0.3 };
}
