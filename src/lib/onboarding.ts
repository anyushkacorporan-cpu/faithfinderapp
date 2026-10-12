import AsyncStorage from '@react-native-async-storage/async-storage';
import { load, save } from './persist';

/**
 * Whether the introduction has been seen on this device.
 *
 * On the device rather than on the account, deliberately. It answers "has this
 * person been told what the app is", and someone signing in on a second phone
 * has been. Tying it to the account would also mean it could not be answered
 * at all before signing in, which is the one moment it is asked.
 */

const KEY = 'faithfinder_onboarding_seen_v1';

let seen = false;

/**
 * Somebody already signed in on this device has, by definition, been past the
 * introduction — it did not exist when they arrived, but they do not need it
 * now. Without this, shipping this screen would show a first-run tour to every
 * existing user on the update that added it, which is the worst possible
 * audience for "here is what this app does".
 *
 * Read straight from the stored key rather than through userStore, whose own
 * hydration is fire-and-forget and cannot be awaited from here.
 */
const USER_KEY = 'faithfinder_user_v1';

async function alreadyUsing(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(USER_KEY);
    if (!raw) return false;
    const u = JSON.parse(raw);
    return !!(u?.email || u?.firstName);
  } catch {
    return false;
  }
}

/**
 * Resolves once the stored answer has been read.
 *
 * Awaited rather than assumed, because the read lands after first render and
 * the screen deciding where to send someone cannot guess in the meantime: a
 * guess of "not seen" shows the introduction again to everyone, every launch,
 * until the read catches up.
 */
export const hydrated: Promise<void> = (async () => {
  await load<boolean>(KEY, v => { seen = v === true; });
  if (seen) return;
  if (await alreadyUsing()) {
    seen = true;
    save(KEY, true);
  }
})();

export function hasSeenOnboarding(): boolean {
  return seen;
}

export async function markOnboardingSeen(): Promise<void> {
  seen = true;
  save(KEY, true);
}
