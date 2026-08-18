#!/bin/bash
cd ~/Desktop/FaithFinderApp

python3 << 'PYEOF'
content = open('app/(tabs)/community.tsx').read()

old = '''<ScrollView style={{flex:1}} keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingVertical:8}}>'''
new = '''<ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingVertical:8,paddingBottom:16}}>'''

if old in content:
    content = content.replace(old, new)
    open('app/(tabs)/community.tsx', 'w').write(content)
    print('ALL DONE')
else:
    print('ERROR: string not found')
PYEOF
