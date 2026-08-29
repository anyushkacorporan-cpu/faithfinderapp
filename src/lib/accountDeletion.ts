import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteAccount } from './userStore';
import { resetStore as resetPosts } from './postsStore';
import { resetStore as resetEvents } from './eventsStore';
import { resetStore as resetTickets } from './ticketStore';
import { resetStore as resetConnections } from './connectionsStore';
import { resetStore as resetNotifications } from './notificationsStore';
import { resetStore as resetActivity } from './activityStore';
import { resetStore as resetBlocked } from './blockStore';
import { resetStore as resetHidden } from './hiddenStore';
import { resetStore as resetPlacesCache } from './placesCache';
import { resetStore as resetProfiles } from './profilesStore';
import { resetStore as resetEventActions } from './eventActionsStore';
import { resetSettings } from './settingsStore';

/**
 * Delete this account and everything belonging to it.
 *
 * The Delete Account button used to call userStore's `deleteAccount`, which
 * cleared the user record and nothing else. Everything the account had produced
 * stayed exactly where it was: posts still in the feed under their name,
 * comments still in threads, their snapshot still in the profile directory so
 * anyone could open their profile and see their photo, cover and bio. The
 * confirmation dialog promised to delete "your profile and data from this
 * device", so the app was telling people something untrue about their own data.
 *
 * Two things have to happen together, which is the reason this module exists
 * rather than a loop over AsyncStorage keys. Storage has to be cleared, and
 * each store's in-memory copy has to be reset — a store that still holds the
 * old array in memory writes it straight back to storage on its next mutation,
 * so clearing keys alone quietly undoes itself.
 *
 * Stores that ship with seed content return to that seed, which is what a fresh
 * install looks like.
 *
 * When the backend lands this stays the client half: it still has to clear the
 * device, and it gains a call to the server-side delete. Apple requires the
 * account to be gone from the service too, not just from the phone.
 */
export async function deleteAccountAndData(): Promise<void> {
  resetPosts();
  resetEvents();
  resetTickets();
  resetConnections();
  resetNotifications();
  resetActivity();
  resetBlocked();
  resetHidden();
  resetPlacesCache();
  resetProfiles();
  resetEventActions();
  resetSettings();

  // Last, so the app is already back to a clean state by the time the user
  // record goes and the screen redirects to login.
  await deleteAccount();

  // Belt and braces: anything a store forgot, or a key left by a store that has
  // since been removed, should not survive a delete either.
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter(k => k.startsWith('faithfinder_') && k !== 'faithfinder_settings_v1');
    if (ours.length) await AsyncStorage.multiRemove(ours);
  } catch {
    // Storage being unreadable must not leave the user stuck on this screen;
    // the in-memory reset above has already taken effect.
  }
}
