import { supabase, writeFailed } from './supabase';
import { getAuthUser } from './auth';
import type { Notification } from './notificationsStore';

/**
 * Notifications, on the server.
 *
 * Nothing here creates one. They are made by triggers beside the like, comment,
 * repost, event or invitation that caused them (13_notifications.sql and
 * 17_more_notifications.sql) — a client cannot write into someone else's bell,
 * and cannot decline to ring it either. This module only reads them and marks
 * them read.
 */

type Row = {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  type: string;
  body: string | null;
  post_id: string | null;
  comment_id: string | null;
  event_id: string | null;
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
    case 'share':
      return { title: `${who} shared your post`, icon: 'share-social', color: '#43e97b' };
    case 'church_post':
      return { title: `${who} posted an update`, icon: 'home', color: '#c9a96e' };
    case 'event':
      return { title: `${who} added a new event`, icon: 'calendar', color: '#1f3a5f' };
    case 'invite':
      return { title: `${who} invited you to an event`, icon: 'person-add', color: '#9b59b6' };
    // The only kind with no actor: it is the review answering, not a person
    // doing something. `body` carries the answer rather than a sentence, so
    // that the sentence can be written here.
    case 'verification':
      return r.body === 'approved'
        ? { title: 'Your church has been verified', icon: 'shield-checkmark', color: '#4a9d7f' }
        : { title: 'Your church verification was not approved', icon: 'shield-outline', color: '#e74c6f' };
    default:
      return { title: who, icon: 'notifications', color: '#c9a96e' };
  }
}

/**
 * Where tapping it should go.
 *
 * An event notification names an event and nothing else; a like names a post.
 * Verification has neither, and belongs on the profile that was verified.
 */
function destination(r: Row): Pick<Notification, 'navigateTo' | 'navigateParams'> {
  if (r.event_id) return { navigateTo: '/event-detail', navigateParams: { id: r.event_id } };
  if (r.post_id) return { navigateTo: '/comments', navigateParams: { postId: r.post_id } };
  if (r.type === 'verification') return { navigateTo: '/(tabs)/profile' };
  return { navigateTo: '/(tabs)/community' };
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
    // Verification puts its answer in `body` and spends it on the title above;
    // repeating 'approved' underneath would read as a stray word.
    body: r.type === 'verification' ? '' : (r.body || ''),
    // Passed through rather than folded into the title, so the list can show
    // whose notification it is as well as say it.
    actorName: r.actor_name || undefined,
    actorId: r.actor_id || undefined,
    createdAt: new Date(r.created_at).getTime(),
    // A rendered fallback only. The screen ages `createdAt` on every render, so
    // a bell left open for an hour does not keep saying "2 minutes ago".
    time: '',
    read: r.read,
    icon,
    color,
    ...destination(r),
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
  const { error } = await db.from('notifications').update({ read: true }).eq('id', id);
  writeFailed('mark a notification read', error);
}

export async function setAllRead(): Promise<void> {
  const db = supabase();
  const me = getAuthUser();
  if (!db || !me) return;
  const { error } = await db.from('notifications').update({ read: true }).eq('user_id', me.id).eq('read', false);
  writeFailed('mark all notifications read', error);
}

export async function removeNotification(id: string): Promise<void> {
  const db = supabase();
  if (!db) return;
  const { error } = await db.from('notifications').delete().eq('id', id);
  writeFailed('clear a notification', error);
}

export async function removeAll(): Promise<void> {
  const db = supabase();
  const me = getAuthUser();
  if (!db || !me) return;
  const { error } = await db.from('notifications').delete().eq('user_id', me.id);
  writeFailed('clear all notifications', error);
}

/**
 * Send this account's notification preferences to the server.
 *
 * They are made there — by triggers beside the like or comment that causes
 * them — so a preference kept only on the phone cannot stop one being written.
 * It could only hide it afterwards, which is what the switches used to do: the
 * row was still created, and turning a switch back on revealed everything that
 * had arrived while it was off.
 *
 * Fire and forget, like every other write here. A failed push leaves the server
 * on the previous answer and the next toggle sends the whole object again.
 */
export async function pushNotificationPrefs(prefs: Record<string, boolean>): Promise<void> {
  const db = supabase();
  const me = getAuthUser();
  if (!db || !me) return;
  const { error } = await db.from('profiles').update({ notification_prefs: prefs }).eq('id', me.id);
  writeFailed('save notification preferences', error);
}
