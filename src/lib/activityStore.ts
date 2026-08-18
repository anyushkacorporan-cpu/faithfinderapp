import { useState, useEffect } from 'react';

export type ActivityItem = {
  id: string;
  type: 'like' | 'comment' | 'attending';
  postId?: string;
  postContent?: string;
  eventId?: string;
  eventTitle?: string;
  timestamp: number;
};

let activity: ActivityItem[] = [];
const listeners: Array<() => void> = [];
function notify() { listeners.forEach(fn => fn()); }

export function logActivity(item: Omit<ActivityItem, 'id' | 'timestamp'>) {
  const id = Date.now().toString() + Math.random().toString(36).slice(2);
  activity = [{ ...item, id, timestamp: Date.now() }, ...activity];
  console.log('ACTIVITY LOGGED:', item.type, '| total:', activity.length);
  notify();
}

export function removeActivityByPost(postId: string, type: 'like' | 'comment') {
  activity = activity.filter(a => !(a.postId === postId && a.type === type));
  notify();
}

export function getActivity(): ActivityItem[] {
  return [...activity].sort((a, b) => b.timestamp - a.timestamp);
}

export function useActivity() {
  const [state, setState] = useState(getActivity());
  useEffect(() => {
    const fn = () => setState(getActivity());
    listeners.push(fn);
    return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };
  }, []);
  return state;
}
