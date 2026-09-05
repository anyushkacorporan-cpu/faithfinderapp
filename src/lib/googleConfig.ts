/**
 * The Google API key, in one place.
 *
 * It was hardcoded in six files. Shipped that way it can be lifted out of the
 * app bundle by anyone who cares to, and spent against your billing account —
 * and rotating it meant editing six files and committing the new one, which is
 * how a key ends up living in git history forever.
 *
 * From the environment it is set once in .env.local, and a leaked key is
 * replaced by changing a line rather than a release.
 *
 * Worth being clear about what this is not: a key in a mobile app is never
 * secret, whatever it is read from. What limits the damage is the restrictions
 * set on it in the Google Cloud console — allowed APIs and allowed bundle ids.
 * Those are the actual protection; this only stops the key being needlessly
 * easy to find and hard to change.
 */

export const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY || '';

/** Whether Google-backed features can work in this build. */
export function hasGoogleKey(): boolean {
  return GOOGLE_API_KEY.startsWith('AIza');
}

if (!hasGoogleKey()) {
  // Said once, at startup. Without it, the symptom is every Google-backed
  // screen quietly returning nothing, which reads as a broken feature rather
  // than a missing setting.
  console.warn('[google] EXPO_PUBLIC_GOOGLE_API_KEY is not set — address lookup, place photos and translation will not work.');
}
