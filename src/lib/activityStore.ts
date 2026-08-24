import { useState, useEffect } from 'react';
import { load, save } from './persist';
import { newId } from './ids';

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

const STORAGE_KEY = 'faithfinder_activity_v1';
function persist() { save(STORAGE_KEY, activity); }
load<typeof activity>(STORAGE_KEY, v => { activity = v; notify(); });

export function logActivity(item: Omit<ActivityItem, 'id' | 'timestamp'>) {
  activity = [{ ...item, id: newId(), timestamp: Date.now() }, ...activity];
  persist(); notify();
}

export function removeActivityByPost(postId: string, type: 'like' | 'comment') {
  activity = activity.filter(a => !(a.postId === postId && a.type === type));
  persist(); notify();
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
