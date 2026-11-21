/**
 * What a ticket buyer sees on their bank statement.
 *
 * Nothing set this, so a charge landed on somebody's Capital One statement
 * under whatever the FourCircle platform account is called, with no mention
 * of the church or the event. "I don't recognise this charge" is the most
 * common reason a card payment is disputed, and a dispute costs the platform
 * the refund plus Stripe's fee whoever turns out to be right. The cheapest
 * dispute is the one that never gets opened.
 *
 * STRIPE'S RULES, WHICH ARE STRICTER THAN THEY LOOK
 *
 * This is a SUFFIX. Stripe joins it to the platform account's own descriptor
 * to make the finished line: "FOURCIRCLE* WOMENS CONF". The joined result
 * may be at most 22 characters, and the prefix eats some of that before this
 * string is even considered.
 *
 * Stripe rejects the whole payment if the suffix contains < > \ " or ', and
 * rejects it again if there is not at least one letter. A payment refused
 * over an apostrophe in a church's name would be a worse bug than the one
 * this fixes, so everything that is not a letter, a digit or a space is
 * removed rather than escaped, and an empty result means the field is left
 * off altogether.
 */

/** Room left for this once the platform's own prefix and "* " are counted. */
export const DESCRIPTOR_MAX = 10;

/**
 * Turn an event's name into something a bank statement can carry.
 *
 * Returns '' when nothing usable survives, which the caller must treat as
 * "send no suffix at all" rather than "send an empty one".
 */
export function statementSuffix(eventTitle: string | null | undefined): string {
  const cleaned = String(eventTitle ?? '')
    .normalize('NFKD')
    // Accents off rather than dropped whole, so MISION keeps its letters.
    // Written as escapes, not as the characters themselves: those two are
    // invisible combining marks, and this file is deployed by copying it
    // through a browser editor, which is exactly where an invisible
    // character gets normalised away or mangled.
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    // Everything Stripe forbids, and everything else that is not plain text.
    // A hyphen or an ampersand is not on Stripe's banned list, but card
    // networks mangle punctuation differently and a space always survives.
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return '';

  // Cut at a word boundary where one is close to the limit, so "WOMENS
  // CONFERENCE" reads as "WOMENS" rather than "WOMENS CON".
  let out = cleaned.slice(0, DESCRIPTOR_MAX).trim();
  if (cleaned.length > DESCRIPTOR_MAX) {
    const lastSpace = out.lastIndexOf(' ');
    if (lastSpace >= 4) out = out.slice(0, lastSpace);
  }
  out = out.trim();

  // At least one letter, or Stripe refuses the payment. A name that is all
  // digits leaves nothing worth sending.
  return /[A-Z]/.test(out) ? out : '';
}
