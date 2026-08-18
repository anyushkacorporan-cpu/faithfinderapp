path = '/Users/AnyushkaAriesCorporan/Desktop/FaithFinderApp/src/lib/settingsStore.ts'
with open(path, encoding='utf-8') as f:
    content = f.read()

old1 = "export type LocationPrefs = {\n  locationEnabled: boolean; nearbyChurches: boolean; nearbyEvents: boolean; locationNotifs: boolean;\n};"
new1 = """export type LocationPrefs = {
  locationEnabled: boolean; nearbyChurches: boolean; nearbyEvents: boolean; locationNotifs: boolean;
};

export type AppearancePrefs = {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  language: string;
};"""
c1 = content.count(old1)
print('type block occurrences:', c1)
if c1 == 1:
    content = content.replace(old1, new1)

old2 = "export type AppSettings = {\n  notifications: NotificationPrefs;\n  privacy: PrivacyPrefs;\n  location: LocationPrefs;\n};"
new2 = """export type AppSettings = {
  notifications: NotificationPrefs;
  privacy: PrivacyPrefs;
  location: LocationPrefs;
  appearance: AppearancePrefs;
};"""
c2 = content.count(old2)
print('AppSettings type occurrences:', c2)
if c2 == 1:
    content = content.replace(old2, new2)

old3 = "  location: {\n    locationEnabled: true, nearbyChurches: true, nearbyEvents: true, locationNotifs: false,\n  },\n};"
new3 = """  location: {
    locationEnabled: true, nearbyChurches: true, nearbyEvents: true, locationNotifs: false,
  },
  appearance: {
    theme: 'light', fontSize: 'medium', language: 'English',
  },
};"""
c3 = content.count(old3)
print('defaults occurrences:', c3)
if c3 == 1:
    content = content.replace(old3, new3)

old4 = "        location: { ...DEFAULT_SETTINGS.location, ...parsed.location },\n      };"
new4 = """        location: { ...DEFAULT_SETTINGS.location, ...parsed.location },
        appearance: { ...DEFAULT_SETTINGS.appearance, ...parsed.appearance },
      };"""
c4 = content.count(old4)
print('hydrate occurrences:', c4)
if c4 == 1:
    content = content.replace(old4, new4)

old5 = "export function updateLocationPrefs(updates: Partial<LocationPrefs>) {\n  settings = { ...settings, location: { ...settings.location, ...updates } };\n  persist();\n  notify();\n}"
new5 = """export function updateLocationPrefs(updates: Partial<LocationPrefs>) {
  settings = { ...settings, location: { ...settings.location, ...updates } };
  persist();
  notify();
}

export function updateAppearancePrefs(updates: Partial<AppearancePrefs>) {
  settings = { ...settings, appearance: { ...settings.appearance, ...updates } };
  persist();
  notify();
}"""
c5 = content.count(old5)
print('update function occurrences:', c5)
if c5 == 1:
    content = content.replace(old5, new5)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
