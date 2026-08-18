import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

with open('src/lib/userStore.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the debug log we added earlier
content = content.replace(
    "  console.log('LOCATION CHECK -> user.location:', JSON.stringify(user.location), '| showLocation:', showLocation);\n",
    ""
)

old_import = "import { useState, useEffect } from 'react';"
new_import = "import { useState, useEffect } from 'react';\nimport AsyncStorage from '@react-native-async-storage/async-storage';\n\nconst USER_KEY = 'faithfinder_user_v1';"
if old_import in content:
    content = content.replace(old_import, new_import)
    print('AsyncStorage imported')
else:
    print('ERROR: import anchor not found')

old_init = "let user: User = { createdAt: new Date().toISOString() };\nconst listeners: Array<() => void> = [];\nfunction notify() { listeners.forEach(fn => fn()); }"
new_init = """let user: User = { createdAt: new Date().toISOString() };
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
hydrate();"""

if old_init in content:
    content = content.replace(old_init, new_init)
    print('Persistence logic added')
else:
    print('ERROR: init block not found exactly')

old_setuser = """export function setUser(updates: Partial<User>) {
  user = { ...user, ...updates };
  notify();
}"""
new_setuser = """export function setUser(updates: Partial<User>) {
  user = { ...user, ...updates };
  persist();
  notify();
}"""

if old_setuser in content:
    content = content.replace(old_setuser, new_setuser)
    print('setUser now persists')
else:
    print('ERROR: setUser not found exactly')

with open('src/lib/userStore.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print('ALL DONE')
