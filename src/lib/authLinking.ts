import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { supabase } from './supabase';
import { setUser } from './userStore';
import { syncProfileAfterSignIn } from './profileSync';

/**
 * Finish sign-in when someone taps a link in an email.
 *
 * Confirmation and password-reset emails send people to a URL rather than
 * back into the app by magic. Supabase verifies the token on its own server
 * and then redirects to the app's scheme with the new session attached. Until
 * something here reads that redirect, tapping the link confirmed the account
 * and then dropped the person on a login screen with no sign that anything had
 * happened — which is most of the way to not working at all.
 *
 * The tokens arrive in the URL fragment (`#access_token=…`), which is the
 * implicit flow supabase-js uses by default. Failures arrive the same way as
 * `error_description`, and an expired link is common enough — people open
 * email hours later — that it needs to say so rather than fail silently.
 */

type Params = Record<string, string>;

/** Read both `?query` and `#fragment` — Supabase uses the fragment, but a
 *  redirect chain can move things into the query, and reading both is free. */
function paramsFrom(url: string): Params {
  const out: Params = {};
  for (const part of [url.split('#')[1], url.split('#')[0].split('?')[1]]) {
    if (!part) continue;
    for (const pair of part.split('&')) {
      const [k, v] = pair.split('=');
      if (k) out[decodeURIComponent(k)] = decodeURIComponent((v || '').replace(/\+/g, ' '));
    }
  }
  return out;
}

export type AuthLinkResult =
  | { kind: 'none' }
  | { kind: 'signedIn'; recovery: boolean }
  | { kind: 'error'; message: string };

export async function handleAuthUrl(url: string): Promise<AuthLinkResult> {
  const p = paramsFrom(url);

  if (p.error_description || p.error) {
    const raw = p.error_description || p.error;
    // The one people actually hit: they opened the email the next morning.
    const expired = /expired|invalid/i.test(raw);
    return {
      kind: 'error',
      message: expired
        ? 'That link has expired. Sign in to send yourself a new one.'
        : raw,
    };
  }

  const access_token = p.access_token;
  const refresh_token = p.refresh_token;
  if (!access_token || !refresh_token) return { kind: 'none' };

  const db = supabase();
  if (!db) return { kind: 'error', message: 'The app is not connected to its server yet.' };

  const { data, error } = await db.auth.setSession({ access_token, refresh_token });
  if (error) return { kind: 'error', message: error.message };

  const u = data.user;
  if (u) {
    setUser({ id: u.id, email: u.email || '' });
    await syncProfileAfterSignIn(u.id);
  }
  return { kind: 'signedIn', recovery: p.type === 'recovery' };
}

/**
 * Watch for auth links for as long as the app is running.
 *
 * Both entry points matter: `getInitialURL` for a link that launched the app
 * from cold, and the listener for one tapped while it was already open. Only
 * handling the second is a bug that reproduces exactly once per install.
 */
export function useAuthDeepLink(onError?: (message: string) => void) {
  useEffect(() => {
    let cancelled = false;

    async function consume(url: string | null) {
      if (!url || cancelled) return;
      const result = await handleAuthUrl(url);
      if (cancelled) return;
      if (result.kind === 'error') { onError?.(result.message); return; }
      if (result.kind === 'signedIn') {
        // A recovery link means they could not remember their password, so
        // asking for the old one would be absurd. Send them somewhere that
        // only asks for a new one.
        router.replace(result.recovery ? '/reset-password' as any : '/(tabs)');
      }
    }

    Linking.getInitialURL().then(consume);
    const sub = Linking.addEventListener('url', e => consume(e.url));
    return () => { cancelled = true; sub.remove(); };
  }, [onError]);
}
