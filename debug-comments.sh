#!/bin/bash
cd ~/Desktop/FaithFinderApp

python3 << 'PYEOF'
content = open('app/(tabs)/community.tsx').read()
# Find the comments modal ScrollView
idx = content.find('showComments')
print(repr(content[idx:idx+2000]))
PYEOF
