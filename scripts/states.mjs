/**
 * One state value per state.
 *
 * OSM's `addr:state` is free text, so a single state arrives as "GA",
 * "Georgia", "Ga", "ga" and — genuinely, in this data — "W. Va." and "-IL".
 * The import stored whatever it was given, so `state = 'GA'` silently misses
 * the rows spelled another way.
 *
 * Only about 90 churches out of 235,000 are affected, so this is not the
 * dramatic bug it first looked like. It is still worth fixing: those churches
 * are in the database and unreachable by the search that should find them, and
 * a filter that quietly omits rows is worse than one that fails loudly.
 */

const NAMES = {
  alabama:'AL',alaska:'AK',arizona:'AZ',arkansas:'AR',california:'CA',colorado:'CO',
  connecticut:'CT',delaware:'DE',districtofcolumbia:'DC',florida:'FL',georgia:'GA',
  hawaii:'HI',idaho:'ID',illinois:'IL',indiana:'IN',iowa:'IA',kansas:'KS',
  kentucky:'KY',louisiana:'LA',maine:'ME',maryland:'MD',massachusetts:'MA',
  michigan:'MI',minnesota:'MN',mississippi:'MS',missouri:'MO',montana:'MT',
  nebraska:'NE',nevada:'NV',newhampshire:'NH',newjersey:'NJ',newmexico:'NM',
  newyork:'NY',northcarolina:'NC',northdakota:'ND',ohio:'OH',oklahoma:'OK',
  oregon:'OR',pennsylvania:'PA',rhodeisland:'RI',southcarolina:'SC',
  southdakota:'SD',tennessee:'TN',texas:'TX',utah:'UT',vermont:'VT',
  virginia:'VA',washington:'WA',westvirginia:'WV',wisconsin:'WI',wyoming:'WY',
};

const CODES = new Set(Object.values(NAMES));

/** Abbreviations people write that are neither the code nor the full name. */
const ALIASES = {
  wva:'WV', wva1:'WV', va1:'VA', calif:'CA', cali:'CA', fla:'FL', tex:'TX',
  penn:'PA', penna:'PA', mich:'MI', wis:'WI', wisc:'WI', minn:'MN', tenn:'TN',
  conn:'CT', mass:'MA', ind:'IN', kans:'KS', nebr:'NE', okla:'OK', ariz:'AZ',
  colo:'CO', dela:'DE', ills:'IL', vt1:'VT', dc:'DC', washingtondc:'DC',
};

/**
 * A two-letter state code, or null if the value cannot be read as one.
 *
 * Punctuation and spaces come out first, which is what turns "W. Va." into
 * "wva" and "-IL" into "il" before anything is looked up.
 */
export function normalizeState(raw) {
  const t = String(raw || '').toLowerCase().replace(/[^a-z]/g, '');
  if (!t) return null;
  if (t.length === 2 && CODES.has(t.toUpperCase())) return t.toUpperCase();
  if (NAMES[t]) return NAMES[t];
  if (ALIASES[t]) return ALIASES[t];
  return null;
}
