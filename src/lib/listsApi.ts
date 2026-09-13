import { supabase, writeFailed } from './supabase';
import { getAuthUser } from './auth';

/**
 * The two per-person lists: saved events, and posts hidden from view.
 *
 * Small, private, and previously device-only — saving an event then signing in
 * elsewhere lost the list, and a post hidden on one phone came back on the
 * next. Both are stored without a foreign key to what they name, because an id
 * here can be a seeded demo event or a post written offline that has not been
 * uploaded. A row pointing at something absent is harmless; the screens already
 * ignore ids they cannot resolve.
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
