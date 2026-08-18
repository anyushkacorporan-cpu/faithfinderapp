#!/bin/bash
cd ~/Desktop/FaithFinderApp

python3 << 'PYEOF'
content = open('app/(tabs)/community.tsx').read()

# The comments ScrollView has flex:1 which forces it to fill the full modal height.
# Removing flex:1 lets it shrink-wrap its content, eliminating the empty space.
old = "<ScrollView style={{flex:1}} keyboardShouldPersistTaps=\"handled\">"
new = "<ScrollView keyboardShouldPersistTaps=\"handled\" contentContainerStyle={{paddingBottom:16}}>"

if old in content:
    content = content.replace(old, new)
    open('app/(tabs)/community.tsx', 'w').write(content)
    print('ALL DONE')
else:
    print('ERROR: string not found')
PYEOF
