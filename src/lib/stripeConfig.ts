// ─────────────────────────────────────────────
// STRIPE CONFIGURATION
// Test mode — swap these keys when going live
// Get your keys at: https://dashboard.stripe.com
// ─────────────────────────────────────────────

export const STRIPE_PUBLISHABLE_KEY = 'pk_test_51234567890abcdefghijklmnopqrstuvwxyz';
// Replace with your real key: pk_test_... or pk_live_...

export const STRIPE_MERCHANT_ID = 'merchant.com.faithfinder';
// Replace with your Apple Pay merchant ID from Apple Developer account

// Test card numbers (use these while testing):
// ✅ Success:     4242 4242 4242 4242
// ❌ Declined:    4000 0000 0000 0002
// 🔐 3D Secure:  4000 0025 0000 3155
// Expiry: any future date | CVV: any 3 digits | ZIP: any 5 digits
