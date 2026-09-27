import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Device-local persistence for the simple stores.
 *
 * Several stores kept their data in a module-level array and nothing else, so
 * connections, notifications, saved events and *purchased tickets* were lost
 * every time the app was closed. These two helpers give them the same
 * durability postsStore already had, without five copies of the same code.
 *
 * Writes are fire-and-forget: a failed write must never break a user action, so
 * errors are swallowed deliberately. Reads are async and land after first
 * render, which is why `apply` re-notifies subscribers rather than assuming it
 * ran before anything mounted.
 *
 * When the backend arrives this is the seam to replace: `load` becomes the
 * initial fetch and `save` becomes a mutation, and no store's public API or any
 * component has to change.
 */

/**
 * Read a stored value once at startup and hand it to the store.
 *
 * Returns when hydration has finished, which matters to any store that also
 * pulls the same list from the server. A sync that ran first saw an empty list,
 * treated the server's copy as the whole truth, and wrote that over the stored
 * one — losing anything saved on this device while signed out. Callers that
 * only hydrate can carry on ignoring the result.
 */
export function load<T>(key: string, apply: (value: T) => void): Promise<void> {
  return AsyncStorage.getItem(key)
    .then(raw => {
      if (!raw) return;
      const parsed = JSON.parse(raw) as T;
      if (parsed != null) apply(parsed);
    })
    .catch(() => {
      // Corrupt or unreadable data: keep the in-memory defaults rather than
      // crashing on launch.
    });
}

/** Persist the store's current value. Safe to call on every mutation. */
export function save(key: string, value: unknown): void {
  AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => {});
}
