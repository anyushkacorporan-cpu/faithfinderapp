import { supabase } from './supabase';

/**
 * An organiser's own Stripe account, through the server.
 *
 * Everything here needs the Stripe secret key, so nothing here talks to Stripe
 * — it talks to the `connect` edge function, which does.
 *
 * The account belongs to the organiser, not to FaithFinder. They sign up with
 * Stripe directly, ticket money lands in their account rather than ours, and
 * Stripe handles their tax forms. We take a fee from each sale and never hold
 * the rest.
 */

export type PayoutStatus = {
  /** Whether a Stripe account exists at all. */
  connected: boolean;
  /** The one that gates money: Stripe will accept charges for this account. */
  chargesEnabled: boolean;
  /** Stripe will move the money on to their bank. */
  payoutsEnabled: boolean;
  /** They finished the form — which is not the same as being approved. */
  detailsSubmitted: boolean;
  /** What Stripe is still waiting for, in Stripe's own words. */
  requirementsDue: string[];
  /** Stripe could not be reached, so this is the last known answer. */
  stale?: boolean;
};

export const NO_PAYOUT_ACCOUNT: PayoutStatus = {
  connected: false,
  chargesEnabled: false,
  payoutsEnabled: false,
  detailsSubmitted: false,
  requirementsDue: [],
};

async function call(body: Record<string, unknown>): Promise<{ data?: any; error?: string }> {
  const db = supabase();
  if (!db) return { error: 'The app is not connected to its server yet.' };

  const { data, error } = await db.functions.invoke('connect', { body });

  if (error) {
    // Same reasoning as paymentsApi: the function puts a readable message in
    // the body for the failures people actually hit, so reach for that before
    // falling back to something generic.
    const fromBody = (data as any)?.error;
    if (fromBody) return { error: String(fromBody) };
    try {
      const parsed = await (error as any).context?.json?.();
      if (parsed?.error) return { error: String(parsed.error) };
    } catch { /* fall through to the generic message */ }
    return { error: 'Could not reach the payouts service. Please try again.' };
  }

  if (data?.error && !data?.stale) return { error: String(data.error) };
  return { data };
}

/**
 * A one-time link into Stripe's onboarding form.
 *
 * Fetched fresh each time rather than stored: Stripe expires these quickly and
 * single-use, which is the point of them.
 */
export async function startPayoutSetup(): Promise<{ url?: string; error?: string }> {
  const { data, error } = await call({ action: 'link' });
  if (error) return { error };
  if (!data?.url) return { error: 'Stripe did not return a setup link.' };
  return { url: String(data.url) };
}

/**
 * Where the account stands, asked of Stripe rather than remembered.
 *
 * Worth re-asking whenever the screen appears: approval continues after the
 * form is submitted and can be withdrawn later, so an answer from last week is
 * not an answer.
 */
export async function fetchPayoutStatus(): Promise<{ status: PayoutStatus; error?: string }> {
  const { data, error } = await call({ action: 'status' });
  if (error) return { status: NO_PAYOUT_ACCOUNT, error };

  return {
    status: {
      connected: data?.connected === true,
      chargesEnabled: data?.charges_enabled === true,
      payoutsEnabled: data?.payouts_enabled === true,
      detailsSubmitted: data?.details_submitted === true,
      requirementsDue: Array.isArray(data?.requirements_due) ? data.requirements_due : [],
      stale: data?.stale === true,
    },
    // A stale answer is worth showing with its reason attached, rather than
    // being reported as a failure that leaves the screen blank.
    error: data?.stale ? String(data.error || 'Could not reach Stripe just now.') : undefined,
  };
}

/** Stripe's own words for what it is waiting on, in plainer ones. */
export function describeRequirement(key: string): string {
  const plain: Record<string, string> = {
    'business_profile.url': 'a website or social media page for the church',
    'business_profile.mcc': 'what kind of organisation this is',
    'business_type': 'whether this is an individual or an organisation',
    'company.tax_id': 'the organisation’s tax ID (EIN)',
    'external_account': 'a bank account to be paid into',
    'individual.verification.document': 'a photo of your ID',
    'individual.id_number': 'your social security number',
    'individual.address.line1': 'your address',
    'individual.dob.day': 'your date of birth',
    'tos_acceptance.date': 'accepting Stripe’s terms',
  };
  if (plain[key]) return plain[key];
  // Unknown keys still beat showing nothing, but Stripe's dotted names read
  // like code, so soften them rather than printing them raw.
  return key.replace(/_/g, ' ').replace(/\./g, ' → ');
}
