import { GOOGLE_API_KEY, googleHeaders } from './googleConfig';
const API_KEY = GOOGLE_API_KEY;

/**
 * Churches, cities and photos from Google Places.
 *
 * On Places API (New) rather than the maps.googleapis.com endpoints this used
 * to call. Those refuse every request on a project with no billing account —
 * "You must enable Billing on the Google Cloud Project" — so church search,
 * city lookup and photos were all dead, silently, because each function caught
 * its own failure and returned an empty list. The new endpoints answer the same
 * questions with no billing at all.
 *
 * They also enforce the key's iOS restriction through a header that `fetch`
 * does not send by itself; googleHeaders supplies it. Without it every call is
 * refused for being an unrecognised caller, which reads like a bad key.
 */

/** One church, in the shape the screens already read. */
export type PlaceResult = {
  placeId: string;
  name: string;
  address: string;
  rating: number;
  count: number;
};

/** Say what went wrong, rather than returning an empty list and nothing else. */
function failed(what: string, body: any): void {
  const msg = body?.error?.message || body?.error?.status || 'unknown error';
  console.warn(`[google] could not ${what}: ${msg}`);
}

function toResults(places: any[]): PlaceResult[] {
  return places.map(p => ({
    placeId: p.id || '',
    name: p.displayName?.text || '',
    address: p.formattedAddress || p.shortFormattedAddress || '',
    rating: p.rating || 0,
    count: p.userRatingCount || 0,
  }));
}

const SEARCH_FIELDS =
  'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount';

/**
 * Churches matching what was typed.
 *
 * null rather than [] when the lookup itself failed, so a screen can tell a
 * neighbourhood with no churches from a request that never arrived. Returning
 * [] for both made a refused key look like an empty map.
 */
export async function searchChurchText(query: string, limit = 20): Promise<PlaceResult[] | null> {
  if (!query.trim()) return [];
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: googleHeaders({
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': SEARCH_FIELDS,
      }),
      body: JSON.stringify({ textQuery: query, includedType: 'church', maxResultCount: limit }),
    });
    const data = await res.json();
    if (!res.ok) { failed('search for churches', data); return null; }
    return toResults(data.places || []);
  } catch (e) {
    failed('search for churches', { error: { message: (e as Error)?.message } });
    return null;
  }
}

/** Churches within 50km. null on a failed lookup, for the same reason. */
export async function searchChurchNearby(lat: number, lng: number, limit = 20): Promise<PlaceResult[] | null> {
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: googleHeaders({
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': SEARCH_FIELDS + ',places.shortFormattedAddress',
      }),
      body: JSON.stringify({
        includedTypes: ['church'],
        maxResultCount: limit,
        locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius: 50000.0 } },
      }),
    });
    const data = await res.json();
    if (!res.ok) { failed('find nearby churches', data); return null; }
    return toResults(data.places || []);
  } catch (e) {
    failed('find nearby churches', { error: { message: (e as Error)?.message } });
    return null;
  }
}

/**
 * A church's photo — empty until the project has a billing account.
 *
 * Places returns the fields you are entitled to and omits the rest rather than
 * refusing the call, so a photo request without billing comes back as a place
 * with no photos at all. Checked against St Patrick's Cathedral, which is not
 * short of pictures.
 *
 * Kept as a function rather than deleted: the callers are right to ask, and the
 * day billing exists this starts answering.
 */
export async function fetchChurchPhoto(placeId: string): Promise<string> {
  if (!placeId) return '';
  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
      { headers: googleHeaders({ 'X-Goog-Api-Key': API_KEY, 'X-Goog-FieldMask': 'photos' }) },
    );
    const data = await res.json();
    if (!res.ok) { failed('load a church photo', data); return ''; }
    const name = data.photos?.[0]?.name;
    if (!name) return '';
    return `https://places.googleapis.com/v1/${name}/media?maxWidthPx=800&key=${API_KEY}`;
  } catch { return ''; }
}

export const PLACE_IDS = {
  'Church of Saint Rocco': 'ChIJ2TZZXK-FwokRVPAZkU8sQQk',
  'Glen Cove Christian Church': 'ChIJ06Harw-FwokRNEnTcZAg1BE',
  "St. Patrick's Church": 'ChIJTyGtZqeFwokRbU5xJYHfw_8',
  "St Paul's Episcopal Church": 'ChIJfzZHVAmFwokRLW9YQHi6jjE',
  'Calvary AME Church': 'ChIJs0R463OFwokRc7KSduspyiY',
  'First Baptist Church': 'ChIJmQZn3Z-FwokRXGasLIM4dLc',
};

export async function autocompleteCity(query: string): Promise<{ description: string; placeId: string }[]> {
  if (!query.trim()) return [];
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: googleHeaders({ 'Content-Type': 'application/json', 'X-Goog-Api-Key': API_KEY }),
      body: JSON.stringify({ input: query, includedPrimaryTypes: ['locality'] }),
    });
    const data = await res.json();
    if (!res.ok) { failed('look up a city', data); return []; }
    return (data.suggestions || [])
      .map((s: any) => s.placePrediction)
      .filter(Boolean)
      .map((p: any) => ({ description: p.text?.text || '', placeId: p.placeId }));
  } catch { return []; }
}

/** Kept for callers that still expect the old name. */
export const searchChurches = searchChurchText;

/**
 * Everything the church page shows, in the field names it already reads.
 *
 * Mapped back to the legacy shape on purpose. The screen reads
 * `formatted_phone_number` and `opening_hours.weekday_text` in a dozen places;
 * renaming those to match Places (New) would be a larger edit than the fix, and
 * the old names describe the same facts perfectly well.
 *
 * `reviews` and `photos` come back empty until the project has billing —
 * Google withholds fields you are not entitled to rather than refusing the
 * call, so they simply are not in the response. Everything else on this page —
 * address, phone, website, rating, hours, the summary — is free.
 */
export async function fetchChurchDetails(placeId: string): Promise<any | null> {
  if (!placeId) return null;
  const fields = [
    'displayName', 'formattedAddress', 'nationalPhoneNumber', 'websiteUri',
    'rating', 'userRatingCount', 'regularOpeningHours', 'editorialSummary',
    'reviews', 'photos',
  ].join(',');
  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
      { headers: googleHeaders({ 'X-Goog-Api-Key': API_KEY, 'X-Goog-FieldMask': fields }) },
    );
    const data = await res.json();
    if (!res.ok) { failed('load church details', data); return null; }

    return {
      name: data.displayName?.text || '',
      formatted_address: data.formattedAddress || '',
      formatted_phone_number: data.nationalPhoneNumber || '',
      website: data.websiteUri || '',
      rating: data.rating || 0,
      user_ratings_total: data.userRatingCount || 0,
      opening_hours: { weekday_text: data.regularOpeningHours?.weekdayDescriptions || [] },
      editorial_summary: { overview: data.editorialSummary?.text || '' },
      reviews: (data.reviews || []).map((r: any) => ({
        author_name: r.authorAttribution?.displayName || '',
        profile_photo_url: r.authorAttribution?.photoUri || '',
        rating: r.rating || 0,
        text: r.text?.text || '',
        relative_time_description: r.relativePublishTimeDescription || '',
      })),
      // The media URL is whole here, where the legacy API gave a reference to
      // build one from. Kept under the old key so the screen's own photoUrl
      // can stay a pass-through.
      photos: (data.photos || []).map((p: any) => ({
        photo_reference: `https://places.googleapis.com/v1/${p.name}/media?maxWidthPx=800&key=${API_KEY}`,
      })),
    };
  } catch (e) {
    failed('load church details', { error: { message: (e as Error)?.message } });
    return null;
  }
}
