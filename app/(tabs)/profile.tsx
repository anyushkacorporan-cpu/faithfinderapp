import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Linking, Alert, Share, FlatList, Dimensions, Modal } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { HeaderIcons } from '../../src/components/Header';
import { useThemeColors, ThemeColors } from '../../src/lib/theme';
import { useUser, setUser, getUser } from '../../src/lib/userStore';
import { useActivity } from '../../src/lib/activityStore';
import { useConnections, useConnectionCount, removeConnection } from '../../src/lib/connectionsStore';
import { usePosts, toggleLike, editPost, isAuthoredBy } from '../../src/lib/postsStore';
import { useUserEvents } from '../../src/lib/eventsStore';
import { PostCard } from '../../src/components/PostCard';
import { useEventActions } from '../../src/lib/eventActionsStore';
import { EVENTS } from '../../src/lib/constants';
import { useEvents } from '../../src/lib/eventsStore';
import { useSettings } from '../../src/lib/settingsStore';
import { useTranslation } from '../../src/lib/i18n';

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
  const c = useThemeColors();
  const s = makeStyles(c);
  const insets = useSafeAreaInsets();
  const user = useUser();
  const appSettings = useSettings();
  const { t, tx } = useTranslation();
  const [activeTab, setActiveTab] = useState('Posts');
  const allPosts = usePosts();
  const displayName = user.accountType === 'church'
    ? (user.churchName || 'Church')
    : ((user.firstName || 'You') + ' ' + (user.lastName || '')).trim();
  const myPosts = allPosts.filter(p => isAuthoredBy(p, user.id, displayName));
  const myEvents = useUserEvents();
  const postGalleryPhotos = myPosts.filter(p => !!p.image).map(p => p.image as string);
  const galleryPhotos = [...new Set([...postGalleryPhotos, ...(user.photos || [])])];
  const galleryItems = galleryPhotos.map(uri => ({ uri, post: myPosts.find(p => p.image === uri) || null }));

  function handleDeleteGalleryPhoto(item: { uri: string; post: any }) {
    Alert.alert(
      tx('Delete Photo?'),
      tx('This photo will be removed from your Faith Gallery') + (item.post ? ' and from the Community post it was shared in.' : '.'),
      [
        { text: tx('Cancel'), style: 'cancel' },
        {
          text: tx('Delete'),
          style: 'destructive',
          onPress: () => {
            if (item.post) {
              editPost(item.post.id, { image: null });
            } else {
              const liveUser = getUser();
              setUser({ photos: (liveUser.photos || []).filter((p: string) => p !== item.uri) });
            }
            setPhotoViewerVisible(false);
          },
        },
      ]
    );
  }
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [photoViewerIndex, setPhotoViewerIndex] = useState(0);
  const { attending } = useEventActions();
  const userCreatedEvents = useEvents();
  const allEventsPool = [...userCreatedEvents, ...EVENTS];
  const myAttendingEvents = attending
    .map(id => allEventsPool.find((e: any) => e.id === id))
    .filter(Boolean);
  const [activePhoto, setActivePhoto] = useState(0);
  const [showAllGallery, setShowAllGallery] = useState(false);
  const isChurch = user.accountType === 'church';
  const connections = useConnections();
  const connectionCount = useConnectionCount();

  async function handleAddPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(tx('Permission needed'), tx('Please allow access to your photo library.'));
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
      Alert.alert(tx('Permission needed'), tx('Please allow camera access.'));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled) {
      setUser({ photos: [...(user.photos || []), result.assets[0].uri] });
    }
  }

  function handleAddPhotoOptions() {
    Alert.alert(tx('Add Photo'), tx('Choose a photo source'), [
      { text: tx('Camera'), onPress: handleTakePhoto },
      { text: tx('Photo Library'), onPress: handleAddPhoto },
      { text: tx('Cancel'), style: 'cancel' },
    ]);
  }

  function toggleAmenity(key: string) {
    setUser({ amenities: { ...user.amenities, [key]: !user.amenities?.[key] } });
  }

  function handlePhone() {
    if (!user.phone) { Alert.alert(tx('No phone number set'), tx('Edit your profile to add a phone number.')); return; }
    Linking.openURL(`tel:${user.phone.replace(/\D/g,'')}`);
  }

  function handleWebsite() {
    if (!user.website) { Alert.alert(tx('No website set'), tx('Edit your profile to add a website.')); return; }
    let url = user.website;
    if (!url.startsWith('http')) url = 'https://' + url;
    Linking.openURL(url);
  }

  function handleEmail() {
    if (!user.churchEmail) { Alert.alert(tx('No email set'), tx('Edit your profile to add an email.')); return; }
    Linking.openURL(`mailto:${user.churchEmail}`);
  }

  function handleDirections() {
    if (!user.address) { Alert.alert(tx('No address set'), tx('Edit your profile to add an address.')); return; }
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
      <SafeAreaView style={s.root} edges={[]}>
        <ScrollView showsVerticalScrollIndicator={false}>

          {/* Photo Gallery */}
          {(user.photos?.length ?? 0) > 0 ? (
            <View style={[s.galleryWrap, {height: 320 + insets.top}]}>

              <FlatList
                data={user.photos}
                horizontal pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={e => setActivePhoto(Math.round(e.nativeEvent.contentOffset.x / W))}
                renderItem={({ item }) => <Image source={{ uri: item }} style={{ width: W, height: 380 + insets.top }} resizeMode="cover" />}
                keyExtractor={(_, i) => String(i)}
              />
              <View style={s.dots}>
                {(user.photos || []).map((_, i) => <View key={i} style={[s.dot, i===activePhoto && s.dotActive]} />)}
              </View>
              <TouchableOpacity style={s.addMorePhotosBtn} onPress={handleAddPhotoOptions}>
                <Ionicons name="camera" size={16} color="#fff" />
                <Text style={s.addMorePhotosTxt}>{t('addPhotos')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{position:'relative'}}>
              <TouchableOpacity style={[s.photoBanner, {height: 380 + insets.top}]} onPress={handleAddPhotoOptions} activeOpacity={0.85}>
                <LinearGradient colors={['#1a1a2e', '#2d2240']} style={StyleSheet.absoluteFill} start={{x:0,y:0}} end={{x:1,y:1}} />
                <View style={s.photoUploadWrap}>
                  <View style={s.photoUploadIcon}>
                    <Ionicons name="camera" size={28} color={c.gold} />
                  </View>
                  <Text style={s.photoUploadTitle}>{t('addChurchPhotos')}</Text>
                  <Text style={s.photoUploadSub}>{t('showChurchToCommunity')}</Text>
                </View>
              </TouchableOpacity>

            </View>
          )}

                    {/* Actions row */}
          <View style={s.actionsRow}>
            <TouchableOpacity onPress={() => router.push('/edit-church-profile')}>
              <View style={s.editProfileBtn}>
                <Ionicons name="pencil-outline" size={16} color={c.text} />
                <Text style={s.editProfileTxt}>{t('editProfile')}</Text>
              </View>
            </TouchableOpacity>
            <View style={s.actionIcons}>
              {user.verificationStatus === 'pending' && (
                <View style={s.pendingBadge}>
                  <Ionicons name="time-outline" size={12} color={c.gold} />
                  <Text style={s.pendingBadgeTxt}>{t('pending')}</Text>
                </View>
              )}
              {user.verificationStatus === 'approved' && (
                <View style={s.verifiedBadge}>
                  <Ionicons name="shield-checkmark" size={12} color="#fff" />
                  <Text style={s.verifiedBadgeTxt}>{t('verified')}</Text>
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
                <LinearGradient colors={['#1a1a2e', '#2d2240']} style={s.churchAvatar} start={{x:0,y:0}} end={{x:1,y:1}}>
                  <Ionicons name="home" size={28} color={c.gold} />
                </LinearGradient>
              )}
              <View style={s.churchNames}>
                <Text style={s.churchName}>{user.churchName || 'Your Church'}</Text>
                {!!user.denomination && <Text style={s.churchDenom}>{user.denomination}</Text>}
                {appSettings.privacy.showLocation && (
                <View style={s.locationRow}>
                  <Ionicons name="location-outline" size={13} color={c.textMuted} />
                  <Text style={s.locationTxt} numberOfLines={1}>{user.address || user.location || ''}</Text>
                </View>
                )}
              </View>
            </View>
          </View>

          {/* Stars */}
          <View style={s.starsRow}>
            {[1,2,3,4,5].map(i => <Ionicons key={i} name="star-outline" size={18} color={c.gold} />)}
            <Text style={s.ratingTxt}>{t('noReviewsYet')}</Text>
          </View>

          <View style={s.divider} />

          {/* About */}
          {!!user.bio && (
            <>
              <View style={s.section}>
                <View style={s.sectionHdr}>
                  <Text style={s.sectionTitle}>{t('about')}</Text>
                </View>
                <Text style={{fontSize:14,color:c.textSecondary,lineHeight:20}}>{user.bio}</Text>
              </View>
              <View style={s.divider} />
            </>
          )}

          {/* Information Card */}
          <View style={s.section}>
            <View style={s.sectionHdr}>
              <Text style={s.sectionTitle}>{t('information')}</Text>
            </View>
            <View style={s.infoCard}>

              {/* Address */}
              <View style={s.infoRow}>
                <View style={s.infoIconWrap}><Ionicons name="location-outline" size={18} color={user.address ? c.text : c.placeholder} /></View>
                <View style={s.infoContent}>
                  <Text style={s.infoLabel}>{t('address')}</Text>
                  {!!user.address && <Text style={s.infoValue}>{user.address}</Text>}
                </View>
                {!!user.address && (
                  <TouchableOpacity style={s.infoBadge} onPress={handleDirections}>
                    <Text style={s.infoBadgeTxt}>{t('directions')}</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={s.infoDivider} />

              {/* Phone */}
              <TouchableOpacity style={s.infoRow} onPress={handlePhone} activeOpacity={user.phone ? 0.7 : 1}>
                <View style={s.infoIconWrap}><Ionicons name="call-outline" size={18} color={user.phone ? c.text : c.placeholder} /></View>
                <View style={s.infoContent}>
                  <Text style={s.infoLabel}>{t('phone')}</Text>
                  {!!user.phone && <Text style={[s.infoValue, s.tappable]}>{user.phone}</Text>}
                </View>
                {!!user.phone && <View style={s.callBadge}><Text style={s.callBadgeTxt}>{t('call')}</Text></View>}
              </TouchableOpacity>
              <View style={s.infoDivider} />

              {/* Website */}
              <TouchableOpacity style={s.infoRow} onPress={handleWebsite} activeOpacity={user.website ? 0.7 : 1}>
                <View style={s.infoIconWrap}><Ionicons name="globe-outline" size={18} color={user.website ? c.text : c.placeholder} /></View>
                <View style={s.infoContent}>
                  <Text style={s.infoLabel}>{t('website')}</Text>
                  {!!user.website && <Text style={[s.infoValue, s.goldTxt]} numberOfLines={1}>{user.website.replace(/^https?:\/\//,'').replace(/\/$/,'')}</Text>}
                </View>
                {!!user.website && <View style={s.visitBadge}><Text style={s.visitBadgeTxt}>{t('visit')}</Text></View>}
              </TouchableOpacity>
              <View style={s.infoDivider} />

              {/* Email */}
              <TouchableOpacity style={s.infoRow} onPress={handleEmail} activeOpacity={user.churchEmail ? 0.7 : 1}>
                <View style={s.infoIconWrap}><Ionicons name="mail-outline" size={18} color={user.churchEmail ? c.text : c.placeholder} /></View>
                <View style={s.infoContent}>
                  <Text style={s.infoLabel}>{t('email')}</Text>
                  {!!user.churchEmail && <Text style={[s.infoValue, s.tappable]}>{user.churchEmail}</Text>}
                </View>
                {!!user.churchEmail && <View style={s.callBadge}><Text style={s.callBadgeTxt}>{t('email')}</Text></View>}
              </TouchableOpacity>
              <View style={s.infoDivider} />

              {/* Service Times */}
              <View style={s.infoRow}>
                <View style={s.infoIconWrap}><Ionicons name="time-outline" size={18} color={user.serviceTimes ? c.text : c.placeholder} /></View>
                <View style={s.infoContent}>
                  <Text style={s.infoLabel}>{t('serviceTimes')}</Text>
                  {!!user.serviceTimes && user.serviceTimes.split('\n').map((line, i, rows) => {
                    const [timePart, notePart] = line.split(' | ');
                    return (
                      <View key={i} style={{marginBottom: i < rows.length - 1 ? 6 : 0}}>
                        <Text style={s.infoValue}>{timePart}</Text>
                        {!!notePart && <Text style={{fontSize:12,color:c.textMuted,marginTop:1}}>{notePart}</Text>}
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
                  <Text style={s.sectionTitle}>{t('ministriesAmenities')}</Text>
                </View>
                <View style={s.chipsWrap}>
                  {(user.ministries || []).map((name: string) => (
                    <View key={`ministry-${name}`} style={s.chip}>
                      <Ionicons name="pricetag-outline" size={14} color={c.text} />
                      <Text style={s.chipTxt}>{name}</Text>
                    </View>
                  ))}
                  {AMENITY_LIST.filter(item => !!user.amenities?.[item.key]).map(item => (
                    <View key={`amenity-${item.key}`} style={s.chip}>
                      <Ionicons name={item.icon as any} size={14} color={c.text} />
                      <Text style={s.chipTxt}>{tx(item.label)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}

          <View style={s.divider} />

          {/* Posts. CHURCH_TABS has been declared since the app was written but
              never rendered, so a church could post and have nowhere on its own
              profile for those posts to appear. */}
          <View style={s.churchTabsRow}>
            {CHURCH_TABS.map(tab => (
              <TouchableOpacity
                key={tab}
                style={[s.churchTab, activeTab === tab && s.churchTabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[s.churchTabTxt, activeTab === tab && s.churchTabTxtActive]}>
                  {tab === 'Posts' ? t('posts') : tab === 'Events' ? t('events') : tx('Members')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeTab === 'Posts' && (
            myPosts.length === 0 ? (
              <View style={s.churchEmpty}>
                <Ionicons name="create-outline" size={26} color={c.textMuted} />
                <Text style={s.churchEmptyTitle}>{tx('No posts yet')}</Text>
                <Text style={s.churchEmptySub}>{tx('Share an update from the Community tab and it will appear here.')}</Text>
              </View>
            ) : (
              myPosts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  showLocation={!!(post.city && post.state)}
                  isOwnPost
                  onLike={() => toggleLike(post.id)}
                  onComment={() => router.push({ pathname: '/comments', params: { postId: post.id } })}
                  onShare={() => {}}
                  onOpenProfile={() => {}}
                />
              ))
            )
          )}

          {activeTab === 'Events' && (
            myEvents.length === 0 ? (
              <View style={s.churchEmpty}>
                <Ionicons name="calendar-outline" size={26} color={c.textMuted} />
                <Text style={s.churchEmptyTitle}>{tx('No events yet')}</Text>
                <Text style={s.churchEmptySub}>{tx('Events you create will be listed here.')}</Text>
              </View>
            ) : (
              myEvents.map(ev => (
                <TouchableOpacity
                  key={ev.id}
                  style={s.churchEventRow}
                  onPress={() => router.push({ pathname: '/event-detail', params: { id: ev.id, title: ev.title, date: ev.date, location: ev.location, type: ev.type, price: ev.isPaid ? String(ev.ticketPrice) : 'Free', organizer: displayName, description: ev.description || '' } })}
                >
                  <View style={s.churchEventIcon}>
                    <Ionicons name="calendar" size={17} color={c.gold} />
                  </View>
                  <View style={{flex:1}}>
                    <Text style={s.churchEventTitle} numberOfLines={1}>{ev.title}</Text>
                    <Text style={s.churchEventMeta}>{ev.date}{ev.location ? ' · ' + ev.location : ''}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={c.placeholder} />
                </TouchableOpacity>
              ))
            )
          )}

          {activeTab === 'Members' && (
            <View style={s.churchEmpty}>
              <Ionicons name="people-outline" size={26} color={c.textMuted} />
              <Text style={s.churchEmptyTitle}>{tx('Members are coming soon')}</Text>
              <Text style={s.churchEmptySub}>{tx('Once people can follow your church, they will be listed here.')}</Text>
            </View>
          )}

          <View style={{height:40}} />
        </ScrollView>
        {/* Bell + gear float over the cover photo. They sit outside the
            ScrollView so they stay pinned as you scroll — the settings sheet is
            the only way into settings, so it must not scroll out of reach. */}
        <View style={[s.floatingIcons, {top: insets.top + 8}]} pointerEvents="box-none">
          <HeaderIcons overlay />
        </View>
      </SafeAreaView>
    );
  }

  // ── PERSONAL PROFILE ────────────────────────────────
  return (
    <SafeAreaView style={s.root} edges={[]}>
        <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[s.coverWrap, {height: 220 + insets.top}]}>
          {user.coverPhoto
            ? <Image source={{uri:user.coverPhoto}} style={{width:'100%',height:200 + insets.top}} resizeMode="cover"/>
            : <View style={[s.cover, {height: 200 + insets.top}]} />
          }
          <TouchableOpacity style={s.addCoverBtn} onPress={async () => {
            const {status} = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') return;
            const result = await ImagePicker.launchImageLibraryAsync({mediaTypes:ImagePicker.MediaTypeOptions.Images,allowsEditing:true,aspect:[16,9],quality:0.8});
            if (!result.canceled) setUser({coverPhoto:result.assets[0].uri});
          }}>
            <Ionicons name="camera-outline" size={14} color="#fff" />
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
              <View style={{position:'absolute',bottom:0,right:0,width:24,height:24,borderRadius:12,backgroundColor:c.navy,borderWidth:2,borderColor:c.card,alignItems:'center',justifyContent:'center'}}>
                <Ionicons name="camera" size={12} color="#fff"/>
              </View>
            </TouchableOpacity>
          </View>
        </View>
        <View style={s.personalInfo}>
          <Text style={s.name}>{user.firstName || 'Annie'} {user.lastName || 'Johnson'}</Text>
          {!!user.bio && (
            <Text style={{fontSize:14,color:c.textSecondary,textAlign:'center',lineHeight:20,marginTop:4,marginBottom:14,paddingHorizontal:8}}>{user.bio}</Text>
          )}
          <View style={{flexDirection:'row',alignItems:'center',gap:16,marginBottom:14}}>
            <TouchableOpacity style={{flexDirection:'row',alignItems:'center',gap:5}} onPress={() => router.push('/connections')}>
              <Ionicons name="people-outline" size={14} color={c.textMuted} />
              <Text style={{fontSize:13,color:c.textMuted}}>{connectionCount}</Text>
            </TouchableOpacity>
            {appSettings.privacy.showLocation && !!user.location && (
              <>
                <View style={{width:1,height:12,backgroundColor:c.border}} />
                <View style={{flexDirection:'row',alignItems:'center',gap:4}}>
                  <Ionicons name="location-outline" size={14} color={c.textMuted} />
                  <Text style={{fontSize:13,color:c.textMuted}}>{user.location.split(',').slice(0,2).join(',').trim()}</Text>
                </View>
              </>
            )}
            {!appSettings.privacy.publicProfile && (
              <>
                <View style={{width:1,height:12,backgroundColor:c.border}} />
                <View style={{flexDirection:'row',alignItems:'center',gap:4}}>
                  <Ionicons name="lock-closed" size={13} color={c.gold} />
                  <Text style={{fontSize:13,color:c.gold,fontWeight:'600'}}>{tx('Private')}</Text>
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
          <TouchableOpacity style={s.editBtn} onPress={() => router.push('/edit-profile')}>
            <Ionicons name="pencil-outline" size={16} color={c.text}/>
            <Text style={s.editTxt}>{t('editProfile')}</Text>
          </TouchableOpacity>

          <View style={s.verseWrap}>
            <Text style={s.verseItalic}>{user.lifeVerse}</Text>
            <View style={s.verseRefRow}>
              <Text style={s.verseRef}>{user.lifeVerseRef}</Text>
            </View>
          </View>

          <TouchableOpacity onPress={() => router.push('/activity')} style={{marginTop:14}}>
            <Text style={{fontSize:13,fontWeight:'600',color:c.gold}}>{t('seeActivity')}</Text>
          </TouchableOpacity>
        </View>

        {/* Faith Gallery */}
        {galleryPhotos.length > 0 && (
          <>
            <View style={s.divider} />
            <View style={s.section}>
              <View style={s.sectionHdr}>
                <View style={{flexDirection:'row',alignItems:'center'}}>
                  <Ionicons name="images-outline" size={16} color={c.text} style={{marginRight:6}} />
                  <Text style={s.sectionTitle}>{t('faithGallery')}</Text>
                </View>
              </View>
              <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
                {(showAllGallery ? galleryPhotos : galleryPhotos.slice(0, 3)).map((uri: string) => {
                  const thumbSize = (Dimensions.get('window').width - 32 - 6 * 3) / 4;
                  const fullIndex = galleryPhotos.indexOf(uri);
                  return (
                    <TouchableOpacity key={uri} onPress={() => { setPhotoViewerIndex(fullIndex); setPhotoViewerVisible(true); }} activeOpacity={0.85}>
                      <Image source={{uri}} style={{width:thumbSize,height:thumbSize,borderRadius:8,backgroundColor:c.cardAlt}} resizeMode="cover" />
                    </TouchableOpacity>
                  );
                })}
              </View>
              {galleryPhotos.length > 3 && (
                <TouchableOpacity onPress={() => setShowAllGallery(!showAllGallery)} style={{marginTop:10,alignSelf:'flex-start'}}>
                  <Text style={{fontSize:13,fontWeight:'600',color:c.gold}}>
                    {showAllGallery ? 'Show Less' : `See More (${galleryPhotos.length - 3})`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        <Modal visible={photoViewerVisible} transparent animationType="fade" onRequestClose={() => setPhotoViewerVisible(false)}>
          <View style={{flex:1,backgroundColor:'#000'}}>
            <TouchableOpacity
              onPress={() => setPhotoViewerVisible(false)}
              style={{position:'absolute',top:54,right:20,zIndex:10,width:36,height:36,borderRadius:18,backgroundColor:'rgba(255,255,255,0.15)',alignItems:'center',justifyContent:'center'}}
            >
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
            <FlatList
              data={galleryItems}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={photoViewerIndex}
              getItemLayout={(_, i) => ({ length: Dimensions.get('window').width, offset: Dimensions.get('window').width * i, index: i })}
              keyExtractor={(item) => item.uri}
              renderItem={({ item }) => (
                <View style={{width:Dimensions.get('window').width,flex:1,justifyContent:'center'}}>
                  <Image source={{uri:item.uri}} style={{width:'100%',height:'70%'}} resizeMode="contain" />
                  <View style={{paddingHorizontal:20,paddingTop:16}}>
                    {item.post ? (
                      <>
                        {!!item.post.content && (
                          <Text style={{color:'#fff',fontSize:14,lineHeight:20,marginBottom:14}}>{item.post.content}</Text>
                        )}
                        <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
                          <View style={{flexDirection:'row',alignItems:'center',gap:20}}>
                            <TouchableOpacity style={{flexDirection:'row',alignItems:'center',gap:6}} onPress={() => toggleLike(item.post!.id)}>
                              <Ionicons name={item.post.liked ? 'heart' : 'heart-outline'} size={20} color={item.post.liked ? '#e74c6f' : '#fff'} />
                              <Text style={{color:'#fff',fontSize:13,fontWeight:'600'}}>{item.post.likes}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={{flexDirection:'row',alignItems:'center',gap:6}}
                              onPress={() => { setPhotoViewerVisible(false); router.push({ pathname: '/comments', params: { postId: item.post!.id } }); }}
                            >
                              <Ionicons name="chatbubble-outline" size={18} color="#fff" />
                              <Text style={{color:'#fff',fontSize:13,fontWeight:'600'}}>{item.post.comments.length}</Text>
                            </TouchableOpacity>
                          </View>
                          <TouchableOpacity onPress={() => handleDeleteGalleryPhoto(item)}>
                            <Ionicons name="trash-outline" size={20} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      </>
                    ) : (
                      <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
                        <Text style={{color:'rgba(255,255,255,0.5)',fontSize:12}}>{t('addedToFaithGallery')}</Text>
                        <TouchableOpacity onPress={() => handleDeleteGalleryPhoto(item)}>
                          <Ionicons name="trash-outline" size={20} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              )}
            />
          </View>
        </Modal>

        <View style={s.divider} />
        <View style={s.section}>
          <View style={s.sectionHdr}>
            <Text style={s.sectionTitle}>{t('posts')}</Text>
          </View>
        </View>
        {(
          myPosts.length === 0 ? (
            <View style={s.emptyState}>
              <Ionicons name="book-outline" size={40} color={c.placeholder} />
              <Text style={s.emptyTxt}>{t('nothingSharedYet')}</Text>
              <Text style={s.emptySub}>{t('scripturesTestimonies')}</Text>
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
                  onComment={() => router.push({ pathname: '/comments', params: { postId: post.id } })}
                  onShare={() => {}}
                  onOpenProfile={() => {}}
                />
              ))}
            </View>
          )
        )}


        <View style={{height:40}} />
      </ScrollView>
      {/* Bell + gear float over the cover photo. They sit outside the
          ScrollView so they stay pinned as you scroll — the settings sheet is
          the only way into settings, so it must not scroll out of reach. */}
      <View style={[s.floatingIcons, {top: insets.top + 8}]} pointerEvents="box-none">
        <HeaderIcons overlay />
      </View>
    </SafeAreaView>
  );
}


function ActivityTabContent() {
  const c = useThemeColors();
  const { t } = useTranslation();
  const activity = useActivity();
  const { attending: myAttendingEvents } = useEventActions();
  const allEvents = useEvents ? useEvents() : [];
  const allPosts = usePosts();

  const TYPE_CONFIG = {
    like: { icon: 'heart', color: '#e74c6f', label: 'Liked a post' },
    comment: { icon: 'chatbubble', color: '#667eea', label: 'Commented on a post' },
    attending: { icon: 'calendar', color: c.gold, label: 'Attending an event' },
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
        <Ionicons name="pulse-outline" size={40} color={c.placeholder} />
        <Text style={{ fontSize: 15, fontWeight: '600', color: c.textMuted }}>{t('noActivityYet')}</Text>
        <Text style={{ fontSize: 13, color: c.textMuted, textAlign: 'center', paddingHorizontal: 40 }}>
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
            <View key={item.id} style={{ marginHorizontal: 14, marginBottom: 14, backgroundColor: c.card, borderRadius: 22, padding: 18, shadowColor: '#000', shadowOffset: {width:0,height:2}, shadowOpacity: 0.06, shadowRadius: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(201,169,110,0.16)', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="calendar" size={18} color={c.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, color: c.textMuted, marginBottom: 2 }}>{t('attendingEvent')}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: c.text }}>{item.eventTitle}</Text>
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
            onComment={() => router.push({ pathname: '/comments', params: { postId: post.id } })}
            onShare={() => {}}
            onOpenProfile={() => {}}
          />
        );
      })}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  churchTabsRow:{flexDirection:'row',backgroundColor:c.cardAlt,borderRadius:100,padding:3,marginHorizontal:16,marginTop:16,marginBottom:14},
  churchTab:{flex:1,paddingVertical:8,borderRadius:100,alignItems:'center'},
  churchTabActive:{backgroundColor:c.card,shadowColor:'#000',shadowOffset:{width:0,height:1},shadowOpacity:0.08,shadowRadius:3},
  churchTabTxt:{fontSize:13,fontWeight:'600',color:c.textMuted},
  churchTabTxtActive:{color:c.text,fontWeight:'700'},
  churchEmpty:{alignItems:'center',paddingVertical:34,paddingHorizontal:28,gap:7},
  churchEmptyTitle:{fontSize:15,fontWeight:'700',color:c.text},
  churchEmptySub:{fontSize:13,color:c.textMuted,textAlign:'center',lineHeight:19},
  churchEventRow:{flexDirection:'row',alignItems:'center',gap:12,marginHorizontal:16,marginBottom:10,padding:13,borderRadius:14,borderWidth:1,borderColor:c.border,backgroundColor:c.card},
  churchEventIcon:{width:36,height:36,borderRadius:11,backgroundColor:'rgba(201,169,110,0.16)',alignItems:'center',justifyContent:'center'},
  churchEventTitle:{fontSize:14,fontWeight:'700',color:c.text},
  churchEventMeta:{fontSize:12,color:c.textMuted,marginTop:2},
  root:{flex:1,backgroundColor:c.bg},
  // Gallery
  coverIconBtn:{width:36,height:36,borderRadius:18,backgroundColor:'rgba(0,0,0,0.4)',alignItems:'center',justifyContent:'center'},
  galleryWrap:{height:320,position:'relative'},
  dots:{position:'absolute',bottom:12,left:0,right:0,flexDirection:'row',justifyContent:'center',gap:6},
  dot:{width:6,height:6,borderRadius:3,backgroundColor:'rgba(255,255,255,0.4)'},
  dotActive:{backgroundColor:'#fff',width:18},
  addMorePhotosBtn:{position:'absolute',bottom:34,right:12,flexDirection:'row',alignItems:'center',gap:6,backgroundColor:'rgba(0,0,0,0.5)',borderRadius:12,paddingHorizontal:12,paddingVertical:7},
  addMorePhotosTxt:{color:'#fff',fontSize:12,fontWeight:'600'},
  photoBanner:{height:380,alignItems:'center',justifyContent:'center'},
  photoUploadWrap:{alignItems:'center',gap:8},
  photoUploadIcon:{width:64,height:64,borderRadius:18,backgroundColor:'rgba(201,169,110,0.2)',alignItems:'center',justifyContent:'center'},
  photoUploadTitle:{fontSize:16,fontWeight:'700',color:'#fff'},
  photoUploadSub:{fontSize:13,color:'rgba(255,255,255,0.6)'},
  // Actions row
  actionsRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:16,paddingVertical:12},
  editProfileBtn:{flexDirection:'row',alignItems:'center',gap:7,borderWidth:1.5,borderColor:c.border,borderRadius:12,paddingHorizontal:16,paddingVertical:9},
  editProfileTxt:{fontSize:14,fontWeight:'700',color:c.text},
  actionIcons:{flexDirection:'row',alignItems:'center',gap:10},
  actionIconBtn:{width:38,height:38,borderRadius:12,borderWidth:1.5,borderColor:c.border,alignItems:'center',justifyContent:'center'},
  pendingBadge:{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:'rgba(201,169,110,0.16)',borderRadius:100,paddingHorizontal:10,paddingVertical:5},
  pendingBadgeTxt:{fontSize:11,fontWeight:'700',color:c.gold},
  verifiedBadge:{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:c.green,borderRadius:100,paddingHorizontal:10,paddingVertical:5},
  verifiedBadgeTxt:{fontSize:11,fontWeight:'700',color:'#fff'},
  // Church identity
  churchIdentity:{paddingHorizontal:16,paddingBottom:12},
  churchAvatarRow:{flexDirection:'row',alignItems:'flex-start',gap:14,marginBottom:16},
  churchAvatar:{width:72,height:72,borderRadius:18,alignItems:'center',justifyContent:'center'},
  churchNames:{flex:1},
  churchName:{fontFamily:'PlayfairDisplay_700Bold',fontSize:20,color:c.text,marginBottom:3},
  churchDenom:{fontSize:13,color:c.gold,fontWeight:'600',marginBottom:4},
  locationRow:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:4,alignSelf:'center'},
  locationTxt:{fontSize:13,color:c.textMuted,flex:1},
  statsRow:{flexDirection:'row',backgroundColor:c.cardAlt,borderRadius:16,paddingVertical:12},
  stat:{flex:1,alignItems:'center'},
  statN:{fontSize:18,fontWeight:'700',color:c.text},
  statL:{fontSize:10,color:c.textMuted},
  // Stars
  starsRow:{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:16,marginBottom:8,flexWrap:'wrap'},
  ratingTxt:{fontSize:13,color:c.textMuted,marginLeft:4},
  writeReviewBtn:{marginLeft:'auto'},
  writeReviewTxt:{fontSize:13,color:c.gold,fontWeight:'700'},
  divider:{height:1,backgroundColor:c.border,marginHorizontal:16,marginVertical:16},
  // Section
  section:{paddingHorizontal:16,marginBottom:4},
  sectionHdr:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:14},
  sectionTitle:{fontSize:17,fontWeight:'700',color:c.text},
  sectionSub:{fontSize:12,color:c.textMuted},
  editLink:{fontSize:13,color:c.gold,fontWeight:'700'},
  // Info card
  infoCard:{borderWidth:1,borderColor:c.border,borderRadius:16,overflow:'hidden'},
  infoRow:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:14,gap:12},
  infoDivider:{height:1,backgroundColor:c.rowBorder,marginLeft:62},
  infoIconWrap:{width:36,height:36,borderRadius:10,backgroundColor:c.cardAlt,alignItems:'center',justifyContent:'center'},
  infoContent:{flex:1},
  infoLabel:{fontSize:11,color:c.textMuted,fontWeight:'600',textTransform:'uppercase',letterSpacing:0.4,marginBottom:2},
  infoValue:{fontSize:14,color:c.text,fontWeight:'500'},
  tappable:{color:c.text,fontWeight:'600'},
  goldTxt:{color:c.gold},
  muted:{color:c.textMuted,fontSize:13},
  infoBadge:{backgroundColor:c.primary,borderRadius:100,paddingHorizontal:12,paddingVertical:7},
  infoBadgeTxt:{color:c.onPrimary,fontSize:12,fontWeight:'700'},
  callBadge:{backgroundColor:c.lightGreen,borderRadius:100,paddingHorizontal:12,paddingVertical:7},
  callBadgeTxt:{color:c.green,fontSize:12,fontWeight:'700'},
  visitBadge:{backgroundColor:'rgba(201,169,110,0.16)',borderRadius:100,paddingHorizontal:12,paddingVertical:7},
  visitBadgeTxt:{color:c.gold,fontSize:12,fontWeight:'700'},
  // Amenities
  amenitiesCard:{borderWidth:1,borderColor:c.border,borderRadius:16,overflow:'hidden'},
  amenityRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:14},
  amenityBorder:{borderBottomWidth:1,borderBottomColor:c.rowBorder},
  amenityLeft:{flexDirection:'row',alignItems:'center',gap:12},
  amenityIconWrap:{width:36,height:36,borderRadius:10,backgroundColor:c.cardAlt,alignItems:'center',justifyContent:'center'},
  amenityIconWrapActive:{backgroundColor:'rgba(124,131,255,0.14)'},
  amenityTxt:{fontSize:14,color:c.text,fontWeight:'500'},
  amenityTxtInactive:{color:c.textMuted},
  // Ministries & Amenities chips
  chipsWrap:{flexDirection:'row',flexWrap:'wrap',gap:8},
  chip:{flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:14,paddingVertical:8,borderRadius:100,backgroundColor:c.cardAlt,borderWidth:1,borderColor:c.border},
  chipTxt:{fontSize:13,fontWeight:'600',color:c.text},
  // Tabs
  tabsRow:{flexDirection:'row',borderTopWidth:1,borderBottomWidth:1,borderColor:c.border},
  tab:{flex:1,paddingVertical:14,alignItems:'center',borderBottomWidth:2,borderBottomColor:'transparent'},
  tabActive:{borderBottomColor:c.primary},
  tabTxt:{fontSize:14,fontWeight:'600',color:c.textMuted},
  tabTxtActive:{color:c.text,fontWeight:'700'},
  emptyState:{paddingVertical:40,alignItems:'center',gap:8,paddingHorizontal:40},
  emptyTxt:{fontSize:15,color:c.textMuted,fontWeight:'600'},
  emptySub:{fontSize:13,color:c.placeholder,textAlign:'center',lineHeight:18},
  // Personal
  coverWrap:{position:'relative',height:220,marginBottom:50,overflow:'visible'},
  floatingIcons:{position:'absolute',right:12,zIndex:10},
  cover:{width:'100%',height:200,backgroundColor:c.navy},
  addCoverBtn:{position:'absolute',bottom:50,left:12,flexDirection:'row',alignItems:'center',gap:5,backgroundColor:'rgba(0,0,0,0.4)',borderRadius:8,paddingHorizontal:10,paddingVertical:5},
  addCoverTxt:{color:'#fff',fontSize:12},
  avatarWrap:{position:'absolute',bottom:-45,left:0,right:0,alignItems:'center'},
  avatar:{width:90,height:90,borderRadius:45,backgroundColor:c.navy,borderWidth:3,borderColor:c.card,alignItems:'center',justifyContent:'center',shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.15,shadowRadius:6},
  avatarTxt:{color:'#fff',fontSize:32,fontWeight:'700'},
  personalInfo:{paddingHorizontal:16,alignItems:'center',paddingBottom:16},
  name:{fontFamily:'PlayfairDisplay_700Bold',fontSize:22,color:c.text,marginBottom:4},
  connectionsRow:{flexDirection:'row',alignItems:'center',marginBottom:16},
  connectionsNum:{fontSize:15,fontWeight:'700',color:c.text},
  connectionsTxt:{fontSize:15,color:c.textMuted},
  churchPill:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:c.cardAlt,borderRadius:100,paddingHorizontal:16,paddingVertical:10,marginBottom:12,borderWidth:1,borderColor:c.border},
  churchPillTxt:{fontSize:14,color:c.text,fontWeight:'600'},
  ministriesRow:{flexDirection:'row',flexWrap:'wrap',gap:10,marginBottom:14},
  ministryTag:{borderWidth:1.5,borderColor:c.gold,borderRadius:100,paddingHorizontal:16,paddingVertical:6},
  ministryTagTxt:{fontSize:13,color:c.gold,fontWeight:'600'},
  editBtn:{flexDirection:'row',alignItems:'center',gap:8,borderWidth:1,borderColor:c.border,borderRadius:12,paddingHorizontal:20,paddingVertical:12,marginBottom:16,width:'100%',justifyContent:'center'},
  activityBtn:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderWidth:1,borderColor:c.border,borderRadius:16,paddingHorizontal:16,paddingVertical:16},
  editTxt:{fontSize:15,fontWeight:'700',color:c.text},
  verseWrap:{alignItems:'center',paddingHorizontal:16},
  verseItalic:{fontFamily:'PlayfairDisplay_400Regular_Italic',fontSize:14,color:c.textSecondary,textAlign:'center',lineHeight:22,marginBottom:4},
  verseRefRow:{flexDirection:'row',alignItems:'center',gap:6},
  verseRef:{fontSize:13,color:c.gold,fontWeight:'700'},
  // Sign out
  signOutBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,marginHorizontal:16,marginTop:16,padding:14,borderRadius:16,borderWidth:1,borderColor:'rgba(231,76,111,0.3)',backgroundColor:'rgba(231,76,111,0.08)'},
  signOutTxt:{fontSize:14,fontWeight:'700',color:c.red},
});
