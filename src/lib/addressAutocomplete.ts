import { newId } from './ids';

/**
 * Address autocomplete, via Google Places.
 *
 * The cost detail that matters: Google bills autocomplete per *session* when
 * you pass a session token, and per *request* when you do not. Typing "123 West
 * Webster" is a dozen keystrokes; without a token that is a dozen billed
 * lookups plus the details call, for one address. With one it is a single
 * session. Every function here takes a token for that reason, and the caller
 * keeps one token from the first keystroke through to the selection - which is
 * exactly what closes the session and bills it once.
 *
 * Requests are also debounced by the caller, so a fast typist does not generate
 * a request per character even within a session.
 */
const KEY = 'AIzaSyAHZO8wyxyCmx0k8u059QSX7QpsEvZ82sU';

export type AddressSuggestion = {
  placeId: string;
  /** "123 Webster Ave" — the line that goes in the street field. */
  main: string;
  /** "Brooklyn, NY, USA" — shown under it, to tell similar streets apart. */
  secondary: string;
};

export type ResolvedAddress = {
  street: string;
  city: string;
  state: string;
  zip: string;
};

/** A token that ties one round of typing to its final selection. */
export function newSessionToken(): string {
  return newId();
}

/**
 * Suggestions for what has been typed so far. Returns [] for anything too
 * short to be worth a lookup, and on failure - the field stays usable either
 * way, since suggestions only ever add to what someone can type themselves.
 */
export async function suggestAddresses(query: string, sessionToken: string): Promise<AddressSuggestion[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  try {
    const url = 'https://maps.googleapis.com/maps/api/place/autocomplete/json'
      + `?input=${encodeURIComponent(q)}`
      + '&types=address&components=country:us|country:ca'
      + `&sessiontoken=${sessionToken}&key=${KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') return [];
    return (data.predictions || []).slice(0, 5).map((p: any) => ({
      placeId: p.place_id,
      main: p.structured_formatting?.main_text || p.description || '',
      secondary: p.structured_formatting?.secondary_text || '',
    }));
  } catch {
    return [];
  }
}

/**
 * The parts of a chosen address, for filling the form.
 *
 * Passing the same session token as the suggestions closes the session, which
 * is what makes the whole exchange bill as one.
 */
export async function resolveAddress(placeId: string, sessionToken: string): Promise<ResolvedAddress | null> {
  try {
    const url = 'https://maps.googleapis.com/maps/api/place/details/json'
      + `?place_id=${placeId}&fields=address_component`
      + `&sessiontoken=${sessionToken}&key=${KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== 'OK') return null;

    const parts: any[] = data.result?.address_components || [];
    const get = (type: string, short = false) => {
      const c = parts.find(p => p.types?.includes(type));
      return (short ? c?.short_name : c?.long_name) || '';
    };

    // A street address is the number and the road, which Google returns
    // separately; everything else maps to one component each.
    const street = [get('street_number'), get('route')].filter(Boolean).join(' ');
    // Larger cities use 'locality'; many towns only populate the borough or
    // township fields instead, so fall through rather than returning blank.
    const city = get('locality')
      || get('sublocality_level_1')
      || get('postal_town')
      || get('administrative_area_level_3')
      || '';

    return {
      street,
      city,
      state: get('administrative_area_level_1', true),
      zip: get('postal_code'),
    };
  } catch {
    return null;
  }
}
