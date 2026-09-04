/**
 * Stripe, for the app side.
 *
 * This file used to hold a hardcoded key — and a placeholder one at that,
 * `pk_test_51234567890abcdef…`, which is not a real key and would have failed
 * the first time anyone tried to pay. Reading it from the environment means
 * the same build works in test and live by changing one line of .env.local
 * rather than editing source and committing a key.
 *
 * Only the *publishable* key belongs here. It is designed to sit in a shipped
 * app: it can start a payment and nothing else. The secret key lives in
 * Supabase (see PAYMENTS.md) and must never appear in this repository.
 */

export const STRIPE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

/**
 * The Apple Pay merchant id, from the Apple Developer account.
 *
 * Apple Pay needs a paid membership and a merchant id registered against it,
 * so this stays a placeholder until that exists. Cards work regardless —
 * Stripe's sheet simply does not offer Apple Pay without it.
 */
export const STRIPE_MERCHANT_ID =
  process.env.EXPO_PUBLIC_APPLE_MERCHANT_ID || 'merchant.com.faithfinder';

/** Whether payments can be taken at all in this build. */
export function hasStripe(): boolean {
  return STRIPE_PUBLISHABLE_KEY.startsWith('pk_');
}

// Test cards, while EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY is a pk_test_ key:
//   success    4242 4242 4242 4242
//   declined   4000 0000 0000 0002
//   3D Secure  4000 0025 0000 3155
// Any future expiry, any CVC, any postcode.
