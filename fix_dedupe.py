path = '/Users/AnyushkaAriesCorporan/Desktop/FaithFinderApp/src/lib/settingsStore.ts'
with open(path, encoding='utf-8') as f:
    content = f.read()

old1 = """export type AppearancePrefs = {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  language: string;
};

export type AppearancePrefs = {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  language: string;
};"""
new1 = """export type AppearancePrefs = {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  language: string;
};"""
c1 = content.count(old1)
print('duplicate type occurrences:', c1)
if c1 == 1:
    content = content.replace(old1, new1)

old2 = """export function updateAppearancePrefs(updates: Partial<AppearancePrefs>) {
  settings = { ...settings, appearance: { ...settings.appearance, ...updates } };
  persist();
  notify();
}

export function updateAppearancePrefs(updates: Partial<AppearancePrefs>) {
  settings = { ...settings, appearance: { ...settings.appearance, ...updates } };
  persist();
  notify();
}"""
new2 = """export function updateAppearancePrefs(updates: Partial<AppearancePrefs>) {
  settings = { ...settings, appearance: { ...settings.appearance, ...updates } };
  persist();
  notify();
}"""
c2 = content.count(old2)
print('duplicate function occurrences:', c2)
if c2 == 1:
    content = content.replace(old2, new2)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
