#!/bin/bash
cd ~/Desktop/FaithFinderApp

python3 << 'PYEOF'
content = open('app/church-detail.tsx').read()

# Find and replace the broken external options section
import re

old = re.search(r'\{/\* External share options \*/\}.*?</View>\s*\)</ScrollView>', content, re.DOTALL)
if old:
    print("Found external options section")

# Replace entire external options block
content = re.sub(
    r'\{/\* External share options \*/\}.*?(\s*\]\s*\)\s*\})',
    '''{/* External share options */}
            <View style={s.externalOptions}>
              <TouchableOpacity style={s.externalOption} onPress={() => {
                const msg = 'Check out ' + church.name + ' on FaithFinder! ' + church.address;
                Linking.openURL('sms:&body=' + encodeURIComponent(msg)).catch(() => {});
              }}>
                <View style={[s.externalOptionIcon, {backgroundColor:'#e8f8f0'}]}>
                  <Ionicons name="chatbubble-outline" size={22} color="#2ecc71" />
                </View>
                <Text style={s.externalOptionLabel}>Messages</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.externalOption} onPress={() => {
                const msg = 'Check out ' + church.name + ' on FaithFinder! ' + church.address;
                Linking.openURL('mailto:?subject=' + encodeURIComponent(church.name) + '&body=' + encodeURIComponent(msg)).catch(() => {});
              }}>
                <View style={[s.externalOptionIcon, {backgroundColor:'#eaf4fb'}]}>
                  <Ionicons name="mail-outline" size={22} color="#3498db" />
                </View>
                <Text style={s.externalOptionLabel}>Email</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.externalOption} onPress={() => {
                setShowShareComposer(false);
                setTimeout(handleExternalShare, 300);
              }}>
                <View style={[s.externalOptionIcon, {backgroundColor:'#f5eefb'}]}>
                  <Ionicons name="share-social-outline" size={22} color="#9b59b6" />
                </View>
                <Text style={s.externalOptionLabel}>More Options</Text>
              </TouchableOpacity>
            </View>''',
    content,
    flags=re.DOTALL
)

open('app/church-detail.tsx', 'w').write(content)
print('ALL DONE')
PYEOF
