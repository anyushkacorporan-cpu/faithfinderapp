import { useState, useEffect, useCallback } from 'react';

let savedChurches: string[] = [];
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

export function toggleSavedChurch(id: string) {
  savedChurches = savedChurches.includes(id) ? savedChurches.filter(s => s !== id) : [...savedChurches, id];
  notify();
}

export function useSavedChurches() {
  const [saved, setSaved] = useState<string[]>([...savedChurches]);
  useEffect(() => subscribe(() => setSaved([...savedChurches])), []);
  const toggle = useCallback((id: string) => { toggleSavedChurch(id); }, []);
  return { saved, toggle };
}
