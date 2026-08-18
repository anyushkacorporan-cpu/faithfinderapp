#!/bin/bash
cd ~/Desktop/FaithFinderApp

python3 - << 'PYEOF'
with open('app/(tabs)/community.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Print exact chars around the ScrollView to diagnose
idx = content.find('keyboardShouldPersistTaps')
if idx == -1:
    print('keyboardShouldPersistTaps not found at all')
else:
    chunk = content[idx-50:idx+120]
    print('FOUND AT', idx)
    for i, ch in enumerate(chunk):
        print(i, repr(ch), ord(ch))
PYEOF
