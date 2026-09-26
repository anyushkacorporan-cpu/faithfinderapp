import { useState, useEffect, useCallback } from 'react';
import { load, save } from './persist';

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
function persist() { save(KEY, savedChurches); }
load<any[]>(KEY, v => {
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
  } else if (typeof church === 'string') {
    // An id with no church behind it cannot be rendered, so saving one would
    // put the empty row back. Callers pass the church.
    return;
  } else {
    savedChurches = [...savedChurches, church];
  }
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
  savedChurches = [];
  persist();
  notify();
}
