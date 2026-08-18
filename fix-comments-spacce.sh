#!/bin/bash
cd ~/Desktop/FaithFinderApp

sed -i '' 's/style={{flex:1}} keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingVertical:8}}/keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingVertical:8,paddingBottom:16}}/g' "app/(tabs)/community.tsx"

echo "ALL DONE"
