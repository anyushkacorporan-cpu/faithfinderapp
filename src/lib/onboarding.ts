import { load, save } from './persist';

/**
 * Whether the introduction has been shown on this device.
 *
 * Set on the way out of it, read by the screen itself. The routes in are all
 * ends of account creation — personal signup, and a church after it has been
 * claimed or registered — and two of those can also be reached long after,
 * which is the case this answers: a church claimed in March should not come
 * with an introduction to an app already in use.
 *
 * On the device rather than the account, because that is where the question is
 * asked and because someone signing in on a second phone has still been told.
 *
 * There was a guard here that treated any device with a stored user as having
 * seen this. It belonged to an earlier placement, before sign-in, where the
 * alternative was showing a first-run tour to every existing user on the
 * update that added it. From the end of signup it is simply wrong: making a
 * second account on a phone that has held one before is exactly when somebody
 * is new, and it would have silently skipped them.
 */

/**
 * v2, and the bump is the fix.
 *
 * The guard described above did not only skip the introduction — it wrote the
 * skip down. `save(KEY, true)` ran on every device that had a stored user, so
 * phones were permanently marked as having seen a screen they had never been
 * shown. Deleting the guard stopped new devices being marked; it could not
 * unmark the ones already written to, which is why the slides still did not
 * appear after creating an account.
 *
 * A new key is the smallest honest repair: the old value is left where it is,
 * nothing has to be migrated or cleared, and every device answers the question
 * again from scratch. Only the ends of account creation lead here, so answering
 * again costs nothing to anyone who is not creating an account.
 */
const KEY = 'faithfinder_onboarding_seen_v2';

let seen = false;

/**
 * Resolves once the stored answer has been read.
 *
 * Awaited rather than assumed: the read lands after first render, and a guess
 * either way is wrong in a way somebody notices — guess "seen" and a new
 * account never gets the introduction, guess "not seen" and it flashes up in
 * front of people who have already read it.
 */
export const hydrated: Promise<void> = load<boolean>(KEY, v => { seen = v === true; });

export function hasSeenOnboarding(): boolean {
  return seen;
}

export async function markOnboardingSeen(): Promise<void> {
  seen = true;
  save(KEY, true);
}
