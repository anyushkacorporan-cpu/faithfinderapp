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
import { useActivity } from '../../src/lib/activityStore';
import { useConnections, useConnectionCount, removeConnection } from '../../src/lib/connectionsStore';
import { usePosts, toggleLike } from '../../src/lib/postsStore';
import { PostCard } from '../../src/components/PostCard';
import { useEventActions } from '../../src/lib/eventActionsStore';
import { EVENTS } from '../../src/lib/constants';
import { useEvents } from '../../src/lib/eventsStore';

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
const PERSONAL_TABS = ['Community Sharing'];

export default function ProfileScreen() {
  const user = useUser();
  const [activeTab, setActiveTab] = useState('Posts');
  const allPosts = usePosts();
  const displayName = user.accountType === 'church'
    ? (user.churchName || 'Church')
    : ((user.firstName || 'You') + ' ' + (user.lastName || '')).trim();
  const myPosts = allPosts.filter(p => p.authorName === displayName);
  const postGalleryPhotos = myPosts.filter(p => !!p.image).map(p => p.image as string);
  const galleryPhotos = [...new Set([...postGalleryPhotos, ...(user.photos || [])])];
  const { attending } = useEventActions();
  const userCreatedEvents = useEvents();
  const allEventsPool = [...userCreatedEvents, ...EVENTS];
  const myAttendingEvents = attending
    .map(id => allEventsPool.find((e: any) => e.id === id))
    .filter(Boolean);
  const [activePhoto, setActivePhoto] = useState(0);
  const isChurch = user.accountType === 'church';
  const connections = useConnections();
  const connectionCount = useConnectionCount();

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
              {/* Overlay icons on cover photo */}

              <FlatList
                data={user.photos}
                horizontal pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={e => setActivePhoto(Math.round(e.nativeEvent.contentOffset.x / W))}
                renderItem={({ item }) => <Image source={{ uri: item }} style={{ width: W, height: 380 }} resizeMode="cover" />}
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
            <View style={{position:'relative'}}>
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

            </View>
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
              {user.avatar ? (
                <Image source={{uri:user.avatar}} style={s.churchAvatar} resizeMode="cover" />
              ) : (
                <LinearGradient colors={[COLORS.navy, '#2d2240']} style={s.churchAvatar} start={{x:0,y:0}} end={{x:1,y:1}}>
                  <Ionicons name="home" size={28} color={COLORS.gold} />
                </LinearGradient>
              )}
              <View style={s.churchNames}>
                <Text style={s.churchName}>{user.churchName || 'Your Church'}</Text>
                {!!user.denomination && <Text style={s.churchDenom}>{user.denomination}</Text>}
                <View style={s.locationRow}>
                  <Ionicons name="location-outline" size={13} color="#888" />
                  <Text style={s.locationTxt} numberOfLines={1}>{user.address || user.location || ''}</Text>
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
          </View>

          <View style={s.divider} />

          {/* About */}
          {!!user.bio && (
            <>
              <View style={s.section}>
                <View style={s.sectionHdr}>
                  <Text style={s.sectionTitle}>About</Text>
                </View>
                <Text style={{fontSize:14,color:'#555',lineHeight:20}}>{user.bio}</Text>
              </View>
              <View style={s.divider} />
            </>
          )}

          {/* Information Card */}
          <View style={s.section}>
            <View style={s.sectionHdr}>
              <Text style={s.sectionTitle}>Information</Text>
            </View>
            <View style={s.infoCard}>

              {/* Address */}
              <View style={s.infoRow}>
                <View style={s.infoIconWrap}><Ionicons name="location-outline" size={18} color={user.address ? COLORS.navy : '#bbb'} /></View>
                <View style={s.infoContent}>
                  <Text style={s.infoLabel}>Address</Text>
                  {!!user.address && <Text style={s.infoValue}>{user.address}</Text>}
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
                  {!!user.phone && <Text style={[s.infoValue, s.tappable]}>{user.phone}</Text>}
                </View>
                {!!user.phone && <View style={s.callBadge}><Text style={s.callBadgeTxt}>Call</Text></View>}
              </TouchableOpacity>
              <View style={s.infoDivider} />

              {/* Website */}
              <TouchableOpacity style={s.infoRow} onPress={handleWebsite} activeOpacity={user.website ? 0.7 : 1}>
                <View style={s.infoIconWrap}><Ionicons name="globe-outline" size={18} color={user.website ? COLORS.navy : '#bbb'} /></View>
                <View style={s.infoContent}>
                  <Text style={s.infoLabel}>Website</Text>
                  {!!user.website && <Text style={[s.infoValue, s.goldTxt]} numberOfLines={1}>{user.website.replace(/^https?:\/\//,'').replace(/\/$/,'')}</Text>}
                </View>
                {!!user.website && <View style={s.visitBadge}><Text style={s.visitBadgeTxt}>Visit</Text></View>}
              </TouchableOpacity>
              <View style={s.infoDivider} />

              {/* Email */}
              <TouchableOpacity style={s.infoRow} onPress={handleEmail} activeOpacity={user.churchEmail ? 0.7 : 1}>
                <View style={s.infoIconWrap}><Ionicons name="mail-outline" size={18} color={user.churchEmail ? COLORS.navy : '#bbb'} /></View>
                <View style={s.infoContent}>
                  <Text style={s.infoLabel}>Email</Text>
                  {!!user.churchEmail && <Text style={[s.infoValue, s.tappable]}>{user.churchEmail}</Text>}
                </View>
                {!!user.churchEmail && <View style={s.callBadge}><Text style={s.callBadgeTxt}>Email</Text></View>}
              </TouchableOpacity>
              <View style={s.infoDivider} />

              {/* Service Times */}
              <View style={s.infoRow}>
                <View style={s.infoIconWrap}><Ionicons name="time-outline" size={18} color={user.serviceTimes ? COLORS.navy : '#bbb'} /></View>
                <View style={s.infoContent}>
                  <Text style={s.infoLabel}>Service Times</Text>
                  {!!user.serviceTimes && user.serviceTimes.split('\n').map((line: string, i: number) => {
                    const [timePart, notePart] = line.split(' | ');
                    return (
                      <View key={i} style={{marginBottom: i < user.serviceTimes.split('\n').length - 1 ? 6 : 0}}>
                        <Text style={s.infoValue}>{timePart}</Text>
                        {!!notePart && <Text style={{fontSize:12,color:'#999',marginTop:1}}>{notePart}</Text>}
                      </View>
                    );
                  })}
                </View>
              </View>

            </View>
          </View>

          {/* Ministries & Amenities */}
          {((user.ministries || []).length > 0 || AMENITY_LIST.some(item => !!user.amenities?.[item.key])) && (
            <>
              <View style={s.divider} />
              <View style={s.section}>
                <View style={s.sectionHdr}>
                  <Text style={s.sectionTitle}>Ministries & Amenities</Text>
                </View>
                <View style={s.chipsWrap}>
                  {(user.ministries || []).map((name: string) => (
                    <View key={`ministry-${name}`} style={s.chip}>
                      <Ionicons name="pricetag-outline" size={14} color={COLORS.navy} />
                      <Text style={s.chipTxt}>{name}</Text>
                    </View>
                  ))}
                  {AMENITY_LIST.filter(item => !!user.amenities?.[item.key]).map(item => (
                    <View key={`amenity-${item.key}`} style={s.chip}>
                      <Ionicons name={item.icon as any} size={14} color={COLORS.navy} />
                      <Text style={s.chipTxt}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}

          <View style={s.divider} />

          {/* Tabs */}
          <View style={s.tabsRow}>
            {PERSONAL_TABS.map(t => (
              <TouchableOpacity key={t} style={[s.tab, activeTab===t && s.tabActive]} onPress={() => setActiveTab(t)}>
                <Text style={[s.tabTxt, activeTab===t && s.tabTxtActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeTab === 'Posts' && (
            <>
              {myPosts.length === 0 ? (
                <View style={s.emptyState}>
                  <Ionicons name="document-text-outline" size={40} color="#ddd" />
                  <Text style={s.emptyTxt}>No posts yet</Text>
                  <Text style={s.emptySub}>Your posts will appear here</Text>
                </View>
              ) : (
                <View style={{gap:0,paddingTop:12}}>
                  {myPosts.map(post => (
                    <PostCard
                      key={post.id}
                      post={post}
                      showLocation={!!(post.city && post.state)}
                      onLike={() => toggleLike(post.id)}
                      onComment={() => router.push({ pathname: '/comments' as any, params: { postId: post.id } })}
                      onShare={() => {}}
                      onOpenProfile={() => {}}
                      isOwnPost={true}
                    />
                  ))}
                </View>
              )}

            </>
          )}





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
          {user.coverPhoto
            ? <Image source={{uri:user.coverPhoto}} style={{width:'100%',height:200}} resizeMode="cover"/>
            : <View style={s.cover} />
          }
          <TouchableOpacity style={s.addCoverBtn} onPress={async () => {
            const {status} = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') return;
            const result = await ImagePicker.launchImageLibraryAsync({mediaTypes:ImagePicker.MediaTypeOptions.Images,allowsEditing:true,aspect:[16,9],quality:0.8});
            if (!result.canceled) setUser({coverPhoto:result.assets[0].uri});
          }}>
            <Ionicons name="camera-outline" size={14} color={COLORS.white} />
            <Text style={s.addCoverTxt}>{user.coverPhoto ? 'Change cover' : 'Add cover'}</Text>
          </TouchableOpacity>
          <View style={s.avatarWrap}>
            <TouchableOpacity style={{width:90,height:90}} onPress={async () => {
              const {status} = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== 'granted') return;
              const result = await ImagePicker.launchImageLibraryAsync({mediaTypes:ImagePicker.MediaTypeOptions.Images,allowsEditing:true,aspect:[1,1],quality:0.8});
              if (!result.canceled) setUser({profilePhoto:result.assets[0].uri});
            }}>
              {user.profilePhoto
                ? <Image source={{uri:user.profilePhoto}} style={[s.avatar,{overflow:'hidden'}]} resizeMode="cover"/>
                : <View style={s.avatar}>
                    <Text style={s.avatarTxt}>{user.firstName?.[0]?.toUpperCase()||'A'}{user.lastName?.[0]?.toUpperCase()||'J'}</Text>
                  </View>
              }
              <View style={{position:'absolute',bottom:0,right:0,width:24,height:24,borderRadius:12,backgroundColor:COLORS.navy,borderWidth:2,borderColor:COLORS.white,alignItems:'center',justifyContent:'center'}}>
                <Ionicons name="camera" size={12} color={COLORS.white}/>
              </View>
            </TouchableOpacity>
          </View>
        </View>
        <View style={s.personalInfo}>
          <Text style={s.name}>{user.firstName || 'Annie'} {user.lastName || 'Johnson'}</Text>
          {!!user.bio && (
            <Text style={{fontSize:14,color:'#555',textAlign:'center',lineHeight:20,marginTop:4,marginBottom:14,paddingHorizontal:8}}>{user.bio}</Text>
          )}
          <View style={{flexDirection:'row',alignItems:'center',gap:16,marginBottom:14}}>
            <TouchableOpacity style={{flexDirection:'row',alignItems:'center',gap:5}} onPress={() => router.push('/connections' as any)}>
              <Ionicons name="people-outline" size={14} color="#888" />
              <Text style={{fontSize:13,color:'#888'}}>{connectionCount}</Text>
            </TouchableOpacity>
            {!!user.location && (
              <>
                <View style={{width:1,height:12,backgroundColor:'#e5e0d8'}} />
                <View style={{flexDirection:'row',alignItems:'center',gap:4}}>
                  <Ionicons name="location-outline" size={14} color="#888" />
                  <Text style={{fontSize:13,color:'#888'}}>{user.location.split(',').slice(0,2).join(',').trim()}</Text>
                </View>
              </>
            )}
          </View>
          {user.ministries && user.ministries.length > 0 && (
            <View style={s.ministriesRow}>
              {user.ministries.map((m: string) => (
                <View key={m} style={s.ministryTag}><Text style={s.ministryTagTxt}>{m}</Text></View>
              ))}
            </View>
          )}
          <TouchableOpacity style={s.editBtn} onPress={() => router.push('/edit-profile' as any)}>
            <Ionicons name="pencil-outline" size={16} color={COLORS.navy}/>
            <Text style={s.editTxt}>Edit Profile</Text>
          </TouchableOpacity>

          <View style={s.verseWrap}>
            <Text style={s.verseItalic}>{user.lifeVerse}</Text>
            <View style={s.verseRefRow}>
              <Text style={s.verseRef}>{user.lifeVerseRef}</Text>
            </View>
          </View>

          <TouchableOpacity onPress={() => router.push('/activity' as any)} style={{marginTop:14}}>
            <Text style={{fontSize:13,fontWeight:'600',color:COLORS.gold}}>See Activity</Text>
          </TouchableOpacity>
        </View>

        {/* Faith Gallery */}
        <View style={{backgroundColor:'#ff0000',padding:12,margin:12,borderRadius:8}}>
          <Text style={{color:'#fff',fontWeight:'700',fontSize:12}}>DEBUG — remove after fixing</Text>
          <Text style={{color:'#fff',fontSize:11}}>displayName: "{displayName}"</Text>
          <Text style={{color:'#fff',fontSize:11}}>myPosts.length: {myPosts.length}</Text>
          <Text style={{color:'#fff',fontSize:11}}>myPosts with image: {myPosts.filter(p => !!p.image).length}</Text>
          <Text style={{color:'#fff',fontSize:11}}>postGalleryPhotos: {JSON.stringify(postGalleryPhotos)}</Text>
          <Text style={{color:'#fff',fontSize:11}}>galleryPhotos.length: {galleryPhotos.length}</Text>
          <Text style={{color:'#fff',fontSize:11}}>all authorNames: {JSON.stringify(allPosts.map(p => p.authorName))}</Text>
        </View>

        {galleryPhotos.length > 0 && (
          <>
            <View style={s.divider} />
            <View style={s.section}>
              <View style={s.sectionHdr}>
                <View style={{flexDirection:'row',alignItems:'center'}}>
                  <Ionicons name="images-outline" size={16} color={COLORS.navy} style={{marginRight:6}} />
                  <Text style={s.sectionTitle}>Faith Gallery</Text>
                </View>
              </View>
              <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
                {galleryPhotos.map((uri: string) => (
                  <Image key={uri} source={{uri}} style={{width:'23%',aspectRatio:1,borderRadius:8}} resizeMode="cover" />
                ))}
              </View>
            </View>
          </>
        )}

        <View style={s.divider} />
        <View style={s.section}>
          <View style={s.sectionHdr}>
            <Text style={s.sectionTitle}>Posts</Text>
          </View>
        </View>
        {(
          myPosts.length === 0 ? (
            <View style={s.emptyState}>
              <Ionicons name="book-outline" size={40} color="#ddd" />
              <Text style={s.emptyTxt}>Nothing shared yet</Text>
              <Text style={s.emptySub}>Scriptures, testimonies, and reflections you share will appear here</Text>
            </View>
          ) : (
            <View>
              {myPosts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  showLocation={true}
                  isOwnPost={true}
                  onLike={() => toggleLike(post.id)}
                  onComment={() => router.push({ pathname: '/comments' as any, params: { postId: post.id } })}
                  onShare={() => {}}
                  onOpenProfile={() => {}}
                />
              ))}
            </View>
          )
        )}


        <View style={{height:40}} />
      </ScrollView>
    </SafeAreaView>
  );
}


function ActivityTabContent() {
  const activity = useActivity();
  const { attending: myAttendingEvents } = useEventActions();
  const allEvents = useEvents ? useEvents() : [];
  const allPosts = usePosts();

  const TYPE_CONFIG = {
    like: { icon: 'heart', color: '#e74c6f', label: 'Liked a post' },
    comment: { icon: 'chatbubble', color: '#667eea', label: 'Commented on a post' },
    attending: { icon: 'calendar', color: COLORS.gold, label: 'Attending an event' },
  };

  // Merge likes/comments with attended events into one chronological list
  const attendingItems = (myAttendingEvents || []).map(eventId => {
    const event = allEvents.find((e: any) => e.id === eventId);
    return {
      id: 'attending-' + eventId,
      type: 'attending' as const,
      eventTitle: event?.title || 'An event',
      timestamp: Date.now() - 1000,
    };
  });

  const allActivity = [...activity, ...attendingItems]
    .sort((a, b) => b.timestamp - a.timestamp);

  if (allActivity.length === 0) {
    return (
      <View style={{ paddingVertical: 60, alignItems: 'center', gap: 10 }}>
        <Ionicons name="pulse-outline" size={40} color="#ddd" />
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#999' }}>No activity yet</Text>
        <Text style={{ fontSize: 13, color: '#bbb', textAlign: 'center', paddingHorizontal: 40 }}>
          Like posts, leave comments, or attend events to see your activity here.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ paddingTop: 12 }}>
      {allActivity.map(item => {
        if (item.type === 'attending') {
          return (
            <View key={item.id} style={{ marginHorizontal: 14, marginBottom: 14, backgroundColor: COLORS.white, borderRadius: 22, padding: 18, shadowColor: '#1a1a2e', shadowOffset: {width:0,height:2}, shadowOpacity: 0.06, shadowRadius: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(201,169,110,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="calendar" size={18} color={COLORS.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, color: '#888', marginBottom: 2 }}>Attending event</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.navy }}>{item.eventTitle}</Text>
                </View>
              </View>
            </View>
          );
        }
        const post = allPosts.find(p => p.id === item.postId);
        if (!post) return null;
        return (
          <PostCard
            key={item.id}
            post={post}
            showLocation={!!(post.city && post.state)}
            onLike={() => toggleLike(post.id)}
            onComment={() => router.push({ pathname: '/comments' as any, params: { postId: post.id } })}
            onShare={() => {}}
            onOpenProfile={() => {}}
          />
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:COLORS.white},
  // Gallery
  coverIconBtn:{width:36,height:36,borderRadius:18,backgroundColor:'rgba(0,0,0,0.4)',alignItems:'center',justifyContent:'center'},
  galleryWrap:{height:320,position:'relative'},
  dots:{position:'absolute',bottom:12,left:0,right:0,flexDirection:'row',justifyContent:'center',gap:6},
  dot:{width:6,height:6,borderRadius:3,backgroundColor:'rgba(255,255,255,0.4)'},
  dotActive:{backgroundColor:'#fff',width:18},
  addMorePhotosBtn:{position:'absolute',top:12,right:12,flexDirection:'row',alignItems:'center',gap:6,backgroundColor:'rgba(0,0,0,0.5)',borderRadius:12,paddingHorizontal:12,paddingVertical:7},
  addMorePhotosTxt:{color:COLORS.white,fontSize:12,fontWeight:'600'},
  photoBanner:{height:380,alignItems:'center',justifyContent:'center'},
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
  locationRow:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:4,alignSelf:'center'},
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
  // Ministries & Amenities chips
  chipsWrap:{flexDirection:'row',flexWrap:'wrap',gap:8},
  chip:{flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:14,paddingVertical:8,borderRadius:100,backgroundColor:COLORS.lightBg,borderWidth:1,borderColor:COLORS.border},
  chipTxt:{fontSize:13,fontWeight:'600',color:COLORS.navy},
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
  coverWrap:{position:'relative',height:220,marginBottom:50,overflow:'visible'},
  cover:{width:'100%',height:200,backgroundColor:COLORS.navy},
  addCoverBtn:{position:'absolute',bottom:50,left:12,flexDirection:'row',alignItems:'center',gap:5,backgroundColor:'rgba(0,0,0,0.4)',borderRadius:8,paddingHorizontal:10,paddingVertical:5},
  addCoverTxt:{color:COLORS.white,fontSize:12},
  avatarWrap:{position:'absolute',bottom:-45,left:0,right:0,alignItems:'center'},
  avatar:{width:90,height:90,borderRadius:45,backgroundColor:COLORS.navy,borderWidth:3,borderColor:COLORS.white,alignItems:'center',justifyContent:'center',shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.15,shadowRadius:6},
  avatarTxt:{color:COLORS.white,fontSize:32,fontWeight:'700'},
  personalInfo:{paddingHorizontal:16,alignItems:'center',paddingBottom:16},
  name:{fontFamily:'PlayfairDisplay_700Bold',fontSize:22,color:COLORS.navy,marginBottom:4},
  connectionsRow:{flexDirection:'row',alignItems:'center',marginBottom:16},
  connectionsNum:{fontSize:15,fontWeight:'700',color:COLORS.navy},
  connectionsTxt:{fontSize:15,color:'#888'},
  churchPill:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:COLORS.lightBg,borderRadius:100,paddingHorizontal:16,paddingVertical:10,marginBottom:12,borderWidth:1,borderColor:COLORS.border},
  churchPillTxt:{fontSize:14,color:COLORS.navy,fontWeight:'600'},
  ministriesRow:{flexDirection:'row',flexWrap:'wrap',gap:10,marginBottom:14},
  ministryTag:{borderWidth:1.5,borderColor:COLORS.gold,borderRadius:100,paddingHorizontal:16,paddingVertical:6},
  ministryTagTxt:{fontSize:13,color:COLORS.gold,fontWeight:'600'},
  editBtn:{flexDirection:'row',alignItems:'center',gap:8,borderWidth:1,borderColor:COLORS.border,borderRadius:12,paddingHorizontal:20,paddingVertical:12,marginBottom:16,width:'100%',justifyContent:'center'},
  activityBtn:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderWidth:1,borderColor:COLORS.border,borderRadius:16,paddingHorizontal:16,paddingVertical:16},
  editTxt:{fontSize:15,fontWeight:'700',color:COLORS.navy},
  verseWrap:{alignItems:'center',paddingHorizontal:16},
  verseItalic:{fontFamily:'PlayfairDisplay_400Regular_Italic',fontSize:14,color:'#555',textAlign:'center',lineHeight:22,marginBottom:4},
  verseRefRow:{flexDirection:'row',alignItems:'center',gap:6},
  verseRef:{fontSize:13,color:COLORS.gold,fontWeight:'700'},
  // Sign out
  signOutBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,marginHorizontal:16,marginTop:16,padding:14,borderRadius:16,borderWidth:1,borderColor:'#fee2e2',backgroundColor:'#fff5f5'},
  signOutTxt:{fontSize:14,fontWeight:'700',color:COLORS.red},
});
