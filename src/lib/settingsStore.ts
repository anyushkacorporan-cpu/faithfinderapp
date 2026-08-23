import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = 'faithfinder_settings_v1';

export type NotificationPrefs = {
  likes: boolean; comments: boolean; shares: boolean;
  churchPosts: boolean; events: boolean; invites: boolean;
  verification: boolean; announcements: boolean;
};

export type PrivacyPrefs = {
  publicProfile: boolean; showLocation: boolean;
};

export type LocationPrefs = {
  locationEnabled: boolean; nearbyChurches: boolean; nearbyEvents: boolean;
};

export type AppearancePrefs = {
  theme: 'light' | 'dark' | 'system';
  language: string;
};

export type AppSettings = {
  notifications: NotificationPrefs;
  privacy: PrivacyPrefs;
  location: LocationPrefs;
  appearance: AppearancePrefs;
};

const DEFAULT_SETTINGS: AppSettings = {
  notifications: {
    likes: true, comments: true, shares: true,
    churchPosts: true, events: true, invites: true,
    verification: true, announcements: true,
  },
  privacy: {
    publicProfile: true, showLocation: false,
  },
  location: {
    locationEnabled: true, nearbyChurches: true, nearbyEvents: true,
  },
  appearance: {
    theme: 'light', language: 'English',
  },
};

let settings: AppSettings = DEFAULT_SETTINGS;
let hydrated = false;
const listeners: Array<() => void> = [];
function notify() { listeners.forEach(fn => fn()); }

async function persist() {
  try { await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch {}
}

async function hydrate() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      settings = {
        notifications: { ...DEFAULT_SETTINGS.notifications, ...parsed.notifications },
        privacy: { ...DEFAULT_SETTINGS.privacy, ...parsed.privacy },
        location: { ...DEFAULT_SETTINGS.location, ...parsed.location },
        appearance: { ...DEFAULT_SETTINGS.appearance, ...parsed.appearance },
      };
      notify();
    }
  } catch {}
}
hydrate();

export function getSettings(): AppSettings { return settings; }

export function updateNotificationPrefs(updates: Partial<NotificationPrefs>) {
  settings = { ...settings, notifications: { ...settings.notifications, ...updates } };
  persist();
  notify();
}

export function updatePrivacyPrefs(updates: Partial<PrivacyPrefs>) {
  settings = { ...settings, privacy: { ...settings.privacy, ...updates } };
  persist();
  notify();
}

export function updateLocationPrefs(updates: Partial<LocationPrefs>) {
  settings = { ...settings, location: { ...settings.location, ...updates } };
  persist();
  notify();
}

export function updateAppearancePrefs(updates: Partial<AppearancePrefs>) {
  settings = { ...settings, appearance: { ...settings.appearance, ...updates } };
  persist();
  notify();
}

export function useSettings(): AppSettings {
  const [state, setState] = useState(getSettings());
  useEffect(() => {
    const fn = () => setState(getSettings());
    listeners.push(fn);
    if (!hydrated) hydrate();
    return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };
  }, []);
  return state;
}
