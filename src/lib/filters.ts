export const DENOMINATIONS = [
  'All',
  'Non-Denominational',
  'Catholic',
  'Baptist',
  'Southern Baptist',
  'Methodist',
  'United Methodist',
  'Lutheran',
  'Presbyterian',
  'Episcopal',
  'Anglican',
  'Pentecostal',
  'Assemblies of God',
  'Charismatic',
  'Apostolic',
  'AME',
  'AME Zion',
  'Church of God',
  'Church of Christ',
  'Evangelical',
  'Reformed',
  'Calvinist',
  'Adventist',
  'Seventh-day Adventist',
  'Orthodox',
  'Greek Orthodox',
  'Nazarene',
  'Wesleyan',
  'Mennonite',
  'Quaker',
  'Moravian',
  'Salvation Army',
  'Christian Science',
  'Disciples of Christ',
  'Foursquare',
  'Vineyard',
  'Brethren',
  'Covenant',
  'Alliance',
];

/**
 * Where the app operates.
 *
 * A region is a US state or a Canadian province — the two countries the app is
 * released in, and the two whose addresses the autocomplete accepts. See the
 * `components=country` restriction in `addressAutocomplete.ts`; these two lists
 * have to move together, because a church that can enter an address in a place
 * this file does not know saves with a blank region and then never appears in
 * anyone's nearby list.
 *
 * The country is carried on the region rather than inferred from the code. No
 * US and Canadian code collides today, but the place search has to ask Google
 * for "Ontario, Canada" rather than hope it guesses, and a third country would
 * bring collisions with it (Australia's SA and WA, for two).
 */
export type Country = 'US' | 'CA';
export type Region = { code: string; name: string; country: Country };

/** For the place-search query, where the bare code is too ambiguous to send. */
export const COUNTRY_NAME: Record<Country, string> = { US: 'USA', CA: 'Canada' };

export const US_STATES: Region[] = [
  { code: 'AL', name: 'Alabama', country: 'US' },
  { code: 'AK', name: 'Alaska', country: 'US' },
  { code: 'AZ', name: 'Arizona', country: 'US' },
  { code: 'AR', name: 'Arkansas', country: 'US' },
  { code: 'CA', name: 'California', country: 'US' },
  { code: 'CO', name: 'Colorado', country: 'US' },
  { code: 'CT', name: 'Connecticut', country: 'US' },
  { code: 'DE', name: 'Delaware', country: 'US' },
  { code: 'DC', name: 'District of Columbia', country: 'US' },
  { code: 'FL', name: 'Florida', country: 'US' },
  { code: 'GA', name: 'Georgia', country: 'US' },
  { code: 'HI', name: 'Hawaii', country: 'US' },
  { code: 'ID', name: 'Idaho', country: 'US' },
  { code: 'IL', name: 'Illinois', country: 'US' },
  { code: 'IN', name: 'Indiana', country: 'US' },
  { code: 'IA', name: 'Iowa', country: 'US' },
  { code: 'KS', name: 'Kansas', country: 'US' },
  { code: 'KY', name: 'Kentucky', country: 'US' },
  { code: 'LA', name: 'Louisiana', country: 'US' },
  { code: 'ME', name: 'Maine', country: 'US' },
  { code: 'MD', name: 'Maryland', country: 'US' },
  { code: 'MA', name: 'Massachusetts', country: 'US' },
  { code: 'MI', name: 'Michigan', country: 'US' },
  { code: 'MN', name: 'Minnesota', country: 'US' },
  { code: 'MS', name: 'Mississippi', country: 'US' },
  { code: 'MO', name: 'Missouri', country: 'US' },
  { code: 'MT', name: 'Montana', country: 'US' },
  { code: 'NE', name: 'Nebraska', country: 'US' },
  { code: 'NV', name: 'Nevada', country: 'US' },
  { code: 'NH', name: 'New Hampshire', country: 'US' },
  { code: 'NJ', name: 'New Jersey', country: 'US' },
  { code: 'NM', name: 'New Mexico', country: 'US' },
  { code: 'NY', name: 'New York', country: 'US' },
  { code: 'NC', name: 'North Carolina', country: 'US' },
  { code: 'ND', name: 'North Dakota', country: 'US' },
  { code: 'OH', name: 'Ohio', country: 'US' },
  { code: 'OK', name: 'Oklahoma', country: 'US' },
  { code: 'OR', name: 'Oregon', country: 'US' },
  { code: 'PA', name: 'Pennsylvania', country: 'US' },
  { code: 'RI', name: 'Rhode Island', country: 'US' },
  { code: 'SC', name: 'South Carolina', country: 'US' },
  { code: 'SD', name: 'South Dakota', country: 'US' },
  { code: 'TN', name: 'Tennessee', country: 'US' },
  { code: 'TX', name: 'Texas', country: 'US' },
  { code: 'UT', name: 'Utah', country: 'US' },
  { code: 'VT', name: 'Vermont', country: 'US' },
  { code: 'VA', name: 'Virginia', country: 'US' },
  { code: 'WA', name: 'Washington', country: 'US' },
  { code: 'WV', name: 'West Virginia', country: 'US' },
  { code: 'WI', name: 'Wisconsin', country: 'US' },
  { code: 'WY', name: 'Wyoming', country: 'US' },
];

export const CA_PROVINCES: Region[] = [
  { code: 'AB', name: 'Alberta', country: 'CA' },
  { code: 'BC', name: 'British Columbia', country: 'CA' },
  { code: 'MB', name: 'Manitoba', country: 'CA' },
  { code: 'NB', name: 'New Brunswick', country: 'CA' },
  { code: 'NL', name: 'Newfoundland and Labrador', country: 'CA' },
  { code: 'NT', name: 'Northwest Territories', country: 'CA' },
  { code: 'NS', name: 'Nova Scotia', country: 'CA' },
  { code: 'NU', name: 'Nunavut', country: 'CA' },
  { code: 'ON', name: 'Ontario', country: 'CA' },
  { code: 'PE', name: 'Prince Edward Island', country: 'CA' },
  { code: 'QC', name: 'Quebec', country: 'CA' },
  { code: 'SK', name: 'Saskatchewan', country: 'CA' },
  { code: 'YT', name: 'Yukon', country: 'CA' },
];

export const REGIONS: Region[] = [...US_STATES, ...CA_PROVINCES];

/** "FL - Florida", the form the filter list shows. */
export function regionLabel(r: Region): string {
  return `${r.code} - ${r.name}`;
}

/**
 * Look a region up by either half of its name.
 *
 * expo-location's reverseGeocodeAsync reports `region` as the full name
 * ("Florida", "Ontario"), while everything stored in the app writes the
 * abbreviation ("Miami, FL"). Comparing those two directly never matched, so a
 * traveller's region never lined up with any event's — the nearby list only
 * ever worked when the *city* name happened to match too.
 */
const REGION_INDEX: Record<string, Region> = (() => {
  const map: Record<string, Region> = {};
  for (const r of REGIONS) {
    map[r.name.toLowerCase()] = r;
    map[r.code.toLowerCase()] = r;
  }
  return map;
})();

export function findRegion(input?: string): Region | undefined {
  return REGION_INDEX[(input || '').trim().toLowerCase()];
}

/** The code for a state or province name, or '' if it is neither. */
export function stateCode(input?: string): string {
  return findRegion(input)?.code || '';
}

/**
 * The region an event is in, as a code. Prefers the explicit field and falls
 * back to the tail of a "City, ST" location string, which is all the older
 * events carry.
 */
export function eventStateCode(e: { state?: string; location?: string }): string {
  const direct = stateCode(e.state);
  if (direct) return direct;
  const tail = String(e.location || '').split(',').pop();
  return stateCode(tail || '');
}

