/**
 * Remove the invented sample records from a device that already saved them.
 *
 * Deleting the seed arrays stopped new installs from getting fake events,
 * posts and connections, but it could not reach a phone that had already run
 * the old build: all three stores write their list to storage, and hydrate
 * reads that list back. The five events, six posts and two connections were
 * saved on first launch and then kept being restored from the device's own
 * copy, so the app still opened onto them with nothing in the code to blame.
 *
 * Matching is by exact id AND the name that id carried, never by a shape or a
 * prefix. Nothing real can collide: events created in the app get `user_` plus
 * a timestamp, posts get a UUID from newId(), and a church connection carries
 * either its Places id or its own name. A short id like '3' or 'pastor-mike'
 * can only have come from the seed, and nothing generates these any more, so
 * the filter is safe to run on every hydrate rather than once behind a
 * migration flag — which also catches a stale copy arriving from elsewhere.
 */

/** id → the title that id held in the deleted EVENTS seed. */
const SAMPLE_EVENTS: Record<string, string> = {
  '1': 'Women of Purpose Conference',
  '2': 'NYC Gospel Music Festival',
  '3': 'Faith & Finance Workshop',
  '4': 'Passion Conference 2026',
  '5': 'Red Rocks Worship Night',
};

/** id → the authorName that id held in the deleted INITIAL_POSTS seed. */
const SAMPLE_POSTS: Record<string, string> = {
  '1': 'Grace Community Church',
  '2': 'Pastor Michael Johnson',
  '3': 'Faith Tabernacle NYC',
  '4': 'Blessing Okafor',
  '5': 'Brooklyn Gospel Choir',
  '6': 'Carlos Rivera',
};

/** id → the name that id held in the deleted INITIAL_CONNECTIONS seed. */
const SAMPLE_CONNECTIONS: Record<string, string> = {
  'grace-community': 'Grace Community Church',
  'pastor-mike': 'Pastor Michael Johnson',
};

function isSample(table: Record<string, string>, id: unknown, name: unknown): boolean {
  if (typeof id !== 'string') return false;
  const expected = table[id];
  // An id that was never in the seed, or was but now carries a different
  // name, is somebody's real record and stays.
  return expected !== undefined && name === expected;
}

export function stripSampleEvents<T extends { id?: string; title?: string }>(rows: T[]): T[] {
  return rows.filter(r => !isSample(SAMPLE_EVENTS, r.id, r.title));
}

export function stripSamplePosts<T extends { id?: string; authorName?: string }>(rows: T[]): T[] {
  return rows.filter(r => !isSample(SAMPLE_POSTS, r.id, r.authorName));
}

export function stripSampleConnections<T extends { id?: string; name?: string }>(rows: T[]): T[] {
  return rows.filter(r => !isSample(SAMPLE_CONNECTIONS, r.id, r.name));
}
