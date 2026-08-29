import { load, save } from './persist';

/**
 * Remembers what Google has already told us, so the app stops paying to ask
 * the same questions.
 *
 * Every open of the Churches tab fired around 41 billable Google requests: ten
 * Place Details for the built-in list, one Nearby Search, ten more Details for
 * the nearby results, and a photo request per card - none of it remembered, so
 * closing and reopening the app asked all of it again.
 *
 * None of those answers change quickly. A church's photo reference is stable
 * for months; which churches sit within 50km of a street corner is stable for
 * far longer than a browsing session. Caching turns the common case - someone
 * opening the app again - into zero requests.
 *
 * This is a stopgap for the real fix. Churches belong in our own database,
 * fetched from Google once server-side and served to every user from there.
 * When that lands this file becomes unnecessary rather than wrong.
 */

type Entry<T> = { value: T; at: number };

const PHOTO_KEY = 'faithfinder_places_photos_v1';
const NEARBY_KEY = 'faithfinder_places_nearby_v1';

/** A photo reference for a place. Stable for a long time. */
const PHOTO_TTL = 30 * 24 * 60 * 60 * 1000;   // 30 days
/** Which churches are near a location. Changes only when churches do. */
const NEARBY_TTL = 7 * 24 * 60 * 60 * 1000;   // 7 days

let photos: Record<string, Entry<string>> = {};
let nearby: Record<string, Entry<any[]>> = {};

load<Record<string, Entry<string>>>(PHOTO_KEY, v => { photos = v || {}; });
load<Record<string, Entry<any[]>>>(NEARBY_KEY, v => { nearby = v || {}; });

function fresh<T>(e: Entry<T> | undefined, ttl: number): boolean {
  return !!e && Date.now() - e.at < ttl;
}

/** The cached photo reference for a place, or undefined if we must ask Google. */
export function getCachedPhotoRef(placeId: string): string | undefined {
  const e = photos[placeId];
  return fresh(e, PHOTO_TTL) ? e.value : undefined;
}

export function setCachedPhotoRef(placeId: string, ref: string) {
  // Empty results are cached too: a place with no photo has no photo, and
  // asking again every launch costs exactly as much as asking for a real one.
  photos = { ...photos, [placeId]: { value: ref, at: Date.now() } };
  save(PHOTO_KEY, photos);
}

/**
 * Nearby results are keyed by coordinates rounded to about a kilometre. Walking
 * down the street should not miss the cache, and at a 50km search radius a
 * kilometre of precision makes no difference to what comes back.
 */
export function nearbyKey(lat: number, lng: number): string {
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

export function getCachedNearby(key: string): any[] | undefined {
  const e = nearby[key];
  return fresh(e, NEARBY_TTL) ? e.value : undefined;
}

export function setCachedNearby(key: string, results: any[]) {
  nearby = { ...nearby, [key]: { value: results, at: Date.now() } };
  save(NEARBY_KEY, nearby);
}

/**
 * Return this store to a fresh-install state, for account deletion.
 *
 * The nearby cache is keyed by the person's own coordinates, so it is a record
 * of roughly where they have been - which has no business surviving "delete my
 * account". Clearing storage alone would not do it either: the in-memory copy
 * would be written straight back on the next cache write.
 */
export function resetStore() {
  photos = {};
  nearby = {};
  save(PHOTO_KEY, photos);
  save(NEARBY_KEY, nearby);
}

