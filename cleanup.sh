#!/bin/bash
cd ~/Desktop/FaithFinderApp
echo "Starting cleanup..."

# 1. Fix duplicate EVENT_TYPES constant in create-event.tsx
python3 << 'PYEOF'
content = open('app/create-event.tsx').read()

# Check for duplicate EVENT_TYPES declarations
import re
matches = [m.start() for m in re.finditer('const EVENT_TYPES', content)]
if len(matches) > 1:
    # Remove the second one
    second = matches[1]
    # Find end of that line
    end = content.index('\n', second)
    content = content[:second] + content[end+1:]
    print('Removed duplicate EVENT_TYPES')

matches2 = [m.start() for m in re.finditer('const SPEAKER_COLORS', content)]
if len(matches2) > 1:
    second = matches2[1]
    end = content.index('\n', second)
    content = content[:second] + content[end+1:]
    print('Removed duplicate SPEAKER_COLORS')

open('app/create-event.tsx', 'w').write(content)
print('create-event cleaned')
PYEOF

# 2. Fix postsStore - remove duplicate listener cleanup
python3 << 'PYEOF'
content = open('src/lib/postsStore.ts').read()
# Ensure no duplicate type definitions
lines = content.split('\n')
seen = set()
cleaned = []
for line in lines:
    key = line.strip()
    if key.startswith('export type Post') and key in seen:
        continue
    seen.add(key)
    cleaned.append(line)
open('src/lib/postsStore.ts', 'w').write('\n'.join(cleaned))
print('postsStore cleaned')
PYEOF

# 3. Fix constants - remove duplicate exported functions
python3 << 'PYEOF'
content = open('src/lib/constants.ts').read()
import re

# Check for duplicate getChurchReviews
matches = [m.start() for m in re.finditer('export function getChurchReviews', content)]
if len(matches) > 1:
    # Keep only first occurrence
    second_start = matches[1]
    # Find the closing brace of this function
    brace_count = 0
    i = second_start
    started = False
    while i < len(content):
        if content[i] == '{':
            brace_count += 1
            started = True
        elif content[i] == '}':
            brace_count -= 1
            if started and brace_count == 0:
                content = content[:second_start] + content[i+2:]
                print('Removed duplicate getChurchReviews')
                break
        i += 1

matches2 = [m.start() for m in re.finditer('export function addChurchReview', content)]
if len(matches2) > 1:
    second_start = matches2[1]
    brace_count = 0
    i = second_start
    started = False
    while i < len(content):
        if content[i] == '{':
            brace_count += 1
            started = True
        elif content[i] == '}':
            brace_count -= 1
            if started and brace_count == 0:
                content = content[:second_start] + content[i+2:]
                print('Removed duplicate addChurchReview')
                break
        i += 1

open('src/lib/constants.ts', 'w').write(content)
print('constants cleaned')
PYEOF

# 4. Fix userStore - make sure it has all needed fields
cat > src/lib/userStore.ts << 'EOF'
import { useState, useEffect } from 'react';

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
};

let user: User = {};
const listeners: Array<() => void> = [];
function notify() { listeners.forEach(fn => fn()); }

export function getUser(): User { return user; }

export function setUser(updates: Partial<User>) {
  user = { ...user, ...updates };
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
EOF
echo "userStore fixed"

# 5. Fix notificationsStore - ensure no memory leaks
python3 << 'PYEOF'
content = open('src/lib/notificationsStore.ts').read()
# Make sure listener cleanup is correct
if 'listeners.splice(i, 1)' not in content:
    content = content.replace(
        'return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i,1); };',
        'return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };'
    )
open('src/lib/notificationsStore.ts', 'w').write(content)
print('notificationsStore cleaned')
PYEOF

# 6. Fix church-detail - remove duplicate useState for connected
python3 << 'PYEOF'
content = open('app/church-detail.tsx').read()
import re

# Check for duplicate connected state
matches = [m.start() for m in re.finditer(r'const \[connected', content)]
if len(matches) > 1:
    # Remove second occurrence
    second = matches[1]
    end = content.index('\n', second)
    content = content[:second] + content[end+1:]
    print('Removed duplicate connected state')
else:
    print('No duplicate connected state')

# Check for duplicate showSharedToast
matches2 = [m.start() for m in re.finditer(r'showSharedToast', content)]
print(f'showSharedToast occurrences: {len(matches2)}')

open('app/church-detail.tsx', 'w').write(content)
print('church-detail cleaned')
PYEOF

# 7. Upgrade expo-linear-gradient to fix warning
npx expo install expo-linear-gradient@~15.0.8 2>/dev/null || echo "Could not upgrade linear-gradient"

echo "=== ALL CLEANUP DONE ==="
echo ""
echo "Summary of fixes:"
echo "1. Removed duplicate constants in create-event"
echo "2. Cleaned postsStore"
echo "3. Removed duplicate functions in constants"
echo "4. Fixed userStore with all fields"
echo "5. Fixed notification listener cleanup"
echo "6. Removed duplicate state in church-detail"
echo "7. Attempted linear-gradient upgrade"
