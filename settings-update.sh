#!/bin/bash
cd ~/Desktop/FaithFinderApp

# ── Edit Profile Screen ────────────────────────────────
cat > app/edit-profile.tsx << 'EOF'
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../src/lib/constants';
import { useUser, setUser } from '../src/lib/userStore';

export default function EditProfileScreen() {
  const user = useUser();
  const isChurch = user.accountType === 'church';
  const [firstName, setFirstName] = useState(user.firstName || '');
  const [lastName, setLastName] = useState(user.lastName || '');
  const [churchName, setChurchName] = useState(user.churchName || '');
  const [bio, setBio] = useState(user.bio || '');
  const [location, setLocation] = useState(user.location || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [website, setWebsite] = useState(user.website || '');
  const [address, setAddress] = useState(user.address || '');
  const [serviceTimes, setServiceTimes] = useState(user.serviceTimes || '');
  const [avatar, setAvatar] = useState(user.avatar || '');

  async function handlePickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsEditing: true, aspect: [1,1] });
    if (!result.canceled) setAvatar(result.assets[0].uri);
  }

  function handleSave() {
    if (isChurch) {
      setUser({ churchName, bio, location, phone, website, address, serviceTimes, avatar });
    } else {
      setUser({ firstName, lastName, bio, location, phone, avatar });
    }
    Alert.alert('Saved!', 'Your profile has been updated.', [{ text: 'OK', onPress: () => router.back() }]);
  }

  const initials = isChurch
    ? (churchName?.[0] || 'C').toUpperCase()
    : `${firstName?.[0] || 'U'}${lastName?.[0] || ''}`.toUpperCase();

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.navy} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={s.saveBtn}>Save</Text>
        </TouchableOpacity>
      </View>
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Avatar */}
          <View style={s.avatarSection}>
            <TouchableOpacity style={s.avatarWrap} onPress={handlePickPhoto}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={s.avatarImg} />
              ) : (
                <View style={s.avatarFallback}>
                  <Text style={s.avatarInitials}>{initials}</Text>
                </View>
              )}
              <View style={s.avatarEditBadge}>
                <Ionicons name="camera" size={14} color={COLORS.white} />
              </View>
            </TouchableOpacity>
            <Text style={s.avatarHint}>Tap to change photo</Text>
          </View>

          {isChurch ? (
            <>
              <Text style={s.sectionTitle}>Church Information</Text>
              <View style={s.fieldWrap}>
                <Text style={s.label}>Church Name</Text>
                <TextInput style={s.input} value={churchName} onChangeText={setChurchName} placeholder="Grace Community Church" placeholderTextColor={COLORS.placeholder} />
              </View>
              <View style={s.fieldWrap}>
                <Text style={s.label}>Address</Text>
                <TextInput style={s.input} value={address} onChangeText={setAddress} placeholder="123 Faith St, City, State" placeholderTextColor={COLORS.placeholder} />
              </View>
              <View style={s.fieldWrap}>
                <Text style={s.label}>Phone</Text>
                <TextInput style={s.input} value={phone} onChangeText={setPhone} placeholder="(555) 000-0000" placeholderTextColor={COLORS.placeholder} keyboardType="phone-pad" />
              </View>
              <View style={s.fieldWrap}>
                <Text style={s.label}>Website</Text>
                <TextInput style={s.input} value={website} onChangeText={setWebsite} placeholder="www.yourchurch.org" placeholderTextColor={COLORS.placeholder} autoCapitalize="none" />
              </View>
              <View style={s.fieldWrap}>
                <Text style={s.label}>Service Times</Text>
                <TextInput style={s.input} value={serviceTimes} onChangeText={setServiceTimes} placeholder="Sunday 9AM & 11AM" placeholderTextColor={COLORS.placeholder} />
              </View>
              <View style={s.fieldWrap}>
                <Text style={s.label}>About / Bio</Text>
                <TextInput style={[s.input, s.bioInput]} value={bio} onChangeText={setBio} placeholder="Tell the community about your church..." placeholderTextColor={COLORS.placeholder} multiline />
              </View>
              <View style={s.fieldWrap}>
                <Text style={s.label}>Location</Text>
                <TextInput style={s.input} value={location} onChangeText={setLocation} placeholder="City, State" placeholderTextColor={COLORS.placeholder} />
              </View>
            </>
          ) : (
            <>
              <Text style={s.sectionTitle}>Personal Information</Text>
              <View style={s.row}>
                <View style={[s.fieldWrap, {flex:1, marginRight:8}]}>
                  <Text style={s.label}>First Name</Text>
                  <TextInput style={s.input} value={firstName} onChangeText={setFirstName} placeholder="First" placeholderTextColor={COLORS.placeholder} />
                </View>
                <View style={[s.fieldWrap, {flex:1}]}>
                  <Text style={s.label}>Last Name</Text>
                  <TextInput style={s.input} value={lastName} onChangeText={setLastName} placeholder="Last" placeholderTextColor={COLORS.placeholder} />
                </View>
              </View>
              <View style={s.fieldWrap}>
                <Text style={s.label}>Bio</Text>
                <TextInput style={[s.input, s.bioInput]} value={bio} onChangeText={setBio} placeholder="Tell the community about yourself..." placeholderTextColor={COLORS.placeholder} multiline />
              </View>
              <View style={s.fieldWrap}>
                <Text style={s.label}>Location</Text>
                <TextInput style={s.input} value={location} onChangeText={setLocation} placeholder="City, State" placeholderTextColor={COLORS.placeholder} />
              </View>
              <View style={s.fieldWrap}>
                <Text style={s.label}>Phone</Text>
                <TextInput style={s.input} value={phone} onChangeText={setPhone} placeholder="(555) 000-0000" placeholderTextColor={COLORS.placeholder} keyboardType="phone-pad" />
              </View>
            </>
          )}

          <TouchableOpacity style={s.saveFullBtn} onPress={handleSave}>
            <Text style={s.saveFullBtnTxt}>Save Changes</Text>
          </TouchableOpacity>
          <View style={{height:40}} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:COLORS.white},
  hdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:12,borderBottomWidth:1,borderBottomColor:COLORS.border},
  backBtn:{width:36,height:36,borderRadius:18,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'},
  hdrTitle:{fontSize:16,fontWeight:'700',color:COLORS.navy},
  saveBtn:{fontSize:15,fontWeight:'700',color:COLORS.gold},
  scroll:{paddingHorizontal:20,paddingTop:20},
  avatarSection:{alignItems:'center',marginBottom:28},
  avatarWrap:{position:'relative',marginBottom:8},
  avatarImg:{width:88,height:88,borderRadius:44},
  avatarFallback:{width:88,height:88,borderRadius:44,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center'},
  avatarInitials:{color:COLORS.white,fontSize:30,fontWeight:'700'},
  avatarEditBadge:{position:'absolute',bottom:0,right:0,width:28,height:28,borderRadius:14,backgroundColor:COLORS.gold,alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:COLORS.white},
  avatarHint:{fontSize:13,color:'#aaa'},
  sectionTitle:{fontSize:16,fontWeight:'700',color:COLORS.navy,marginBottom:16},
  row:{flexDirection:'row'},
  fieldWrap:{marginBottom:16},
  label:{fontSize:13,fontWeight:'600',color:'#444',marginBottom:8},
  input:{borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,paddingHorizontal:16,paddingVertical:13,fontSize:15,color:COLORS.navy},
  bioInput:{height:100,textAlignVertical:'top',paddingTop:12},
  saveFullBtn:{backgroundColor:COLORS.navy,borderRadius:16,paddingVertical:16,alignItems:'center',marginTop:8,shadowColor:COLORS.navy,shadowOffset:{width:0,height:4},shadowOpacity:0.25,shadowRadius:8},
  saveFullBtnTxt:{color:'#fff',fontSize:16,fontWeight:'700'},
});
EOF
echo "edit-profile done"

# ── Settings Screens ───────────────────────────────────
cat > app/settings-notifications.tsx << 'EOF'
import { useState } from 'react';
import { View, Text, Switch, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../src/lib/constants';

export default function NotificationSettingsScreen() {
  const [prefs, setPrefs] = useState({
    likes: true, comments: true, shares: true,
    churchPosts: true, events: true, invites: true,
    verification: true, announcements: false,
  });

  function toggle(key: keyof typeof prefs) {
    setPrefs(p => ({ ...p, [key]: !p[key] }));
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
  ];

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
        <Text style={s.sectionDesc}>Choose which notifications you'd like to receive.</Text>
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
                value={prefs[item.key as keyof typeof prefs]}
                onValueChange={() => toggle(item.key as keyof typeof prefs)}
                trackColor={{ false: '#ddd', true: COLORS.navy }}
                thumbColor={COLORS.white}
              />
            </View>
          ))}
        </View>
        <TouchableOpacity style={s.saveBtn} onPress={() => Alert.alert('Saved!', 'Notification preferences updated.', [{text:'OK', onPress:()=>router.back()}])}>
          <Text style={s.saveBtnTxt}>Save Preferences</Text>
        </TouchableOpacity>
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
  saveBtn:{backgroundColor:COLORS.navy,borderRadius:16,paddingVertical:15,alignItems:'center'},
  saveBtnTxt:{color:'#fff',fontSize:15,fontWeight:'700'},
});
EOF
echo "notifications settings done"

cat > app/settings-location.tsx << 'EOF'
import { useState } from 'react';
import { View, Text, Switch, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../src/lib/constants';

export default function LocationSettingsScreen() {
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [nearbyChurches, setNearbyChurches] = useState(true);
  const [nearbyEvents, setNearbyEvents] = useState(true);
  const [locationNotifs, setLocationNotifs] = useState(false);

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
        <Text style={s.sectionDesc}>Control how FaithFinder uses your location.</Text>
        <View style={s.card}>
          <View style={[s.row, s.rowBorder]}>
            <View style={[s.iconWrap, {backgroundColor:'#e8f5e9'}]}>
              <Ionicons name="location" size={20} color={COLORS.green} />
            </View>
            <View style={s.rowInfo}>
              <Text style={s.rowLabel}>Enable Location</Text>
              <Text style={s.rowDesc}>Allow FaithFinder to access your location</Text>
            </View>
            <Switch value={locationEnabled} onValueChange={setLocationEnabled} trackColor={{false:'#ddd',true:COLORS.navy}} thumbColor={COLORS.white} />
          </View>
          <View style={[s.row, s.rowBorder]}>
            <View style={[s.iconWrap, {backgroundColor:'rgba(201,169,110,0.12)'}]}>
              <Ionicons name="home-outline" size={20} color={COLORS.gold} />
            </View>
            <View style={s.rowInfo}>
              <Text style={s.rowLabel}>Nearby Churches</Text>
              <Text style={s.rowDesc}>Show churches near your location</Text>
            </View>
            <Switch value={nearbyChurches} onValueChange={setNearbyChurches} trackColor={{false:'#ddd',true:COLORS.navy}} thumbColor={COLORS.white} />
          </View>
          <View style={[s.row, s.rowBorder]}>
            <View style={[s.iconWrap, {backgroundColor:'rgba(26,26,46,0.08)'}]}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.navy} />
            </View>
            <View style={s.rowInfo}>
              <Text style={s.rowLabel}>Nearby Events</Text>
              <Text style={s.rowDesc}>Show events happening near you</Text>
            </View>
            <Switch value={nearbyEvents} onValueChange={setNearbyEvents} trackColor={{false:'#ddd',true:COLORS.navy}} thumbColor={COLORS.white} />
          </View>
          <View style={s.row}>
            <View style={[s.iconWrap, {backgroundColor:'#fce4ec'}]}>
              <Ionicons name="notifications-outline" size={20} color={COLORS.red} />
            </View>
            <View style={s.rowInfo}>
              <Text style={s.rowLabel}>Location Notifications</Text>
              <Text style={s.rowDesc}>Notify when near a saved church</Text>
            </View>
            <Switch value={locationNotifs} onValueChange={setLocationNotifs} trackColor={{false:'#ddd',true:COLORS.navy}} thumbColor={COLORS.white} />
          </View>
        </View>
        <TouchableOpacity style={s.saveBtn} onPress={() => Alert.alert('Saved!', 'Location settings updated.', [{text:'OK', onPress:()=>router.back()}])}>
          <Text style={s.saveBtnTxt}>Save Settings</Text>
        </TouchableOpacity>
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
  saveBtn:{backgroundColor:COLORS.navy,borderRadius:16,paddingVertical:15,alignItems:'center'},
  saveBtnTxt:{color:'#fff',fontSize:15,fontWeight:'700'},
});
EOF
echo "location settings done"

cat > app/settings-privacy.tsx << 'EOF'
import { useState } from 'react';
import { View, Text, Switch, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../src/lib/constants';

export default function PrivacySettingsScreen() {
  const [publicProfile, setPublicProfile] = useState(true);
  const [showLocation, setShowLocation] = useState(false);
  const [allowMessages, setAllowMessages] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);
  const [dataSharing, setDataSharing] = useState(false);

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
            <Switch value={publicProfile} onValueChange={setPublicProfile} trackColor={{false:'#ddd',true:COLORS.navy}} thumbColor={COLORS.white} />
          </View>
          <View style={[s.row, s.rowBorder]}>
            <View style={[s.iconWrap, {backgroundColor:'#e8f5e9'}]}>
              <Ionicons name="location-outline" size={20} color={COLORS.green} />
            </View>
            <View style={s.rowInfo}>
              <Text style={s.rowLabel}>Show Location on Profile</Text>
              <Text style={s.rowDesc}>Display your city on your profile</Text>
            </View>
            <Switch value={showLocation} onValueChange={setShowLocation} trackColor={{false:'#ddd',true:COLORS.navy}} thumbColor={COLORS.white} />
          </View>
          <View style={s.row}>
            <View style={[s.iconWrap, {backgroundColor:'rgba(201,169,110,0.12)'}]}>
              <Ionicons name="chatbubble-outline" size={20} color={COLORS.gold} />
            </View>
            <View style={s.rowInfo}>
              <Text style={s.rowLabel}>Allow Messages</Text>
              <Text style={s.rowDesc}>Let other members message you</Text>
            </View>
            <Switch value={allowMessages} onValueChange={setAllowMessages} trackColor={{false:'#ddd',true:COLORS.navy}} thumbColor={COLORS.white} />
          </View>
        </View>
        <Text style={s.sectionLabel}>Security</Text>
        <View style={s.card}>
          <View style={[s.row, s.rowBorder]}>
            <View style={[s.iconWrap, {backgroundColor:'#fce4ec'}]}>
              <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.red} />
            </View>
            <View style={s.rowInfo}>
              <Text style={s.rowLabel}>Two-Factor Authentication</Text>
              <Text style={s.rowDesc}>Add extra security to your account</Text>
            </View>
            <Switch value={twoFactor} onValueChange={setTwoFactor} trackColor={{false:'#ddd',true:COLORS.navy}} thumbColor={COLORS.white} />
          </View>
          <View style={s.row}>
            <View style={[s.iconWrap, {backgroundColor:'rgba(26,26,46,0.08)'}]}>
              <Ionicons name="analytics-outline" size={20} color={COLORS.navy} />
            </View>
            <View style={s.rowInfo}>
              <Text style={s.rowLabel}>Data Sharing</Text>
              <Text style={s.rowDesc}>Share anonymous usage data</Text>
            </View>
            <Switch value={dataSharing} onValueChange={setDataSharing} trackColor={{false:'#ddd',true:COLORS.navy}} thumbColor={COLORS.white} />
          </View>
        </View>
        <TouchableOpacity style={s.dangerBtn} onPress={() => Alert.alert('Delete Account', 'Are you sure? This cannot be undone.', [{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>router.replace('/login')}])}>
          <Text style={s.dangerBtnTxt}>Delete Account</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.saveBtn} onPress={() => Alert.alert('Saved!', 'Privacy settings updated.', [{text:'OK',onPress:()=>router.back()}])}>
          <Text style={s.saveBtnTxt}>Save Settings</Text>
        </TouchableOpacity>
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
  card:{backgroundColor:COLORS.white,borderRadius:16,borderWidth:1,borderColor:COLORS.border,overflow:'hidden',marginBottom:16},
  row:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:14,gap:12},
  rowBorder:{borderBottomWidth:1,borderBottomColor:'#f5f3ef'},
  iconWrap:{width:40,height:40,borderRadius:12,alignItems:'center',justifyContent:'center'},
  rowInfo:{flex:1},
  rowLabel:{fontSize:14,fontWeight:'600',color:COLORS.navy,marginBottom:2},
  rowDesc:{fontSize:12,color:'#aaa'},
  dangerBtn:{borderWidth:1.5,borderColor:'#fee2e2',borderRadius:16,paddingVertical:14,alignItems:'center',marginBottom:12,backgroundColor:'#fff5f5'},
  dangerBtnTxt:{fontSize:14,fontWeight:'700',color:COLORS.red},
  saveBtn:{backgroundColor:COLORS.navy,borderRadius:16,paddingVertical:15,alignItems:'center'},
  saveBtnTxt:{color:'#fff',fontSize:15,fontWeight:'700'},
});
EOF
echo "privacy settings done"

cat > app/settings-appearance.tsx << 'EOF'
import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../src/lib/constants';

export default function AppearanceSettingsScreen() {
  const [theme, setTheme] = useState('light');
  const [fontSize, setFontSize] = useState('medium');
  const [language, setLanguage] = useState('English');

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.navy} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>Appearance</Text>
        <View style={{width:36}} />
      </View>
      <ScrollView contentContainerStyle={s.scroll}>

        <Text style={s.sectionLabel}>Theme</Text>
        <View style={s.card}>
          {[
            {id:'light', label:'Light', icon:'sunny-outline', color:'#f39c12'},
            {id:'dark', label:'Dark', icon:'moon-outline', color:'#2c3e50'},
            {id:'system', label:'System Default', icon:'phone-portrait-outline', color:'#7f8c8d'},
          ].map((item,i,arr) => (
            <TouchableOpacity key={item.id} style={[s.row, i<arr.length-1&&s.rowBorder]} onPress={() => setTheme(item.id)}>
              <View style={[s.iconWrap, {backgroundColor: item.color+'18'}]}>
                <Ionicons name={item.icon as any} size={20} color={item.color} />
              </View>
              <Text style={s.rowLabel}>{item.label}</Text>
              {theme===item.id && <Ionicons name="checkmark-circle" size={22} color={COLORS.navy} />}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.sectionLabel}>Text Size</Text>
        <View style={s.card}>
          {[
            {id:'small', label:'Small'},
            {id:'medium', label:'Medium (Default)'},
            {id:'large', label:'Large'},
          ].map((item,i,arr) => (
            <TouchableOpacity key={item.id} style={[s.row, i<arr.length-1&&s.rowBorder]} onPress={() => setFontSize(item.id)}>
              <Text style={[s.rowLabel, item.id==='small'&&{fontSize:12}, item.id==='large'&&{fontSize:17}]}>{item.label}</Text>
              {fontSize===item.id && <Ionicons name="checkmark-circle" size={22} color={COLORS.navy} />}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.sectionLabel}>Language</Text>
        <View style={s.card}>
          {['English','Español','Français','Português'].map((lang,i,arr) => (
            <TouchableOpacity key={lang} style={[s.row, i<arr.length-1&&s.rowBorder]} onPress={() => setLanguage(lang)}>
              <Text style={s.rowLabel}>{lang}</Text>
              {language===lang && <Ionicons name="checkmark-circle" size={22} color={COLORS.navy} />}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={s.saveBtn} onPress={() => Alert.alert('Saved!', 'Appearance settings updated.', [{text:'OK',onPress:()=>router.back()}])}>
          <Text style={s.saveBtnTxt}>Save Preferences</Text>
        </TouchableOpacity>
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
  card:{backgroundColor:COLORS.white,borderRadius:16,borderWidth:1,borderColor:COLORS.border,overflow:'hidden',marginBottom:16},
  row:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:14,gap:12},
  rowBorder:{borderBottomWidth:1,borderBottomColor:'#f5f3ef'},
  iconWrap:{width:40,height:40,borderRadius:12,alignItems:'center',justifyContent:'center'},
  rowLabel:{flex:1,fontSize:14,fontWeight:'600',color:COLORS.navy},
  saveBtn:{backgroundColor:COLORS.navy,borderRadius:16,paddingVertical:15,alignItems:'center',marginTop:8},
  saveBtnTxt:{color:'#fff',fontSize:15,fontWeight:'700'},
});
EOF
echo "appearance settings done"

cat > app/settings-help.tsx << 'EOF'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Linking, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../src/lib/constants';

export default function HelpSupportScreen() {
  const items = [
    { icon:'book-outline', color:'#667eea', label:'Getting Started Guide', action: () => Alert.alert('Guide', 'Opening help guide...') },
    { icon:'help-circle-outline', color:COLORS.gold, label:'FAQ', action: () => Alert.alert('FAQ', 'Frequently asked questions coming soon.') },
    { icon:'chatbubble-outline', color:COLORS.green, label:'Contact Support', action: () => Linking.openURL('mailto:support@faithfinderapp.com') },
    { icon:'bug-outline', color:COLORS.red, label:'Report a Bug', action: () => Linking.openURL('mailto:bugs@faithfinderapp.com?subject=Bug Report') },
    { icon:'star-outline', color:'#f39c12', label:'Rate the App', action: () => Alert.alert('Rate Us', 'Thank you! Redirecting to App Store...') },
    { icon:'share-social-outline', color:'#9b59b6', label:'Share FaithFinder', action: () => Alert.alert('Share', 'Share link: faithfinderapp.com') },
    { icon:'document-text-outline', color:COLORS.navy, label:'Terms of Service', action: () => Linking.openURL('https://faithfinderapp.com/terms') },
    { icon:'shield-outline', color:'#7f8c8d', label:'Privacy Policy', action: () => Linking.openURL('https://faithfinderapp.com/privacy') },
  ];

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.navy} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>Help & Support</Text>
        <View style={{width:36}} />
      </View>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.emailBox}>
          <Ionicons name="mail-outline" size={24} color={COLORS.gold} />
          <View style={s.emailInfo}>
            <Text style={s.emailLabel}>Email Support</Text>
            <Text style={s.emailAddr}>support@faithfinderapp.com</Text>
          </View>
        </View>
        <View style={s.card}>
          {items.map((item, i) => (
            <TouchableOpacity key={i} style={[s.row, i<items.length-1&&s.rowBorder]} onPress={item.action}>
              <View style={[s.iconWrap, {backgroundColor: item.color+'18'}]}>
                <Ionicons name={item.icon as any} size={20} color={item.color} />
              </View>
              <Text style={s.rowLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color="#ddd" />
            </TouchableOpacity>
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
  emailBox:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:COLORS.white,borderRadius:16,padding:16,marginBottom:16,borderWidth:1,borderColor:COLORS.border},
  emailInfo:{flex:1},
  emailLabel:{fontSize:13,fontWeight:'600',color:COLORS.navy},
  emailAddr:{fontSize:13,color:COLORS.gold},
  card:{backgroundColor:COLORS.white,borderRadius:16,borderWidth:1,borderColor:COLORS.border,overflow:'hidden'},
  row:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:14,gap:12},
  rowBorder:{borderBottomWidth:1,borderBottomColor:'#f5f3ef'},
  iconWrap:{width:40,height:40,borderRadius:12,alignItems:'center',justifyContent:'center'},
  rowLabel:{flex:1,fontSize:14,fontWeight:'600',color:COLORS.navy},
});
EOF
echo "help settings done"

cat > app/settings-about.tsx << 'EOF'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Linking } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../src/lib/constants';
import Logo from '../src/components/Logo';

export default function AboutScreen() {
  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.navy} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>About FaithFinder</Text>
        <View style={{width:36}} />
      </View>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.logoSection}>
          <Logo size="large" />
          <Text style={s.version}>Version 1.0.0</Text>
          <Text style={s.tagline}>"Connecting believers, one church at a time."</Text>
        </View>
        <View style={s.missionBox}>
          <Text style={s.missionTitle}>Our Mission</Text>
          <Text style={s.missionTxt}>FaithFinder exists to help believers find their spiritual home. We connect people with churches, faith communities, and events that align with their values and beliefs. Whether you're new to an area or searching for a church home, FaithFinder makes it easy to discover, connect, and grow in faith.</Text>
        </View>
        <View style={s.card}>
          {[
            {icon:'globe-outline', color:'#667eea', label:'Website', action:() => Linking.openURL('https://faithfinderapp.com')},
            {icon:'logo-instagram', color:'#e91e63', label:'Instagram', action:() => Linking.openURL('https://instagram.com/faithfinderapp')},
            {icon:'document-text-outline', color:COLORS.navy, label:'Terms of Service', action:() => Linking.openURL('https://faithfinderapp.com/terms')},
            {icon:'shield-outline', color:COLORS.green, label:'Privacy Policy', action:() => Linking.openURL('https://faithfinderapp.com/privacy')},
          ].map((item,i,arr) => (
            <TouchableOpacity key={i} style={[s.row, i<arr.length-1&&s.rowBorder]} onPress={item.action}>
              <View style={[s.iconWrap, {backgroundColor:item.color+'18'}]}>
                <Ionicons name={item.icon as any} size={20} color={item.color} />
              </View>
              <Text style={s.rowLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color="#ddd" />
            </TouchableOpacity>
          ))}
        </View>
        <Text style={s.copyright}>© 2026 FaithFinder App. All rights reserved.</Text>
        <Text style={s.builtWith}>Made with ♥ for the faith community</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:'#f8f7f4'},
  hdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:12,borderBottomWidth:1,borderBottomColor:COLORS.border,backgroundColor:COLORS.white},
  backBtn:{width:36,height:36,borderRadius:18,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'},
  hdrTitle:{fontSize:16,fontWeight:'700',color:COLORS.navy},
  scroll:{padding:20,alignItems:'center'},
  logoSection:{alignItems:'center',marginBottom:24,paddingVertical:20},
  version:{fontSize:13,color:'#aaa',marginTop:8},
  tagline:{fontFamily:'PlayfairDisplay_400Regular_Italic',fontSize:14,color:'#888',marginTop:6,textAlign:'center'},
  missionBox:{backgroundColor:COLORS.white,borderRadius:16,padding:20,marginBottom:16,borderWidth:1,borderColor:COLORS.border,width:'100%'},
  missionTitle:{fontSize:16,fontWeight:'700',color:COLORS.navy,marginBottom:10},
  missionTxt:{fontSize:14,color:'#555',lineHeight:22},
  card:{backgroundColor:COLORS.white,borderRadius:16,borderWidth:1,borderColor:COLORS.border,overflow:'hidden',marginBottom:20,width:'100%'},
  row:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:14,gap:12},
  rowBorder:{borderBottomWidth:1,borderBottomColor:'#f5f3ef'},
  iconWrap:{width:40,height:40,borderRadius:12,alignItems:'center',justifyContent:'center'},
  rowLabel:{flex:1,fontSize:14,fontWeight:'600',color:COLORS.navy},
  copyright:{fontSize:12,color:'#bbb',textAlign:'center',marginBottom:4},
  builtWith:{fontSize:12,color:COLORS.gold,textAlign:'center'},
});
EOF
echo "about screen done"

# Update Header to navigate to settings screens
python3 << 'PYEOF'
content = open('src/components/Header.tsx').read()
content = content.replace(
    "if (item.label === 'Sign Out') { router.replace('/login'); }\n                else { Alert.alert(item.label, 'Coming soon!'); }",
    """if (item.label === 'Sign Out') {
                  router.replace('/login');
                } else if (item.label === 'Edit Profile') {
                  router.push('/edit-profile');
                } else if (item.label === 'Notification Preferences') {
                  router.push('/settings-notifications');
                } else if (item.label === 'Location Settings') {
                  router.push('/settings-location');
                } else if (item.label === 'Privacy & Security') {
                  router.push('/settings-privacy');
                } else if (item.label === 'Appearance') {
                  router.push('/settings-appearance');
                } else if (item.label === 'Help & Support') {
                  router.push('/settings-help');
                } else if (item.label === 'About FaithFinder') {
                  router.push('/settings-about');
                }"""
)
open('src/components/Header.tsx', 'w').write(content)
print('Header updated')
PYEOF

# Update _layout to include all settings screens
cat > app/_layout.tsx << 'EOF'
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useFonts, DMSans_400Regular, DMSans_600SemiBold, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { PlayfairDisplay_700Bold, PlayfairDisplay_400Regular_Italic } from '@expo-google-fonts/playfair-display';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ DMSans_400Regular, DMSans_600SemiBold, DMSans_700Bold, PlayfairDisplay_700Bold, PlayfairDisplay_400Regular_Italic });
  useEffect(() => { if (fontsLoaded) SplashScreen.hideAsync(); }, [fontsLoaded]);
  if (!fontsLoaded) return null;
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="forgot" />
        <Stack.Screen name="church-setup" />
        <Stack.Screen name="claim-church" />
        <Stack.Screen name="register-church" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="edit-church-profile" />
        <Stack.Screen name="settings-notifications" />
        <Stack.Screen name="settings-location" />
        <Stack.Screen name="settings-privacy" />
        <Stack.Screen name="settings-appearance" />
        <Stack.Screen name="settings-help" />
        <Stack.Screen name="settings-about" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="church-detail" />
        <Stack.Screen name="event-detail" />
      </Stack>
    </>
  );
}
EOF
echo "layout done"

echo "ALL DONE"
