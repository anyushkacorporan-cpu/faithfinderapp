import { useState, useEffect } from 'react';
import { load, save } from './persist';

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
function notify() { listeners.forEach(fn => fn()); }

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
    listeners.push(fn);
    return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };
  }, []);
  return state;
}
