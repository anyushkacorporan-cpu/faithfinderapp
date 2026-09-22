/**
 * Stripe.
 *
 * This used to be half of a pair. @stripe/stripe-react-native reaches into
 * react-native internals that exist only in a native build, so importing it at
 * all failed a web bundle, and payments.web.tsx sat beside this file to keep
 * that from happening — Metro picked one or the other by platform.
 *
 * The app is iOS only and web has been taken out of app.json, so there is no
 * longer a platform this import cannot serve. The shim is gone with it.
 */
export { StripeProvider, useStripe } from '@stripe/stripe-react-native';
