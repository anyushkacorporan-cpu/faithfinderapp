import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

# ===== 1. settings-notifications.tsx =====
notif_screen = '''import { View, Text, Switch, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../src/lib/constants';
import { useSettings, updateNotificationPrefs, NotificationPrefs } from '../src/lib/settingsStore';

export default function NotificationSettingsScreen() {
  const settings = useSettings();
  const prefs = settings.notifications;

  function toggle(key: keyof NotificationPrefs) {
    updateNotificationPrefs({ [key]: !prefs[key] });
  }

  const items = [
    { key: 'likes', label: 'Likes', desc: 'When someone likes your post', icon: 'heart-outline', color: COLORS.red },
    { key: 'comments', label: 'Comments', desc: 'When someone comments on your post', icon: 'chatbubble-outline', color: '#667eea' },
    { key: 'shares', label: 'Shares', desc: 'When someone shares your post', icon: 'share-social-outline', color: '#43e97b' },
    { key: 'churchPosts', label: 'Church Updates', desc: 'When a connected church posts', icon: 'home-outline', color: COLORS.gold },
    { key: 'events', label: 'Events', desc: 'New events near you', icon: 'calendar-outline', color: COLORS.navy },
    { key: 'invites', label: 'Invitations', desc: 'When someone invites you', icon: 'person-add-outline', color: '#9b59b6' },
    { key: 'verification', label: 'Verification Updates', desc: 'Church verification status', icon: 'shield-checkmark-outline', color: COLORS.green },
    { key: 'announcements', label: 'App Announcements', desc: 'News and updates from FaithFinder', icon: 'megaphone-outline', color: '#e67e22' },
  ] as const;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.navy} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>Notification Preferences</Text>
        <View style={{width:36}} />
      </View>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.sectionDesc}>Choose which notifications you'd like to receive. Changes save automatically.</Text>
        <View style={s.card}>
          {items.map((item, i) => (
            <View key={item.key} style={[s.row, i < items.length-1 && s.rowBorder]}>
              <View style={[s.iconWrap, { backgroundColor: item.color + '18' }]}>
                <Ionicons name={item.icon as any} size={20} color={item.color} />
              </View>
              <View style={s.rowInfo}>
                <Text style={s.rowLabel}>{item.label}</Text>
                <Text style={s.rowDesc}>{item.desc}</Text>
              </View>
              <Switch
                value={prefs[item.key]}
                onValueChange={() => toggle(item.key)}
                trackColor={{ false: '#ddd', true: COLORS.navy }}
                thumbColor={COLORS.white}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:'#f8f7f4'},
  hdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:12,borderBottomWidth:1,borderBottomColor:COLORS.border,backgroundColor:COLORS.white},
  backBtn:{width:36,height:36,borderRadius:18,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'},
  hdrTitle:{fontSize:16,fontWeight:'700',color:COLORS.navy},
  scroll:{padding:20},
  sectionDesc:{fontSize:14,color:'#888',marginBottom:16,lineHeight:20},
  card:{backgroundColor:COLORS.white,borderRadius:16,borderWidth:1,borderColor:COLORS.border,overflow:'hidden',marginBottom:20},
  row:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:14,gap:12},
  rowBorder:{borderBottomWidth:1,borderBottomColor:'#f5f3ef'},
  iconWrap:{width:40,height:40,borderRadius:12,alignItems:'center',justifyContent:'center'},
  rowInfo:{flex:1},
  rowLabel:{fontSize:14,fontWeight:'600',color:COLORS.navy,marginBottom:2},
  rowDesc:{fontSize:12,color:'#aaa'},
});
'''
with open('app/settings-notifications.tsx', 'w', encoding='utf-8') as f:
    f.write(notif_screen)
print('settings-notifications.tsx rewritten with persistence')

# ===== 2. settings-privacy.tsx =====
privacy_screen = '''import { View, Text, Switch, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../src/lib/constants';
import { useSettings, updatePrivacyPrefs } from '../src/lib/settingsStore';

export default function PrivacySettingsScreen() {
  const settings = useSettings();
  const { publicProfile, showLocation, allowMessages } = settings.privacy;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.navy} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>Privacy & Security</Text>
        <View style={{width:36}} />
      </View>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.sectionLabel}>Privacy</Text>
        <View style={s.card}>
          <View style={[s.row, s.rowBorder]}>
            <View style={[s.iconWrap, {backgroundColor:'rgba(26,26,46,0.08)'}]}>
              <Ionicons name="person-outline" size={20} color={COLORS.navy} />
            </View>
            <View style={s.rowInfo}>
              <Text style={s.rowLabel}>Public Profile</Text>
              <Text style={s.rowDesc}>Allow others to view your profile</Text>
            </View>
            <Switch value={publicProfile} onValueChange={(v) => updatePrivacyPrefs({publicProfile:v})} trackColor={{false:'#ddd',true:COLORS.navy}} thumbColor={COLORS.white} />
          </View>
          <View style={[s.row, s.rowBorder]}>
            <View style={[s.iconWrap, {backgroundColor:'#e8f5e9'}]}>
              <Ionicons name="location-outline" size={20} color={COLORS.green} />
            </View>
            <View style={s.rowInfo}>
              <Text style={s.rowLabel}>Show Location on Profile</Text>
              <Text style={s.rowDesc}>Display your city on your profile</Text>
            </View>
            <Switch value={showLocation} onValueChange={(v) => updatePrivacyPrefs({showLocation:v})} trackColor={{false:'#ddd',true:COLORS.navy}} thumbColor={COLORS.white} />
          </View>
          <View style={s.row}>
            <View style={[s.iconWrap, {backgroundColor:'rgba(201,169,110,0.12)'}]}>
              <Ionicons name="chatbubble-outline" size={20} color={COLORS.gold} />
            </View>
            <View style={s.rowInfo}>
              <Text style={s.rowLabel}>Allow Messages</Text>
              <Text style={s.rowDesc}>Let other members message you</Text>
            </View>
            <Switch value={allowMessages} onValueChange={(v) => updatePrivacyPrefs({allowMessages:v})} trackColor={{false:'#ddd',true:COLORS.navy}} thumbColor={COLORS.white} />
          </View>
        </View>

        <Text style={s.sectionLabel}>Security</Text>
        <View style={s.card}>
          <TouchableOpacity style={s.row} onPress={() => Alert.alert('Coming Soon', 'Two-factor authentication is in development and will be available in a future update.')}>
            <View style={[s.iconWrap, {backgroundColor:'#fce4ec'}]}>
              <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.red} />
            </View>
            <View style={s.rowInfo}>
              <Text style={s.rowLabel}>Two-Factor Authentication</Text>
              <Text style={s.rowDesc}>Coming soon</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#ddd" />
          </TouchableOpacity>
        </View>

        <Text style={s.sectionDesc}>Need to delete your account? Contact support@faithfinderapp.com and we'll help you right away.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:'#f8f7f4'},
  hdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:12,borderBottomWidth:1,borderBottomColor:COLORS.border,backgroundColor:COLORS.white},
  backBtn:{width:36,height:36,borderRadius:18,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'},
  hdrTitle:{fontSize:16,fontWeight:'700',color:COLORS.navy},
  scroll:{padding:20},
  sectionLabel:{fontSize:12,fontWeight:'700',color:'#aaa',textTransform:'uppercase',letterSpacing:0.5,marginBottom:10,marginTop:4},
  sectionDesc:{fontSize:13,color:'#999',lineHeight:19,marginTop:8,paddingHorizontal:4},
  card:{backgroundColor:COLORS.white,borderRadius:16,borderWidth:1,borderColor:COLORS.border,overflow:'hidden',marginBottom:16},
  row:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:14,gap:12},
  rowBorder:{borderBottomWidth:1,borderBottomColor:'#f5f3ef'},
  iconWrap:{width:40,height:40,borderRadius:12,alignItems:'center',justifyContent:'center'},
  rowInfo:{flex:1},
  rowLabel:{fontSize:14,fontWeight:'600',color:COLORS.navy,marginBottom:2},
  rowDesc:{fontSize:12,color:'#aaa'},
});
'''
with open('app/settings-privacy.tsx', 'w', encoding='utf-8') as f:
    f.write(privacy_screen)
print('settings-privacy.tsx rewritten with persistence (2FA honest, Delete Account removed - see note)')

# ===== 3. settings-location.tsx =====
location_screen = '''import { View, Text, Switch, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../src/lib/constants';
import { useSettings, updateLocationPrefs } from '../src/lib/settingsStore';

export default function LocationSettingsScreen() {
  const settings = useSettings();
  const { locationEnabled, nearbyChurches, nearbyEvents, locationNotifs } = settings.location;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.navy} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>Location Settings</Text>
        <View style={{width:36}} />
      </View>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.sectionDesc}>Control how FaithFinder uses your location. Changes save automatically.</Text>
        <View style={s.card}>
          <View style={[s.row, s.rowBorder]}>
            <View style={[s.iconWrap, {backgroundColor:'#e8f5e9'}]}>
              <Ionicons name="location" size={20} color={COLORS.green} />
            </View>
            <View style={s.rowInfo}>
              <Text style={s.rowLabel}>Enable Location</Text>
              <Text style={s.rowDesc}>Allow FaithFinder to access your location</Text>
            </View>
            <Switch value={locationEnabled} onValueChange={(v) => updateLocationPrefs({locationEnabled:v})} trackColor={{false:'#ddd',true:COLORS.navy}} thumbColor={COLORS.white} />
          </View>
          <View style={[s.row, s.rowBorder]}>
            <View style={[s.iconWrap, {backgroundColor:'rgba(201,169,110,0.12)'}]}>
              <Ionicons name="home-outline" size={20} color={COLORS.gold} />
            </View>
            <View style={s.rowInfo}>
              <Text style={s.rowLabel}>Nearby Churches</Text>
              <Text style={s.rowDesc}>Show churches near your location</Text>
            </View>
            <Switch value={nearbyChurches} onValueChange={(v) => updateLocationPrefs({nearbyChurches:v})} trackColor={{false:'#ddd',true:COLORS.navy}} thumbColor={COLORS.white} />
          </View>
          <View style={[s.row, s.rowBorder]}>
            <View style={[s.iconWrap, {backgroundColor:'rgba(26,26,46,0.08)'}]}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.navy} />
            </View>
            <View style={s.rowInfo}>
              <Text style={s.rowLabel}>Nearby Events</Text>
              <Text style={s.rowDesc}>Show events happening near you</Text>
            </View>
            <Switch value={nearbyEvents} onValueChange={(v) => updateLocationPrefs({nearbyEvents:v})} trackColor={{false:'#ddd',true:COLORS.navy}} thumbColor={COLORS.white} />
          </View>
          <View style={s.row}>
            <View style={[s.iconWrap, {backgroundColor:'#fce4ec'}]}>
              <Ionicons name="notifications-outline" size={20} color={COLORS.red} />
            </View>
            <View style={s.rowInfo}>
              <Text style={s.rowLabel}>Location Notifications</Text>
              <Text style={s.rowDesc}>Notify when near a saved church</Text>
            </View>
            <Switch value={locationNotifs} onValueChange={(v) => updateLocationPrefs({locationNotifs:v})} trackColor={{false:'#ddd',true:COLORS.navy}} thumbColor={COLORS.white} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:'#f8f7f4'},
  hdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:12,borderBottomWidth:1,borderBottomColor:COLORS.border,backgroundColor:COLORS.white},
  backBtn:{width:36,height:36,borderRadius:18,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'},
  hdrTitle:{fontSize:16,fontWeight:'700',color:COLORS.navy},
  scroll:{padding:20},
  sectionDesc:{fontSize:14,color:'#888',marginBottom:16,lineHeight:20},
  card:{backgroundColor:COLORS.white,borderRadius:16,borderWidth:1,borderColor:COLORS.border,overflow:'hidden',marginBottom:20},
  row:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:14,gap:12},
  rowBorder:{borderBottomWidth:1,borderBottomColor:'#f5f3ef'},
  iconWrap:{width:40,height:40,borderRadius:12,alignItems:'center',justifyContent:'center'},
  rowInfo:{flex:1},
  rowLabel:{fontSize:14,fontWeight:'600',color:COLORS.navy,marginBottom:2},
  rowDesc:{fontSize:12,color:'#aaa'},
});
'''
with open('app/settings-location.tsx', 'w', encoding='utf-8') as f:
    f.write(location_screen)
print('settings-location.tsx rewritten with persistence')

print('ALL DONE')
