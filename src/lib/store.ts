import { useState, useEffect, useCallback } from 'react';

let savedChurches: string[] = [];
const listeners: Array<() => void> = [];

function subscribe(fn: () => void) {
  listeners.push(fn);
  return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };
}
function notify() { listeners.forEach(fn => fn()); }

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
