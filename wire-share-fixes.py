import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

# ===== church-detail.tsx =====
with open('app/church-detail.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_import_anchor = None
for line in content.split('\n')[:20]:
    if 'COLORS' in line and 'import' in line:
        old_import_anchor = line
        break

if old_import_anchor and 'shareLinks' not in content:
    content = content.replace(
        old_import_anchor,
        old_import_anchor + "\nimport { buildChurchShareText } from '../src/lib/shareLinks';",
        1
    )
    print('shareLinks imported into church-detail.tsx')

old_share_block = """                    const shareText = 'Check out ' + church.name + ' on FaithFinder' + church.address + (church.website ? ' ' + church.website : '');
                    if (opt.label === 'Messages') {
                      Linking.openURL('sms:&body=' + encodeURIComponent(shareText));
                    } else if (opt.label === 'Email') {
                      Linking.openURL('mailto:?subject=' + encodeURIComponent(church.name) + '&body=' + encodeURIComponent(shareText));
                    } else {
                      Share.share({
                        title: church.name,
                        message: 'Check out ' + church.name + ' on FaithFinder! ' + church.address,
                      }).catch(() => {});
                    }"""

new_share_block = """                    const shareText = buildChurchShareText({
                      name: church.name,
                      description: church.address,
                      churchId: params.id || placeId || church.name,
                    });
                    if (opt.label === 'Messages') {
                      Linking.openURL('sms:&body=' + encodeURIComponent(shareText)).catch(() => {});
                    } else if (opt.label === 'Email') {
                      Linking.openURL('mailto:?subject=' + encodeURIComponent('Check out ' + church.name + ' on FaithFinder') + '&body=' + encodeURIComponent(shareText)).catch(() => {});
                    } else {
                      Share.share({
                        title: church.name,
                        message: shareText,
                      }).catch(() => {});
                    }"""

if old_share_block in content:
    content = content.replace(old_share_block, new_share_block)
    print('church-detail.tsx share block updated with real link + description')
else:
    print('ERROR: church-detail.tsx share block not found exactly')

with open('app/church-detail.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

# ===== event-detail.tsx =====
with open('app/event-detail.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_import_anchor2 = None
for line in content.split('\n')[:20]:
    if 'COLORS' in line and 'import' in line:
        old_import_anchor2 = line
        break

if old_import_anchor2 and 'shareLinks' not in content:
    content = content.replace(
        old_import_anchor2,
        old_import_anchor2 + "\nimport { buildEventShareText } from '../src/lib/shareLinks';",
        1
    )
    print('shareLinks imported into event-detail.tsx')

# There are two occurrences of this pattern (two share composer sections) - replace both
old_pattern = """                <TouchableOpacity style={{alignItems:'center',gap:8}} onPress={() => {
                  const msg = params.title + ' — ' + params.date + ' at ' + params.location;
                  Linking.openURL('sms:&body=' + encodeURIComponent(msg)).catch(() => {});
                }}>
                  <View style={{width:54,height:54,borderRadius:16,backgroundColor:'#e8f8f0',alignItems:'center',justifyContent:'center'}}>
                    <Ionicons name="chatbubble-outline" size={22} color="#2ecc71"/>
                  </View>
                  <Text style={{fontSize:12,color:'#111',fontWeight:'600'}}>Messages</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{alignItems:'center',gap:8}} onPress={() => {
                  const msg = params.title + ' — ' + params.date + ' at ' + params.location;
                  Linking.openURL('mailto:?subject=' + encodeURIComponent(params.title) + '&body=' + encodeURIComponent(msg)).catch(() => {});
                }}>"""

new_pattern = """                <TouchableOpacity style={{alignItems:'center',gap:8}} onPress={() => {
                  const msg = buildEventShareText({ title: params.title || '', date: params.date, location: params.location, eventId: params.id || params.title || '' });
                  Linking.openURL('sms:&body=' + encodeURIComponent(msg)).catch(() => {});
                }}>
                  <View style={{width:54,height:54,borderRadius:16,backgroundColor:'#e8f8f0',alignItems:'center',justifyContent:'center'}}>
                    <Ionicons name="chatbubble-outline" size={22} color="#2ecc71"/>
                  </View>
                  <Text style={{fontSize:12,color:'#111',fontWeight:'600'}}>Messages</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{alignItems:'center',gap:8}} onPress={() => {
                  const msg = buildEventShareText({ title: params.title || '', date: params.date, location: params.location, eventId: params.id || params.title || '' });
                  Linking.openURL('mailto:?subject=' + encodeURIComponent(String(params.title || '')) + '&body=' + encodeURIComponent(msg)).catch(() => {});
                }}>"""

count = content.count(old_pattern)
content = content.replace(old_pattern, new_pattern)
print(f'event-detail.tsx Messages+Email pattern replaced {count} time(s)')

old_more_pattern = """                  const t = params.title || '';
                  const d = params.date || '';
                  const l = params.location || '';
                  setShowShareComposer(false);
                  setTimeout(() => {
                    Share.share({ title: t, message: t + ' — ' + d + ' at ' + l + '. Find it on FaithFinder!' }).catch(() => {});
                  }, 600);"""

new_more_pattern = """                  const t = params.title || '';
                  const d = params.date || '';
                  const l = params.location || '';
                  const fullMsg = buildEventShareText({ title: t, date: d, location: l, eventId: params.id || t });
                  setShowShareComposer(false);
                  setTimeout(() => {
                    Share.share({ title: t, message: fullMsg }).catch(() => {});
                  }, 600);"""

count2 = content.count(old_more_pattern)
content = content.replace(old_more_pattern, new_more_pattern)
print(f'event-detail.tsx More pattern replaced {count2} time(s)')

with open('app/event-detail.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('ALL DONE')
