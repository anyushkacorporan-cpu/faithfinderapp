import { useState, useEffect } from 'react';
import { load, save } from './persist';
import { newId } from './ids';
import { getSettings, useSettings, NotificationPrefs } from './settingsStore';

// Maps each notification type to the preference toggle that controls it
// (Settings → Notification Preferences). When a toggle is off, notifications
// of that type are hidden from the list and the unread badge, and no new ones
// of that type are created.
const TYPE_PREF: Record<Notification['type'], keyof NotificationPrefs> = {
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
  type: 'like' | 'church_post' | 'event' | 'comment' | 'share' | 'invite' | 'verification' | 'announcement';
  title: string;
  body: string;
  time: string;
  read: boolean;
  icon: string;
  color: string;
  navigateTo?: string;
  navigateParams?: Record<string, string>;
};

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'like',
    title: 'John Smith liked your post',
    body: 'Your post is getting attention!',
    time: '2m ago',
    read: false,
    icon: 'heart',
    color: '#e74c6f',
    navigateTo: '/(tabs)/community',
  },
  {
    id: '2',
    type: 'church_post',
    title: 'Grace Community Church posted an update',
    body: 'What an incredible Sunday! Over 50 people came forward...',
    time: '1h ago',
    read: false,
    icon: 'home',
    color: '#c9a96e',
    navigateTo: '/(tabs)/community',
  },
  {
    id: '3',
    type: 'event',
    title: 'New event near you',
    body: 'Women of Purpose Conference — Apr 18-19 in Valley Stream, NY',
    time: '3h ago',
    read: false,
    icon: 'calendar',
    color: '#1a1a2e',
    navigateTo: '/event-detail',
    navigateParams: {
      id: '1',
      title: 'Women of Purpose Conference',
      description: 'Worship and fellowship for women.',
      date: 'Apr 18-19, 2026',
      location: 'Valley Stream, NY',
      type: 'Conference',
      price: 'Free',
    },
  },
  {
    id: '4',
    type: 'verification',
    title: 'Church verification under review',
    body: 'FaithFinder is reviewing your submission. 3-5 business days.',
    time: '5h ago',
    read: true,
    icon: 'shield-checkmark',
    color: '#2e7d32',
    navigateTo: '/(tabs)/profile',
  },
  {
    id: '5',
    type: 'comment',
    title: 'Sarah Johnson commented on your post',
    body: '"Amen! God is so good 🙏"',
    time: '1d ago',
    read: true,
    icon: 'chatbubble',
    color: '#667eea',
    navigateTo: '/(tabs)/community',
  },
];

let notifications: Notification[] = INITIAL_NOTIFICATIONS;

const listeners: Array<() => void> = [];
function notify() { listeners.forEach(fn => fn()); }

const STORAGE_KEY = 'faithfinder_notifications_v1';
function persist() { save(STORAGE_KEY, notifications); }
load<typeof notifications>(STORAGE_KEY, v => { notifications = v; notify(); });

export function getNotifications() { return [...notifications]; }
export function getUnreadCount() { return notifications.filter(n => !n.read).length; }

export function markRead(id: string) {
  notifications = notifications.map(n => n.id === id ? { ...n, read: true } : n);
  persist(); notify();
}

export function markAllRead() {
  notifications = notifications.map(n => ({ ...n, read: true }));
  persist(); notify();
}

export function addNotification(notif: Omit<Notification, 'id' | 'read'>) {
  // Respect the user's notification preferences: skip types they've turned off.
  if (!isTypeEnabled(notif.type)) return;
  notifications = [{ ...notif, id: newId(), read: false }, ...notifications];
  persist(); notify();
}

/**
 * Tell a church's followers it posted an announcement.
 *
 * This is a client-side stand-in. On a device there is exactly one account, so
 * the only follower we can reach is this user — and only if they actually
 * follow the church. That is the correct rule, just applied to an audience of
 * one; when the backend exists the server fans the same notification out to
 * every follower and this function becomes the call that asks it to.
 *
 * Respects the Announcements preference: addNotification drops it if the user
 * has that switch off.
 */
export function announceToFollowers(opts: {
  churchName: string;
  churchId?: string;
  body: string;
  postId: string;
}) {
  const { isConnected } = require('./connectionsStore');
  const followsChurch = isConnected(opts.churchId || opts.churchName);
  if (!followsChurch) return;

  addNotification({
    type: 'announcement',
    title: `${opts.churchName} posted an announcement`,
    body: opts.body.slice(0, 120),
    time: 'now',
    icon: 'megaphone',
    color: '#c9a96e',
    navigateTo: '/(tabs)/community',
  });
}

export function useNotifications() {
  const settings = useSettings(); // re-render when preferences change
  const [state, setState] = useState(getNotifications());
  useEffect(() => {
    const fn = () => setState(getNotifications());
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
    listeners.push(fn);
    return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };
  }, []);
  return notifs.filter(n => isTypeEnabled(n.type, settings.notifications) && !n.read).length;
}

export function clearAllNotifications() {
  notifications = [];
  persist(); notify();
}
export function clearNotification(id: string) {
  notifications = notifications.filter(n => n.id !== id);
  persist(); notify();
}

/**
 * Return this store to a fresh-install state. Called only from
 * `deleteAccountAndData` — see src/lib/accountDeletion.ts for why clearing
 * storage alone is not enough.
 */
export function resetStore() {
  notifications = INITIAL_NOTIFICATIONS;
  persist();
  notify();
}
