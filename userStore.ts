import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_KEY = 'faithfinder_user_v1';
const ACCOUNTS_KEY = 'faithfinder_accounts_v1';

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
  profilePhoto?: string;
  coverPhoto?: string;
  lifeVerse?: string;
  lifeVerseRef?: string;
  photos?: string[];
  ministries?: string[];
  amenities?: Record<string, boolean>;
  denomination?: string;
  churchEmail?: string;
  createdAt?: string;
};

let user: User = { createdAt: new Date().toISOString() };
let accounts: Record<string, User> = {};
let hydrated = false;
const listeners: Array<() => void> = [];
function notify() { listeners.forEach(fn => fn()); }

function normalizeEmail(email?: string) {
  return (email || '').trim().toLowerCase();
}

async function persist() {
  try { await AsyncStorage.setItem(USER_KEY, JSON.stringify(user)); } catch {}
}

async function persistAccounts() {
  try { await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts)); } catch {}
}

async function hydrate() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = await AsyncStorage.getItem(USER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      user = { ...user, ...parsed };
    }
    const rawAccounts = await AsyncStorage.getItem(ACCOUNTS_KEY);
    if (rawAccounts) {
      accounts = JSON.parse(rawAccounts);
    }
    // Backfill: if there's already an active account from before this fix existed,
    // make sure it's captured in the accounts map so logging out and back in still finds it.
    const key = normalizeEmail(user.email);
    if (key && !accounts[key]) {
      accounts = { ...accounts, [key]: user };
      persistAccounts();
    }
    notify();
  } catch {}
}
hydrate();

export function getUser(): User { return user; }

export function setUser(updates: Partial<User>) {
  user = { ...user, ...updates };
  persist();
  // Keep the per-email account record in sync with every change,
  // so edits made while logged in are still there next time this email logs in.
  const key = normalizeEmail(user.email);
  if (key) {
    accounts = { ...accounts, [key]: user };
    persistAccounts();
  }
  notify();
}

// Returns true if an account was found and loaded for this email.
// Returns false if no account exists yet for this email (caller should prompt sign up).
export function loginWithEmail(email: string): boolean {
  const key = normalizeEmail(email);
  const existing = accounts[key];
  if (!existing) return false;
  user = { ...existing, email: key };
  persist();
  notify();
  return true;
}

export async function signOut() {
  user = {};
  try { await AsyncStorage.removeItem(USER_KEY); } catch {}
  // Note: accounts map is intentionally NOT cleared here, so the account
  // can still be found and restored the next time this email logs in.
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
