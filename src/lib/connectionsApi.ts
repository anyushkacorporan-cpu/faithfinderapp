import { supabase } from './supabase';
import { getAuthUser } from './auth';
import type { Connection } from './connectionsStore';

/**
 * Connections, on the server.
 *
 * Following someone was recorded on the phone, so the For You feed was built
 * from a list nobody else could see and a new device started you back at the
 * two seeded connections. Mirrors the local store, which stays as the thing
 * the screens read.
 */

export async function fetchConnections(): Promise<Connection[] | null> {
  const db = supabase();
  const me = getAuthUser();
  if (!db || !me) return null;

  const { data, error } = await db
    .from('connections')
    .select('target_id, target_name, target_type, target_color, target_initials, address, place_id')
    .eq('follower_id', me.id);

  if (error || !data) return null;
  return data.map(r => ({
    id: r.target_id,
    name: r.target_name,
    type: r.target_type as 'user' | 'church',
    color: r.target_color || '#667eea',
    initials: r.target_initials || r.target_name.slice(0, 2).toUpperCase(),
    address: r.address || undefined,
    placeId: r.place_id || undefined,
  }));
}

export async function pushConnection(c: Connection): Promise<void> {
  const db = supabase();
  const me = getAuthUser();
  if (!db || !me) return;

  // Upsert rather than insert: connecting from the feed and from the profile
  // screen produce the same row, and the second one must not be an error.
  await db.from('connections').upsert({
    follower_id: me.id,
    target_id: c.id,
    target_name: c.name,
    target_type: c.type,
    target_color: c.color,
    target_initials: c.initials,
    address: c.address ?? null,
    place_id: c.placeId ?? null,
  }, { onConflict: 'follower_id,target_id' });
}

/** Remove by id, place id or name — whichever the calling screen holds. */
export async function removeConnectionRemote(idOrName: string): Promise<void> {
  const db = supabase();
  const me = getAuthUser();
  if (!db || !me) return;

  // Three separate deletes, because the value could legitimately be any of the
  // three and an `or` filter that matches the wrong column removes nothing
  // while reporting success.
  await db.from('connections').delete().eq('follower_id', me.id).eq('target_id', idOrName);
  await db.from('connections').delete().eq('follower_id', me.id).eq('place_id', idOrName);
  await db.from('connections').delete().eq('follower_id', me.id).eq('target_name', idOrName);
}
