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
  /** The gallery they curate in Edit Profile. Distinct from photos that came
   *  from their posts, which a viewer can already derive from the posts. */
  photos?: string[];
  /** Last time this snapshot was refreshed, so a newer one always wins. */
  updatedAt: number;
};

let profiles: Record<string, ProfileSnapshot> = {};
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
  if (!keys.every(k => a[k] === b[k])) return false;
  // photos is an array: === compares references, so a rebuilt list identical
  // in content would read as a change and rewrite storage on every publish.
  return sameList(a.photos, b.photos);
}

function sameList(a?: string[], b?: string[]): boolean {
  if (a === b) return true;
  if (!a || !b) return (a?.length ?? 0) === (b?.length ?? 0);
  return a.length === b.length && a.every((v, i) => v === b[i]);
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

/**
 * Return this store to a fresh-install state. Called only from
 * `deleteAccountAndData` — see src/lib/accountDeletion.ts for why clearing
 * storage alone is not enough.
 */
export function resetStore() {
  profiles = {};
  persist();
  notify();
}

/**
 * A person as they appear in a search result.
 *
 * Deliberately narrower than ProfileSnapshot. Searching is how you find someone
 * you are not connected to, so a result must carry enough to tell two people
 * with the same name apart - and nothing more. Name, photo and city/state do
 * that; bio, life verse and connection count do not help you identify anyone
 * and have no business being returned to a stranger's search.
 */
export type PersonResult = {
  id: string;
  name: string;
  accountType?: 'personal' | 'church';
  photo?: string;
  city?: string;
  state?: string;
  color?: string;
  initials?: string;
};

function toResult(p: ProfileSnapshot): PersonResult {
  return {
    id: p.id, name: p.name, accountType: p.accountType,
    photo: p.photo, city: p.city, state: p.state,
    color: p.color, initials: p.initials,
  };
}

/**
 * People this device knows of, matching a name query.
 *
 * Matches on whole words as well as prefixes, so "smith" finds "John Smith"
 * and "jo" finds "John" — but "ohn" does not, because substring-anywhere
 * matching turns a search box into a way to trawl the directory.
 *
 * An empty query returns nothing rather than everyone: browsing the full list
 * of every account this device has encountered is not a feature anyone asked
 * for, and it is the sort of thing that quietly becomes one.
 */
export function searchPeople(query: string, opts?: { excludeId?: string }): PersonResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return Object.values(profiles)
    .filter(p => p.id !== opts?.excludeId)
    .filter(p => p.name.toLowerCase().split(/\s+/).some(word => word.startsWith(q))
              || p.name.toLowerCase().startsWith(q))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(toResult);
}

