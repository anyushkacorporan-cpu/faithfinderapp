import { supabase, hasDatabase } from './supabase';
import { gradientFor } from './constants';
import { findRegion } from './filters';

/**
 * Church lookups against our own database.
 *
 * This is the replacement for the Google Places calls on the Churches tab. The
 * shape it returns is deliberately the one those calls already returned, so no
 * screen, card or detail view had to change — the data source moved, the UI
 * did not.
 *
 * Every function returns `null` to mean "the lookup failed" and `[]` to mean
 * "it worked and there is nothing here". The screen already relies on that
 * distinction: without it, a network failure renders as "0 churches near you",
 * which is a lie about the neighbourhood rather than a report about the app.
 * `null` is also the signal to fall back to Google.
 */

export type ChurchRow = {
  id: string;
  name: string;
  address: string;
  phone: string;
  type: string;
  rating: number;
  count: number;
  hours: string;
  website: string;
  placeId: string;
  gradient: [string, string];
  state: string;
  city?: string;
  photo?: string;
  /** Who to credit for `photo`. Null when it is the church's own upload. */
  photoCredit?: string;
  isClaimed?: boolean;
  distanceKm?: number;
};

/** Database row → the shape the church cards already expect. */
function toChurch(r: any): ChurchRow {
  return {
    id: `db_${r.id}`,
    name: r.name || '',
    address: r.address || [r.city, r.state].filter(Boolean).join(', '),
    phone: r.phone || '',
    // The cards read `type` as the denomination. Imported data has a real one
    // where OSM knew it, which is more than the old 'Non-Denom' placeholder.
    type: r.denomination || 'Church',
    // Google's star ratings have no equivalent here. Zero rather than a made-up
    // number; the card already hides the row when there are no ratings.
    rating: 0,
    count: 0,
    hours: '',
    website: r.website || '',
    // No Places id. Anything that keys off this must tolerate an empty string —
    // the photo lookup does, and returns nothing rather than calling Google.
    placeId: '',
    gradient: gradientFor(r.name || ''),
    state: r.state || '',
    city: r.city || '',
    photo: r.photo_url || undefined,
    photoCredit: r.photo_credit || undefined,
    isClaimed: !!r.is_claimed,
    distanceKm: typeof r.distance_m === 'number' ? r.distance_m / 1000 : undefined,
  };
}

/**
 * Churches within `radiusKm`, nearest first.
 *
 * One request. The distance maths happens in Postgres against a spatial index,
 * so this costs the same whether the table holds two thousand churches or three
 * hundred thousand.
 */
export async function nearbyChurches(
  lat: number,
  lng: number,
  opts: { radiusKm?: number; limit?: number; denomination?: string } = {},
): Promise<ChurchRow[] | null> {
  const db = supabase();
  if (!db) return null;

  try {
    const { data, error } = await db.rpc('nearby_churches', {
      in_lat: lat,
      in_lng: lng,
      radius_m: Math.round((opts.radiusKm ?? 40) * 1000),
      max_rows: opts.limit ?? 40,
      denom: opts.denomination ?? null,
    });
    if (error) return null;
    return (data || []).map(toChurch);
  } catch {
    return null;
  }
}

/** Every church in a state or province, for the region filter. */
export async function churchesInRegion(
  stateCode: string,
  country: 'US' | 'CA' = 'US',
  limit = 60,
): Promise<ChurchRow[] | null> {
  const db = supabase();
  if (!db) return null;

  try {
    const { data, error } = await db
      .from('churches_public')
      .select('id,name,address,city,state,denomination,phone,website,photo_url,photo_credit,is_claimed')
      .eq('country', country)
      .eq('state', stateCode)
      .limit(limit);
    if (error) return null;
    return (data || []).map(toChurch);
  } catch {
    return null;
  }
}

/**
 * Free-text search.
 *
 * People type three different kinds of thing into one box — a church's name, a
 * city, or a state — so this checks what kind of query it is before deciding
 * where to look.
 *
 * A place name is handled first and separately. "New Jersey" matches no
 * church's *name*, so searching names for it returns nothing while the database
 * holds 3,328 New Jersey churches. Recognising it as a region and listing that
 * region is the answer someone typing it actually wants.
 */
export async function searchChurches(query: string, limit = 30): Promise<ChurchRow[] | null> {
  const q = query.trim();
  if (q.length < 2) return [];
  const db = supabase();
  if (!db) return null;

  // "New Jersey", "NJ", "Ontario" — a place, not a church.
  const region = findRegion(q);
  if (region) return churchesInRegion(region.code, region.country, limit);

  try {
    // Name or city, since "Brooklyn" is as likely a query as "Grace Community".
    const { data, error } = await db
      .from('churches_public')
      .select('id,name,address,city,state,denomination,phone,website,photo_url,photo_credit,is_claimed')
      .or(`name.ilike.%${q}%,city.ilike.%${q}%`)
      .limit(limit);
    if (error) return null;
    return (data || []).map(toChurch);
  } catch {
    return null;
  }
}

export { hasDatabase };

/** "0.4 mi" / "12 mi" — miles, since this ships to the US and Canada. */
export function formatDistance(km: number): string {
  const miles = km * 0.621371;
  if (miles < 0.1) return 'here';
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}
