import { useState, useEffect } from 'react';

let savedEvents: string[] = [];
let attendingEvents: string[] = [];
const listeners: Array<() => void> = [];
function notify() { listeners.forEach(fn => fn()); }

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
  notify();
}

export function addAttending(id: string) {
  if (!attendingEvents.includes(id)) {
    attendingEvents = [...attendingEvents, id];
    notify();
  }
}

export function removeAttending(id: string) {
  attendingEvents = attendingEvents.filter(e => e !== id);
  notify();
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
