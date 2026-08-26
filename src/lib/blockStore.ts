import { useState, useEffect } from 'react';
import { load, save } from './persist';
import { removeConnection } from './connectionsStore';

/**
 * People this account has blocked.
 *
 * Apps that carry user-generated content are required to let people block
 * abusive users, not merely report them — reporting asks someone else to act,
 * blocking is the control the person has over their own feed. Blocked authors
 * disappear from both feeds, from comment threads, and from their own profile
 * screen.
 *
 * Identity is stored twice on purpose. Posts written before accounts had ids
 * carry only a display name, so a block recorded against an id would silently
 * fail to match them. We keep whichever we have and match on either. Once the
 * backend owns identity the name half can go.
 */
export type BlockedUser = {
  id?: string;
  name: string;
  blockedAt: number;
};

let blocked: BlockedUser[] = [];
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

const STORAGE_KEY = 'faithfinder_blocked_v1';
function persist() { save(STORAGE_KEY, blocked); }
load<BlockedUser[]>(STORAGE_KEY, v => { blocked = v; notify(); });

export function getBlocked(): BlockedUser[] {
  return [...blocked].sort((a, b) => b.blockedAt - a.blockedAt);
}

/**
 * Is this author blocked? Pass whatever the content carries — an id, a name, or
 * both. A match on either one hides the content.
 */
export function isBlocked(authorId?: string, authorName?: string): boolean {
  if (!authorId && !authorName) return false;
  return blocked.some(b =>
    (!!authorId && !!b.id && b.id === authorId) ||
    (!!authorName && b.name === authorName)
  );
}

export function blockUser(user: { id?: string; name: string }) {
  if (!user.name) return;
  if (isBlocked(user.id, user.name)) return;
  blocked = [...blocked, { id: user.id, name: user.name, blockedAt: Date.now() }];
  // Blocking implies disconnecting. Leaving someone in the connections list
  // after blocking them means they still appear in the one place the list is
  // shown, and still count towards the connection total.
  removeConnection(user.id || user.name);
  if (user.id) removeConnection(user.name);
  persist();
  notify();
}

/** Unblock by id or by name — whichever the caller has to hand. */
export function unblockUser(idOrName: string) {
  blocked = blocked.filter(b => b.id !== idOrName && b.name !== idOrName);
  persist();
  notify();
}

export function useBlocked(): BlockedUser[] {
  const [state, setState] = useState(getBlocked());
  useEffect(() => {
    const fn = () => setState(getBlocked());
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
  blocked = [];
  persist();
  notify();
}
