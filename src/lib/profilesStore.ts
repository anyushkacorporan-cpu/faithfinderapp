import { useState, useEffect } from 'react';
import { load, save } from './persist';

/**
 * A directory of everyone this device has seen.
 *
 * The problem this solves: opening someone's profile used to show almost
 * nothing. Their name, city and avatar arrived as route params from whatever
 * post you tapped, and their cover photo, bio and life verse simply had no
 * source — userStore holds exactly one user, you. So other people's profiles
 * rendered as a blank cover and a name.
 *
 * The alternative was copying profile fields onto every post, which goes stale
 * the moment someone edits their bio: old posts would keep serving the old one
 * forever. Instead each account publishes a snapshot of itself, keyed by id,
 * and profile screens read from here.
 *
 * This is deliberately the same shape as a `profiles` table. When the backend
 * lands, `getProfile` becomes a select and `publishProfile` becomes an upsert;
 * the screens do not change.
 */
export type ProfileSnapshot = {
  id: string;
  name: string;
  accountType?: 'personal' | 'church';
  photo?: string;
  cover?: string;
  bio?: string;
  city?: string;
  state?: string;
  lifeVerse?: string;
  lifeVerseRef?: string;
  color?: string;
  initials?: string;
  /** Their own connection count at publish time — not something a viewer
   *  could otherwise know, since connections live on each device. */
  connectionCount?: number;
  /** Last time this snapshot was refreshed, so a newer one always wins. */
  updatedAt: number;
};

let profiles: Record<string, ProfileSnapshot> = {};
const listeners: Array<() => void> = [];
function notify() { listeners.forEach(fn => fn()); }

const STORAGE_KEY = 'faithfinder_profiles_v1';
function persist() { save(STORAGE_KEY, profiles); }
load<Record<string, ProfileSnapshot>>(STORAGE_KEY, v => { profiles = v || {}; notify(); });

/**
 * Record or refresh an account's profile. Called whenever someone posts or
 * saves their profile, so the directory keeps up without a server.
 */
export function publishProfile(p: Omit<ProfileSnapshot, 'updatedAt'>) {
  if (!p.id || !p.name) return;
  const existing = profiles[p.id];
  // Merge, never erase: callers publish from wherever they happen to be, and a
  // comment made from a screen that has no city must not blank out the city a
  // profile edit already recorded. Only fields actually supplied overwrite.
  const supplied = Object.fromEntries(
    Object.entries(p).filter(([, v]) => v !== undefined)
  ) as Partial<ProfileSnapshot>;
  const next: ProfileSnapshot = { ...existing, ...supplied, id: p.id, name: p.name, updatedAt: Date.now() };
  // Skip the write when nothing actually changed, so posting in a loop does not
  // thrash storage.
  if (existing && sameProfile(existing, next)) return;
  profiles = { ...profiles, [p.id]: next };
  persist();
  notify();
}

function sameProfile(a: ProfileSnapshot, b: ProfileSnapshot): boolean {
  const keys: (keyof ProfileSnapshot)[] = [
    'name','accountType','photo','cover','bio','city','state',
    'lifeVerse','lifeVerseRef','color','initials','connectionCount',
  ];
  return keys.every(k => a[k] === b[k]);
}

/**
 * Look up a profile by id, falling back to a name match for accounts recorded
 * before ids existed. Returns undefined when this device has never seen them —
 * the screen should then fall back to whatever the route passed it.
 */
export function getProfile(id?: string, name?: string): ProfileSnapshot | undefined {
  if (id && profiles[id]) return profiles[id];
  if (name) return Object.values(profiles).find(p => p.name === name);
  return undefined;
}

export function useProfile(id?: string, name?: string): ProfileSnapshot | undefined {
  const [state, setState] = useState(() => getProfile(id, name));
  useEffect(() => {
    const fn = () => setState(getProfile(id, name));
    fn();
    listeners.push(fn);
    return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };
  }, [id, name]);
  return state;
}
