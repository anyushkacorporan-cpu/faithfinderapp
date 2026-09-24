import { supabase, writeFailed } from './supabase';
import { getAuthUser } from './auth';
import type { PrivacyPrefs } from './settingsStore';

/**
 * The two privacy answers, on the account rather than on the phone.
 *
 * profiles already had public_profile and show_location, and the row-level
 * security policy on profiles already reads the first of them:
 *
 *   for select using (public_profile or auth.uid() = id)
 *
 * Nothing ever wrote to them. Both sat at their default of true for every
 * account in the database while the switches saved their positions to
 * AsyncStorage, so "Public Profile: off" was a fact about one phone. The
 * filter it drove ran on that phone, against that phone's settings — every
 * other reader ran the same filter against their own, which is to say it did
 * not hide anything from anybody.
 *
 * Fire and forget, like every other write of this kind. A failed push leaves
 * the server on the previous answer, and the next toggle sends both again.
 */
export async function pushPrivacyPrefs(prefs: PrivacyPrefs): Promise<void> {
  const db = supabase();
  const me = getAuthUser();
  if (!db || !me) return;

  const { error } = await db.from('profiles').update({
    public_profile: prefs.publicProfile,
    show_location: prefs.showLocation,
  }).eq('id', me.id);
  writeFailed('save privacy settings', error);
}
