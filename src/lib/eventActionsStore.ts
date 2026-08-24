import { useState, useEffect } from 'react';
import { load, save } from './persist';

let savedEvents: string[] = [];
let attendingEvents: string[] = [];
const listeners: Array<() => void> = [];
function notify() { listeners.forEach(fn => fn()); }

// Both lists live under one key: they are always read and written together,
// so a single record keeps them consistent and halves the storage round-trips.
const STORAGE_KEY = 'faithfinder_event_actions_v1';
type Persisted = { saved: string[]; attending: string[] };
function persist() { save(STORAGE_KEY, { saved: savedEvents, attending: attendingEvents }); }
load<Persisted>(STORAGE_KEY, v => {
  savedEvents = v.saved || [];
  attendingEvents = v.attending || [];
  notify();
});

export function getSavedEvents() { return [...savedEvents]; }
export function getAttendingEvents() { return [...attendingEvents]; }
export function isEventSaved(id: string) { return savedEvents.includes(id); }
export function isEventAttending(id: string) { return attendingEvents.includes(id); }

export function toggleSaveEvent(id: string) {
  if (savedEvents.includes(id)) {
    savedEvents = savedEvents.filter(e => e !== id);
  } else {
    savedEvents = [...savedEvents, id];
  }
  persist(); notify();
}

export function addAttending(id: string) {
  if (!attendingEvents.includes(id)) {
    attendingEvents = [...attendingEvents, id];
    persist(); notify();
  }
}

export function removeAttending(id: string) {
  attendingEvents = attendingEvents.filter(e => e !== id);
  persist(); notify();
}

export function useEventActions() {
  const [saved, setSaved] = useState(getSavedEvents());
  const [attending, setAttending] = useState(getAttendingEvents());
  useEffect(() => {
    const fn = () => { setSaved(getSavedEvents()); setAttending(getAttendingEvents()); };
    listeners.push(fn);
    return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };
  }, []);
  return { saved, attending };
}

/**
 * Return this store to a fresh-install state. Called only from
 * `deleteAccountAndData` — see src/lib/accountDeletion.ts for why clearing
 * storage alone is not enough.
 */
export function resetStore() {
  savedEvents = [];
  attendingEvents = [];
  persist();
  notify();
}
