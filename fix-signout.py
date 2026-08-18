import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

# 1. Add signOut function to userStore.ts
with open('src/lib/userStore.ts', 'r', encoding='utf-8') as f:
    content = f.read()

old_setuser = """export function setUser(updates: Partial<User>) {
  user = { ...user, ...updates };
  persist();
  notify();
}"""

new_setuser = """export function setUser(updates: Partial<User>) {
  user = { ...user, ...updates };
  persist();
  notify();
}

export async function signOut() {
  user = {};
  try { await AsyncStorage.removeItem(USER_KEY); } catch {}
  notify();
}"""

if old_setuser in content:
    content = content.replace(old_setuser, new_setuser)
    print('signOut function added to userStore.ts')
else:
    print('ERROR: setUser block not found exactly')

with open('src/lib/userStore.ts', 'w', encoding='utf-8') as f:
    f.write(content)

# 2. Wire it into Header.tsx's Sign Out action
with open('src/components/Header.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_import = "import { useNotifications, useUnreadCount, markRead, markAllRead, clearAllNotifications, clearNotification } from '../lib/notificationsStore';"
new_import = old_import + "\nimport { signOut } from '../lib/userStore';"
if old_import in content:
    content = content.replace(old_import, new_import)
    print('signOut imported into Header.tsx')
else:
    print('ERROR: notificationsStore import not found')

old_signout_action = """                if (item.label === 'Sign Out') {
                  router.replace('/login');
                } else if (item.label === 'Create Event') {"""

new_signout_action = """                if (item.label === 'Sign Out') {
                  signOut();
                  router.replace('/login');
                } else if (item.label === 'Create Event') {"""

if old_signout_action in content:
    content = content.replace(old_signout_action, new_signout_action)
    print('Sign Out now actually clears user data')
else:
    print('ERROR: Sign Out action block not found exactly')

with open('src/components/Header.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('ALL DONE')
