import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { newId } from './ids';

const USER_KEY = 'faithfinder_user_v1';

/**
 * The signed-in user's profile. Everything is optional: the object starts
 * essentially empty at signup and fills in as the user completes their profile,
 * so every read site has to cope with a missing value anyway.
 *
 * Personal and church accounts share this one shape — `accountType` decides
 * which half is meaningful. Fields are grouped below accordingly.
 */
export type User = {
  /**
   * Stable identity for this account. Generated once on first run and never
   * changed — names change, this does not. Everything that asks "is this mine?"
   * must compare ids, never display names. When the backend lands this is the
   * column the server's user id replaces.
   */
  id?: string;
  accountType?: 'personal' | 'church';
  email?: string;
  bio?: string;
  phone?: string;
  createdAt?: string;

  // ── Personal accounts ──────────────────────────────────────────────
  firstName?: string;
  lastName?: string;
  location?: string;      // free-text "City, ST" the user typed
  profilePhoto?: string;  // local or remote image URI
  coverPhoto?: string;    // local or remote image URI
  lifeVerse?: string;     // the verse text itself
  lifeVerseRef?: string;  // e.g. "Philippians 4:13"

  // ── Church accounts ────────────────────────────────────────────────
  churchName?: string;
  /**
   * Google Place ID of the church this account claimed. This is the only stable
   * link between a church ACCOUNT and its church PAGE — names diverge, because
   * Places supplies one spelling and the account holder types another. Set when
   * claiming; absent for churches registered from scratch, which have no Places
   * entry to point at.
   */
  placeId?: string;
  churchEmail?: string;
  denomination?: string;
  address?: string;
  website?: string;
  serviceTimes?: string;
  avatar?: string;        // church logo image URI
  photos?: string[];      // gallery image URIs, shown as a pager on the profile
  ministries?: string[];  // free-text ministry names the church added
  /** Amenity key -> offered. Keys come from AMENITY_LIST in edit-church-profile. */
  amenities?: Record<string, boolean>;
  /** Set to 'pending' when a claim/registration is submitted. */
  verificationStatus?: 'pending' | 'approved';
};

let user: User = { id: newId(), createdAt: new Date().toISOString() };
let hydrated = false;
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

async function persist() {
  try { await AsyncStorage.setItem(USER_KEY, JSON.stringify(user)); } catch {}
}

async function hydrate() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = await AsyncStorage.getItem(USER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      user = { ...user, ...parsed };
      // Installs that predate `id` get one now and keep it from here on.
      if (!user.id) { user.id = newId(); persist(); }
      notify();
    }
  } catch {}
}
hydrate();

export function getUser(): User { return user; }

export function setUser(updates: Partial<User>) {
  user = { ...user, ...updates };
  persist();
  notify();
}

export async function signOut() {
  user = { id: newId() };
  try { await AsyncStorage.removeItem(USER_KEY); } catch {}
  notify();
}

// Clears the profile stored on this device. Note: since there's no backend
// yet, this only removes local data — it doesn't delete server-side data
// (there isn't any) or content already posted elsewhere in the app.
/**
 * Clears the user record only. Not the entry point for the Delete Account
 * button — call `deleteAccountAndData` in accountDeletion.ts, which resets the
 * rest of the stores too. On its own this leaves the account's posts, comments
 * and profile snapshot behind.
 */
export async function deleteAccount() {
  user = { id: newId() };
  try { await AsyncStorage.removeItem(USER_KEY); } catch {}
  notify();
}

export function useUser(): User {
  const [state, setState] = useState(getUser());
  useEffect(() => {
    const fn = () => setState(getUser());
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
 * The name to write onto anything this account publishes.
 *
 * Three screens each built this themselves as
 * `(firstName || 'You') + ' ' + (lastName || '')`, which reads correctly on
 * your own screen and is wrong the moment it leaves the device: posts were
 * reaching the server authored by "You", and every other reader would see
 * that. A placeholder meant for the first person is not a name.
 *
 * Falls back to the email's local part before giving up, because
 * "anyushka.corporan" identifies someone and "Member" does not.
 */
export function displayName(u: User = getUser()): string {
  if (u.accountType === 'church') return u.churchName || 'Church';

  const full = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  if (full) return full;

  const local = (u.email || '').split('@')[0];
  if (local) {
    return local
      .split(/[._\-+]+/)
      .filter(Boolean)
      .map(w => w[0].toUpperCase() + w.slice(1))
      .join(' ');
  }
  return 'Member';
}

/** Initials for the avatar, from the same name the post will carry. */
export function displayInitials(u: User = getUser()): string {
  const name = displayName(u);
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'M';
}
