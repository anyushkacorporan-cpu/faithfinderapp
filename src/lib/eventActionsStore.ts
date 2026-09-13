import { useState, useEffect } from 'react';
import { load, save } from './persist';
import * as api from './listsApi';

let savedEvents: string[] = [];
let attendingEvents: string[] = [];
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
  const wasSaved = savedEvents.includes(id);
  savedEvents = wasSaved ? savedEvents.filter(e => e !== id) : [...savedEvents, id];
  persist(); notify();
  void (wasSaved ? api.unsaveEventRemote(id) : api.saveEventRemote(id));
}

/**
 * Bring the saved list in from the server.
 *
 * A union rather than a replacement. Saving happens on a phone and the write
 * that follows can fail, so a device may hold something the server has not
 * heard about yet — and dropping it here would lose the save rather than sync
 * it. Anything local that the server is missing is pushed while we are here.
 *
 * Attending is left alone: tickets are its source of truth and they arrive
 * through their own sync.
 */
export async function syncSavedEventsFromServer(): Promise<void> {
  const remote = await api.fetchSavedEvents();
  if (!remote) return;

  const localOnly = savedEvents.filter(id => !remote.includes(id));
  for (const id of localOnly) void api.saveEventRemote(id);

  savedEvents = [...remote, ...localOnly];
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
    // Re-read on subscribe: hydration from storage can land between the
    // useState initialiser above and this effect, and that notify would be
    // missed - leaving this component on the empty pre-hydration value until
    // something else happened to change the store.
    fn();
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
