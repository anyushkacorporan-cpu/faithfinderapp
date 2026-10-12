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

const KEY = 'faithfinder_onboarding_seen_v1';

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
