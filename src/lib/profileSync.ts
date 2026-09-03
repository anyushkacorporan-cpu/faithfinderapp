import { supabase } from './supabase';
import { getUser, setUser, User } from './userStore';
import { load, save } from './persist';
import { syncBlocksAfterSignIn } from './blockStore';

/**
 * Keeps the account's profile and the on-device user in step.
 *
 * The app already has a working local user model that every screen reads. This
 * does not replace it — it makes it durable. On sign-in the server's profile is
 * pulled down into it; on edit the change is pushed back up. Screens carry on
 * reading `getUser()` and know nothing about any of this.
 *
 * MIGRATION
 *
 * Someone signing in for the first time on a device that already has a profile,
 * posts and saved churches should not lose them. The first sign-in pushes what
 * is on the device up to the empty profile, once, and records that it happened
 * so a later sign-in on the same device cannot overwrite the account with stale
 * local data.
 */

const MIGRATED_KEY = 'faithfinder_profile_migrated_v1';

let migrated: Record<string, boolean> = {};
load<Record<string, boolean>>(MIGRATED_KEY, v => { migrated = v || {}; });

/** Server row → the User shape the app already uses. */
function toUser(row: any): Partial<User> {
  return {
    id: row.id,
    accountType: row.account_type || 'personal',
    firstName: row.first_name || undefined,
    lastName: row.last_name || undefined,
    bio: row.bio || undefined,
    location: row.location || undefined,
    profilePhoto: row.profile_photo || undefined,
    coverPhoto: row.cover_photo || undefined,
    lifeVerse: row.life_verse || undefined,
    lifeVerseRef: row.life_verse_ref || undefined,
    churchName: row.church_name || undefined,
    phone: row.phone || undefined,
  };
}

/** The User shape → the columns the server holds. */
function toRow(u: User) {
  return {
    account_type: u.accountType || 'personal',
    first_name: u.firstName ?? null,
    last_name: u.lastName ?? null,
    bio: u.bio ?? null,
    location: u.location ?? null,
    profile_photo: u.profilePhoto ?? null,
    cover_photo: u.coverPhoto ?? null,
    life_verse: u.lifeVerse ?? null,
    life_verse_ref: u.lifeVerseRef ?? null,
    church_name: u.churchName ?? null,
    phone: u.phone ?? null,
    updated_at: new Date().toISOString(),
  };
}

/** Is this row still the empty one the sign-up trigger created? */
function isBlank(row: any): boolean {
  return !row.bio && !row.location && !row.profile_photo && !row.cover_photo
    && !row.life_verse && !row.phone;
}

/**
 * Called after sign-in. Pulls the profile down, or — on a device that already
 * had one and has never migrated — pushes the local profile up first.
 */
export async function syncProfileAfterSignIn(userId: string): Promise<void> {
  const db = supabase();
  if (!db) return;

  // First, and unconditionally. The profile work below has several early
  // returns, and a block list that syncs only on some sign-in paths is worse
  // than one that never syncs — it works until the day it matters.
  await syncBlocksAfterSignIn();

  const { data: row, error } = await db
    .from('profiles').select('*').eq('id', userId).single();
  if (error || !row) return;

  const local = getUser();
  const hasLocalContent = !!(local.bio || local.location || local.profilePhoto
    || local.coverPhoto || local.lifeVerse || local.firstName);

  // Only ever on a first sign-in for this account on this device, and only
  // into a profile nobody has filled in. Both conditions matter: without the
  // first, a reinstall would push stale data over a profile edited elsewhere;
  // without the second, signing in on a friend's phone would overwrite yours.
  if (!migrated[userId] && hasLocalContent && isBlank(row)) {
    await db.from('profiles').update(toRow(local)).eq('id', userId);
    migrated[userId] = true;
    save(MIGRATED_KEY, migrated);
    setUser({ id: userId });
    return;
  }

  migrated[userId] = true;
  save(MIGRATED_KEY, migrated);
  setUser(toUser(row));
}

/**
 * Push local profile edits to the server.
 *
 * Fire-and-forget on purpose: a failed sync must not block someone editing
 * their own profile, and the next edit sends the whole row again anyway.
 */
export function pushProfile(): void {
  const db = supabase();
  const u = getUser();
  if (!db || !u.id) return;
  db.from('profiles').update(toRow(u)).eq('id', u.id).then(() => {}, () => {});
}
