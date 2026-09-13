/**
 * Stripe, on the platforms that have it.
 *
 * @stripe/stripe-react-native reaches into react-native internals that exist
 * only in a native build, so importing it at all fails a web bundle — the
 * error names codegenNativeCommands and mentions nothing about Stripe or about
 * this app, which makes it a puzzle rather than a message. Metro picks this
 * file for iOS and Android and payments.web.tsx for web, so the import never
 * happens where it cannot work.
 */
export { StripeProvider, useStripe } from '@stripe/stripe-react-native';
