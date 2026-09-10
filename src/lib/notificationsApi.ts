import { supabase } from './supabase';
import { getAuthUser } from './auth';
import type { Notification } from './notificationsStore';

/**
 * Notifications, on the server.
 *
 * Nothing here creates one. They are made by triggers beside the like, comment
 * or follow that caused them (13_notifications.sql) — a client cannot write
 * into someone else's bell, and cannot decline to ring it either. This module
 * only reads them and marks them read.
 */

type Row = {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  type: string;
  body: string | null;
  post_id: string | null;
  comment_id: string | null;
  read: boolean;
  created_at: string;
};

/**
 * The sentence, composed here rather than stored.
 *
 * The server keeps who did what; the words are the app's, so a notification
 * made while this phone was offline still arrives in the reader's language and
 * still uses the actor's current name.
 */
function compose(r: Row): { title: string; icon: string; color: string } {
  const who = r.actor_name || 'Someone';
  switch (r.type) {
    case 'like':
      return { title: `${who} liked your post`, icon: 'heart', color: '#e74c6f' };
    case 'comment':
      return { title: `${who} commented on your post`, icon: 'chatbubble', color: '#667eea' };
    case 'reply':
      return { title: `${who} replied to you`, icon: 'chatbubble-ellipses', color: '#667eea' };
    case 'follow':
      return { title: `${who} started following you`, icon: 'person-add', color: '#4a9d7f' };
    case 'announcement':
      return { title: `${who} posted an announcement`, icon: 'megaphone', color: '#c9a96e' };
    default:
      return { title: who, icon: 'notifications', color: '#c9a96e' };
  }
}

/** A server row in the shape the screens already read. */
function rowToNotification(r: Row): Notification {
  const { title, icon, color } = compose(r);
  return {
    id: r.id,
    // 'reply' is a comment as far as the preference toggles are concerned:
    // someone who turned comments off does not want to hear about replies.
    type: (r.type === 'reply' ? 'comment' : r.type) as Notification['type'],
    title,
    body: r.body || '',
    createdAt: new Date(r.created_at).getTime(),
    // A rendered fallback only. The screen ages `createdAt` on every render, so
    // a bell left open for an hour does not keep saying "2 minutes ago".
    time: '',
    read: r.read,
    icon,
    color,
    navigateTo: r.post_id ? '/comments' : '/(tabs)/community',
    navigateParams: r.post_id ? { postId: r.post_id } : undefined,
  };
}

export async function fetchNotifications(limit = 100): Promise<Notification[] | null> {
  const db = supabase();
  const me = getAuthUser();
  if (!db || !me) return null;

  const { data, error } = await db
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error || !data) return null;
  return (data as Row[]).map(rowToNotification);
}

export async function setRead(id: string): Promise<void> {
  const db = supabase();
  if (!db) return;
  await db.from('notifications').update({ read: true }).eq('id', id);
}

export async function setAllRead(): Promise<void> {
  const db = supabase();
  const me = getAuthUser();
  if (!db || !me) return;
  await db.from('notifications').update({ read: true }).eq('user_id', me.id).eq('read', false);
}

export async function removeNotification(id: string): Promise<void> {
  const db = supabase();
  if (!db) return;
  await db.from('notifications').delete().eq('id', id);
}

export async function removeAll(): Promise<void> {
  const db = supabase();
  const me = getAuthUser();
  if (!db || !me) return;
  await db.from('notifications').delete().eq('user_id', me.id);
}
