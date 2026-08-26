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

export const STATES = [
  'All States',
  'AL - Alabama',
  'AK - Alaska',
  'AZ - Arizona',
  'AR - Arkansas',
  'CA - California',
  'CO - Colorado',
  'CT - Connecticut',
  'DE - Delaware',
  'FL - Florida',
  'GA - Georgia',
  'HI - Hawaii',
  'ID - Idaho',
  'IL - Illinois',
  'IN - Indiana',
  'IA - Iowa',
  'KS - Kansas',
  'KY - Kentucky',
  'LA - Louisiana',
  'ME - Maine',
  'MD - Maryland',
  'MA - Massachusetts',
  'MI - Michigan',
  'MN - Minnesota',
  'MS - Mississippi',
  'MO - Missouri',
  'MT - Montana',
  'NE - Nebraska',
  'NV - Nevada',
  'NH - New Hampshire',
  'NJ - New Jersey',
  'NM - New Mexico',
  'NY - New York',
  'NC - North Carolina',
  'ND - North Dakota',
  'OH - Ohio',
  'OK - Oklahoma',
  'OR - Oregon',
  'PA - Pennsylvania',
  'RI - Rhode Island',
  'SC - South Carolina',
  'SD - South Dakota',
  'TN - Tennessee',
  'TX - Texas',
  'UT - Utah',
  'VT - Vermont',
  'VA - Virginia',
  'WA - Washington',
  'WV - West Virginia',
  'WI - Wisconsin',
  'WY - Wyoming',
];

/**
 * Normalise a state to its two-letter code: "Florida" and "FL" both give "FL".
 * Returns '' for anything that is not a US state.
 *
 * expo-location's reverseGeocodeAsync reports `region` as the full state name
 * ("Florida"), while everything stored in the app writes the abbreviation
 * ("Miami, FL"). Comparing those two directly never matched, so a traveller's
 * state never lined up with any event's state - the nearby list only ever
 * worked when the *city* name happened to match.
 *
 * Built from STATES so there is one list of states in the app, not two.
 */
const STATE_CODES: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const entry of STATES) {
    const [code, name] = entry.split(' - ');
    if (!name) continue; // skips 'All States'
    map[name.toLowerCase()] = code;
    map[code.toLowerCase()] = code;
  }
  return map;
})();

export function stateCode(input?: string): string {
  const key = (input || '').trim().toLowerCase();
  return STATE_CODES[key] || '';
}

/**
 * The state an event is in, as a code. Prefers the explicit field and falls
 * back to the tail of a "City, ST" location string, which is all the older
 * events carry.
 */
export function eventStateCode(e: { state?: string; location?: string }): string {
  const direct = stateCode(e.state);
  if (direct) return direct;
  const tail = String(e.location || '').split(',').pop();
  return stateCode(tail || '');
}

