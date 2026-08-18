import { useState, useEffect } from 'react';

export type Notification = {
  id: string;
  type: 'like' | 'church_post' | 'event' | 'comment' | 'share' | 'invite' | 'verification';
  title: string;
  body: string;
  time: string;
  read: boolean;
  icon: string;
  color: string;
  navigateTo?: string;
  navigateParams?: Record<string, string>;
};

let notifications: Notification[] = [
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

const listeners: Array<() => void> = [];
function notify() { listeners.forEach(fn => fn()); }

export function getNotifications() { return [...notifications]; }
export function getUnreadCount() { return notifications.filter(n => !n.read).length; }

export function markRead(id: string) {
  notifications = notifications.map(n => n.id === id ? { ...n, read: true } : n);
  notify();
}

export function markAllRead() {
  notifications = notifications.map(n => ({ ...n, read: true }));
  notify();
}

export function addNotification(notif: Omit<Notification, 'id' | 'read'>) {
  notifications = [{ ...notif, id: Date.now().toString(), read: false }, ...notifications];
  notify();
}

export function useNotifications() {
  const [state, setState] = useState(getNotifications());
  useEffect(() => {
    const fn = () => setState(getNotifications());
    listeners.push(fn);
    return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };
  }, []);
  return state;
}

export function useUnreadCount() {
  const [count, setCount] = useState(getUnreadCount());
  useEffect(() => {
    const fn = () => setCount(getUnreadCount());
    listeners.push(fn);
    return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };
  }, []);
  return count;
}

export function clearAllNotifications() {
  notifications = [];
  notify();
}
export function clearNotification(id: string) {
  notifications = notifications.filter(n => n.id !== id);
  notify();
}
