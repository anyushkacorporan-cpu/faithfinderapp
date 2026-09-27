import { useState, useEffect, useCallback } from 'react';
import { load, save } from './persist';
import * as api from './listsApi';

/**
 * Churches you have saved.
 *
 * Holds the church, not just its id.
 *
 * It used to keep a bare list of ids, and the Saved tab found the rest by
 * looking each id up in whatever happened to be on screen: the seeded demo
 * list, the nearby results, the current search. That failed in the most
 * ordinary way possible — the tab button itself cleared the search results in
 * the same tap that opened the tab, so saving a church you had just searched
 * for and then going to look at it showed nothing at all, under a heading that
 * counted it. The count came from the ids; the emptiness came from the lookup.
 *
 * And nothing was written down, so closing the app emptied the list.
 *
 * A saved church is now stored whole and persisted, which answers both: the
 * tab renders from what it holds rather than from what is on screen, and the
 * list survives a restart. The shape is deliberately loose — a church from the
 * directory, one from Google and one of the seeded ones are all saveable and
 * do not carry the same fields.
 */
export type SavedChurch = {
  id: string;
  name: string;
  [key: string]: any;
};

let savedChurches: SavedChurch[] = [];
const listeners: Array<() => void> = [];

function subscribe(fn: () => void) {
  listeners.push(fn);
  return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };
}
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

const KEY = 'faithfinder_saved_churches_v1';

/**
 * Unsaves the server has not accepted yet.
 *
 * The union in syncSavedChurchesFromServer keeps anything the server has that
 * the phone does not, which is what stops a failed save from being lost. It
 * does the wrong thing to a failed *unsave*: the row is still up there, so the
 * union reads it as a church to restore and the heart comes back on by itself.
 *
 * So an unsave that does not reach the server is written down, and stays
 * written down across restarts until it does. Without persisting it, closing
 * the app is enough to forget the intent and let the church return.
 */
const PENDING_KEY = 'faithfinder_unsaved_churches_pending_v1';
let pendingRemovals: string[] = [];
function persistPending() { save(PENDING_KEY, pendingRemovals); }
const hydratedPending = load<string[]>(PENDING_KEY, v => { pendingRemovals = v || []; });
function persist() { save(KEY, savedChurches); }
const hydrated = load<any[]>(KEY, v => {
  // Old installs stored ids. There is no church behind a bare string any more,
  // so they are dropped rather than kept as rows that cannot be drawn.
  savedChurches = (v || []).filter(c => c && typeof c === 'object' && c.id);
  notify();
});

export function getSavedChurches(): SavedChurch[] { return [...savedChurches]; }

export function isSavedChurch(id: string): boolean {
  return savedChurches.some(c => c.id === id);
}

/**
 * Save or unsave. Takes the church rather than the id, because the id alone is
 * not enough to show it again later — which is the whole of the bug above.
 */
export function toggleSavedChurch(church: SavedChurch | string) {
  const id = typeof church === 'string' ? church : church.id;
  if (!id) return;
  if (savedChurches.some(c => c.id === id)) {
    savedChurches = savedChurches.filter(c => c.id !== id);
    persist();
    notify();
    void (async () => {
      if (await api.unsaveChurchRemote(id)) return;
      if (pendingRemovals.includes(id)) return;
      pendingRemovals = [...pendingRemovals, id];
      persistPending();
    })();
    return;
  }
  if (typeof church === 'string') {
    // An id with no church behind it cannot be rendered, so saving one would
    // put the empty row back. Callers pass the church.
    return;
  }
  savedChurches = [...savedChurches, church];
  persist();
  notify();
  // Saving again clears any pending unsave: the later tap is the intent.
  if (pendingRemovals.includes(id)) {
    pendingRemovals = pendingRemovals.filter(p => p !== id);
    persistPending();
  }
  // Not awaited, and deliberately. The tap has already been answered on the
  // phone; a slow or failed write must not make the heart hesitate. A write
  // that fails is recovered by the union in syncSavedChurchesFromServer.
  void api.saveChurchRemote(church);
}

/**
 * Bring the saved list in from the account.
 *
 * A union, not a replacement, for the same reason the hidden list is one: a
 * church saved while the write failed — offline, or signed out at the time —
 * is still saved as far as the person who tapped the heart is concerned, and
 * taking the server's list as the truth would quietly un-save it. Anything
 * held locally and missing on the server is pushed up rather than dropped.
 *
 * A null return means the read failed, which is not the same as an empty list
 * and must not empty anything.
 */
export async function syncSavedChurchesFromServer(): Promise<void> {
  // Before anything is compared. Hydration is async, and a union against a list
  // that has not loaded yet is a union against nothing.
  await hydrated;
  await hydratedPending;

  // Retry the unsaves that never landed, before reading. One that succeeds now
  // stops being pending; one that fails again is still excluded from the union
  // below, so the church does not reappear while we keep trying.
  if (pendingRemovals.length) {
    const stillPending: string[] = [];
    for (const id of pendingRemovals) {
      if (!(await api.unsaveChurchRemote(id))) stillPending.push(id);
    }
    if (stillPending.length !== pendingRemovals.length) {
      pendingRemovals = stillPending;
      persistPending();
    }
  }

  const remote = await api.fetchSavedChurches();
  if (!remote) return;

  const dropped = new Set(pendingRemovals);
  const kept = (remote as SavedChurch[]).filter(c => !dropped.has(c.id));
  const keptIds = new Set(kept.map(c => c.id));
  const localOnly = savedChurches.filter(c => !keptIds.has(c.id) && !dropped.has(c.id));
  for (const c of localOnly) void api.saveChurchRemote(c);

  savedChurches = [...kept, ...localOnly];
  persist();
  notify();
}

export function useSavedChurches() {
  const [saved, setSaved] = useState<SavedChurch[]>([...savedChurches]);
  useEffect(() => {
    const off = subscribe(() => setSaved([...savedChurches]));
    // Re-read on subscribe: hydration from storage can land between the
    // useState initialiser above and this effect, and that notify would be
    // missed — leaving this component on the empty pre-hydration value.
    setSaved([...savedChurches]);
    return off;
  }, []);
  const toggle = useCallback((c: SavedChurch | string) => { toggleSavedChurch(c); }, []);
  return { saved, toggle, ids: saved.map(c => c.id) };
}

/** Return this store to a fresh-install state. See accountDeletion.ts. */
export function resetStore() {
  pendingRemovals = [];
  persistPending();
  savedChurches = [];
  persist();
  notify();
}
