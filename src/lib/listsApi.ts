import { supabase, writeFailed } from './supabase';
import { getAuthUser } from './auth';

/**
 * The per-person lists: saved events, saved churches, and posts hidden from
 * view.
 *
 * Small, private, and previously device-only — saving an event then signing in
 * elsewhere lost the list, and a post hidden on one phone came back on the
 * next. All are stored without a foreign key to what they name, because an id
 * here can be a seeded demo event or a post written offline that has not been
 * uploaded. A row pointing at something absent is harmless; the screens already
 * ignore ids they cannot resolve.
 *
 * Saved churches are the exception to the id-only shape below, and carry the
 * church itself. supabase/22_saved_churches.sql says why: two of the three
 * places a church can come from cannot be fetched back by id, so an id alone
 * is a row that cannot be drawn.
 */

async function ids(table: string, column: string): Promise<string[] | null> {
  const db = supabase();
  const me = getAuthUser();
  if (!db || !me) return null;
  const { data, error } = await db.from(table).select(column).eq('user_id', me.id);
  if (error) { writeFailed(`read ${table}`, error); return null; }
  return (data || []).map((r: any) => r[column]).filter(Boolean);
}

async function add(table: string, column: string, id: string): Promise<void> {
  const db = supabase();
  const me = getAuthUser();
  if (!db || !me || !id) return;
  const { error } = await db.from(table)
    .upsert({ user_id: me.id, [column]: id }, { onConflict: `user_id,${column}` });
  writeFailed(`add to ${table}`, error);
}

async function remove(table: string, column: string, id: string): Promise<void> {
  const db = supabase();
  const me = getAuthUser();
  if (!db || !me || !id) return;
  const { error } = await db.from(table).delete().eq('user_id', me.id).eq(column, id);
  writeFailed(`remove from ${table}`, error);
}

export const fetchSavedEvents = () => ids('saved_events', 'event_id');
export const saveEventRemote = (id: string) => add('saved_events', 'event_id', id);
export const unsaveEventRemote = (id: string) => remove('saved_events', 'event_id', id);

export const fetchHiddenPosts = () => ids('hidden_posts', 'post_id');
export const hidePostRemote = (id: string) => add('hidden_posts', 'post_id', id);
export const unhidePostRemote = (id: string) => remove('hidden_posts', 'post_id', id);

/**
 * Saved churches, which travel with their church rather than as bare ids.
 *
 * `fetchSavedChurches` returns null for "the read failed" and [] for "nothing
 * saved", the same distinction the rest of this file keeps — the caller unions
 * against what it already has and must not treat a failure as an empty list.
 */
export async function fetchSavedChurches(): Promise<Array<Record<string, any>> | null> {
  const db = supabase();
  const me = getAuthUser();
  if (!db || !me) return null;
  const { data, error } = await db.from('saved_churches')
    .select('church_id,church')
    .eq('user_id', me.id);
  if (error) { writeFailed('read saved_churches', error); return null; }
  // The id is stored in its own column so it can be a primary key, and inside
  // the snapshot because that is where the app reads it. The column wins: it is
  // what the row was keyed and deleted by.
  return (data || [])
    .map((r: any) => (r.church && typeof r.church === 'object' ? { ...r.church, id: r.church_id } : null))
    .filter(Boolean) as Array<Record<string, any>>;
}

export async function saveChurchRemote(church: { id: string; [k: string]: any }): Promise<void> {
  const db = supabase();
  const me = getAuthUser();
  if (!db || !me || !church?.id) return;
  const { error } = await db.from('saved_churches').upsert(
    { user_id: me.id, church_id: church.id, church },
    { onConflict: 'user_id,church_id' },
  );
  writeFailed('add to saved_churches', error);
}

/**
 * Returns whether the row is gone from the server.
 *
 * The caller needs to know, unlike the other writes here. A save that fails is
 * recovered by the union on the next sync; an unsave that fails is *undone* by
 * it, because the server still has a row the phone no longer does and the union
 * treats that as something to keep. False means "still there, ask again".
 *
 * Not signed in counts as done: there is no row of theirs to remove.
 */
export async function unsaveChurchRemote(id: string): Promise<boolean> {
  const db = supabase();
  const me = getAuthUser();
  if (!id) return true;
  if (!db || !me) return false;
  const { error } = await db.from('saved_churches')
    .delete().eq('user_id', me.id).eq('church_id', id);
  return !writeFailed('remove from saved_churches', error);
}
