#!/bin/bash
cd ~/Desktop/FaithFinderApp

python3 << 'PYEOF'
content = open('app/(tabs)/community.tsx').read()
idx = content.find('showComments} animationType')
print(repr(content[idx:idx+1500]))
PYEOF
