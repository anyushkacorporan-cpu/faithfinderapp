#!/bin/bash
cd ~/Desktop/FaithFinderApp

# Install image picker
npx expo install expo-image-picker 2>/dev/null || true

# Update userStore with better defaults and church support
cat > src/lib/userStore.ts << 'EOF'
import { useState, useEffect } from 'react';

let userData: any = {
  accountType: 'personal',
  firstName: 'Annie',
  lastName: 'Johnson',
  churchName: '',
  email: '',
  location: 'Glen Cove, NY',
  denomination: '',
  serviceTimes: '',
  website: '',
  phone: '',
  churchEmail: '',
  address: '',
  lifeVerse: '"I can do all things through Christ who strengthens me."',
  lifeVerseRef: 'Philippians 4:13',
  ministries: ['Worship', 'Outreach'],
  verificationStatus: 'none',
  photos: [] as string[],
  amenities: {
    parking: true,
    wheelchair: true,
    children: true,
    liveWorship: true,
    bibleStudy: false,
    youthMinistry: false,
    onlineServices: false,
    communityOutreach: false,
  },
};

const listeners: Array<() => void> = [];
function notify() { listeners.forEach(fn => fn()); }

export function getUser() { return { ...userData }; }

export function setUser(updates: any) {
  userData = { ...userData, ...updates };
  notify();
}

export function useUser() {
  const [user, setUserState] = useState({ ...userData });
  useEffect(() => {
    const fn = () => setUserState({ ...userData });
    listeners.push(fn);
    return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };
  }, []);
  return user;
}
EOF
echo "userStore done"

# Church Profile screen
cat > "app/(tabs)/profile.tsx" << 'EOF'
import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Linking, Alert, Share, FlatList, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import Header from '../../src/components/Header';
import { COLORS } from '../../src/lib/constants';
import { useUser, setUser } from '../../src/lib/userStore';

const { width: W } = Dimensions.get('window');

const AMENITY_LIST = [
  { key: 'parking', label: 'Parking Available', icon: 'car-outline' },
  { key: 'wheelchair', label: 'Wheelchair Accessible', icon: 'accessibility-outline' },
  { key: 'children', label: 'Children Ministry', icon: 'people-outline' },
  { key: 'liveWorship', label: 'Live Worship', icon: 'musical-notes-outline' },
  { key: 'bibleStudy', label: 'Bible Study', icon: 'book-outline' },
  { key: 'youthMinistry', label: 'Youth Ministry', icon: 'school-outline' },
  { key: 'onlineServices', label: 'Online Services', icon: 'globe-outline' },
  { key: 'communityOutreach', label: 'Community Outreach', icon: 'heart-outline' },
];

const CHURCH_TABS = ['Posts', 'Events', 'Members'];
const PERSONAL_TABS = ['Posts', 'Activity', 'Saved'];

export default function ProfileScreen() {
  const user = useUser();
  const [activeTab, setActiveTab] = useState('Posts');
  const [activePhoto, setActivePhoto] = useState(0);
  const isChurch = user.accountType === 'church';

  async function handleAddPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      const newPhotos = result.assets.map(a => a.uri);
      setUser({ photos: [...(user.photos || []), ...newPhotos] });
    }
  }

  async function handleTakePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow camera access.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled) {
      setUser({ photos: [...(user.photos || []), result.assets[0].uri] });
    }
  }

  function handleAddPhotoOptions() {
    Alert.alert('Add Photo', 'Choose a photo source', [
      { text: 'Camera', onPress: handleTakePhoto },
      { text: 'Photo Library', onPress: handleAddPhoto },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function toggleAmenity(key: string) {
    setUser({ amenities: { ...user.amenities, [key]: !user.amenities?.[key] } });
  }

  function handlePhone() {
    if (!user.phone) { Alert.alert('No phone number set', 'Edit your profile to add a phone number.'); return; }
    Linking.openURL(`tel:${user.phone.replace(/\D/g,'')}`);
  }

  function handleWebsite() {
    if (!user.website) { Alert.alert('No website set', 'Edit your profile to add a website.'); return; }
    let url = user.website;
    if (!url.startsWith('http')) url = 'https://' + url;
    Linking.openURL(url);
  }

  function handleEmail() {
    if (!user.churchEmail) { Alert.alert('No email set', 'Edit your profile to add an email.'); return; }
    Linking.openURL(`mailto:${user.churchEmail}`);
  }

  function handleDirections() {
    if (!user.address) { Alert.alert('No address set', 'Edit your profile to add an address.'); return; }
    const q = encodeURIComponent(user.address);
    Linking.openURL(`maps://?q=${q}`).catch(() => Linking.openURL(`https://maps.google.com/?q=${q}`));
  }

  function handleShare() {
    const name = isChurch ? user.churchName : `${user.firstName} ${user.lastName}`;
    Share.share({ message: `Check out ${name} on FaithFinder!` });
  }

  // ── CHURCH PROFILE ──────────────────────────────────
  if (isChurch) {
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        <Header />
        <ScrollView showsVerticalScrollIndicator={false}>

          {/* Photo Gallery */}
          {user.photos?.length > 0 ? (
            <View style={s.galleryWrap}>
              <FlatList
                data={user.photos}
                horizontal pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={e => setActivePhoto(Math.round(e.nativeEvent.contentOffset.x / W))}
                renderItem={({ item }) => <Image source={{ uri: item }} style={{ width: W, height: 260 }} resizeMode="cover" />}
                keyExtractor={(_, i) => String(i)}
              />
              <View style={s.dots}>
                {user.photos.map((_: any, i: number) => <View key={i} style={[s.dot, i===activePhoto && s.dotActive]} />)}
              </View>
              <TouchableOpacity style={s.addMorePhotosBtn} onPress={handleAddPhotoOptions}>
                <Ionicons name="camera" size={16} color={COLORS.white} />
                <Text style={s.addMorePhotosTxt}>Add Photos</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={s.photoBanner} onPress={handleAddPhotoOptions} activeOpacity={0.85}>
              <LinearGradient colors={[COLORS.navy, '#2d2240']} style={StyleSheet.absoluteFill} start={{x:0,y:0}} end={{x:1,y:1}} />
              <View style={s.photoUploadWrap}>
                <View style={s.photoUploadIcon}>
                  <Ionicons name="camera" size={28} color={COLORS.gold} />
                </View>
                <Text style={s.photoUploadTitle}>Add Church Photos</Text>
                <Text style={s.photoUploadSub}>Show your church to the community</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Actions row */}
          <View style={s.actionsRow}>
            <TouchableOpacity onPress={() => router.push('/edit-church-profile')}>
              <View style={s.editProfileBtn}>
                <Ionicons name="pencil-outline" size={16} color={COLORS.navy} />
                <Text style={s.editProfileTxt}>Edit Profile</Text>
              </View>
            </TouchableOpacity>
            <View style={s.actionIcons}>
              <TouchableOpacity style={s.actionIconBtn} onPress={handleShare}>
                <Ionicons name="share-social-outline" size={20} color="#888" />
              </TouchableOpacity>
              {user.verificationStatus === 'pending' && (
                <View style={s.pendingBadge}>
                  <Ionicons name="time-outline" size={12} color={COLORS.gold} />
                  <Text style={s.pendingBadgeTxt}>Pending</Text>
                </View>
              )}
              {user.verificationStatus === 'approved' && (
                <View style={s.verifiedBadge}>
                  <Ionicons name="shield-checkmark" size={12} color="#fff" />
                  <Text style={s.verifiedBadgeTxt}>Verified</Text>
                </View>
              )}
            </View>
          </View>

          {/* Church Identity */}
          <View style={s.churchIdentity}>
            <View style={s.churchAvatarRow}>
              <LinearGradient colors={[COLORS.navy, '#2d2240']} style={s.churchAvatar} start={{x:0,y:0}} end={{x:1,y:1}}>
                <Ionicons name="home" size={28} color={COLORS.gold} />
              </LinearGradient>
              <View style={s.churchNames}>
                <Text style={s.churchName}>{user.churchName || 'Your Church'}</Text>
                {!!user.denomination && <Text style={s.churchDenom}>{user.denomination}</Text>}
                <View style={s.locationRow}>
                  <Ionicons name="location-outline" size={13} color="#888" />
                  <Text style={s.locationTxt} numberOfLines={1}>{user.address || user.location || 'Location not set'}</Text>
                </View>
              </View>
            </View>

            {/* Stats */}
            <View style={s.statsRow}>
              {[['0','Members'],['0','Events'],['0','Posts'],['0','Reviews']].map(([n,l]) => (
                <View key={l} style={s.stat}>
                  <Text style={s.statN}>{n}</Text>
                  <Text style={s.statL}>{l}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Stars */}
          <View style={s.starsRow}>
            {[1,2,3,4,5].map(i => <Ionicons key={i} name="star-outline" size={18} color={COLORS.gold} />)}
            <Text style={s.ratingTxt}>No reviews yet</Text>
            <TouchableOpacity style={s.writeReviewBtn}>
              <Text style={s.writeReviewTxt}>Write a review</Text>
            </TouchableOpacity>
          </View>

          <View style={s.divider} />

          {/* Information Card */}
          <View style={s.section}>
            <View style={s.sectionHdr}>
              <Text style={s.sectionTitle}>Information</Text>
              <TouchableOpacity onPress={() => router.push('/edit-church-profile')}>
                <Text style={s.editLink}>Edit</Text>
              </TouchableOpacity>
            </View>
            <View style={s.infoCard}>

              {/* Address */}
              <View style={s.infoRow}>
                <View style={s.infoIconWrap}><Ionicons name="location-outline" size={18} color={user.address ? COLORS.navy : '#bbb'} /></View>
                <View style={s.infoContent}>
                  <Text style={s.infoLabel}>Address</Text>
                  <Text style={[s.infoValue, !user.address && s.muted]}>{user.address || 'Not set — tap Edit to add'}</Text>
                </View>
                {!!user.address && (
                  <TouchableOpacity style={s.infoBadge} onPress={handleDirections}>
                    <Text style={s.infoBadgeTxt}>Directions</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={s.infoDivider} />

              {/* Phone */}
              <TouchableOpacity style={s.infoRow} onPress={handlePhone} activeOpacity={user.phone ? 0.7 : 1}>
                <View style={s.infoIconWrap}><Ionicons name="call-outline" size={18} color={user.phone ? COLORS.navy : '#bbb'} /></View>
                <View style={s.infoContent}>
                  <Text style={s.infoLabel}>Phone</Text>
                  <Text style={[s.infoValue, user.phone ? s.tappable : s.muted]}>{user.phone || 'Not set — tap Edit to add'}</Text>
                </View>
                {!!user.phone && <View style={s.callBadge}><Text style={s.callBadgeTxt}>Call</Text></View>}
              </TouchableOpacity>
              <View style={s.infoDivider} />

              {/* Website */}
              <TouchableOpacity style={s.infoRow} onPress={handleWebsite} activeOpacity={user.website ? 0.7 : 1}>
                <View style={s.infoIconWrap}><Ionicons name="globe-outline" size={18} color={user.website ? COLORS.navy : '#bbb'} /></View>
                <View style={s.infoContent}>
                  <Text style={s.infoLabel}>Website</Text>
                  <Text style={[s.infoValue, user.website ? s.goldTxt : s.muted]} numberOfLines={1}>{user.website ? user.website.replace(/^https?:\/\//,'').replace(/\/$/,'') : 'Not set — tap Edit to add'}</Text>
                </View>
                {!!user.website && <View style={s.visitBadge}><Text style={s.visitBadgeTxt}>Visit</Text></View>}
              </TouchableOpacity>
              <View style={s.infoDivider} />

              {/* Email */}
              <TouchableOpacity style={s.infoRow} onPress={handleEmail} activeOpacity={user.churchEmail ? 0.7 : 1}>
                <View style={s.infoIconWrap}><Ionicons name="mail-outline" size={18} color={user.churchEmail ? COLORS.navy : '#bbb'} /></View>
                <View style={s.infoContent}>
                  <Text style={s.infoLabel}>Email</Text>
                  <Text style={[s.infoValue, user.churchEmail ? s.tappable : s.muted]}>{user.churchEmail || 'Not set — tap Edit to add'}</Text>
                </View>
                {!!user.churchEmail && <View style={s.callBadge}><Text style={s.callBadgeTxt}>Email</Text></View>}
              </TouchableOpacity>
              <View style={s.infoDivider} />

              {/* Service Times */}
              <View style={s.infoRow}>
                <View style={s.infoIconWrap}><Ionicons name="time-outline" size={18} color={user.serviceTimes ? COLORS.navy : '#bbb'} /></View>
                <View style={s.infoContent}>
                  <Text style={s.infoLabel}>Service Times</Text>
                  <Text style={[s.infoValue, !user.serviceTimes && s.muted]}>{user.serviceTimes || 'Not set — tap Edit to add'}</Text>
                </View>
              </View>

            </View>
          </View>

          <View style={s.divider} />

          {/* Amenities — toggleable */}
          <View style={s.section}>
            <View style={s.sectionHdr}>
              <Text style={s.sectionTitle}>Amenities</Text>
              <Text style={s.sectionSub}>Tap to toggle</Text>
            </View>
            <View style={s.amenitiesCard}>
              {AMENITY_LIST.map((item, i) => {
                const active = user.amenities?.[item.key];
                return (
                  <TouchableOpacity key={item.key} style={[s.amenityRow, i < AMENITY_LIST.length-1 && s.amenityBorder]} onPress={() => toggleAmenity(item.key)} activeOpacity={0.7}>
                    <View style={s.amenityLeft}>
                      <View style={[s.amenityIconWrap, active && s.amenityIconWrapActive]}>
                        <Ionicons name={item.icon as any} size={16} color={active ? COLORS.navy : '#bbb'} />
                      </View>
                      <Text style={[s.amenityTxt, !active && s.amenityTxtInactive]}>{item.label}</Text>
                    </View>
                    <Ionicons name={active ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={active ? COLORS.green : '#ddd'} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={s.divider} />

          {/* Tabs */}
          <View style={s.tabsRow}>
            {CHURCH_TABS.map(t => (
              <TouchableOpacity key={t} style={[s.tab, activeTab===t && s.tabActive]} onPress={() => setActiveTab(t)}>
                <Text style={[s.tabTxt, activeTab===t && s.tabTxtActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.emptyState}>
            <Ionicons name={activeTab==='Posts' ? 'document-text-outline' : activeTab==='Events' ? 'calendar-outline' : 'people-outline'} size={40} color="#ddd" />
            <Text style={s.emptyTxt}>No {activeTab.toLowerCase()} yet</Text>
            <Text style={s.emptySub}>{activeTab==='Posts' ? 'Share announcements with your community' : activeTab==='Events' ? 'Create events for your congregation' : 'Members will appear here when they connect'}</Text>
          </View>

          {/* Sign out */}
          <TouchableOpacity style={s.signOutBtn} onPress={() => router.replace('/login')}>
            <Ionicons name="log-out-outline" size={18} color={COLORS.red} />
            <Text style={s.signOutTxt}>Sign Out</Text>
          </TouchableOpacity>

          <View style={{height:40}} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── PERSONAL PROFILE ────────────────────────────────
  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <Header />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.coverWrap}>
          <View style={s.cover} />
          <TouchableOpacity style={s.addCoverBtn}>
            <Ionicons name="camera-outline" size={14} color={COLORS.white} />
            <Text style={s.addCoverTxt}>Add cover</Text>
          </TouchableOpacity>
          <View style={s.avatarWrap}>
            <View style={s.avatar}>
              <Text style={s.avatarTxt}>{user.firstName?.[0]?.toUpperCase()||'A'}{user.lastName?.[0]?.toUpperCase()||'J'}</Text>
            </View>
          </View>
        </View>
        <View style={s.personalInfo}>
          <Text style={s.name}>{user.firstName || 'Annie'} {user.lastName || 'Johnson'}</Text>
          <View style={s.locationRow}>
            <Ionicons name="location-outline" size={14} color="#888" />
            <Text style={s.locationTxt}>{user.location || 'Location not set'}</Text>
          </View>
          <TouchableOpacity style={s.connectionsRow}>
            <Text style={s.connectionsNum}>0</Text>
            <Text style={s.connectionsTxt}> Connections </Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.gold} />
          </TouchableOpacity>
          <View style={s.churchPill}>
            <Ionicons name="home-outline" size={16} color="#888" />
            <Text style={s.churchPillTxt}>Grace Community Church</Text>
          </View>
          <View style={s.ministriesRow}>
            {['Worship','Outreach'].map(m => (
              <View key={m} style={s.ministryTag}><Text style={s.ministryTagTxt}>{m}</Text></View>
            ))}
          </View>
          <TouchableOpacity style={s.editBtn}>
            <Ionicons name="pencil-outline" size={16} color={COLORS.navy} />
            <Text style={s.editTxt}>Edit Profile</Text>
          </TouchableOpacity>
          <View style={s.verseWrap}>
            <Text style={s.verseItalic}>{user.lifeVerse}</Text>
            <View style={s.verseRefRow}>
              <Text style={s.verseRef}>{user.lifeVerseRef}</Text>
              <Ionicons name="pencil-outline" size={13} color={COLORS.gold} />
            </View>
          </View>
        </View>
        <View style={s.tabsRow}>
          {PERSONAL_TABS.map(t => (
            <TouchableOpacity key={t} style={[s.tab, activeTab===t && s.tabActive]} onPress={() => setActiveTab(t)}>
              <Text style={[s.tabTxt, activeTab===t && s.tabTxtActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={s.emptyState}>
          <Ionicons name={activeTab==='Posts' ? 'document-text-outline' : activeTab==='Activity' ? 'pulse-outline' : 'bookmark-outline'} size={40} color="#ddd" />
          <Text style={s.emptyTxt}>No {activeTab.toLowerCase()} yet</Text>
        </View>
        <TouchableOpacity style={s.signOutBtn} onPress={() => router.replace('/login')}>
          <Ionicons name="log-out-outline" size={18} color={COLORS.red} />
          <Text style={s.signOutTxt}>Sign Out</Text>
        </TouchableOpacity>
        <View style={{height:40}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:COLORS.white},
  // Gallery
  galleryWrap:{height:260,position:'relative'},
  dots:{position:'absolute',bottom:12,left:0,right:0,flexDirection:'row',justifyContent:'center',gap:6},
  dot:{width:6,height:6,borderRadius:3,backgroundColor:'rgba(255,255,255,0.4)'},
  dotActive:{backgroundColor:'#fff',width:18},
  addMorePhotosBtn:{position:'absolute',top:12,right:12,flexDirection:'row',alignItems:'center',gap:6,backgroundColor:'rgba(0,0,0,0.5)',borderRadius:12,paddingHorizontal:12,paddingVertical:7},
  addMorePhotosTxt:{color:COLORS.white,fontSize:12,fontWeight:'600'},
  photoBanner:{height:220,alignItems:'center',justifyContent:'center'},
  photoUploadWrap:{alignItems:'center',gap:8},
  photoUploadIcon:{width:64,height:64,borderRadius:18,backgroundColor:'rgba(201,169,110,0.2)',alignItems:'center',justifyContent:'center'},
  photoUploadTitle:{fontSize:16,fontWeight:'700',color:COLORS.white},
  photoUploadSub:{fontSize:13,color:'rgba(255,255,255,0.6)'},
  // Actions row
  actionsRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:16,paddingVertical:12},
  editProfileBtn:{flexDirection:'row',alignItems:'center',gap:7,borderWidth:1.5,borderColor:COLORS.border,borderRadius:12,paddingHorizontal:16,paddingVertical:9},
  editProfileTxt:{fontSize:14,fontWeight:'700',color:COLORS.navy},
  actionIcons:{flexDirection:'row',alignItems:'center',gap:10},
  actionIconBtn:{width:38,height:38,borderRadius:12,borderWidth:1.5,borderColor:COLORS.border,alignItems:'center',justifyContent:'center'},
  pendingBadge:{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:'rgba(201,169,110,0.12)',borderRadius:100,paddingHorizontal:10,paddingVertical:5},
  pendingBadgeTxt:{fontSize:11,fontWeight:'700',color:COLORS.gold},
  verifiedBadge:{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:COLORS.green,borderRadius:100,paddingHorizontal:10,paddingVertical:5},
  verifiedBadgeTxt:{fontSize:11,fontWeight:'700',color:'#fff'},
  // Church identity
  churchIdentity:{paddingHorizontal:16,paddingBottom:12},
  churchAvatarRow:{flexDirection:'row',alignItems:'flex-start',gap:14,marginBottom:16},
  churchAvatar:{width:72,height:72,borderRadius:18,alignItems:'center',justifyContent:'center'},
  churchNames:{flex:1},
  churchName:{fontFamily:'PlayfairDisplay_700Bold',fontSize:20,color:COLORS.navy,marginBottom:3},
  churchDenom:{fontSize:13,color:COLORS.gold,fontWeight:'600',marginBottom:4},
  locationRow:{flexDirection:'row',alignItems:'center',gap:4},
  locationTxt:{fontSize:13,color:'#888',flex:1},
  statsRow:{flexDirection:'row',backgroundColor:COLORS.lightBg,borderRadius:16,paddingVertical:12},
  stat:{flex:1,alignItems:'center'},
  statN:{fontSize:18,fontWeight:'700',color:COLORS.navy},
  statL:{fontSize:10,color:'#aaa'},
  // Stars
  starsRow:{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:16,marginBottom:8,flexWrap:'wrap'},
  ratingTxt:{fontSize:13,color:'#aaa',marginLeft:4},
  writeReviewBtn:{marginLeft:'auto'},
  writeReviewTxt:{fontSize:13,color:COLORS.gold,fontWeight:'700'},
  divider:{height:1,backgroundColor:COLORS.border,marginHorizontal:16,marginVertical:16},
  // Section
  section:{paddingHorizontal:16,marginBottom:4},
  sectionHdr:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:14},
  sectionTitle:{fontSize:17,fontWeight:'700',color:COLORS.navy},
  sectionSub:{fontSize:12,color:'#bbb'},
  editLink:{fontSize:13,color:COLORS.gold,fontWeight:'700'},
  // Info card
  infoCard:{borderWidth:1,borderColor:COLORS.border,borderRadius:16,overflow:'hidden'},
  infoRow:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:14,gap:12},
  infoDivider:{height:1,backgroundColor:'#f5f3ef',marginLeft:62},
  infoIconWrap:{width:36,height:36,borderRadius:10,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'},
  infoContent:{flex:1},
  infoLabel:{fontSize:11,color:'#bbb',fontWeight:'600',textTransform:'uppercase',letterSpacing:0.4,marginBottom:2},
  infoValue:{fontSize:14,color:COLORS.navy,fontWeight:'500'},
  tappable:{color:COLORS.navy,fontWeight:'600'},
  goldTxt:{color:COLORS.gold},
  muted:{color:'#bbb',fontSize:13},
  infoBadge:{backgroundColor:COLORS.navy,borderRadius:100,paddingHorizontal:12,paddingVertical:7},
  infoBadgeTxt:{color:'#fff',fontSize:12,fontWeight:'700'},
  callBadge:{backgroundColor:'#e8f5e9',borderRadius:100,paddingHorizontal:12,paddingVertical:7},
  callBadgeTxt:{color:COLORS.green,fontSize:12,fontWeight:'700'},
  visitBadge:{backgroundColor:'rgba(201,169,110,0.12)',borderRadius:100,paddingHorizontal:12,paddingVertical:7},
  visitBadgeTxt:{color:COLORS.gold,fontSize:12,fontWeight:'700'},
  // Amenities
  amenitiesCard:{borderWidth:1,borderColor:COLORS.border,borderRadius:16,overflow:'hidden'},
  amenityRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:14},
  amenityBorder:{borderBottomWidth:1,borderBottomColor:'#f5f3ef'},
  amenityLeft:{flexDirection:'row',alignItems:'center',gap:12},
  amenityIconWrap:{width:36,height:36,borderRadius:10,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'},
  amenityIconWrapActive:{backgroundColor:'rgba(26,26,46,0.08)'},
  amenityTxt:{fontSize:14,color:COLORS.navy,fontWeight:'500'},
  amenityTxtInactive:{color:'#bbb'},
  // Tabs
  tabsRow:{flexDirection:'row',borderTopWidth:1,borderBottomWidth:1,borderColor:COLORS.border},
  tab:{flex:1,paddingVertical:14,alignItems:'center',borderBottomWidth:2,borderBottomColor:'transparent'},
  tabActive:{borderBottomColor:COLORS.navy},
  tabTxt:{fontSize:14,fontWeight:'600',color:'#999'},
  tabTxtActive:{color:COLORS.navy,fontWeight:'700'},
  emptyState:{paddingVertical:40,alignItems:'center',gap:8,paddingHorizontal:40},
  emptyTxt:{fontSize:15,color:'#bbb',fontWeight:'600'},
  emptySub:{fontSize:13,color:'#ddd',textAlign:'center',lineHeight:18},
  // Personal
  coverWrap:{position:'relative',height:160,marginBottom:40},
  cover:{width:'100%',height:140,backgroundColor:COLORS.navy},
  addCoverBtn:{position:'absolute',bottom:50,left:12,flexDirection:'row',alignItems:'center',gap:5,backgroundColor:'rgba(0,0,0,0.4)',borderRadius:8,paddingHorizontal:10,paddingVertical:5},
  addCoverTxt:{color:COLORS.white,fontSize:12},
  avatarWrap:{position:'absolute',bottom:0,left:0,right:0,alignItems:'center'},
  avatar:{width:80,height:80,borderRadius:40,backgroundColor:COLORS.navy,borderWidth:3,borderColor:COLORS.white,alignItems:'center',justifyContent:'center'},
  avatarTxt:{color:COLORS.white,fontSize:28,fontWeight:'700'},
  personalInfo:{paddingHorizontal:16,alignItems:'center',paddingBottom:16},
  name:{fontFamily:'PlayfairDisplay_700Bold',fontSize:22,color:COLORS.navy,marginBottom:4},
  connectionsRow:{flexDirection:'row',alignItems:'center',marginBottom:16},
  connectionsNum:{fontSize:15,fontWeight:'700',color:COLORS.navy},
  connectionsTxt:{fontSize:15,color:'#888'},
  churchPill:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:COLORS.lightBg,borderRadius:100,paddingHorizontal:16,paddingVertical:10,marginBottom:12,borderWidth:1,borderColor:COLORS.border},
  churchPillTxt:{fontSize:14,color:COLORS.navy,fontWeight:'600'},
  ministriesRow:{flexDirection:'row',gap:10,marginBottom:14},
  ministryTag:{borderWidth:1.5,borderColor:COLORS.gold,borderRadius:100,paddingHorizontal:16,paddingVertical:6},
  ministryTagTxt:{fontSize:13,color:COLORS.gold,fontWeight:'600'},
  editBtn:{flexDirection:'row',alignItems:'center',gap:8,borderWidth:1,borderColor:COLORS.border,borderRadius:12,paddingHorizontal:20,paddingVertical:12,marginBottom:16,width:'100%',justifyContent:'center'},
  editTxt:{fontSize:15,fontWeight:'700',color:COLORS.navy},
  verseWrap:{alignItems:'center',paddingHorizontal:16},
  verseItalic:{fontFamily:'PlayfairDisplay_400Regular_Italic',fontSize:14,color:'#555',textAlign:'center',lineHeight:22,marginBottom:4},
  verseRefRow:{flexDirection:'row',alignItems:'center',gap:6},
  verseRef:{fontSize:13,color:COLORS.gold,fontWeight:'700'},
  // Sign out
  signOutBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,marginHorizontal:16,marginTop:16,padding:14,borderRadius:16,borderWidth:1,borderColor:'#fee2e2',backgroundColor:'#fff5f5'},
  signOutTxt:{fontSize:14,fontWeight:'700',color:COLORS.red},
});
EOF
echo "profile done"

# Edit Church Profile screen
cat > app/edit-church-profile.tsx << 'EOF'
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../src/lib/constants';
import { useUser, setUser } from '../src/lib/userStore';

const DENOMINATIONS = ['Non-Denominational','Catholic','Baptist','Methodist','Lutheran','Presbyterian','Episcopal','Pentecostal','Assemblies of God','Evangelical','Reformed','AME','Other'];

export default function EditChurchProfileScreen() {
  const user = useUser();
  const [churchName, setChurchName] = useState(user.churchName || '');
  const [address, setAddress] = useState(user.address || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [website, setWebsite] = useState(user.website || '');
  const [churchEmail, setChurchEmail] = useState(user.churchEmail || '');
  const [serviceTimes, setServiceTimes] = useState(user.serviceTimes || '');
  const [denomination, setDenomination] = useState(user.denomination || '');
  const [showDenom, setShowDenom] = useState(false);

  function handleSave() {
    setUser({ churchName, address, phone, website, churchEmail, serviceTimes, denomination });
    Alert.alert('Saved!', 'Your church profile has been updated.', [{ text: 'OK', onPress: () => router.back() }]);
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
        <View style={s.hdr}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={COLORS.navy} />
          </TouchableOpacity>
          <Text style={s.hdrTitle}>Edit Church Profile</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={s.saveBtn}>Save</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <Text style={s.sectionTitle}>Church Information</Text>

          <View style={s.fieldWrap}>
            <Text style={s.label}>Church Name</Text>
            <View style={s.inputWrap}>
              <Ionicons name="home-outline" size={18} color="#bbb" style={s.icon} />
              <TextInput style={[s.input, s.inputWithIcon]} placeholder="Grace Community Church" placeholderTextColor={COLORS.placeholder} value={churchName} onChangeText={setChurchName} />
            </View>
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.label}>Address</Text>
            <View style={s.inputWrap}>
              <Ionicons name="location-outline" size={18} color="#bbb" style={s.icon} />
              <TextInput style={[s.input, s.inputWithIcon]} placeholder="123 Faith St, Glen Cove, NY 11542" placeholderTextColor={COLORS.placeholder} value={address} onChangeText={setAddress} />
            </View>
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.label}>Denomination</Text>
            <TouchableOpacity style={[s.picker, showDenom && s.pickerOpen]} onPress={() => setShowDenom(!showDenom)}>
              <Text style={[s.pickerTxt, !denomination && s.pickerPlaceholder]}>{denomination || 'Select denomination'}</Text>
              <Ionicons name={showDenom ? 'chevron-up' : 'chevron-down'} size={18} color="#bbb" />
            </TouchableOpacity>
            {showDenom && (
              <View style={s.dropList}>
                {DENOMINATIONS.map(d => (
                  <TouchableOpacity key={d} style={[s.dropItem, denomination===d && s.dropItemActive]} onPress={() => { setDenomination(d); setShowDenom(false); }}>
                    <Text style={[s.dropTxt, denomination===d && s.dropTxtActive]}>{d}</Text>
                    {denomination===d && <Ionicons name="checkmark" size={16} color={COLORS.gold} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.label}>Service Times</Text>
            <View style={s.inputWrap}>
              <Ionicons name="time-outline" size={18} color="#bbb" style={s.icon} />
              <TextInput style={[s.input, s.inputWithIcon]} placeholder="Sunday 9AM & 11AM" placeholderTextColor={COLORS.placeholder} value={serviceTimes} onChangeText={setServiceTimes} />
            </View>
          </View>

          <View style={s.divider} />
          <Text style={s.sectionTitle}>Contact Information</Text>

          <View style={s.fieldWrap}>
            <Text style={s.label}>Phone Number</Text>
            <View style={s.inputWrap}>
              <Ionicons name="call-outline" size={18} color="#bbb" style={s.icon} />
              <TextInput style={[s.input, s.inputWithIcon]} placeholder="(516) 000-0000" placeholderTextColor={COLORS.placeholder} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            </View>
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.label}>Website</Text>
            <View style={s.inputWrap}>
              <Ionicons name="globe-outline" size={18} color="#bbb" style={s.icon} />
              <TextInput style={[s.input, s.inputWithIcon]} placeholder="www.yourchurch.org" placeholderTextColor={COLORS.placeholder} value={website} onChangeText={setWebsite} autoCapitalize="none" keyboardType="url" />
            </View>
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.label}>Church Email</Text>
            <View style={s.inputWrap}>
              <Ionicons name="mail-outline" size={18} color="#bbb" style={s.icon} />
              <TextInput style={[s.input, s.inputWithIcon]} placeholder="info@yourchurch.org" placeholderTextColor={COLORS.placeholder} value={churchEmail} onChangeText={setChurchEmail} keyboardType="email-address" autoCapitalize="none" />
            </View>
          </View>

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
  sectionTitle:{fontSize:16,fontWeight:'700',color:COLORS.navy,marginBottom:16},
  divider:{height:1,backgroundColor:COLORS.border,marginVertical:20},
  fieldWrap:{marginBottom:16},
  label:{fontSize:13,fontWeight:'600',color:'#444',marginBottom:8},
  input:{borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,paddingHorizontal:16,paddingVertical:14,fontSize:15,color:COLORS.navy},
  inputWrap:{position:'relative'},
  icon:{position:'absolute',left:14,top:16,zIndex:1},
  inputWithIcon:{paddingLeft:44},
  picker:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,paddingHorizontal:16,paddingVertical:15},
  pickerOpen:{borderColor:COLORS.navy},
  pickerTxt:{fontSize:15,color:COLORS.navy},
  pickerPlaceholder:{color:COLORS.placeholder},
  dropList:{borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,marginTop:4,overflow:'hidden'},
  dropItem:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:13,borderBottomWidth:1,borderBottomColor:COLORS.border},
  dropItemActive:{backgroundColor:'rgba(201,169,110,0.06)'},
  dropTxt:{fontSize:14,color:'#444'},
  dropTxtActive:{color:COLORS.navy,fontWeight:'700'},
  saveFullBtn:{backgroundColor:COLORS.navy,borderRadius:16,paddingVertical:16,alignItems:'center',marginTop:8,shadowColor:COLORS.navy,shadowOffset:{width:0,height:4},shadowOpacity:0.25,shadowRadius:8},
  saveFullBtnTxt:{color:'#fff',fontSize:16,fontWeight:'700'},
});
EOF
echo "edit-church-profile done"

# Update _layout to include edit-church-profile
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
        <Stack.Screen name="edit-church-profile" />
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
