import { useState, useEffect } from 'react';
import { load, save } from './persist';

/**
 * Posts this person has chosen not to see again.
 *
 * Reporting used to leave the post exactly where it was. You would report
 * something as hate speech, be told "our team will review this", and then keep
 * scrolling past it - which is the opposite of what someone reporting content
 * wants, and weaker than what App Store guideline 1.2 asks for: people must be
 * able to get objectionable content out of their own experience.
 *
 * Hiding is separate from blocking on purpose. Blocking is about a person and
 * removes everything they write; hiding is about one post, and someone may want
 * a single post gone without cutting off a church or a friend entirely.
 *
 * This is per-device, like the block list, and moves to the backend with it.
 * Reports themselves still have nowhere to go - that needs a server and a human
 * who can read them - but the reporter no longer has to live with the post in
 * the meantime.
 */
let hidden: string[] = [];
const listeners: Array<() => void> = [];
/**
 * Notify over a copy: a subscriber's setState can unmount a component, whose
 * cleanup splices itself out of this list mid-iteration.
 */
function notify() { [...listeners].forEach(fn => fn()); }

const STORAGE_KEY = 'faithfinder_hidden_posts_v1';
function persist() { save(STORAGE_KEY, hidden); }
load<string[]>(STORAGE_KEY, v => { hidden = v || []; notify(); });

export function isHidden(postId?: string): boolean {
  return !!postId && hidden.includes(postId);
}

export function hidePost(postId: string) {
  if (!postId || hidden.includes(postId)) return;
  hidden = [...hidden, postId];
  persist();
  notify();
}

export function unhidePost(postId: string) {
  hidden = hidden.filter(id => id !== postId);
  persist();
  notify();
}

export function useHidden(): string[] {
  const [state, setState] = useState(hidden);
  useEffect(() => {
    const fn = () => setState(hidden);
    // Re-read on subscribe: hydration can land between the initialiser and here.
    fn();
    listeners.push(fn);
    return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };
  }, []);
  return state;
}

/** Return this store to a fresh-install state, for account deletion. */
export function resetStore() {
  hidden = [];
  persist();
  notify();
}
