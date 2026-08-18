#!/usr/bin/env python3
import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

# ── Step 1: Fix notifications - add individual clear with Alert on long press ──
with open('src/components/Header.tsx', 'r', encoding='utf-8') as f:
    header = f.read()

# Make notification rows long-pressable to clear
old_notif_row = '<TouchableOpacity key={n.id} style={[s.notifRow, !n.read && s.notifRowUnread]} onPress={() => handleNotifTap(n)} activeOpacity={0.75}>'
new_notif_row = '''<TouchableOpacity key={n.id} style={[s.notifRow, !n.read && s.notifRowUnread]}
                  onPress={() => handleNotifTap(n)}
                  onLongPress={() => Alert.alert('Remove Notification', 'Remove this notification?', [
                    { text: 'Remove', style: 'destructive', onPress: () => clearNotification(n.id) },
                    { text: 'Cancel', style: 'cancel' },
                  ])}
                  activeOpacity={0.75}>'''

if old_notif_row in header:
    header = header.replace(old_notif_row, new_notif_row)
    with open('src/components/Header.tsx', 'w', encoding='utf-8') as f:
        f.write(header)
    print('Header.tsx notifications updated')
else:
    print('Header notification row not found - may already be updated')

# ── Step 2: Add scripture to community tab ────────────────────────────────────
with open('app/(tabs)/community.tsx', 'r', encoding='utf-8') as f:
    community = f.read()

SCRIPTURES = [
    { 'text': '"For I know the plans I have for you," declares the Lord, "plans to prosper you and not to harm you, plans to give you hope and a future."', 'ref': 'Jeremiah 29:11' },
    { 'text': '"I can do all this through him who gives me strength."', 'ref': 'Philippians 4:13' },
    { 'text': '"Trust in the Lord with all your heart and lean not on your own understanding."', 'ref': 'Proverbs 3:5' },
]

scripture_component = '''
// ── Daily Scripture ───────────────────────────────────────────────────────────
const SCRIPTURES = [
  { text: '"For I know the plans I have for you," declares the Lord, "plans to prosper you and not to harm you, plans to give you hope and a future."', ref: 'Jeremiah 29:11' },
  { text: '"I can do all this through him who gives me strength."', ref: 'Philippians 4:13' },
  { text: '"Trust in the Lord with all your heart and lean not on your own understanding."', ref: 'Proverbs 3:5' },
  { text: '"Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go."', ref: 'Joshua 1:9' },
  { text: '"The Lord is my shepherd, I lack nothing."', ref: 'Psalm 23:1' },
  { text: '"And we know that in all things God works for the good of those who love him."', ref: 'Romans 8:28' },
  { text: '"Come to me, all you who are weary and burdened, and I will give you rest."', ref: 'Matthew 11:28' },
];
const todayScripture = SCRIPTURES[new Date().getDay() % SCRIPTURES.length];

function ScriptureCard() {
  return (
    <View style={sc.card}>
      <View style={sc.topRow}>
        <Ionicons name="book-outline" size={14} color={COLORS.gold} />
        <Text style={sc.label}>Daily Scripture</Text>
      </View>
      <Text style={sc.text}>{todayScripture.text}</Text>
      <Text style={sc.ref}>{todayScripture.ref}</Text>
    </View>
  );
}

const sc = StyleSheet.create({
  card:{backgroundColor:COLORS.white,marginBottom:8,paddingHorizontal:16,paddingVertical:14,borderBottomWidth:1,borderTopWidth:1,borderColor:'rgba(201,169,110,0.2)',backgroundColor:'rgba(201,169,110,0.04)'},
  topRow:{flexDirection:'row',alignItems:'center',gap:6,marginBottom:8},
  label:{fontSize:11,fontWeight:'700',color:COLORS.gold,textTransform:'uppercase',letterSpacing:0.8},
  text:{fontSize:14,color:COLORS.navy,lineHeight:22,fontStyle:'italic',marginBottom:6},
  ref:{fontSize:12,fontWeight:'700',color:COLORS.gold},
});

'''

# Add scripture component before PostCard function
if 'function ScriptureCard' not in community:
    old_postcard = '// ── Post Card'
    community = community.replace(old_postcard, scripture_component + '// ── Post Card')

# Add ScriptureCard to the feed, right after the discover banner
old_banner_end = '''      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>'''
new_banner_end = '''      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        <ScriptureCard />'''

if 'ScriptureCard' not in community:
    community = community.replace(old_banner_end, new_banner_end)

with open('app/(tabs)/community.tsx', 'w', encoding='utf-8') as f:
    f.write(community)
print('community.tsx scripture added')

# ── Step 3: Rewrite profile.tsx ───────────────────────────────────────────────
with open('app/(tabs)/profile.tsx', 'r', encoding='utf-8') as f:
    profile = f.read()

# Find the return statement and replace it entirely
# Key fixes:
# 1. Remove Header (FaithFinder title)
# 2. Larger cover photo with notification/settings icons overlaid
# 3. Remove duplicate edit icon
# 4. Remove "Location not set"
# 5. Functional connections button
# 6. Functional edit profile button

# Fix 1: Remove "Location not set" text
profile = profile.replace(
    "user.location || 'Location not set'",
    "user.location || ''"
)
profile = profile.replace(
    "{!user.location && <Text style={s.locationNotSet}>Location not set</Text>}",
    ""
)

# Fix 2: Remove duplicate edit icon - find and remove second pencil icon
if profile.count('pencil-outline') > 1:
    # Find the second occurrence and remove that block
    idx1 = profile.find('pencil-outline')
    idx2 = profile.find('pencil-outline', idx1 + 1)
    # Remove the TouchableOpacity containing the second pencil
    start = profile.rfind('<TouchableOpacity', 0, idx2)
    end = profile.find('</TouchableOpacity>', idx2) + len('</TouchableOpacity>')
    profile = profile[:start] + profile[end:]
    print('Removed duplicate edit icon')

# Fix 3: Make Header disappear by removing <Header /> from profile
profile = profile.replace('<Header />\n        ', '')
profile = profile.replace('<Header />\n', '')

# Fix 4: Increase cover photo height
profile = profile.replace(
    'style={{ width: W, height: 260 }}',
    'style={{ width: W, height: 320 }}'
)
profile = profile.replace('height: 260,', 'height: 320,')
profile = profile.replace("height:260", "height:320")

# Fix 5: Add notification + settings icons on top of cover photo
# Find the photo banner/gallery and add overlay icons
old_gallery = '<View style={s.galleryWrap}>'
new_gallery = '''<View style={s.galleryWrap}>
              {/* Overlay icons on cover photo */}
              <View style={{position:'absolute',top:0,left:0,right:0,zIndex:10,flexDirection:'row',justifyContent:'flex-end',gap:8,paddingHorizontal:16,paddingTop:16}}>
                <TouchableOpacity style={s.coverIconBtn} onPress={() => router.push('/notifications' as any)}>
                  <Ionicons name="notifications-outline" size={20} color={COLORS.white} />
                </TouchableOpacity>
                <TouchableOpacity style={s.coverIconBtn} onPress={() => router.push('/settings' as any)}>
                  <Ionicons name="settings-outline" size={20} color={COLORS.white} />
                </TouchableOpacity>
              </View>'''

if old_gallery in profile:
    profile = profile.replace(old_gallery, new_gallery)
    print('Added overlay icons to gallery')

# Fix 6: Add coverIconBtn style
old_style_end = 'galleryWrap:{'
new_style_end = '''coverIconBtn:{width:36,height:36,borderRadius:18,backgroundColor:'rgba(0,0,0,0.4)',alignItems:'center',justifyContent:'center'},
  galleryWrap:{'''
profile = profile.replace(old_style_end, new_style_end)

# Fix 7: Make connections button navigate to connections screen
old_connections_btn = "onPress={() => Alert.alert('Connections', `You have ${connectionCount} connections`)}"
new_connections_btn = "onPress={() => router.push('/connections' as any)}"
profile = profile.replace(old_connections_btn, new_connections_btn)

with open('app/(tabs)/profile.tsx', 'w', encoding='utf-8') as f:
    f.write(profile)
print('profile.tsx updated')

# ── Step 4: Create connections screen ─────────────────────────────────────────
connections_screen = '''import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../src/lib/constants';
import { useConnections, removeConnection } from '../src/lib/connectionsStore';

export default function ConnectionsScreen() {
  const connections = useConnections();
  const churches = connections.filter(c => c.type === 'church');
  const people = connections.filter(c => c.type === 'user');

  function handleRemove(id: string, name: string) {
    Alert.alert('Disconnect', `Remove ${name} from your connections?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disconnect', style: 'destructive', onPress: () => removeConnection(id) },
    ]);
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.navy} />
        </TouchableOpacity>
        <Text style={s.title}>Connections</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {connections.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="people-outline" size={48} color="#ddd" />
            <Text style={s.emptyTitle}>No connections yet</Text>
            <Text style={s.emptySub}>Discover believers and churches in the Community tab</Text>
            <TouchableOpacity style={s.discoverBtn} onPress={() => { router.back(); }}>
              <Text style={s.discoverBtnTxt}>Go to Community</Text>
            </TouchableOpacity>
          </View>
        )}

        {churches.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Churches ({churches.length})</Text>
            {churches.map(c => (
              <TouchableOpacity key={c.id} style={s.row} onPress={() => router.push({ pathname: '/profile' as any, params: { id: c.id, name: c.name, initials: c.initials, color: c.color, type: c.type } })}>
                <View style={[s.avatar, { backgroundColor: c.color }]}>
                  <Text style={s.avatarTxt}>{c.initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{c.name}</Text>
                  <Text style={s.type}>Church</Text>
                </View>
                <TouchableOpacity style={s.removeBtn} onPress={() => handleRemove(c.id, c.name)}>
                  <Text style={s.removeTxt}>Remove</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {people.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>People ({people.length})</Text>
            {people.map(c => (
              <TouchableOpacity key={c.id} style={s.row} onPress={() => router.push({ pathname: '/profile' as any, params: { id: c.id, name: c.name, initials: c.initials, color: c.color, type: c.type } })}>
                <View style={[s.avatar, { backgroundColor: c.color }]}>
                  <Text style={s.avatarTxt}>{c.initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{c.name}</Text>
                  <Text style={s.type}>Member</Text>
                </View>
                <TouchableOpacity style={s.removeBtn} onPress={() => handleRemove(c.id, c.name)}>
                  <Text style={s.removeTxt}>Remove</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8f7f4' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 14, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: '#f0ede8' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.navy },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32, gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.navy },
  emptySub: { fontSize: 13, color: '#aaa', textAlign: 'center', lineHeight: 20 },
  discoverBtn: { marginTop: 8, backgroundColor: COLORS.navy, borderRadius: 22, paddingHorizontal: 28, paddingVertical: 12 },
  discoverBtnTxt: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  section: { backgroundColor: COLORS.white, marginTop: 8, paddingHorizontal: 16, paddingTop: 14 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f5f3ef' },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
  name: { fontSize: 15, fontWeight: '700', color: COLORS.navy },
  type: { fontSize: 12, color: '#aaa', marginTop: 2 },
  removeBtn: { borderWidth: 1, borderColor: '#e0dbd4', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 6 },
  removeTxt: { fontSize: 12, fontWeight: '600', color: '#888' },
});
'''

with open('app/connections.tsx', 'w', encoding='utf-8') as f:
    f.write(connections_screen)
print('connections.tsx created')

print('\nALL DONE')
