import { useState, useEffect } from 'react';
import { load, save } from './persist';
import { newId } from './ids';
import { getSettings, useSettings, NotificationPrefs } from './settingsStore';
import * as api from './notificationsApi';

// Maps each notification type to the preference toggle that controls it
// (Settings → Notification Preferences). When a toggle is off, notifications
// of that type are hidden from the list and the unread badge, and no new ones
// of that type are created.
// Partial, not total: a type may have no toggle. 'follow' has none — there is
// no "follows" switch in Settings — and isTypeEnabled below already reads a
// missing key as on, which is the behaviour wanted rather than an oversight.
const TYPE_PREF: Partial<Record<Notification['type'], keyof NotificationPrefs>> = {
  like: 'likes',
  comment: 'comments',
  share: 'shares',
  church_post: 'churchPosts',
  event: 'events',
  invite: 'invites',
  verification: 'verification',
  announcement: 'announcements',
};

function isTypeEnabled(type: Notification['type'], prefs = getSettings().notifications): boolean {
  const key = TYPE_PREF[type];
  return key ? prefs[key] !== false : true;
}

export type Notification = {
  id: string;
  type: 'like' | 'church_post' | 'event' | 'comment' | 'share' | 'invite' | 'verification' | 'announcement' | 'follow';
  title: string;
  body: string;
  time: string;
  read: boolean;
  icon: string;
  color: string;
  navigateTo?: string;
  navigateParams?: Record<string, string>;
  /** When it happened. `time` is only the string this was last rendered as. */
  createdAt?: number;
};

/**
 * A new install has no notifications.
 *
 * This used to hold three invented ones — a like from "John Smith", an update
 * from a church that does not exist — shown identically to every account on
 * first run. They were demo dressing from before there was a server, and they
 * outlived it: real notifications now arrive from the database, and a fake one
 * sitting above them is indistinguishable from a bug.
 */
let notifications: Notification[] = [];


const listeners: Array<() => void> = [];
/**
 * Notify subscribers over a copy of the list.
 *
 * A subscriber's setState can unmount a component, whose cleanup splices itself
 * out of `listeners` while forEach is still walking it — every listener after
 * the removed index is then skipped and silently misses that update. Iterating
 * a snapshot means the removal takes effect on the next notify instead of
 * halfway through this one.
 */
function notify() { [...listeners].forEach(fn => fn()); }

const STORAGE_KEY = 'faithfinder_notifications_v1';
function persist() { save(STORAGE_KEY, notifications); }
load<typeof notifications>(STORAGE_KEY, v => { notifications = v; notify(); });

export function getNotifications() { return [...notifications]; }
/**
 * Unread count, counting only types the user has switched on - the same rule
 * the badge and the notifications list use. Without the type filter this
 * returned a different number than the badge showed, which is precisely the
 * kind of quiet disagreement that makes a count look buggy.
 */
export function getUnreadCount() {
  return notifications.filter(n => isTypeEnabled(n.type) && !n.read).length;
}

// Each of these changes the list here first and tells the server after. The
// bell responds to the tap; the round trip is not something anyone should have
// to watch. A failed write is corrected by the next sync.
export function markRead(id: string) {
  notifications = notifications.map(n => n.id === id ? { ...n, read: true } : n);
  persist(); notify();
  void api.setRead(id);
}

export function markAllRead() {
  notifications = notifications.map(n => ({ ...n, read: true }));
  persist(); notify();
  void api.setAllRead();
}

export function addNotification(notif: Omit<Notification, 'id' | 'read'>) {
  // Respect the user's notification preferences: skip types they've turned off.
  if (!isTypeEnabled(notif.type)) return;
  notifications = [{ ...notif, id: newId(), read: false }, ...notifications];
  persist(); notify();
}

export function useNotifications() {
  const settings = useSettings(); // re-render when preferences change
  const [state, setState] = useState(getNotifications());
  useEffect(() => {
    const fn = () => setState(getNotifications());
    // Re-read on subscribe: hydration from storage can land between the
    // useState initialiser above and this effect, and that notify would be
    // missed - leaving this component on the empty pre-hydration value until
    // something else happened to change the store.
    fn();
    listeners.push(fn);
    return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };
  }, []);
  return state.filter(n => isTypeEnabled(n.type, settings.notifications));
}

export function useUnreadCount() {
  const settings = useSettings(); // re-render when preferences change
  const [notifs, setNotifs] = useState(getNotifications());
  useEffect(() => {
    const fn = () => setNotifs(getNotifications());
    // Re-read on subscribe: hydration from storage can land between the
    // useState initialiser above and this effect, and that notify would be
    // missed - leaving this component on the empty pre-hydration value until
    // something else happened to change the store.
    fn();
    listeners.push(fn);
    return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };
  }, []);
  return notifs.filter(n => isTypeEnabled(n.type, settings.notifications) && !n.read).length;
}

export function clearAllNotifications() {
  notifications = [];
  persist(); notify();
  void api.removeAll();
}
export function clearNotification(id: string) {
  notifications = notifications.filter(n => n.id !== id);
  persist(); notify();
  void api.removeNotification(id);
}

/**
 * Bring the bell in from the server.
 *
 * A straight replacement, unlike the feed's sync: every notification is made
 * server-side, so there is no local-only set to preserve. Anything held here
 * that the server does not have is a leftover from before this existed.
 */
export async function syncNotificationsFromServer(): Promise<void> {
  const remote = await api.fetchNotifications();
  if (!remote) return;
  notifications = remote;
  persist();
  notify();
}

/**
 * Return this store to a fresh-install state. Called only from
 * `deleteAccountAndData` — see src/lib/accountDeletion.ts for why clearing
 * storage alone is not enough.
 */
export function resetStore() {
  notifications = [];
  persist();
  notify();
}
