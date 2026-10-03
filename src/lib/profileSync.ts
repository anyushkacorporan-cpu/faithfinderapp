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
import { syncSavedChurchesFromServer } from './store';

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

// Accounts whose profile edits have not reached the server yet. Kept on the
// device so a push lost to a dead connection is still owed after a restart.
const PENDING_KEY = 'faithfinder_profile_push_pending_v1';

let pendingPush: Record<string, boolean> = {};
load<Record<string, boolean>>(PENDING_KEY, v => { pendingPush = v || {}; });

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
  await syncSavedChurchesFromServer();
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
    const { error } = await db.from('profiles').update(toRow(local)).eq('id', userId);

    // The flag is only set once the write has landed. It used to be set either
    // way, which quietly threw the profile away: this runs once per account per
    // device, so a write that failed — offline on the walk home, a timeout —
    // left the flag saying "done" and the condition above could never be true
    // again. The bio, photos and life verse someone wrote before they had an
    // account were gone from the server for good, and because the local copy
    // still showed them they looked fine on that one phone and blank to
    // everybody else.
    //
    // Leaving the flag unset costs nothing: the next sign-in finds the profile
    // still blank and tries again.
    if (error) {
      setUser({ id: userId });
      return;
    }

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
export async function submitVerification(churchUuid?: string | null): Promise<boolean> {
  const db = supabase();
  const u = getUser();
  if (!db || !u.id) return false;

  // The profile edits made alongside the claim — the church name, the address,
  // the website — go up first, because they are the substance of what is being
  // reviewed. An approval granted against a blank profile is meaningless.
  await pushProfile();

  // Which church, as an id rather than as text.
  //
  // The claim used to record only the church's name and address, which is
  // enough for a person reading the claim and nothing else: no query could get
  // from an approved claim back to the row it was about, so approving one
  // granted no ownership of anything. Nothing could then be edited on the
  // church's behalf. This is what the approval trigger in
  // 23_church_photos_editable.sql joins on.
  //
  // Only churches from our own directory can be named this way. A Google result
  // or a seeded demo church has no row to point at, so the claim still goes up
  // and is still reviewable — it just cannot confer ownership, which is honest,
  // because there is nothing to own.
  const patch: Record<string, unknown> = { verification_status: 'pending' };
  if (churchUuid) patch.claimed_church_id = churchUuid;

  const { error } = await db.from('profiles').update(patch).eq('id', u.id);
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
 * Callers do not wait on this, and should not: a sync must never block someone
 * editing their own profile. But not waiting is different from not looking.
 * This used to end in `.then(() => {}, () => {})`, which threw the outcome
 * away, so a profile that never reached the server looked saved on the phone
 * that wrote it and stayed blank to everyone else — and the comment excused it
 * on the grounds that "the next edit sends the whole row again anyway", which
 * is only true if there is a next edit. Someone who fills in their profile
 * once, on a bad connection, never gets one.
 *
 * So it retries, and it returns whether the row landed. Callers are still free
 * to ignore that; `pendingProfilePush()` lets a screen notice and try again.
 */
export async function pushProfile(): Promise<boolean> {
  const db = supabase();
  const u = getUser();
  if (!db || !u.id) return false;

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

  // Three tries over about three seconds. A profile push is one small row, and
  // the failure being guarded against is a phone that was on a lift or a train
  // for a moment, not a server that is down.
  for (let attempt = 1; attempt <= 3; attempt++) {
    const { error } = await db.from('profiles').update(row).eq('id', u.id);
    if (!error) {
      if (pendingPush[u.id]) {
        delete pendingPush[u.id];
        save(PENDING_KEY, pendingPush);
      }
      return true;
    }
    if (attempt < 3) await new Promise(s => setTimeout(s, 500 * attempt * attempt));
  }

  // Remembered across restarts, because the phone being closed is the likeliest
  // reason this failed in the first place.
  pendingPush[u.id] = true;
  save(PENDING_KEY, pendingPush);
  return false;
}

/** Whether this account has profile edits that never reached the server. */
export function pendingProfilePush(): boolean {
  const u = getUser();
  return !!(u.id && pendingPush[u.id]);
}

/**
 * Try again, if an earlier push never landed.
 *
 * Safe to call freely — it does nothing unless something is actually owed, and
 * pushProfile sends the whole row, so one success settles it.
 */
export async function retryProfilePush(): Promise<void> {
  if (pendingProfilePush()) void pushProfile();
}
