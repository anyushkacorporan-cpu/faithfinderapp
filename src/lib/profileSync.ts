import { supabase } from './supabase';
import { getUser, setUser, User } from './userStore';
import { load, save } from './persist';
import { syncBlocksAfterSignIn } from './blockStore';
import { syncConnectionsAfterSignIn } from './connectionsStore';
import { syncEventsFromServer } from './eventsStore';
import { syncTicketsFromServer } from './ticketStore';
import { syncPostsFromServer } from './postsStore';
import { syncNotificationsFromServer } from './notificationsStore';
import { uploadImage } from './postsApi';
import { pushNotificationPrefs } from './notificationsApi';
import { pushPrivacyPrefs } from './privacyApi';
import { getSettings, applyServerPrefs } from './settingsStore';
import { syncSavedEventsFromServer } from './eventActionsStore';
import { syncHiddenFromServer } from './hiddenStore';

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
    // Read, never written. `toRow` leaves it out on purpose — see
    // submitVerification below.
    verificationStatus: row.verification_status && row.verification_status !== 'none'
      ? row.verification_status : undefined,
  };
}

/**
 * The User shape → the columns the server holds.
 *
 * verification_status is deliberately absent. It is the one profile column this
 * account does not own: the answer is set by whoever reads the claim, and a
 * phone that has been offline since before the approval still thinks it is
 * pending. Sending it on every unrelated profile edit would mean a stale copy
 * arguing with the decision. (The trigger in 17_more_notifications.sql would
 * refuse it, so this is politeness rather than protection — but a write that is
 * always thrown away is a write that should not be made.)
 */
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
  await syncConnectionsAfterSignIn();
  await syncEventsFromServer();
  await syncTicketsFromServer();
  await syncSavedEventsFromServer();
  await syncHiddenFromServer();
  // The feed is the point of the app being shared at all; pull it as soon as
  // we know who is asking, so likes come back marked as yours.
  await syncPostsFromServer();
  await syncNotificationsFromServer();
  const { data: row, error } = await db
    .from('profiles').select('*').eq('id', userId).single();
  if (error || !row) return;

  // Preferences come DOWN here, not up.
  //
  // This used to push `getSettings()` to whichever account had just signed in,
  // which is backwards on a phone more than one person uses: signing in as
  // somebody else overwrote their stored answers with the ones left on the
  // device. The server holds the record for anything belonging to an account,
  // and sign-in is when this phone learns it.
  //
  // Absent means on, matching wants_notification() in the database, so a
  // profile that has never saved preferences still gets everything.
  applyServerPrefs({
    notifications: (row.notification_prefs && typeof row.notification_prefs === 'object')
      ? row.notification_prefs : {},
    privacy: {
      publicProfile: row.public_profile !== false,
      showLocation: row.show_location === true,
    },
  });

  const local = getUser();
  const hasLocalContent = !!(local.bio || local.location || local.profilePhoto
    || local.coverPhoto || local.lifeVerse || local.firstName);

  // Only ever on a first sign-in for this account on this device, and only
  // into a profile nobody has filled in. Both conditions matter: without the
  // first, a reinstall would push stale data over a profile edited elsewhere;
  // without the second, signing in on a friend's phone would overwrite yours.
  if (!migrated[userId] && hasLocalContent && isBlank(row)) {
    await db.from('profiles').update(toRow(local)).eq('id', userId);
    // The one path where the device is the record: a profile filled in before
    // this account existed, moving onto a blank one. Its preferences go with
    // it — otherwise the migration carries the bio and drops the privacy.
    void pushNotificationPrefs({ ...getSettings().notifications });
    void pushPrivacyPrefs({ ...getSettings().privacy });
    migrated[userId] = true;
    save(MIGRATED_KEY, migrated);
    setUser({ id: userId });
    return;
  }

  migrated[userId] = true;
  save(MIGRATED_KEY, migrated);
  setUser(toUser(row));

  // A photo picked before uploads existed is still a path on this phone.
  // Nothing prompts an edit, so it would stay that way until the person
  // happened to change their picture; catch it on the way in instead.
  const after = getUser();
  if (after.profilePhoto?.startsWith('file://') || after.coverPhoto?.startsWith('file://')) {
    void pushProfile();
  }
}

/**
 * Submit this account's church claim for review.
 *
 * The claim form used to end at `setUser({ verificationStatus: 'pending' })`
 * and a 1.5-second wait dressed up as a submission. Nothing left the phone, so
 * nobody could review anything and no church was ever going to hear back.
 *
 * Now the claim is a column on the profile. Review is a person reading it and
 * setting that column to approved or rejected, and the church is told the
 * moment they do — see notify_verification in 17_more_notifications.sql.
 *
 * Returns false if it did not reach the server, so the form can say so rather
 * than show a success screen for a submission that never happened.
 */
export async function submitVerification(): Promise<boolean> {
  const db = supabase();
  const u = getUser();
  if (!db || !u.id) return false;

  // The profile edits made alongside the claim — the church name, the address,
  // the website — go up first, because they are the substance of what is being
  // reviewed. An approval granted against a blank profile is meaningless.
  await pushProfile();

  const { error } = await db
    .from('profiles').update({ verification_status: 'pending' }).eq('id', u.id);
  if (error) return false;

  setUser({ verificationStatus: 'pending' });
  return true;
}

/**
 * Bring the verification answer back down.
 *
 * The rest of the profile syncs at sign-in, which is often enough for a bio.
 * It is not often enough for this: the decision arrives while the app is open,
 * as a notification, and the badge beside it would go on saying "Pending" until
 * the next sign-in. Called from the profile tab, which is where the badge is.
 */
export async function refreshVerificationStatus(): Promise<void> {
  const db = supabase();
  const u = getUser();
  if (!db || !u.id) return;

  const { data, error } = await db
    .from('profiles').select('verification_status').eq('id', u.id).single();
  if (error || !data) return;

  const status = data.verification_status;
  setUser({
    verificationStatus: status && status !== 'none' ? status : undefined,
  });
}

/**
 * Push local profile edits to the server.
 *
 * Fire-and-forget on purpose: a failed sync must not block someone editing
 * their own profile, and the next edit sends the whole row again anyway.
 */
export async function pushProfile(): Promise<void> {
  const db = supabase();
  const u = getUser();
  if (!db || !u.id) return;

  // Photos first. A picked image is a path on this phone; stored as-is it
  // renders for its owner and as a blank for everyone else — and because it
  // looks right to the one person who would notice, nobody reports it.
  const [profilePhoto, coverPhoto] = await Promise.all([
    uploadImage(u.profilePhoto || '', 'avatars'),
    uploadImage(u.coverPhoto || '', 'avatars'),
  ]);

  if (profilePhoto !== u.profilePhoto || coverPhoto !== u.coverPhoto) {
    // Write the shared urls back locally too, so the next post carries those
    // rather than the path that only works here.
    setUser({ profilePhoto, coverPhoto });
  }

  const row = toRow({ ...getUser(), profilePhoto, coverPhoto });
  await db.from('profiles').update(row).eq('id', u.id).then(() => {}, () => {});
}
