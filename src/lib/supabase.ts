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
 * Whether the credentials we were handed are actually credentials.
 *
 * This exists because of a real failure: a shell command was accidentally
 * appended into .env.local as the value of the anon key. It was a non-empty
 * string, so a plain `!!anonKey` check passed, the client was built, and every
 * call to the database — auth and churches alike — failed at the server. The
 * app reported "email and password do not match" for a sign-up that had never
 * reached Supabase, and church search quietly fell back to Google for days.
 *
 * A non-empty string is not a credential. Checking the shape turns a silent
 * wrong answer into a loud, findable one.
 */
function credentialProblem(): string | null {
  if (!url && !anonKey) return null;              // simply not configured yet
  if (!url) return 'EXPO_PUBLIC_SUPABASE_URL is missing.';
  if (!anonKey) return 'EXPO_PUBLIC_SUPABASE_ANON_KEY is missing.';
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)\/?$/i.test(url.trim())) {
    return `EXPO_PUBLIC_SUPABASE_URL does not look like a Supabase URL: "${url}"`;
  }
  // Keys are opaque, but every form of them — the legacy eyJ… JWT and the
  // newer sb_publishable_… — is one long run of non-whitespace. Whitespace
  // means something other than a key ended up in the variable.
  if (/\s/.test(anonKey) || anonKey.length < 20) {
    return 'EXPO_PUBLIC_SUPABASE_ANON_KEY does not look like a key. Check .env.local for a stray line break or a pasted command.';
  }
  return null;
}

/**
 * Whether the app has been given a working database to talk to.
 *
 * Deliberately a question the rest of the app can ask, rather than a crash on
 * startup. With no credentials the church screens fall back to Google exactly
 * as before, so a build without them is degraded, not broken — which is what
 * lets this ship before every environment has been set up.
 */
export function hasDatabase(): boolean {
  return !!url && !!anonKey && !credentialProblem();
}

/** The reason the database is unavailable, for screens that should say so. */
export function databaseProblem(): string | null {
  return credentialProblem();
}

// Say it once, loudly, at startup. Malformed credentials are a setup mistake,
// and the cost of not noticing is every symptom being blamed on something else.
const problem = credentialProblem();
if (problem) console.warn(`[supabase] ${problem}`);

/**
 * What this build is actually pointed at, short enough to put on screen.
 *
 * Temporary, for diagnosing a sign-up that fails on a phone while the same
 * credentials work from Node. Everything else we can inspect says it should
 * work, so the remaining unknown is what the app itself is holding.
 */
export function describeConnection(): string {
  const p = credentialProblem();
  if (p) return `BROKEN — ${p}`;
  if (!url && !anonKey) return 'NOT CONFIGURED — env vars are empty in this bundle';
  const project = url.replace(/^https:\/\//, '').split('.')[0];
  return `${project} · key ${anonKey.slice(0, 8)}…${anonKey.slice(-4)}`;
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
