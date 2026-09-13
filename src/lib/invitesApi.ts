import { supabase, writeFailed } from './supabase';
import { getAuthUser } from './auth';

/**
 * Event invitations.
 *
 * The invite sheet used to end at the share sheet: you picked people from a
 * list of accounts and then sent a text message about them. For someone with no
 * account that is still the only thing that works, and it still happens — but
 * someone who is standing in the app deserves to hear about it in the app.
 *
 * Only the row is written here. The notification is made beside it by a trigger
 * (17_more_notifications.sql), the same as every other kind, so an invitation
 * cannot be sent without one and cannot be sent quietly.
 */

/** Ids that name an account. The people list also holds seeded, id-less rows. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isAccountId(id: string | undefined): boolean {
  return !!id && UUID.test(id);
}

/**
 * Invite people to an event. Returns how many reached an account.
 *
 * One insert per person, not one batch.
 *
 * The people list is the directory this device has built from everything it
 * has seen, and not everyone in it is an account on this server: seeded demo
 * profiles are in there too, with ids that look exactly like real ones because
 * `newId()` issues real uuids. An invitation addressed to one of those is
 * refused by the foreign key — and in a single statement it would take every
 * other invitation in the batch down with it. That is the shape of the bug
 * that made ticket purchases look sold out (see 14_fix_like_counts.sql).
 *
 * Inviting someone twice is not an error and does not tell them twice — the
 * primary key sees to the first and the unique index on the notification sees
 * to the second.
 */
export async function sendEventInvites(
  eventId: string, eventTitle: string, inviteeIds: string[],
): Promise<number> {
  const db = supabase();
  const me = getAuthUser();
  const targets = inviteeIds.filter(id => isAccountId(id) && id !== me?.id);
  if (!db || !me || !eventId || targets.length === 0) return 0;

  const results = await Promise.all(targets.map(async invitee_id => {
    const { error } = await db.from('event_invites').upsert(
      { event_id: eventId, event_title: eventTitle, inviter_id: me.id, invitee_id },
      { onConflict: 'event_id,inviter_id,invitee_id', ignoreDuplicates: true },
    );
    return !error;
  }));

  const sent = results.filter(Boolean).length;
  // Said once, and only about the ones that did not land. Someone who invited
  // four people and reached three should not be told four times, and should not
  // be told nothing either.
  if (sent < targets.length) {
    console.warn(`[server] ${targets.length - sent} of ${targets.length} invitations `
      + 'did not save: those people are not accounts on this server');
  }
  return sent;
}
