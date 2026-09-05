import { GOOGLE_API_KEY } from './googleConfig';
const API_KEY = GOOGLE_API_KEY;

export async function fetchChurchPhoto(placeId: string): Promise<string> {
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&key=${API_KEY}`
    );
    const data = await res.json();
    const photoRef = data?.result?.photos?.[0]?.photo_reference;
    if (!photoRef) return '';
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoRef}&key=${API_KEY}`;
  } catch { return ''; }
}

export async function searchChurches(query: string, location: string): Promise<any[]> {
  try {
    const q = encodeURIComponent(`${query} church ${location}`);
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${q}&type=church&key=${API_KEY}`
    );
    const data = await res.json();
    return data.results || [];
  } catch { return []; }
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
    const q = encodeURIComponent(query);
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${q}&types=(cities)&key=${API_KEY}`
    );
    const data = await res.json();
    if (!data.predictions) return [];
    return data.predictions.map((p: any) => ({ description: p.description, placeId: p.place_id }));
  } catch { return []; }
}
