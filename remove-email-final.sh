#!/bin/bash
cd ~/Desktop/FaithFinderApp

python3 << 'PYEOF'
content = open('app/event-checkout.tsx').read()

# Find the line numbers of the email section and remove them
lines = content.split('\n')
new_lines = []
skip = False
for line in lines:
    if '// Send email via Mail app' in line:
        skip = True
    if 'Linking.openURL' in line and 'mailto' in line:
        skip = False
        continue
    if not skip:
        new_lines.append(line)

result = '\n'.join(new_lines)

# Remove Linking from import
result = result.replace(
    "import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking } from 'react-native';",
    "import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';"
)

# Remove footer note about mail
result = result.replace(
    " · Tickets sent to Mail app",
    ""
)

open('app/event-checkout.tsx', 'w').write(result)

# Verify
check = open('app/event-checkout.tsx').read()
if 'mailto' in check or 'Send email' in check:
    print('STILL THERE - failed')
else:
    print('ALL DONE - email removed successfully')
PYEOF
