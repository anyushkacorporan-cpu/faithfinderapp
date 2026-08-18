import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_KEY = 'faithfinder_user_v1';

export type User = {
  accountType?: 'personal' | 'church';
  firstName?: string;
  lastName?: string;
  churchName?: string;
  email?: string;
  bio?: string;
  location?: string;
  phone?: string;
  website?: string;
  address?: string;
  serviceTimes?: string;
  avatar?: string;
  createdAt?: string;
};

let user: User = { createdAt: new Date().toISOString() };
let hydrated = false;
const listeners: Array<() => void> = [];
function notify() { listeners.forEach(fn => fn()); }

async function persist() {
  try { await AsyncStorage.setItem(USER_KEY, JSON.stringify(user)); } catch {}
}

async function hydrate() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = await AsyncStorage.getItem(USER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      user = { ...user, ...parsed };
      notify();
    }
  } catch {}
}
hydrate();

export function getUser(): User { return user; }

export function setUser(updates: Partial<User>) {
  user = { ...user, ...updates };
  persist();
  notify();
}

export async function signOut() {
  user = {};
  try { await AsyncStorage.removeItem(USER_KEY); } catch {}
  notify();
}

// Clears the profile stored on this device. Note: since there's no backend
// yet, this only removes local data — it doesn't delete server-side data
// (there isn't any) or content already posted elsewhere in the app.
export async function deleteAccount() {
  user = {};
  try { await AsyncStorage.removeItem(USER_KEY); } catch {}
  notify();
}

export function useUser(): User {
  const [state, setState] = useState(getUser());
  useEffect(() => {
    const fn = () => setState(getUser());
    listeners.push(fn);
    return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };
  }, []);
  return state;
}
