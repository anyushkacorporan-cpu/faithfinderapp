import { useEffect, useState } from 'react';
import { supabase, hasDatabase } from './supabase';

/**
 * Accounts.
 *
 * Before this, `login.tsx` took any email and any six characters, called
 * setUser({ email }) and navigated. There was no account and nothing was
 * checked — an "account" was a name written on the device, which is why
 * blocking someone, deleting your account, or reinstalling the app all failed
 * to mean anything.
 *
 * Supabase owns the credential half: password hashing, sessions, refresh,
 * resets. This file is the app's side of that, and the store that lets screens
 * ask who is signed in.
 */

export type AuthUser = { id: string; email: string };

let current: AuthUser | null = null;
let ready = false;
const listeners: (() => void)[] = [];

function notify() {
  // Copy first: a listener that unsubscribes while we iterate would otherwise
  // shift the array under the loop and skip the next one.
  for (const l of [...listeners]) l();
}

function setCurrent(u: AuthUser | null) {
  current = u;
  notify();
}

// Restore whatever session is on disk, then follow it. Supabase fires this
// immediately with the stored session and again on every sign-in, sign-out and
// token refresh, so nothing else has to poll.
const db = supabase();
if (db) {
  db.auth.getSession().then(({ data }) => {
    const u = data.session?.user;
    current = u ? { id: u.id, email: u.email || '' } : null;
    ready = true;
    notify();
  });

  db.auth.onAuthStateChange((_event, session) => {
    const u = session?.user;
    setCurrent(u ? { id: u.id, email: u.email || '' } : null);
  });
} else {
  ready = true;
}

/** Who is signed in, or null. Undefined-safe before the session has loaded. */
export function getAuthUser(): AuthUser | null {
  return current;
}

/** Whether the stored session has been read yet — false only very briefly. */
export function isAuthReady(): boolean {
  return ready;
}

export function useAuth(): { user: AuthUser | null; ready: boolean } {
  const [, setTick] = useState(0);
  useEffect(() => {
    const l = () => setTick(t => t + 1);
    listeners.push(l);
    return () => { listeners.splice(listeners.indexOf(l), 1); };
  }, []);
  return { user: current, ready };
}

/** Human-readable failure, or null on success. */
export type AuthError = string | null;

/**
 * Supabase's messages are written for developers. These are the ones people
 * actually hit, said plainly.
 */
function readable(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return 'That email and password do not match.';
  if (m.includes('already registered')) return 'An account already exists for that email.';
  if (m.includes('password') && m.includes('6')) return 'Password must be at least 6 characters.';
  if (m.includes('email') && m.includes('valid')) return 'Please enter a valid email address.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Too many attempts. Try again in a few minutes.';
  if (m.includes('network') || m.includes('fetch')) return 'Could not reach the server. Check your connection.';
  return message;
}

export async function signUp(
  email: string,
  password: string,
  meta: { accountType?: 'personal' | 'church'; firstName?: string; lastName?: string; churchName?: string } = {},
): Promise<AuthError> {
  const db = supabase();
  if (!db) return 'The app is not connected to its server yet.';

  const { error } = await db.auth.signUp({
    email: email.trim(),
    password,
    options: {
      // Read by the database trigger, which creates the profile row. Sending
      // it here means the profile is right from the first moment rather than
      // being filled in by a second call that might not happen.
      data: {
        account_type: meta.accountType || 'personal',
        first_name: meta.firstName || null,
        last_name: meta.lastName || null,
        church_name: meta.churchName || null,
      },
    },
  });
  return error ? readable(error.message) : null;
}

export async function signIn(email: string, password: string): Promise<AuthError> {
  const db = supabase();
  if (!db) return 'The app is not connected to its server yet.';
  const { error } = await db.auth.signInWithPassword({ email: email.trim(), password });
  return error ? readable(error.message) : null;
}

export async function signOut(): Promise<void> {
  await supabase()?.auth.signOut();
}

export async function sendPasswordReset(email: string): Promise<AuthError> {
  const db = supabase();
  if (!db) return 'The app is not connected to its server yet.';
  const { error } = await db.auth.resetPasswordForEmail(email.trim());
  return error ? readable(error.message) : null;
}

/**
 * Delete this account for real.
 *
 * Calls a database function rather than deleting rows from the app: removing
 * an auth user needs privileges no app key has, and should. The function
 * checks the caller is signed in and deletes only their own account, which
 * cascades to their profile.
 */
export async function deleteAccount(): Promise<AuthError> {
  const db = supabase();
  if (!db) return 'The app is not connected to its server yet.';
  const { error } = await db.rpc('delete_own_account');
  if (error) return readable(error.message);
  await db.auth.signOut();
  return null;
}

export { hasDatabase };
