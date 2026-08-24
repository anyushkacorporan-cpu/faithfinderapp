import { useState, useEffect } from 'react';
import { load, save } from './persist';
import { newId } from './ids';

export type ActivityItem = {
  id: string;
  type: 'like' | 'comment' | 'attending';
  postId?: string;
  postContent?: string;
  eventId?: string;
  eventTitle?: string;
  timestamp: number;
};

let activity: ActivityItem[] = [];
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

const STORAGE_KEY = 'faithfinder_activity_v1';
function persist() { save(STORAGE_KEY, activity); }
load<typeof activity>(STORAGE_KEY, v => { activity = v; notify(); });

export function logActivity(item: Omit<ActivityItem, 'id' | 'timestamp'>) {
  activity = [{ ...item, id: newId(), timestamp: Date.now() }, ...activity];
  persist(); notify();
}

export function removeActivityByPost(postId: string, type: 'like' | 'comment') {
  activity = activity.filter(a => !(a.postId === postId && a.type === type));
  persist(); notify();
}

export function getActivity(): ActivityItem[] {
  return [...activity].sort((a, b) => b.timestamp - a.timestamp);
}

export function useActivity() {
  const [state, setState] = useState(getActivity());
  useEffect(() => {
    const fn = () => setState(getActivity());
    // Re-read on subscribe: hydration from storage can land between the
    // useState initialiser above and this effect, and that notify would be
    // missed - leaving this component on the empty pre-hydration value until
    // something else happened to change the store.
    fn();
    listeners.push(fn);
    return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };
  }, []);
  return state;
}

/**
 * Return this store to a fresh-install state. Called only from
 * `deleteAccountAndData` — see src/lib/accountDeletion.ts for why clearing
 * storage alone is not enough.
 */
export function resetStore() {
  activity = [];
  persist();
  notify();
}
