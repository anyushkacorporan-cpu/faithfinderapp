/**
 * One denomination name per denomination.
 *
 * OSM's `denomination` tag is free text written by thousands of people, so the
 * same body arrives spelled several ways — Utah alone produced "Latter-day
 * Saints", "Latter Day Saints" and "Latter-Day Saints" as three separate
 * entries, which split 1,646 churches across three filter options and hid a
 * fifth of them from anyone who picked the wrong one.
 *
 * The fix is to match on a *shape* rather than a string: lowercase, and every
 * run of spaces, hyphens and underscores flattened to one separator. All three
 * Utah spellings collapse to `latter_day_saints` and land on one name.
 */

/**
 * "Latter-Day_Saints" → "latter_day_saints"
 *
 * The semicolon split has to happen before punctuation is stripped. OSM uses
 * `;` to list several values — "Presbyterian;PCA" — and stripping first glued
 * them into "presbyterianpca", a denomination that does not exist. Taking the
 * first value is right for a single-denomination field: a church tagged
 * "Southern Baptist;Baptist" is a Southern Baptist church.
 */
export function key(raw) {
  return String(raw || '')
    .split(';')[0]
    .toLowerCase()
    .trim()
    .replace(/[\s\-_]+/g, '_')
    .replace(/[^a-z0-9_']/g, '');
}

const CANON = {
  // Catholic
  catholic: 'Catholic',
  roman_catholic: 'Catholic',
  catholic_church: 'Catholic',
  greek_catholic: 'Greek Catholic',
  ukrainian_greek_catholic: 'Ukrainian Greek Catholic',

  // Baptist
  baptist: 'Baptist',
  southern_baptist: 'Southern Baptist',
  american_baptist: 'American Baptist',
  free_will_baptist: 'Free Will Baptist',
  missionary_baptist: 'Missionary Baptist',
  independent_baptist: 'Independent Baptist',
  primitive_baptist: 'Primitive Baptist',

  // Methodist
  methodist: 'Methodist',
  united_methodist: 'United Methodist',
  african_methodist_episcopal: 'African Methodist Episcopal',
  african_methodist_episcopal_zion: 'African Methodist Episcopal Zion',
  free_methodist: 'Free Methodist',

  // Lutheran
  lutheran: 'Lutheran',
  evangelical_lutheran: 'Evangelical Lutheran',
  missouri_synod: 'Lutheran (Missouri Synod)',
  wisconsin_evangelical_lutheran_synod: 'Lutheran (Wisconsin Synod)',

  // Presbyterian
  presbyterian: 'Presbyterian',
  presbyterian_church_usa: 'Presbyterian (PCUSA)',
  pcusa: 'Presbyterian (PCUSA)',
  presbyterian_church_in_america: 'Presbyterian (PCA)',
  cumberland_presbyterian: 'Cumberland Presbyterian',

  // Latter-day Saints — the three spellings that started this
  latter_day_saints: 'Latter-day Saints',
  mormon: 'Latter-day Saints',
  lds: 'Latter-day Saints',
  church_of_jesus_christ_of_latter_day_saints: 'Latter-day Saints',

  // Orthodox
  orthodox: 'Orthodox',
  greek_orthodox: 'Greek Orthodox',
  russian_orthodox: 'Russian Orthodox',
  serbian_orthodox: 'Serbian Orthodox',
  romanian_orthodox: 'Romanian Orthodox',
  coptic_orthodox: 'Coptic Orthodox',
  ethiopian_orthodox: 'Ethiopian Orthodox',
  antiochian_orthodox: 'Antiochian Orthodox',
  oriental_orthodox: 'Oriental Orthodox',
  eastern_orthodox: 'Orthodox',

  // Restorationist / Stone-Campbell
  church_of_christ: 'Church of Christ',
  churches_of_christ: 'Church of Christ',
  disciples_of_christ: 'Disciples of Christ',
  christian_church: 'Christian Church',
  community_of_christ: 'Community of Christ',

  // Pentecostal / charismatic
  pentecostal: 'Pentecostal',
  neo_pentecostal: 'Neo-Pentecostal',
  assemblies_of_god: 'Assemblies of God',
  assembly_of_god: 'Assemblies of God',
  church_of_god: 'Church of God',
  church_of_god_in_christ: 'Church of God in Christ',
  foursquare: 'Foursquare',
  apostolic: 'Apostolic',
  charismatic: 'Charismatic',

  // Anglican family
  episcopal: 'Episcopal',
  anglican: 'Anglican',

  // Reformed / Congregational
  reformed: 'Reformed',
  christian_reformed: 'Christian Reformed',
  congregational: 'Congregational',
  united_church_of_christ: 'United Church of Christ',
  ucc: 'United Church of Christ',

  // Adventist
  seventh_day_adventist: 'Seventh-day Adventist',
  adventist: 'Adventist',

  // Peace churches
  mennonite: 'Mennonite',
  quaker: 'Quaker',
  friends: 'Quaker',
  society_of_friends: 'Quaker',
  religious_society_of_friends: 'Quaker',
  amish: 'Amish',
  brethren: 'Brethren',
  church_of_the_brethren: 'Brethren',
  moravian: 'Moravian',

  // Other
  nondenominational: 'Non-Denominational',
  non_denominational: 'Non-Denominational',
  independent: 'Independent',
  evangelical: 'Evangelical',
  protestant: 'Protestant',
  nazarene: 'Nazarene',
  church_of_the_nazarene: 'Nazarene',
  wesleyan: 'Wesleyan',
  salvation_army: 'Salvation Army',
  christ_scientist: 'Christian Science',
  christian_science: 'Christian Science',
  jehovahs_witness: "Jehovah's Witness",
  jehovahs_witnesses: "Jehovah's Witness",
  unitarian: 'Unitarian',
  unitarian_universalist: 'Unitarian Universalist',
  vineyard: 'Vineyard',
  calvary_chapel: 'Calvary Chapel',
  alliance: 'Christian and Missionary Alliance',
  christian: 'Christian',
};

/** Words that stay lowercase inside a name, the way English titles work. */
const SMALL = new Set(['of', 'and', 'in', 'the', 'de', 'la']);

function titleCase(k) {
  return k.split('_').map((w, i) => {
    if (i > 0 && SMALL.has(w)) return w;
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(' ');
}

/**
 * The display name for a raw OSM denomination, or null if there wasn't one.
 * Anything unrecognised still comes through readably rather than being lost —
 * a rare denomination is better shown than dropped.
 */
export function canonical(raw) {
  const k = key(raw);
  if (!k) return null;
  return CANON[k] || titleCase(k);
}
