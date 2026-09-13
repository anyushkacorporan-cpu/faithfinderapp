import { ReactNode } from 'react';

/**
 * Stripe, on a platform that does not have it.
 *
 * Not a stub standing in for something that should work: this app is iOS only,
 * and the web bundle exists so the project can be built and checked, not so
 * anyone can buy a ticket in a browser. The provider passes its children
 * through and the hook answers honestly.
 *
 * Honestly matters. Returning functions that quietly do nothing would let a
 * checkout screen believe it had taken a payment.
 */
export function StripeProvider({ children }: { children: ReactNode; publishableKey?: string; merchantIdentifier?: string }) {
  return <>{children}</>;
}

export function useStripe() {
  return {
    initPaymentSheet: async () => ({ error: { message: 'Payments are not available on web.' } }),
    presentPaymentSheet: async () => ({ error: { message: 'Payments are not available on web.' } }),
  };
}
