import { supabase } from './supabase';
import { getAuthUser } from './auth';
import { uploadImage } from './postsApi';
import type { AppEvent } from './eventsStore';
import type { Ticket } from './ticketStore';

/**
 * Events and tickets, on the server.
 *
 * An event created by a church existed only on the organiser's phone, so
 * nobody could attend one. A ticket existed only on the buyer's, so a lost
 * phone lost the ticket and the organiser had no list to check anyone against
 * at the door.
 */

function eventToRow(e: AppEvent, organizerId: string) {
  return {
    id: e.id,
    organizer_id: organizerId,
    status: e.status,
    title: e.title,
    description: e.description ?? '',
    summary: e.summary ?? '',
    organizer: e.organizer ?? '',
    date: e.date ?? null,
    time: e.time ?? null,
    end_time: e.endTime ?? null,
    location: e.location ?? null,
    city: e.city ?? null,
    state: e.state ?? null,
    zip: e.zip ?? null,
    type: e.type ?? null,
    price: e.price ?? null,
    is_paid: !!e.isPaid,
    ticket_price: e.ticketPrice ?? 0,
    platform_fee: e.platformFee ?? 0,
    creator_payout: e.creatorPayout ?? 0,
    currency: e.currency ?? 'USD',
    capacity: e.capacity ?? 0,
    attending: e.attending ?? 0,
    banner_image: e.bannerImage ?? null,
    venue_layout_image: e.venueLayoutImage ?? null,
    banner_color: e.bannerColor ?? null,
    speakers: e.speakers ?? [],
    agenda: e.agenda ?? [],
    experience: e.experience ?? [],
    audience: e.audience ?? null,
    venue_type: e.venueType ?? 'in-person',
    venue_name: e.venueName ?? null,
    venue_address: e.venueAddress ?? null,
    venue_instructions: e.venueInstructions ?? null,
    parking: e.parking ?? null,
    live_stream_url: e.liveStreamUrl ?? null,
    meeting_url: e.meetingUrl ?? null,
    platform: e.platform ?? null,
    has_live_stream: !!e.hasLiveStream,
    recurrence: e.recurrence ?? 'once',
    notes: e.notes ?? null,
    created_at: new Date(e.createdAt || Date.now()).toISOString(),
    // tickets_sold is owned by the capacity trigger, not by the app — sending
    // it would let a stale client reset the count that gates the last seat.
  };
}

function rowToEvent(r: Record<string, any>): AppEvent {
  return {
    id: r.id,
    status: r.status,
    title: r.title,
    description: r.description || '',
    summary: r.summary || '',
    organizer: r.organizer || '',
    date: r.date || '',
    time: r.time || '',
    endTime: r.end_time || '',
    location: r.location || '',
    city: r.city || '',
    state: r.state || '',
    zip: r.zip || '',
    type: r.type || '',
    price: r.price || '',
    isPaid: r.is_paid,
    ticketPrice: Number(r.ticket_price) || 0,
    platformFee: Number(r.platform_fee) || 0,
    creatorPayout: Number(r.creator_payout) || 0,
    ticketsSold: r.tickets_sold || 0,
    capacity: r.capacity || 0,
    currency: r.currency,
    bannerImage: r.banner_image || undefined,
    venueLayoutImage: r.venue_layout_image || undefined,
    bannerColor: r.banner_color || ['#667eea', '#764ba2'],
    speakers: r.speakers || [],
    agenda: r.agenda || [],
    experience: r.experience || [],
    audience: r.audience || '',
    venueType: r.venue_type || 'in-person',
    venueName: r.venue_name || '',
    venueAddress: r.venue_address || '',
    venueInstructions: r.venue_instructions || '',
    parking: r.parking || '',
    liveStreamUrl: r.live_stream_url || '',
    meetingUrl: r.meeting_url || '',
    platform: r.platform || '',
    hasLiveStream: r.has_live_stream,
    recurrence: r.recurrence || 'once',
    notes: r.notes || '',
    attending: r.attending || 0,
    createdAt: new Date(r.created_at).getTime(),
  } as AppEvent;
}

export async function fetchEvents(limit = 200): Promise<AppEvent[] | null> {
  const db = supabase();
  if (!db) return null;
  const { data, error } = await db
    .from('events').select('*').order('created_at', { ascending: false }).limit(limit);
  if (error || !data) return null;
  return data.map(rowToEvent);
}

export async function createEvent(e: AppEvent): Promise<boolean> {
  const db = supabase();
  const me = getAuthUser();
  if (!db || !me) return false;

  const row = eventToRow(e, me.id);
  // Banners are picked from the organiser's camera roll, so they are paths on
  // one phone until they are not — the same failure post images had.
  if (row.banner_image) row.banner_image = await uploadImage(row.banner_image, 'post-images');
  if (row.venue_layout_image) row.venue_layout_image = await uploadImage(row.venue_layout_image, 'post-images');

  const { error } = await db.from('events').insert(row);
  return !error;
}

export async function updateEventRemote(e: AppEvent): Promise<void> {
  const db = supabase();
  const me = getAuthUser();
  if (!db || !me) return;
  const row = eventToRow(e, me.id);
  if (row.banner_image) row.banner_image = await uploadImage(row.banner_image, 'post-images');
  await db.from('events').update(row).eq('id', e.id);
}

export async function deleteEventRemote(id: string): Promise<void> {
  const db = supabase();
  if (!db || !getAuthUser()) return;
  await db.from('events').delete().eq('id', id);
}

// ── Tickets ────────────────────────────────────────────────────────────────

export async function fetchTickets(): Promise<Ticket[] | null> {
  const db = supabase();
  const me = getAuthUser();
  if (!db || !me) return null;

  const { data, error } = await db
    .from('tickets').select('*').eq('buyer_id', me.id).order('purchased_at', { ascending: false });
  if (error || !data) return null;

  return data.map(r => ({
    id: r.id,
    eventId: r.event_id,
    eventTitle: r.event_title || '',
    eventDate: r.event_date || '',
    eventLocation: r.event_location || '',
    eventType: r.event_type || '',
    email: r.email || undefined,
    quantity: r.quantity,
    pricePerTicket: Number(r.price_per_ticket) || 0,
    totalPaid: Number(r.total_paid) || 0,
    platformFee: Number(r.platform_fee) || 0,
    purchasedAt: new Date(r.purchased_at).getTime(),
    ticketIds: r.ticket_codes || [],
  }));
}

/**
 * Record a purchase.
 *
 * Returns an error message rather than a boolean, because the one failure
 * that matters here is the last seat going to someone else a moment earlier —
 * and the buyer needs to be told that, not shown a ticket that does not exist.
 */
export async function createTicket(t: Ticket): Promise<string | null> {
  const db = supabase();
  const me = getAuthUser();
  // No database configured is a degraded build, not a refusal — the ticket
  // still exists on the device, exactly as it did before any of this.
  if (!db) return null;
  if (!me) return 'You need to be signed in to buy a ticket.';

  const { error } = await db.from('tickets').insert({
    id: t.id,
    event_id: t.eventId,
    buyer_id: me.id,
    event_title: t.eventTitle,
    event_date: t.eventDate,
    event_location: t.eventLocation,
    event_type: t.eventType,
    email: t.email ?? null,
    quantity: t.quantity,
    price_per_ticket: t.pricePerTicket,
    total_paid: t.totalPaid,
    platform_fee: t.platformFee,
    ticket_codes: t.ticketIds,
    purchased_at: new Date(t.purchasedAt).toISOString(),
  });

  if (!error) return null;
  // The capacity trigger raises with the seats remaining in the message, which
  // is more useful to the buyer than anything this side could word.
  return /ticket\(s\) left/i.test(error.message)
    ? error.message
    : 'Could not complete the purchase. Please try again.';
}
