import { newId } from './ids';
export const COLORS = {
  // Core
  navy: '#1a1a2e',
  gold: '#c9a96e',
  cream: '#faf9f6',
  white: '#ffffff',
  // Backgrounds
  lightBg: '#f5f3ef',
  border: '#f0ede8',
  // Text
  text: '#1a1a2e',
  textSecondary: '#666',
  textMuted: '#999',
  placeholder: '#bbb',
  muted: '#888',
  // Semantic
  green: '#2e7d32',
  lightGreen: '#e8f5e9',
  red: '#e74c6f',
};

// ── Card gradients ──────────────────────────────────────────────────────────

/**
 * The stand-in shown on a church or event card that has no photo.
 *
 * These were assigned by hand down the seed list and hard-coded for anything
 * fetched from Google — which is every church a real user sees, so a nearby
 * search returned a column of identical purple tiles. People pick a row out of
 * a list by its shape and colour before they read it; when every tile matches,
 * the list has to be read line by line, and a uniform block of placeholder
 * colour is also what a failed image grid looks like.
 */
export const CARD_GRADIENTS: [string, string][] = [
  ['#667eea', '#764ba2'],
  ['#4facfe', '#00f2fe'],
  ['#fa709a', '#fee140'],
  ['#f5576c', '#f093fb'],
  ['#a18cd1', '#fbc2eb'],
  ['#43e97b', '#38f9d7'],
  ['#38f9d7', '#43e97b'],
  ['#f093fb', '#f5576c'],
];

/**
 * A stable gradient for a name.
 *
 * Derived rather than random so a church keeps the same colour between
 * launches — a tile that changes hue on every load is worse than a repeated
 * one. Eight options still collide in a long list; this turns "all identical"
 * into "occasionally repeated", which is the cheap half of the fix. The real
 * answer is the Place photo, which placesCache already holds.
 */
export function gradientFor(name: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return CARD_GRADIENTS[Math.abs(hash) % CARD_GRADIENTS.length];
}

// ── Typography ──────────────────────────────────────────────────────────────
export const TYPOGRAPHY = {
  // Display
  pageTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 24, color: '#1a1a2e' },
  sectionTitle: { fontSize: 17, fontWeight: '700' as const, color: '#1a1a2e' },
  // Cards
  cardTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 18, color: '#1a1a2e', lineHeight: 24 },
  cardSubtitle: { fontSize: 13, color: '#666', fontWeight: '500' as const },
  // Names
  userName: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 20, color: '#1a1a2e' },
  churchName: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 18, color: '#1a1a2e' },
  eventTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 17, color: '#1a1a2e' },
  // Body
  body: { fontSize: 14, color: '#1a1a2e', lineHeight: 22 },
  bodySmall: { fontSize: 13, color: '#666', lineHeight: 20 },
  // Meta
  caption: { fontSize: 12, color: '#999' },
  meta: { fontSize: 12, color: '#888' },
  // Buttons
  buttonPrimary: { fontSize: 15, fontWeight: '700' as const, color: '#ffffff' },
  buttonSecondary: { fontSize: 14, fontWeight: '600' as const, color: '#1a1a2e' },
  // Labels
  label: { fontSize: 11, fontWeight: '700' as const, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
};

// ── Spacing ─────────────────────────────────────────────────────────────────
export const SPACING = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32,
};

// ── Radius ──────────────────────────────────────────────────────────────────
export const RADIUS = {
  sm: 8, md: 12, lg: 16, xl: 20, pill: 100,
};

// ── Shadows ─────────────────────────────────────────────────────────────────
export const SHADOWS = {
  card: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  button: { shadowColor: '#1a1a2e', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 2 },
};

// ── Buttons ─────────────────────────────────────────────────────────────────
export const BUTTON_STYLES = {
  primary: {
    backgroundColor: '#1a1a2e', borderRadius: 14, paddingVertical: 14,
    paddingHorizontal: 24, alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  secondary: {
    backgroundColor: 'transparent', borderRadius: 14, paddingVertical: 13,
    paddingHorizontal: 24, borderWidth: 1.5, borderColor: '#f0ede8',
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  gold: {
    backgroundColor: '#c9a96e', borderRadius: 14, paddingVertical: 14,
    paddingHorizontal: 24, alignItems: 'center' as const, justifyContent: 'center' as const,
  },
};

export const CHURCHES = [
  { id: '1', state: 'AL', name: 'Church of the Highlands', address: '4700 Highlands Way, Birmingham, AL 35210', phone: '(205) 980-5577', type: 'Non-Denom', rating: 4.8, count: 1093, hours: 'Sunday Service', website: 'highlandschurch.net', placeId: 'ChIJtZDtSNoTiYgR_n4Q8NSqGmg', gradient: ['#667eea','#764ba2'] as [string,string] },
  { id: '2', state: 'AK', name: 'Changepoint Alaska', address: '6689 Changepoint Dr, Anchorage, AK 99518', phone: '(907) 646-4800', type: 'Non-Denom', rating: 4.8, count: 52, hours: 'Sun: 9AM, 5PM', website: 'changepointalaska.com', placeId: 'ChIJPytyJgCXyFYRZYuigzKKrQY', gradient: ['#f093fb','#f5576c'] as [string,string] },
  { id: '3', state: 'AZ', name: 'Dream City Church', address: '13613 N Cave Creek Rd, Phoenix, AZ 85022', phone: '(602) 867-7117', type: 'Non-Denom', rating: 4.7, count: 1116, hours: 'Sun: 7AM-1PM, Sat: 4PM', website: 'dreamcitychurch.com', placeId: 'ChIJVQB-7RByK4cRwRAYjMca3Bc', gradient: ['#4facfe','#00f2fe'] as [string,string] },
  { id: '4', state: 'AR', name: 'Cross Church Springdale', address: '1709 Johnson Rd, Springdale, AR 72762', phone: '(479) 751-4523', type: 'Baptist', rating: 4.5, count: 93, hours: 'Sun: 8AM-12PM', website: 'crosschurch.com', placeId: 'ChIJFfOMbp9syYcRm_7Uphh8d_Y', gradient: ['#43e97b','#38f9d7'] as [string,string] },
  { id: '5', state: 'CA', name: 'Grace Community Church', address: '13248 Roscoe Blvd, Sun Valley, CA 91352', phone: '(818) 909-5500', type: 'Non-Denom', rating: 4.8, count: 1169, hours: 'Sun: 8AM-8PM', website: 'gracechurch.org', placeId: 'ChIJL-v7OcmWwoARLWQTr2JBIgw', gradient: ['#fa709a','#fee140'] as [string,string] },
  { id: '6', state: 'CO', name: 'New Life Church', address: '11025 Voyager Pkwy, Colorado Springs, CO 80921', phone: '(719) 594-6602', type: 'Non-Denom', rating: 4.4, count: 659, hours: 'Sun: 8AM-1PM', website: 'newlifechurch.org', placeId: 'ChIJvaozaVVME4cRfDcQZarMeCU', gradient: ['#a18cd1','#fbc2eb'] as [string,string] },
  { id: '7', state: 'CT', name: 'Black Rock Church', address: '3685 Black Rock Tpke, Fairfield, CT 06825', phone: '(203) 255-3401', type: 'Non-Denom', rating: 4.7, count: 227, hours: 'Sun: 9AM, 10:30AM, 12PM, 5PM', website: 'blackrock.org', placeId: 'ChIJbwamGIMP6IkR_-F1do_YHbo', gradient: ['#f5576c','#f093fb'] as [string,string] },
  { id: '8', state: 'DE', name: 'The Delaware Church', address: '222 Clinton St, Delaware City, DE 19706', phone: '(302) 709-1331', type: 'Non-Denom', rating: 5.0, count: 2, hours: 'Sunday Service', website: 'thedelawarechurch.com', placeId: 'ChIJh30eohWpx4kRvDVbn2fcIMs', gradient: ['#38f9d7','#43e97b'] as [string,string] },
  { id: '9', state: 'FL', name: 'Christ Fellowship Church', address: '5343 Northlake Blvd, Palm Beach Gardens, FL 33418', phone: '(561) 799-7600', type: 'Non-Denom', rating: 4.7, count: 810, hours: 'Sun: 8:15AM-3PM', website: 'christfellowship.org', placeId: 'ChIJpYkx0cAq2YgR7NQv16uL0Pw', gradient: ['#667eea','#764ba2'] as [string,string] },
  { id: '10', state: 'GA', name: 'Victory Church', address: '5905 Brook Hollow Pkwy, Norcross, GA 30071', phone: '(770) 849-9400', type: 'Non-Denom', rating: 4.8, count: 1366, hours: 'Sat: 4PM, Sun: 9AM-5PM', website: 'victory.com', placeId: 'ChIJWwX_5bam9YgRw_3zQSWcjC8', gradient: ['#4facfe','#00f2fe'] as [string,string] },
  { id: '11', state: 'HI', name: 'New Hope Oahu', address: '290 Sand Island Access Rd, Honolulu, HI 96819', phone: '(808) 842-4242', type: 'Non-Denom', rating: 4.8, count: 300, hours: 'Sun: 8AM-3PM', website: 'newhopeoahu.com', placeId: 'ChIJ9cPn3VtuAHwRIXI4toN-RWM', gradient: ['#fa709a','#fee140'] as [string,string] },
  { id: '12', state: 'ID', name: 'Christ Church', address: '403 S Jackson St, Moscow, ID 83843', phone: '(208) 882-2034', type: 'Non-Denom', rating: 3.6, count: 221, hours: 'Sun: 8AM-12PM', website: 'christkirk.com', placeId: 'ChIJ-zQeQHknoFQRT3BhUE6mTfg', gradient: ['#a18cd1','#fbc2eb'] as [string,string] },
  { id: '13', state: 'IL', name: 'Harvest Bible Chapel', address: '800 S Rohlwing Rd, Rolling Meadows, IL 60008', phone: '(847) 398-7005', type: 'Non-Denom', rating: 4.5, count: 318, hours: 'Sat: 8AM, 5PM, Sun: 9AM', website: 'harvestbiblechapel.org', placeId: 'ChIJjbfVidikD4gRJvCj9Qoa6lI', gradient: ['#43e97b','#38f9d7'] as [string,string] },
  { id: '14', state: 'IN', name: 'Family Christian Center', address: '340 45th St, Munster, IN 46321', phone: '(219) 922-6500', type: 'Non-Denom', rating: 4.7, count: 720, hours: 'Sun: 8AM-5PM', website: 'familychristiancenter.org', placeId: 'ChIJj1121EngEYgRKcZ4Oj2QaFw', gradient: ['#f5576c','#f093fb'] as [string,string] },
  { id: '15', state: 'IA', name: 'Iowa City Church', address: '4643 American Legion Rd, Iowa City, IA 52240', phone: '(319) 214-3756', type: 'Non-Denom', rating: 4.9, count: 20, hours: 'Sun: 8:30AM-12PM', website: 'iowacitychurch.com', placeId: 'ChIJbaJsTLRr5IcRLQwNHl1wXlE', gradient: ['#38f9d7','#43e97b'] as [string,string] },
  { id: '16', state: 'KS', name: 'The Cure Church', address: '3650 N 67th St, Kansas City, KS 66104', phone: '(913) 596-0006', type: 'Non-Denom', rating: 4.5, count: 184, hours: 'Sun: 9AM, 5PM', website: 'thecure.church', placeId: 'ChIJ5x2LAG7zwIcRKqxNH7P3fI0', gradient: ['#667eea','#764ba2'] as [string,string] },
  { id: '17', state: 'KY', name: 'Southeast Christian Church', address: '920 Blankenbaker Pkwy, Louisville, KY 40243', phone: '(502) 253-8000', type: 'Christian', rating: 4.5, count: 676, hours: 'Mon-Fri: 8:30AM-5PM', website: 'southeastchristian.org', placeId: 'ChIJf-rktd6haYgRQ3VgdFiYFzw', gradient: ['#4facfe','#00f2fe'] as [string,string] },
  { id: '18', state: 'LA', name: 'Healing Place Church', address: '19202 Highland Rd, Baton Rouge, LA 70809', phone: '(225) 753-2273', type: 'Non-Denom', rating: 4.8, count: 599, hours: 'Sun: 8AM, 9:30AM, 11:30AM', website: 'healingplacechurch.org', placeId: 'ChIJAZ7WqGO6JoYRkijzBlLixds', gradient: ['#fa709a','#fee140'] as [string,string] },
  { id: '19', state: 'ME', name: 'Eastpoint Christian Church', address: '345 Clarks Pond Pkwy, South Portland, ME 04106', phone: '(207) 541-9992', type: 'Non-Denom', rating: 4.5, count: 224, hours: 'Sun: 8:30AM-3:30PM', website: 'eastpointchurch.org', placeId: 'ChIJCRWjsGOZskwRQDsM7dCkOXs', gradient: ['#a18cd1','#fbc2eb'] as [string,string] },
  { id: '20', state: 'MD', name: 'Church of the Redeemer', address: '19425 Woodfield Rd, Gaithersburg, MD 20879', phone: '(301) 926-0967', type: 'Non-Denom', rating: 4.8, count: 673, hours: 'Sun: 9AM-3PM', website: 'theredeemer.com', placeId: 'ChIJI7dAJHjTt4kRwI3RQZb76Wo', gradient: ['#43e97b','#38f9d7'] as [string,string] },
  { id: '21', state: 'MA', name: 'Hillsong Church Boston', address: '279 Tremont St, Boston, MA 02116', phone: '', type: 'Non-Denom', rating: 4.7, count: 108, hours: 'Sun: 10AM', website: 'hillsong.com/boston', placeId: 'ChIJq5_BwnZ644kR4bJZamtwh9s', gradient: ['#f5576c','#f093fb'] as [string,string] },
  { id: '22', state: 'MI', name: 'Straight Gate International Church', address: '10100 Grand River Ave, Detroit, MI 48204', phone: '(313) 491-8430', type: 'Non-Denom', rating: 4.7, count: 124, hours: 'Sun: 10AM', website: 'straightgate.org', placeId: 'ChIJzVb2v-zMJIgR2frJ9soeGV4', gradient: ['#667eea','#764ba2'] as [string,string] },
  { id: '23', state: 'MN', name: 'Eagle Brook Church', address: '1021 Hennepin Ave, Minneapolis, MN 55403', phone: '(651) 429-9227', type: 'Non-Denom', rating: 4.7, count: 52, hours: 'Sun: 9AM-12PM', website: 'eaglebrookchurch.com', placeId: 'ChIJbdW7cqkzs1IRSwzNFSuALiA', gradient: ['#4facfe','#00f2fe'] as [string,string] },
  { id: '24', state: 'MS', name: 'The Church Triumphant Global', address: '6531 Dogwood View Pkwy, Jackson, MS 39213', phone: '(601) 977-0007', type: 'Non-Denom', rating: 5.0, count: 32, hours: 'Sun: 10AM-12PM', website: 'tctglobal.org', placeId: 'ChIJTQDk7fnMKYYRBqagi38BVKE', gradient: ['#fa709a','#fee140'] as [string,string] },
  { id: '25', state: 'MO', name: 'The Life Church KC', address: '10400 View High Dr, Kansas City, MO 64134', phone: '(816) 489-3817', type: 'Non-Denom', rating: 4.8, count: 97, hours: 'Sunday Service', website: 'thelifechurchkc.com', placeId: 'ChIJAQAAAIQfwYcRoMkH-oOAnHU', gradient: ['#a18cd1','#fbc2eb'] as [string,string] },
  { id: '26', state: 'MT', name: 'Rocky Mountain Community Church', address: '2832 Broadwater Ave, Billings, MT 59102', phone: '(406) 259-7811', type: 'Non-Denom', rating: 5.0, count: 22, hours: 'Sun: 9AM-2PM', website: 'rmcc.net', placeId: 'ChIJlZ-7atx8SFMRQl7NHmnOmvM', gradient: ['#38f9d7','#43e97b'] as [string,string] },
  { id: '27', state: 'NE', name: 'Lifegate Church', address: '15555 W Dodge Rd, Omaha, NE 68154', phone: '(402) 330-5724', type: 'Non-Denom', rating: 4.7, count: 206, hours: 'Sun: 7AM-12:30PM', website: 'lifegatechurch.net', placeId: 'ChIJtzJ6KPTxk4cROSJ4ew6iE3U', gradient: ['#f5576c','#f093fb'] as [string,string] },
  { id: '28', state: 'NV', name: 'Shadow Hills Church', address: '7811 W Vegas Dr, Las Vegas, NV 89128', phone: '(702) 880-7811', type: 'Non-Denom', rating: 4.6, count: 163, hours: 'Sun: 9AM, 10:30AM', website: 'shadowhillschurch.com', placeId: 'ChIJa6sjHBTAyIARTCnxtWVf5H8', gradient: ['#667eea','#764ba2'] as [string,string] },
  { id: '29', state: 'NH', name: 'One Church Manchester', address: '1308 Wellington Rd, Manchester, NH 03104', phone: '(603) 486-1678', type: 'Non-Denom', rating: 4.8, count: 151, hours: 'Sun: 8AM, 9:30AM, 11AM', website: 'onechurchnh.com', placeId: 'ChIJfZidzClP4okRIgnxBsc7gBo', gradient: ['#4facfe','#00f2fe'] as [string,string] },
  { id: '30', state: 'NJ', name: 'EPIC Church International', address: '2707 Main St, Sayreville, NJ 08872', phone: '(732) 727-9500', type: 'Non-Denom', rating: 4.7, count: 503, hours: 'Sun: 9AM-1:30PM', website: 'epicchurchnj.com', placeId: 'ChIJ_2hUXjrKw4kRQG-wWxzBrHI', gradient: ['#fa709a','#fee140'] as [string,string] },
  { id: '31', state: 'NM', name: 'Legacy Church', address: '7201 Central Ave NW, Albuquerque, NM 87121', phone: '(505) 831-0961', type: 'Non-Denom', rating: 4.5, count: 875, hours: 'Sun: 8:30AM-2PM', website: 'legacychurch.com', placeId: 'ChIJCT68_FkNIocR0cF5jK-5CL4', gradient: ['#a18cd1','#fbc2eb'] as [string,string] },
  { id: '32', state: 'NY', name: 'Hillsong Church NYC', address: '235 W 46th St, New York, NY 10036', phone: '', type: 'Non-Denom', rating: 4.7, count: 992, hours: 'Sun: 10AM-4PM', website: 'hillsong.com/nyc', placeId: 'ChIJqZ1V7YpZwokRFWx06WYdJlU', gradient: ['#43e97b','#38f9d7'] as [string,string] },
  { id: '33', state: 'NC', name: 'Mecklenburg Community Church', address: '8335 Browne Rd, Charlotte, NC 28269', phone: '(704) 598-9800', type: 'Non-Denom', rating: 4.9, count: 298, hours: 'Sun: 7:30AM-2PM', website: 'mecklenburg.org', placeId: 'ChIJr4oLoXodVIgRxHDcNQ7THYM', gradient: ['#38f9d7','#43e97b'] as [string,string] },
  { id: '34', state: 'ND', name: 'The Door Christian Fellowship', address: '3511 Main Ave, Fargo, ND 58102', phone: '(701) 970-0322', type: 'Non-Denom', rating: 4.9, count: 27, hours: 'Sun: 10AM, 5PM', website: 'thedoorfargo.com', placeId: 'ChIJjwAY3l_JyFIRQhAjT9VoBic', gradient: ['#f5576c','#f093fb'] as [string,string] },
  { id: '35', state: 'OH', name: 'World Harvest Church', address: '4595 Gender Rd, Canal Winchester, OH 43110', phone: '(614) 837-1990', type: 'Non-Denom', rating: 4.2, count: 631, hours: 'Sun: 9AM-2PM', website: 'worldharvest.org', placeId: 'ChIJvWfh64R8OIgRTWG9SXIg1tI', gradient: ['#667eea','#764ba2'] as [string,string] },
  { id: '36', state: 'OK', name: 'Life.Church Oklahoma City', address: '2001 NW 178th St, Edmond, OK 73012', phone: '(405) 478-5433', type: 'Non-Denom', rating: 4.8, count: 552, hours: 'Sat: 4:30PM, Sun: 8AM-2:30PM', website: 'life.church', placeId: 'ChIJ0eNpEL8dsocRpzX-wm1UZUw', gradient: ['#4facfe','#00f2fe'] as [string,string] },
  { id: '37', state: 'OR', name: 'A Jesus Church', address: '10500 SW Nimbus Ave, Portland, OR 97223', phone: '(503) 620-1120', type: 'Non-Denom', rating: 4.7, count: 196, hours: 'Sun: 8AM-1PM', website: 'ajesuschurch.com', placeId: 'ChIJq5KJQRsKlVQRHTMfXvk-34g', gradient: ['#fa709a','#fee140'] as [string,string] },
  { id: '38', state: 'PA', name: 'Epic Church Center City', address: '480 S Broad St, Philadelphia, PA 19146', phone: '(215) 525-9193', type: 'Non-Denom', rating: 4.9, count: 79, hours: 'Sunday Service', website: 'epicchurchphilly.com', placeId: 'ChIJH5aBryTGxokR2tSsEvoomI4', gradient: ['#a18cd1','#fbc2eb'] as [string,string] },
  { id: '39', state: 'RI', name: 'Impact Center Providence', address: '184 Broad St, Providence, RI 02903', phone: '(401) 461-7210', type: 'Non-Denom', rating: 4.5, count: 29, hours: 'Sunday Service', website: 'impactcenterprovidence.com', placeId: 'ChIJNxBJg4BP5IkRVed3QHTKWWA', gradient: ['#43e97b','#38f9d7'] as [string,string] },
  { id: '40', state: 'SC', name: 'NewSpring Church', address: '657 Bush River Rd, Columbia, SC 29210', phone: '(803) 726-4361', type: 'Non-Denom', rating: 4.6, count: 198, hours: 'Sun: 9AM-12:30PM', website: 'newspring.cc', placeId: 'ChIJA6dk4T-j-IgRmLwkdMvVMl4', gradient: ['#38f9d7','#43e97b'] as [string,string] },
  { id: '41', state: 'SD', name: 'New Life Church', address: '500 S 1st Ave, Sioux Falls, SD 57104', phone: '(605) 251-5257', type: 'Non-Denom', rating: 4.6, count: 88, hours: 'Sun: 9AM-12:30PM', website: 'newlifesioux.com', placeId: 'ChIJHdweTby1jocR3ayz9mtQliQ', gradient: ['#f5576c','#f093fb'] as [string,string] },
  { id: '42', state: 'TN', name: 'Cross Point Church', address: '299 Cowan St, Nashville, TN 37213', phone: '(615) 298-4422', type: 'Non-Denom', rating: 4.7, count: 379, hours: 'Sun: 8:30AM, 5:30PM', website: 'crosspoint.tv', placeId: 'ChIJn8PhUlNmZIgRnsndQskInyo', gradient: ['#667eea','#764ba2'] as [string,string] },
  { id: '43', state: 'TX', name: 'Lakewood Church', address: '3700 Southwest Fwy, Houston, TX 77027', phone: '(713) 635-4154', type: 'Non-Denom', rating: 4.6, count: 5543, hours: 'Sun: 8AM-5PM', website: 'lakewoodchurch.com', placeId: 'ChIJVUsKgcH0OxARBJlw13Qgw2w', gradient: ['#4facfe','#00f2fe'] as [string,string] },
  { id: '44', state: 'UT', name: 'Courageous Church Salt Lake City', address: '2139 S Foothill Dr, Salt Lake City, UT 84109', phone: '(801) 923-4954', type: 'Non-Denom', rating: 4.9, count: 31, hours: 'Sun: 8AM-2PM', website: 'courageouschurch.com', placeId: 'ChIJzVzN-GtgUocRko1wvmyIRfo', gradient: ['#fa709a','#fee140'] as [string,string] },
  { id: '45', state: 'VT', name: 'Church at the Well', address: '60 Lake St, Burlington, VT 05401', phone: '(802) 238-0399', type: 'Non-Denom', rating: 5.0, count: 8, hours: 'Sunday Service', website: 'churchatthewell.org', placeId: 'ChIJM8zOevB6ykwReDLWP8WlsXE', gradient: ['#a18cd1','#fbc2eb'] as [string,string] },
  { id: '46', state: 'VA', name: 'Liberation Church', address: '5501 Midlothian Turnpike, Richmond, VA 23225', phone: '(804) 230-8861', type: 'Non-Denom', rating: 4.6, count: 128, hours: 'Sun: 10AM-12PM', website: 'liberationchurch.org', placeId: 'ChIJqS4GIEISsYkR8Mup5WfleyM', gradient: ['#43e97b','#38f9d7'] as [string,string] },
  { id: '47', state: 'WA', name: 'Bethany Community Church', address: '8023 Green Lake Dr N, Seattle, WA 98103', phone: '(206) 524-9000', type: 'Non-Denom', rating: 4.6, count: 95, hours: 'Sun: 8AM-12PM', website: 'bethanyseattle.org', placeId: 'ChIJczRKZBcUkFQR8GDa1PMUqGs', gradient: ['#38f9d7','#43e97b'] as [string,string] },
  { id: '48', state: 'WV', name: 'Bible Center Church', address: '100 Bible Center Dr, Charleston, WV 25309', phone: '(304) 346-0431', type: 'Non-Denom', rating: 4.6, count: 102, hours: 'Sun: 9:15AM, 11AM', website: 'biblechurch.com', placeId: 'ChIJB6UDYFAyT4gRiBYJ2gEsllI', gradient: ['#f5576c','#f093fb'] as [string,string] },
  { id: '49', state: 'WI', name: 'Eastbrook Church', address: '5353 N Green Bay Ave, Milwaukee, WI 53209', phone: '(414) 228-5220', type: 'Non-Denom', rating: 4.7, count: 193, hours: 'Sun: 8AM-1PM', website: 'eastbrook.org', placeId: 'ChIJTfNTCUIdBYgRbfmSNZt5iJA', gradient: ['#667eea','#764ba2'] as [string,string] },
  { id: '50', state: 'WY', name: 'Element Church', address: '600 E Carlson St, Cheyenne, WY 82009', phone: '(307) 635-1316', type: 'Non-Denom', rating: 4.6, count: 184, hours: 'Sun: 8AM, 9:30AM, 11AM', website: 'elementchurch.com', placeId: 'ChIJ3XGqo0E6b4cR83xMVTL8gB0', gradient: ['#4facfe','#00f2fe'] as [string,string] },
];

export const EVENTS = [
  { id: '1', title: 'Women of Purpose Conference', description: 'Worship and fellowship for women.', date: 'Apr 18-19, 2026', location: 'Valley Stream, NY', type: 'Conference', price: 'Free', attending: 0 },
  { id: '2', title: 'NYC Gospel Music Festival', description: 'A celebration of gospel music.', date: 'May 2, 2026', location: 'Brooklyn, NY', type: 'Festival', price: '$15', attending: 0 },
  { id: '3', title: 'Faith & Finance Workshop', description: 'Learn to manage money with faith.', date: 'Apr 5, 2026', location: 'Glen Cove, NY', type: 'Workshop', price: 'Free', attending: 0 },
  { id: '4', title: 'Passion Conference 2026', description: 'A conference for the next generation.', date: 'Jun 12-14, 2026', location: 'Atlanta, GA', type: 'Conference', price: '$125', attending: 0 },
  { id: '5', title: 'Red Rocks Worship Night', description: 'An unforgettable night of worship.', date: 'Jun 27, 2026', location: 'Morrison, CO', type: 'Service', price: '$30', attending: 0 },
];

export const POSTS = [
  { id: '1', author: 'Grace Community Church', initials: 'GC', type: 'Church', time: '2h', content: 'What an incredible Sunday! Over 50 people came forward during altar call. God is moving in Glen Cove! Join us next week, all are welcome.', likes: 2, comments: 2, color: '#e74c6f' },
  { id: '2', author: 'Lakewood Church', initials: 'LC', type: 'Church', time: '1d', content: 'Night of Hope is coming to Chicago on June 5th! Free admission. Join Joel and Victoria Osteen for an unforgettable evening of worship and encouragement.', likes: 2, comments: 2, color: '#c9a96e' },
  { id: '3', author: 'Jasmine Carter', initials: 'JC', type: 'Member', time: '4h', content: 'Just finished writing Unshakeable. God gave me every lyric at 3am!', likes: 8, comments: 1, color: '#667eea' },
];

export const PEOPLE = [
  { id: '1', name: 'Jasmine Carter', initials: 'JC', role: 'Unknown', color: '#64b5f6' },
  { id: '2', name: 'David Okonkwo', initials: 'DO', role: 'Unknown', color: '#ce93d8' },
  { id: '3', name: 'Isaiah Williams', initials: 'IW', role: 'Unknown', color: '#ef9a9a' },
  { id: '4', name: 'Rachel Park', initials: 'RP', role: 'Unknown', color: '#b39ddb' },
];

// User reviews store
let churchReviews: Record<string, {id:string; author:string; rating:number; text:string; time:string}[]> = {};
const reviewListeners: Array<()=>void> = [];

export function getChurchReviews(placeId: string) {
  return churchReviews[placeId] || [];
}

export function addChurchReview(placeId: string, review: {author:string; rating:number; text:string}) {
  if (!churchReviews[placeId]) churchReviews[placeId] = [];
  churchReviews[placeId] = [{ ...review, id: newId(), time: 'Just now' }, ...churchReviews[placeId]];
  reviewListeners.forEach(fn => fn());
}

export function subscribeReviews(fn: ()=>void) {
  reviewListeners.push(fn);
  return () => { const i = reviewListeners.indexOf(fn); if (i>-1) reviewListeners.splice(i,1); };
}

export const EVENT_DETAILS: Record<string, any> = {
  '1': {
    bannerColor: ['#667eea', '#764ba2'],
    summary: 'A powerful two-day conference designed to inspire and equip women of faith to walk boldly in their God-given purpose.',
    experience: ['Powerful worship sessions', 'Keynote messages from faith leaders', 'Breakout workshops', 'Prayer and intercession time', 'Fellowship and networking'],
    speakers: [
      { name: 'Pastor Sarah Williams', role: 'Keynote Speaker', initials: 'SW', color: '#667eea' },
      { name: 'Dr. Joyce Carter', role: 'Workshop Leader', initials: 'JC', color: '#f093fb' },
    ],
    audience: 'Women of all ages and backgrounds',
    notes: [
      { icon: 'wifi-outline', label: 'Live Stream', value: 'Available on FaithFinder App' },
      { icon: 'car-outline', label: 'Parking', value: 'Free parking available on site' },
      { icon: 'shirt-outline', label: 'Dress Code', value: 'Smart casual' },
    ],
  },
  '2': {
    bannerColor: ['#f093fb', '#f5576c'],
    summary: 'A joyful celebration of gospel music featuring choirs, soloists, and worship bands from across the tri-state area.',
    experience: ['Live gospel performances', 'Community choir showcase', 'Worship and praise', 'Food vendors on site', 'Children\'s activities area'],
    speakers: [
      { name: 'Minister David Okonkwo', role: 'Host & Worship Leader', initials: 'DO', color: '#f5576c' },
      { name: 'Brooklyn Gospel Choir', role: 'Featured Performance', initials: 'BC', color: '#f093fb' },
    ],
    audience: 'All ages — families welcome',
    notes: [
      { icon: 'ticket-outline', label: 'Tickets', value: '$15 at door or online' },
      { icon: 'car-outline', label: 'Parking', value: 'Street parking available nearby' },
      { icon: 'restaurant-outline', label: 'Food', value: 'Food vendors on site' },
    ],
  },
  '3': {
    bannerColor: ['#4facfe', '#00f2fe'],
    summary: 'Learn practical biblical principles for managing finances, giving, saving, and building generational wealth.',
    experience: ['Interactive teaching sessions', 'Q&A with financial advisors', 'Faith-based budgeting tools', 'Small group discussions'],
    speakers: [
      { name: 'Bishop Marcus Johnson', role: 'Lead Teacher', initials: 'MJ', color: '#4facfe' },
    ],
    audience: 'Adults, couples, and young professionals',
    notes: [
      { icon: 'book-outline', label: 'Bring', value: 'Notebook and pen' },
      { icon: 'wifi-outline', label: 'Live Stream', value: 'Available on YouTube' },
      { icon: 'cafe-outline', label: 'Refreshments', value: 'Light refreshments provided' },
    ],
  },
  '4': {
    bannerColor: ['#43e97b', '#38f9d7'],
    summary: 'Passion Conference is the premier gathering for the next generation of believers, featuring world-class worship and teaching.',
    experience: ['Mainstage worship sessions', 'Breakout sessions by topic', 'Late-night prayer gatherings', 'Merchandise and resources', 'Communion service'],
    speakers: [
      { name: 'Louie Giglio', role: 'Founder & Speaker', initials: 'LG', color: '#43e97b' },
      { name: 'Christine Caine', role: 'Guest Speaker', initials: 'CC', color: '#38f9d7' },
      { name: 'Hillsong Worship', role: 'Worship Leaders', initials: 'HW', color: '#667eea' },
    ],
    audience: 'College students and young adults (18-25)',
    notes: [
      { icon: 'bed-outline', label: 'Lodging', value: 'Hotel blocks available nearby' },
      { icon: 'wifi-outline', label: 'Live Stream', value: 'Streaming on Passion App' },
      { icon: 'bag-outline', label: 'What to Bring', value: 'Bible, journal, open heart' },
    ],
  },
  '5': {
    bannerColor: ['#fa709a', '#fee140'],
    summary: 'An unforgettable evening of worship under the stars at Red Rocks Amphitheatre — one of the most iconic venues in the world.',
    experience: ['Sunset worship experience', 'Live band performance', 'Acoustic sets', 'Outdoor prayer walk', 'Communion at sunset'],
    speakers: [
      { name: 'Red Rocks Worship Band', role: 'Worship Leaders', initials: 'RR', color: '#fa709a' },
    ],
    audience: 'All ages — outdoor event',
    notes: [
      { icon: 'cloudy-outline', label: 'Weather', value: 'Bring layers — evenings can be cool' },
      { icon: 'car-outline', label: 'Parking', value: 'Arrive early — limited spaces' },
      { icon: 'accessibility-outline', label: 'Accessibility', value: 'Accessible seating available' },
    ],
  },
};
