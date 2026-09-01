import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The app's connection to its own database.
 *
 * Uses the *anon* key, which is meant to sit in a shipped app — unlike the
 * Google key, this one is safe there by design. What protects the data is
 * row-level security in Postgres, not the secrecy of the key: the schema grants
 * anon read access to the church directory and nothing else, so a key lifted
 * out of the bundle can read a public church list and do nothing more.
 *
 * The service_role key is the opposite and must never appear here. It bypasses
 * every policy; it belongs only in the import scripts you run yourself.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Whether the app has been given a database to talk to.
 *
 * Deliberately a question the rest of the app can ask, rather than a crash on
 * startup. With no credentials the church screens fall back to Google exactly
 * as before, so a build without them is degraded, not broken — which is what
 * lets this ship before every environment has been set up.
 */
export function hasDatabase(): boolean {
  return !!url && !!anonKey;
}

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient | null {
  if (!hasDatabase()) return null;
  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        // The session lives in AsyncStorage so signing in survives closing the
        // app — the whole point of accounts over a device-local identity.
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        // There is no browser here to read a token out of a redirect URL.
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
