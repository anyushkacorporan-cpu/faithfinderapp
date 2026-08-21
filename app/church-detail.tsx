import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Share, Alert, Image, FlatList, Dimensions, ActivityIndicator, Modal, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../src/components/Header';
import { CHURCHES } from '../src/lib/constants';
import { useThemeColors, ThemeColors } from '../src/lib/theme';
import { buildChurchShareText } from '../src/lib/shareLinks';
import { useSavedChurches } from '../src/lib/store';
import { isConnected, addConnection, removeConnection } from '../src/lib/connectionsStore';
import { useChurchPosts, toggleLike, addComment } from '../src/lib/postsStore';
import { useSettings } from '../src/lib/settingsStore';
import { useTranslation } from '../src/lib/i18n';

const KEY = 'AIzaSyAHZO8wyxyCmx0k8u059QSX7QpsEvZ82sU';
const { width: W } = Dimensions.get('window');
const MY_ID = 'current_user';

function photoUrl(ref: string) {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${ref}&key=${KEY}`;
}

async function fetchDetails(placeId: string) {
  try {
    const fields = 'name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,opening_hours,photos,reviews,editorial_summary';
    const res = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${KEY}`);
    const data = await res.json();
    return data.result || null;
  } catch { return null; }
}

const TAGS = [
  { label: 'Parking Available', icon: 'car-outline' },
  { label: 'Wheelchair Accessible', icon: 'accessibility-outline' },
  { label: 'Children Ministry', icon: 'people-outline' },
  { label: 'Live Worship', icon: 'musical-notes-outline' },
  { label: 'Bible Study', icon: 'book-outline' },
  { label: 'Youth Ministry', icon: 'school-outline' },
];

function Collapsible({ title, preview, children }: { title: string; preview?: string; children: React.ReactNode }) {
  const c = useThemeColors();
  const cs = makeCs(c);
  const [open, setOpen] = useState(false);
  return (
    <View style={cs.wrap}>
      <TouchableOpacity style={cs.header} onPress={() => setOpen(!open)} activeOpacity={0.7}>
        <View style={cs.left}>
          <Text style={cs.title}>{title}</Text>
          {!open && !!preview && <Text style={cs.preview}>{preview}</Text>}
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={c.gold} />
      </TouchableOpacity>
      {open && <View style={cs.body}>{children}</View>}
    </View>
  );
}

const makeCs = (c: ThemeColors) => StyleSheet.create({
  wrap:{borderWidth:1,borderColor:c.border,borderRadius:16,overflow:'hidden'},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:16,backgroundColor:c.card},
  left:{flex:1},
  title:{fontSize:15,fontWeight:'700',color:c.text},
  preview:{fontSize:12,color:c.textMuted,marginTop:3},
  body:{borderTopWidth:1,borderTopColor:c.border},
});

export default function ChurchDetailScreen() {
  const c = useThemeColors();
  const s = makeStyles(c);
  const params = useLocalSearchParams<{ id:string; placeId?:string; name?:string; address?:string; phone?:string; rating?:string; count?:string; website?:string; }>();
  const staticChurch = CHURCHES.find(c => c.id === params.id);
  const appSettings = useSettings();
  const { t, tx } = useTranslation();
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);
  const [showReviews, setShowReviews] = useState(false);
  const churchPosts: any[] = [];
  const [activeTab, setActiveTab] = useState('About');
  const [commentModal, setCommentModal] = useState<string|null>(null);
  const [commentText, setCommentText] = useState('');
  const { saved, toggle } = useSavedChurches();
  const placeId = params.placeId || staticChurch?.placeId || '';
  const isSaved = saved.includes(params.id || '');
  const [connected, setConnected] = useState(isConnected(params.id || placeId || ''));
  const allChurchPosts = useChurchPosts(placeId);

  const church = {
    id: params.id || '',
    name: details?.name || params.name || staticChurch?.name || '',
    address: details?.formatted_address || params.address || staticChurch?.address || '',
    phone: details?.formatted_phone_number || params.phone || staticChurch?.phone || '',
    rating: details?.rating || parseFloat(params.rating || String(staticChurch?.rating || 0)),
    count: details?.user_ratings_total || parseInt(params.count || String(staticChurch?.count || 0)),
    website: details?.website || params.website || staticChurch?.website || '',
    hours: details?.opening_hours?.weekday_text || [],
    description: details?.editorial_summary?.overview || '',
    photos: details?.photos?.slice(0, 8) || [],
    reviews: details?.reviews || [],
    gradient: staticChurch?.gradient || ['#667eea','#764ba2'] as [string,string],
  };

  useEffect(() => {
    async function load() {
      if (!placeId) { setLoading(false); return; }
      const result = await fetchDetails(placeId);
      setDetails(result);
      setLoading(false);
    }
    load();
  }, [placeId]);

  function handleConnect() {
    const connId = params.id || placeId || '';
    if (connected) {
      removeConnection(connId);
      setConnected(false);
    } else {
      addConnection({
        id: connId,
        name: church.name,
        type: 'church',
        address: church.address,
        placeId: church.placeId,
        color: c.gold,
        initials: church.name?.slice(0,2).toUpperCase() || 'CH',
      });
      setConnected(true);
    }
  }

  const [showShareComposer, setShowShareComposer] = useState(false);
  const [showSharedToast, setShowSharedToast] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const [sharingToFeed, setSharingToFeed] = useState(false);

  function handleShare() {
    setShowShareComposer(true);
  }

  async function handleExternalShare() {
    try {
      const result = await Share.share({
        title: church.name,
        message: 'Check out ' + church.name + ' on FaithFinder!\n📍 ' + church.address + (church.phone ? '\n📞 ' + church.phone : '') + (church.website ? '\n🌐 ' + church.website : ''),
        url: church.website || 'https://faithfinderapp.com',
      });
    } catch (e) {}
  }

  async function handlePostToFeed() {
    setSharingToFeed(true);
    const { getUser } = require('../src/lib/userStore');
    const { addPost } = require('../src/lib/postsStore');
    const { getCurrentCityState } = require('../src/lib/userLocation');
    const u = getUser();
    let city: string | undefined;
    let state: string | undefined;
    if (appSettings.location.locationEnabled) {
      const loc = await getCurrentCityState();
      if (loc) { city = loc.city; state = loc.state; }
    }
    const displayName = u.accountType === 'church'
      ? (u.churchName || 'Church')
      : ((u.firstName || 'User') + ' ' + (u.lastName || '')).trim();
    const initials = (u.accountType === 'church'
      ? (u.churchName?.[0] || 'C')
      : ((u.firstName?.[0] || 'U') + (u.lastName?.[0] || ''))).toUpperCase();
    addPost({
      authorName: displayName,
      authorInitials: initials,
      authorType: u.accountType === 'church' ? 'church' : 'personal',
      authorColor: u.accountType === 'church' ? '#c9a96e' : '#667eea',
      authorPhoto: u.profilePhoto,
      content: shareMessage.trim(),
      time: 'now',
      city,
      state,
      churchPlaceId: placeId,
      churchName: church.name,
      churchShareData: {
        placeId: placeId,
        name: church.name,
        address: church.address,
        description: church.description || '',
        id: church.id,
        type: church.type,
        rating: church.rating,
        photo: church.photos?.[0]?.photo_reference ? photoUrl(church.photos[0].photo_reference) : undefined,
        gradient: church.gradient,
        phone: church.phone,
      },
    });
    setSharingToFeed(false);
    setShowShareComposer(false);
    setShareMessage('');
    setShowSharedToast(true);
    setTimeout(() => setShowSharedToast(false), 3000);
  }

  function handlePhone() {
    if (!church.phone) { Alert.alert(tx('No phone number available')); return; }
    Linking.openURL(`tel:${church.phone.replace(/\D/g, '')}`);
  }

  function handleWebsite() {
    if (!church.website) { Alert.alert(tx('No website available')); return; }
    let url = church.website;
    if (!url.startsWith('http')) url = 'https://' + url;
    Linking.openURL(url);
  }

  function handleDirections() {
    const q = encodeURIComponent(church.address);
    Linking.openURL(`maps://?q=${q}`).catch(() => Linking.openURL(`https://maps.google.com/?q=${q}`));
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todayHours = church.hours.find((h: string) => h.startsWith(today));
  const todayTime = todayHours ? todayHours.split(': ').slice(1).join(': ') : '';

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <Header />
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Photo Gallery */}
        {loading ? (
          <View style={s.photoPlaceholder}>
            <LinearGradient colors={church.gradient} style={StyleSheet.absoluteFill} start={{x:0,y:0}} end={{x:1,y:1}} />
            <ActivityIndicator color="rgba(255,255,255,0.8)" size="large" />
            <Text style={s.loadingTxt}>{t('loadingDetails')}</Text>
          </View>
        ) : church.photos.length > 0 ? (
          <View style={s.galleryWrap}>
            <FlatList
              data={church.photos}
              horizontal pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={e => setActivePhoto(Math.round(e.nativeEvent.contentOffset.x / W))}
              renderItem={({ item }) => <Image source={{ uri: photoUrl(item.photo_reference) }} style={{ width: W, height: 280 }} resizeMode="cover" />}
              keyExtractor={(_, i) => String(i)}
            />
            <View style={s.dots}>
              {church.photos.map((_: any, i: number) => <View key={i} style={[s.dot, i===activePhoto && s.dotActive]} />)}
            </View>
            <View style={s.photoCount}>
              <Ionicons name="images-outline" size={13} color="#fff" />
              <Text style={s.photoCountTxt}>{activePhoto+1}/{church.photos.length}</Text>
            </View>
          </View>
        ) : (
          <View style={s.photoPlaceholder}>
            <LinearGradient colors={church.gradient} style={StyleSheet.absoluteFill} start={{x:0,y:0}} end={{x:1,y:1}} />
            <Ionicons name="home" size={48} color="rgba(255,255,255,0.4)" />
          </View>
        )}

        {/* Actions */}
        <View style={s.actionsRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={c.text} />
          </TouchableOpacity>
          <View style={s.actionBtns}>
            <TouchableOpacity onPress={() => toggle(church.id)}>
              <Ionicons name={isSaved ? 'heart' : 'heart-outline'} size={24} color={isSaved ? c.red : c.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShare}>
              <Ionicons name="share-social-outline" size={24} color={c.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={[s.connectBtn, connected && s.connectBtnActive]} onPress={handleConnect}>
              <Text style={s.connectBtnTxt}>{connected ? '✓ Connected' : 'Connect'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Identity */}
        <View style={s.identityRow}>
          <LinearGradient colors={[c.navy,'#2d2240']} style={s.churchIcon} start={{x:0,y:0}} end={{x:1,y:1}}>
            <Ionicons name="home" size={28} color={c.gold} />
          </LinearGradient>
          <View style={s.identityInfo}>
            <Text style={s.churchName}>{church.name}</Text>
            <View style={s.metaRow}>
              <Text style={s.typeLabel}>{t('church')}</Text>
              <Text style={s.metaDot}> · </Text>
              <Ionicons name="location-outline" size={13} color={c.textMuted} />
              <Text style={s.metaTxt} numberOfLines={1}>{church.address.split(',').slice(-2).join(',').trim()}</Text>
            </View>
            {church.count > 0 && <Text style={s.reviewCount}><Text style={s.reviewNum}>{church.count}</Text> Google reviews</Text>}
          </View>
        </View>

        {/* Stars */}
        {church.rating > 0 && (
          <View style={s.starsRow}>
            {[1,2,3,4,5].map(i => <Ionicons key={i} name={i<=Math.round(church.rating)?'star':'star-outline'} size={20} color={c.gold} />)}
            <Text style={s.ratingNum}>{church.rating.toFixed(1)}</Text>
            <TouchableOpacity style={s.seeReviewsBtn} onPress={() => setShowReviews(true)}>
              <Text style={s.seeReviewsTxt}>{t('seeReviews')}</Text>
              <Ionicons name="chevron-forward" size={14} color={c.gold} />
            </TouchableOpacity>
          </View>
        )}

        {!!church.description && (
          <View style={s.descBox}><Text style={s.descTxt}>{church.description}</Text></View>
        )}

        {/* Tabs: About | Posts */}
        <View style={s.tabsRow}>
          {['About','Posts'].map(t => (
            <TouchableOpacity key={t} style={[s.tab, activeTab===t && s.tabActive]} onPress={() => setActiveTab(t)}>
              <Text style={[s.tabTxt, activeTab===t && s.tabTxtActive]}>
                {t}{t==='Posts' && (churchPosts||[]).length > 0 ? ` (${(churchPosts||[]).length})` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ABOUT TAB */}
        {activeTab === 'About' && (
          <>
            <View style={s.divider} />
            <View style={s.section}>
              <Text style={s.sectionTitle}>{t('information')}</Text>
              <View style={s.infoCard}>
                <View style={s.infoRow}>
                  <View style={s.infoIconWrap}><Ionicons name="location-outline" size={18} color={c.text} /></View>
                  <View style={s.infoContent}>
                    <Text style={s.infoLabel}>{t('address')}</Text>
                    <Text style={s.infoValue}>{church.address}</Text>
                  </View>
                  <TouchableOpacity style={s.actionBadge} onPress={handleDirections}>
                    <Text style={s.actionBadgeTxt}>{t('directions')}</Text>
                  </TouchableOpacity>
                </View>
                <View style={s.infoDivider} />
                <TouchableOpacity style={s.infoRow} onPress={handlePhone} activeOpacity={church.phone?0.7:1}>
                  <View style={s.infoIconWrap}><Ionicons name="call-outline" size={18} color={church.phone?c.navy:c.textMuted} /></View>
                  <View style={s.infoContent}>
                    <Text style={s.infoLabel}>{t('phone')}</Text>
                    {!!church.phone && <Text style={[s.infoValue, s.tappable]}>{church.phone}</Text>}
                  </View>
                  {!!church.phone && <View style={s.callBadge}><Text style={s.callBadgeTxt}>{t('call')}</Text></View>}
                </TouchableOpacity>
                <View style={s.infoDivider} />
                <TouchableOpacity style={s.infoRow} onPress={handleWebsite} activeOpacity={church.website?0.7:1}>
                  <View style={s.infoIconWrap}><Ionicons name="globe-outline" size={18} color={church.website?c.navy:c.textMuted} /></View>
                  <View style={s.infoContent}>
                    <Text style={s.infoLabel}>{t('website')}</Text>
                    {!!church.website && <Text style={[s.infoValue, s.goldTxt]} numberOfLines={1}>{church.website.replace(/^https?:\/\//,'').replace(/\/$/,'')}</Text>}
                  </View>
                  {!!church.website && <View style={s.visitBadge}><Text style={s.visitBadgeTxt}>{t('visit')}</Text></View>}
                </TouchableOpacity>
                <View style={s.infoDivider} />
                <View style={s.infoRow}>
                <View style={s.infoIcon}><Ionicons name="mail-outline" size={18} color={c.textMuted}/></View>
                <View style={s.infoText}>
                  <Text style={s.infoLabel}>{t('email').toUpperCase()}</Text>
                  <Text style={s.muted}>{church.churchEmail || 'Not available'}</Text>
                </View>
              </View>
                </View>
              </View>
            {church.hours.length>0&&<View style={s.divider}/>}
            <View style={s.section}>
              <Collapsible title="Amenities" preview="Parking, Wheelchair, Children Ministry & more">
                {TAGS.map((tag,i) => (
                  <View key={i} style={[s.amenityRow, i<TAGS.length-1&&s.amenityBorder]}>
                    <View style={s.amenityLeft}>
                      <View style={s.amenityIconWrap}><Ionicons name={tag.icon as any} size={16} color={c.text}/></View>
                      <Text style={s.amenityTxt}>{tag.label}</Text>
                    </View>
                    <Ionicons name="checkmark-circle" size={20} color={c.green}/>
                  </View>
                ))}
              </Collapsible>
            </View>
            <View style={s.divider} />
            <View style={s.mapBox}>
              <TouchableOpacity style={s.mapArea} onPress={handleDirections} activeOpacity={0.8}>
                <View style={s.mapPin}><Ionicons name="location" size={20} color={c.gold}/></View>
                <View style={s.mapPinShadow}/>
                <Text style={s.mapHint}>{t('tapToOpenMaps')}</Text>
              </TouchableOpacity>
              <View style={s.mapFooter}>
                <Text style={s.mapCity} numberOfLines={1}>{church.address.split(',')[0]}</Text>
                <TouchableOpacity style={s.directionsBtn} onPress={handleDirections}>
                  <Ionicons name="navigate" size={13} color="#fff"/>
                  <Text style={s.directionsTxt}>{t('directions')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {/* POSTS TAB */}
        {activeTab === 'Posts' && (
          <View style={s.postsSection}>
            {(churchPosts||[]).length === 0 ? (
              <View style={s.emptyPosts}>
                <Ionicons name="document-text-outline" size={40} color={c.placeholder} />
                <Text style={s.emptyPostsTxt}>{t('noPostsYet')}</Text>
                <Text style={s.emptyPostsSub}>{t('churchNoPostsSub')}</Text>
              </View>
            ) : (
              (churchPosts||[]).map(post => {
                const liked = post.likes.includes(MY_ID);
                return (
                  <View key={post.id} style={s.postCard}>
                    <View style={s.postHdr}>
                      <View style={[s.postAvatar, {backgroundColor:post.authorColor}]}>
                        <Text style={s.postAvatarTxt}>{post.authorInitials}</Text>
                      </View>
                      <View style={s.postMeta}>
                        <Text style={s.postAuthor}>{post.authorName}</Text>
                        <Text style={s.postTime}>{post.time}</Text>
                      </View>
                    </View>
                    <Text style={s.postContent}>{post.content}</Text>
                    {!!post.image && <Image source={{uri:post.image}} style={s.postImage} resizeMode="cover"/>}
                    {(post.likes.length>0||post.comments.length>0) && (
                      <View style={s.postStats}>
                        {post.likes.length>0&&<Text style={s.statTxt}>{post.likes.length} like{post.likes.length!==1?'s':''}</Text>}
                        {post.comments.length>0&&<Text style={s.statTxt}>{post.comments.length} comment{post.comments.length!==1?'s':''}</Text>}
                      </View>
                    )}
                    <View style={s.postActions}>
                      <TouchableOpacity style={s.actionBtn} onPress={() => toggleLike(post.id, MY_ID)}>
                        <Ionicons name={liked?'heart':'heart-outline'} size={18} color={liked?c.red:c.textMuted}/>
                        <Text style={[s.actionTxt, liked&&{color:c.red}]}>{t('like')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.actionBtn} onPress={() => setCommentModal(post.id)}>
                        <Ionicons name="chatbubble-outline" size={18} color={c.textMuted}/>
                        <Text style={s.actionTxt}>{t('comment')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.actionBtn} onPress={() => Share.share({message:`${post.authorName}: ${post.content}`})}>
                        <Ionicons name="share-social-outline" size={18} color={c.textMuted}/>
                        <Text style={s.actionTxt}>{t('share')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {isSaved && (
          <View style={s.savedBanner}>
            <Ionicons name="heart" size={16} color={c.red}/>
            <Text style={s.savedBannerTxt}>{t('savedToChurches')}</Text>
          </View>
        )}
        <View style={{height:40}}/>
      </ScrollView>

      {/* Reviews Modal */}
      <Modal visible={showReviews} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modalRoot} edges={['top']}>
          <View style={s.modalHdr}>
            <View>
              <Text style={s.modalTitle}>{t('reviews')}</Text>
              <View style={s.modalStarsRow}>
                {[1,2,3,4,5].map(i=><Ionicons key={i} name={i<=Math.round(church.rating)?'star':'star-outline'} size={16} color={c.gold}/>)}
                <Text style={s.modalRating}>{church.rating.toFixed(1)} · {church.count} reviews</Text>
              </View>
            </View>
            <TouchableOpacity style={s.closeBtn} onPress={() => setShowReviews(false)}>
              <Ionicons name="close" size={20} color={c.text}/>
            </TouchableOpacity>
          </View>
          <ScrollView style={s.modalScroll} showsVerticalScrollIndicator={false}>
            {church.reviews.length>0?church.reviews.map((r:any,i:number)=>(
              <View key={i} style={s.reviewCard}>
                <View style={s.reviewHdr}>
                  {r.profile_photo_url
                    ?<Image source={{uri:r.profile_photo_url}} style={s.reviewAvatar}/>
                    :<View style={[s.reviewAvatar,s.reviewAvatarFallback]}><Text style={s.reviewAvatarTxt}>{r.author_name?.[0]||'?'}</Text></View>
                  }
                  <View style={s.reviewMeta}>
                    <Text style={s.reviewName}>{r.author_name}</Text>
                    <View style={s.reviewStarsRow}>
                      {[1,2,3,4,5].map(j=><Ionicons key={j} name={j<=r.rating?'star':'star-outline'} size={13} color={c.gold}/>)}
                      <Text style={s.reviewTime}> · {r.relative_time_description}</Text>
                    </View>
                  </View>
                </View>
                <Text style={s.reviewTxt}>{r.text}</Text>
              </View>
            )):(
              <View style={s.noReviews}>
                <Ionicons name="star-outline" size={40} color={c.placeholder}/>
                <Text style={s.noReviewsTxt}>{t('noReviewsAvailable')}</Text>
              </View>
            )}
            <View style={{height:40}}/>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Share Composer Modal */}
      <Modal visible={showShareComposer} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modalRoot} edges={['top']}>
          {/* Header */}
          <View style={s.shareHdr}>
            <TouchableOpacity style={s.shareCancelBtn} onPress={() => { setShowShareComposer(false); setShareMessage(''); }}>
              <Text style={s.shareCancelTxt}>{t('cancel')}</Text>
            </TouchableOpacity>
            <Text style={s.shareHdrTitle}>{t('newPost')}</Text>
            <TouchableOpacity
              style={[s.sharePostBtn, sharingToFeed && s.sharePostBtnDisabled]}
              onPress={handlePostToFeed}
              disabled={sharingToFeed}
            >
              <Text style={s.sharePostBtnTxt}>{t('share')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={s.shareScroll} keyboardShouldPersistTaps="handled">
            {/* Composer row — avatar + text input */}
            <View style={s.composerRow}>
              <View style={s.composerAvatarWrap}>
                <View style={s.composerAvatar}>
                  <Ionicons name="person" size={18} color={c.onPrimary} />
                </View>
                <View style={s.composerAvatarLine} />
              </View>
              <View style={s.composerRight}>
                <TextInput
                  style={s.composerInput}
                  placeholder={tx('Add your thoughts...')}
                  placeholderTextColor={c.placeholder}
                  value={shareMessage}
                  onChangeText={setShareMessage}
                  multiline
                  autoFocus
                />
                {/* Quoted church card */}
                <View style={s.quotedCard}>
                  <View style={s.quotedTop}>
                    <View style={s.quotedIconWrap}>
                      <Ionicons name="home" size={14} color={c.gold} />
                    </View>
                    <Text style={s.quotedName}>{church.name}</Text>
                  </View>
                  <View style={s.quotedLocationRow}>
                    <Ionicons name="location-outline" size={11} color={c.textMuted} />
                    <Text style={s.quotedAddr} numberOfLines={1}>{church.address}</Text>
                  </View>
                  {!!church.description && (
                    <Text style={s.quotedDesc} numberOfLines={2}>{church.description}</Text>
                  )}
                  <View style={s.quotedFooter}>
                    <Text style={s.quotedLink}>View church on FaithFinder →</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Divider */}
            <View style={s.shareOrRow}>
              <View style={s.shareOrLine} />
              <Text style={s.shareOrTxt}>or share outside FaithFinder</Text>
              <View style={s.shareOrLine} />
            </View>

            {/* External share options */}
            <View style={s.externalOptions}>
              {[
                { icon: 'chatbubble-outline', label: 'Messages', color: '#2ecc71', action: 'messages' },
                { icon: 'mail-outline', label: 'Email', color: '#3498db', action: 'email' },
                { icon: 'share-social-outline', label: 'More Options', color: '#9b59b6', action: 'more' },
              ].map((opt, i) => (
                <TouchableOpacity
                  key={i}
                  style={s.externalOption}
                  onPress={() => {
                    const shareText = buildChurchShareText({
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
                    }
                  }}
                >
                  <View style={[s.externalOptionIcon, { backgroundColor: opt.color + '18' }]}>
                    <Ionicons name={opt.icon as any} size={22} color={opt.color} />
                  </View>
                  <Text style={s.externalOptionLabel}>{tx(opt.label)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Comment Modal */}
      <Modal visible={!!commentModal} transparent animationType="slide">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setCommentModal(null)}/>
        <View style={s.commentSheet}>
          <View style={s.commentSheetHdr}>
            <Text style={s.commentSheetTitle}>{t('commentsTitle')}</Text>
            <TouchableOpacity onPress={() => setCommentModal(null)}>
              <Ionicons name="close" size={22} color={c.text}/>
            </TouchableOpacity>
          </View>
          <ScrollView style={s.commentList}>
            {churchPosts.find(p=>p.id===commentModal)?.comments.map(c=>(
              <View key={c.id} style={s.commentItem}>
                <View style={s.commentAvatar}><Text style={s.commentAvatarTxt}>{c.author[0]}</Text></View>
                <View style={s.commentBubble}>
                  <Text style={s.commentBubbleAuthor}>{c.author}</Text>
                  <Text style={s.commentBubbleText}>{c.text}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={s.commentInputRow}>
            <TextInput style={s.commentInput} placeholder={tx('Write a comment...')} placeholderTextColor={c.placeholder} value={commentText} onChangeText={setCommentText}/>
            <TouchableOpacity style={s.commentSendBtn} onPress={() => { if(commentModal){addComment(commentModal,'You',commentText);setCommentText('');setCommentModal(null);} }}>
              <Ionicons name="send" size={18} color={c.onPrimary}/>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {showSharedToast && (
        <View style={{position:'absolute',bottom:40,left:16,right:16,zIndex:999,backgroundColor:'white',borderRadius:16,padding:16,flexDirection:'row',alignItems:'center',gap:12,shadowColor:'#000',shadowOffset:{width:0,height:8},shadowOpacity:0.15,shadowRadius:16,borderWidth:1,borderColor:c.border}}>
          <View style={{width:44,height:44,borderRadius:22,backgroundColor:'#e8f5e9',alignItems:'center',justifyContent:'center'}}>
            <Ionicons name="checkmark-circle" size={28} color="#2e7d32" />
          </View>
          <Text style={{flex:1,fontSize:15,fontWeight:'700',color:c.text}}>{t('sharedToCommunity')}</Text>
          <TouchableOpacity onPress={() => setShowSharedToast(false)}>
            <Ionicons name="close" size={18} color={c.textMuted} />
          </TouchableOpacity>
        </View>
      )}
      {showSharedToast && (
        <View style={{position:'absolute',bottom:40,left:16,right:16,zIndex:999,backgroundColor:'white',borderRadius:16,padding:16,flexDirection:'row',alignItems:'center',gap:12,shadowColor:'#000',shadowOffset:{width:0,height:8},shadowOpacity:0.15,shadowRadius:16,borderWidth:1,borderColor:c.border}}>
          <View style={{width:44,height:44,borderRadius:22,backgroundColor:'#e8f5e9',alignItems:'center',justifyContent:'center'}}>
            <Ionicons name="checkmark-circle" size={28} color="#2e7d32" />
          </View>
          <Text style={{flex:1,fontSize:15,fontWeight:'700',color:c.text}}>{t('sharedToCommunity')}</Text>
          <TouchableOpacity onPress={() => setShowSharedToast(false)}>
            <Ionicons name="close" size={18} color={c.textMuted} />
          </TouchableOpacity>
        </View>
      )}
      {showSharedToast && (
        <View style={{position:'absolute',bottom:40,left:16,right:16,zIndex:999,backgroundColor:'white',borderRadius:16,padding:16,flexDirection:'row',alignItems:'center',gap:12,shadowColor:'#000',shadowOffset:{width:0,height:8},shadowOpacity:0.15,shadowRadius:16,borderWidth:1,borderColor:c.border}}>
          <View style={{width:44,height:44,borderRadius:22,backgroundColor:'#e8f5e9',alignItems:'center',justifyContent:'center'}}>
            <Ionicons name="checkmark-circle" size={28} color="#2e7d32" />
          </View>
          <Text style={{flex:1,fontSize:15,fontWeight:'700',color:c.text}}>{t('sharedToCommunity')}</Text>
          <TouchableOpacity onPress={() => setShowSharedToast(false)}>
            <Ionicons name="close" size={18} color={c.textMuted} />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root:{flex:1,backgroundColor:c.card},
  photoPlaceholder:{height:280,alignItems:'center',justifyContent:'center',gap:10},
  loadingTxt:{color:'rgba(255,255,255,0.8)',fontSize:14,fontWeight:'600'},
  galleryWrap:{height:280,position:'relative'},
  dots:{position:'absolute',bottom:12,left:0,right:0,flexDirection:'row',justifyContent:'center',gap:6},
  dot:{width:6,height:6,borderRadius:3,backgroundColor:'rgba(255,255,255,0.4)'},
  dotActive:{backgroundColor:c.card,width:18},
  photoCount:{position:'absolute',top:12,right:12,backgroundColor:'rgba(0,0,0,0.5)',borderRadius:12,paddingHorizontal:10,paddingVertical:4,flexDirection:'row',alignItems:'center',gap:4},
  photoCountTxt:{color:'#fff',fontSize:12,fontWeight:'600'},
  actionsRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:16,paddingVertical:14},
  actionBtns:{flexDirection:'row',alignItems:'center',gap:16},
  connectBtn:{backgroundColor:c.primary,borderRadius:100,paddingHorizontal:20,paddingVertical:9},
  connectBtnActive:{backgroundColor:c.green},
  connectBtnTxt:{color:'#fff',fontSize:14,fontWeight:'700'},
  identityRow:{flexDirection:'row',alignItems:'flex-start',gap:14,paddingHorizontal:16,paddingBottom:16},
  churchIcon:{width:76,height:76,borderRadius:18,alignItems:'center',justifyContent:'center'},
  identityInfo:{flex:1},
  churchName:{fontSize:20,fontWeight:'700',color:c.text,marginBottom:5},
  metaRow:{flexDirection:'row',alignItems:'center',marginBottom:5,flexWrap:'wrap'},
  typeLabel:{fontSize:14,color:c.gold,fontWeight:'600'},
  metaDot:{color:c.placeholder,fontSize:14},
  metaTxt:{fontSize:13,color:c.textMuted,flex:1},
  reviewCount:{fontSize:13,color:c.textMuted},
  reviewNum:{fontWeight:'700',color:c.text},
  starsRow:{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:16,marginBottom:12,flexWrap:'wrap'},
  ratingNum:{fontSize:16,fontWeight:'700',color:c.text,marginLeft:4},
  seeReviewsBtn:{marginLeft:'auto',flexDirection:'row',alignItems:'center',gap:3,backgroundColor:'rgba(201,169,110,0.12)',borderRadius:100,paddingHorizontal:12,paddingVertical:6},
  seeReviewsTxt:{fontSize:13,color:c.gold,fontWeight:'700'},
  descBox:{paddingHorizontal:16,marginBottom:12},
  descTxt:{fontSize:14,color:c.textSecondary,lineHeight:22},
  tabsRow:{flexDirection:'row',borderTopWidth:1,borderBottomWidth:1,borderColor:c.border,marginTop:8},
  tab:{flex:1,paddingVertical:13,alignItems:'center',borderBottomWidth:2,borderBottomColor:'transparent'},
  tabActive:{borderBottomColor:c.navy},
  tabTxt:{fontSize:14,fontWeight:'600',color:c.textMuted},
  tabTxtActive:{color:c.text,fontWeight:'700'},
  divider:{height:1,backgroundColor:c.border,marginHorizontal:16,marginVertical:16},
  section:{paddingHorizontal:16,marginBottom:4},
  sectionTitle:{fontSize:17,fontWeight:'700',color:c.text,marginBottom:14},
  infoCard:{borderWidth:1,borderColor:c.border,borderRadius:16,overflow:'hidden'},
  infoRow:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:14,gap:12},
  infoDivider:{height:1,backgroundColor:c.cardAlt,marginLeft:62},
  infoIconWrap:{width:36,height:36,borderRadius:10,backgroundColor:c.cardAlt,alignItems:'center',justifyContent:'center'},
  infoContent:{flex:1},
  infoLabel:{fontSize:11,color:c.textMuted,fontWeight:'600',textTransform:'uppercase',letterSpacing:0.4,marginBottom:2},
  infoValue:{fontSize:14,color:c.text,fontWeight:'500'},
  tappable:{color:c.text,fontWeight:'600'},
  goldTxt:{color:c.gold},
  muted:{color:c.textMuted,fontSize:14},
  actionBadge:{backgroundColor:c.primary,borderRadius:100,paddingHorizontal:14,paddingVertical:7},
  actionBadgeTxt:{color:'#fff',fontSize:12,fontWeight:'700'},
  callBadge:{backgroundColor:'#e8f5e9',borderRadius:100,paddingHorizontal:14,paddingVertical:7},
  callBadgeTxt:{color:c.green,fontSize:12,fontWeight:'700'},
  visitBadge:{backgroundColor:'rgba(201,169,110,0.12)',borderRadius:100,paddingHorizontal:14,paddingVertical:7},
  visitBadgeTxt:{color:c.gold,fontSize:12,fontWeight:'700'},
  hourRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:16,paddingVertical:13},
  hourBorder:{borderBottomWidth:1,borderBottomColor:c.cardAlt},
  hourRowToday:{backgroundColor:'rgba(201,169,110,0.06)'},
  hourLeft:{flexDirection:'row',alignItems:'center',gap:8},
  todayDot:{width:6,height:6,borderRadius:3,backgroundColor:c.gold},
  hourDay:{fontSize:14,color:c.textSecondary},
  hourTime:{fontSize:14,color:c.textSecondary},
  todayTxt:{color:c.text,fontWeight:'700'},
  amenityRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:14},
  amenityBorder:{borderBottomWidth:1,borderBottomColor:c.cardAlt},
  amenityLeft:{flexDirection:'row',alignItems:'center',gap:12},
  amenityIconWrap:{width:36,height:36,borderRadius:10,backgroundColor:c.cardAlt,alignItems:'center',justifyContent:'center'},
  amenityTxt:{fontSize:14,color:c.text,fontWeight:'500'},
  mapBox:{marginHorizontal:16,borderRadius:16,overflow:'hidden',borderWidth:1,borderColor:c.border},
  mapArea:{height:180,backgroundColor:c.cardAlt,alignItems:'center',justifyContent:'center',gap:8},
  mapPin:{width:40,height:40,borderRadius:20,backgroundColor:c.primary,alignItems:'center',justifyContent:'center'},
  mapPinShadow:{width:10,height:6,borderRadius:5,backgroundColor:'rgba(0,0,0,0.2)'},
  mapHint:{fontSize:12,color:c.textMuted,marginTop:4},
  mapFooter:{backgroundColor:c.card,padding:14,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  mapCity:{fontSize:15,fontWeight:'700',color:c.text,flex:1},
  directionsBtn:{flexDirection:'row',alignItems:'center',gap:5,backgroundColor:c.primary,borderRadius:100,paddingHorizontal:14,paddingVertical:9},
  directionsTxt:{color:'#fff',fontSize:12,fontWeight:'700'},
  // Posts tab
  postsSection:{padding:16},
  emptyPosts:{paddingVertical:40,alignItems:'center',gap:8},
  emptyPostsTxt:{fontSize:15,color:c.textMuted,fontWeight:'600'},
  emptyPostsSub:{fontSize:13,color:c.placeholder,textAlign:'center'},
  postCard:{backgroundColor:c.card,borderRadius:16,padding:14,marginBottom:12,borderWidth:1,borderColor:c.border},
  postHdr:{flexDirection:'row',gap:10,marginBottom:10},
  postAvatar:{width:44,height:44,borderRadius:22,alignItems:'center',justifyContent:'center'},
  postAvatarTxt:{color:c.onPrimary,fontWeight:'700',fontSize:15},
  postMeta:{flex:1},
  postAuthor:{fontSize:15,fontWeight:'700',color:c.text},
  postTime:{fontSize:12,color:c.textMuted,marginTop:2},
  postContent:{fontSize:14,color:c.text,lineHeight:21,marginBottom:10},
  postImage:{width:'100%',height:200,borderRadius:12,marginBottom:10},
  postStats:{flexDirection:'row',gap:12,marginBottom:8},
  statTxt:{fontSize:12,color:c.textMuted},
  postActions:{flexDirection:'row',borderTopWidth:1,borderTopColor:c.border,paddingTop:10},
  actionBtn:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:5},
  actionTxt:{fontSize:13,color:c.textMuted,fontWeight:'600'},
  // Saved banner
  savedBanner:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,marginHorizontal:16,marginTop:16,backgroundColor:'#fff0f3',borderRadius:12,paddingVertical:12},
  savedBannerTxt:{fontSize:14,fontWeight:'600',color:c.red},
  // Reviews Modal
  modalRoot:{flex:1,backgroundColor:c.card},
  modalHdr:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',paddingHorizontal:20,paddingVertical:16,borderBottomWidth:1,borderBottomColor:c.border},
  modalTitle:{fontSize:20,fontWeight:'700',color:c.text,marginBottom:4},
  modalStarsRow:{flexDirection:'row',alignItems:'center',gap:4},
  modalRating:{fontSize:13,color:c.textMuted,marginLeft:4},
  closeBtn:{width:36,height:36,borderRadius:18,backgroundColor:c.cardAlt,alignItems:'center',justifyContent:'center'},
  modalScroll:{flex:1,padding:16},
  reviewCard:{backgroundColor:c.cardAlt,borderRadius:16,padding:14,marginBottom:12},
  reviewHdr:{flexDirection:'row',alignItems:'center',gap:10,marginBottom:10},
  reviewAvatar:{width:44,height:44,borderRadius:22},
  reviewAvatarFallback:{backgroundColor:c.primary,alignItems:'center',justifyContent:'center'},
  reviewAvatarTxt:{color:'#fff',fontWeight:'700',fontSize:16},
  reviewMeta:{flex:1},
  reviewName:{fontSize:15,fontWeight:'700',color:c.text,marginBottom:3},
  reviewStarsRow:{flexDirection:'row',alignItems:'center'},
  reviewTime:{fontSize:12,color:c.textMuted},
  reviewTxt:{fontSize:14,color:c.textSecondary,lineHeight:22},
  noReviews:{alignItems:'center',paddingVertical:60,gap:10},
  noReviewsTxt:{fontSize:16,color:c.textMuted,fontWeight:'600'},
  shareHdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:14,borderBottomWidth:1,borderBottomColor:c.border},
  shareCancelBtn:{paddingVertical:4,paddingHorizontal:4},
  shareCancelTxt:{fontSize:15,color:c.textMuted,fontWeight:'500'},
  shareHdrTitle:{fontSize:16,fontWeight:'700',color:c.text},
  sharePostBtn:{backgroundColor:c.primary,borderRadius:100,paddingHorizontal:20,paddingVertical:9},
  sharePostBtnDisabled:{opacity:0.5},
  sharePostBtnTxt:{color:'#fff',fontSize:14,fontWeight:'700'},
  shareScroll:{flex:1},
  composerRow:{flexDirection:'row',paddingHorizontal:16,paddingTop:16,paddingBottom:8},
  composerAvatarWrap:{alignItems:'center',marginRight:12},
  composerAvatar:{width:42,height:42,borderRadius:21,backgroundColor:c.primary,alignItems:'center',justifyContent:'center'},
  composerAvatarLine:{width:2,flex:1,backgroundColor:c.border,marginTop:8,borderRadius:1},
  composerRight:{flex:1},
  composerInput:{fontSize:16,color:c.text,minHeight:80,textAlignVertical:'top',marginBottom:14,lineHeight:24,paddingTop:4},
  quotedCard:{borderWidth:1.5,borderColor:c.border,borderRadius:14,padding:12,marginBottom:16,backgroundColor:c.cardAlt},
  quotedTop:{flexDirection:'row',alignItems:'center',gap:6,marginBottom:6},
  quotedIconWrap:{width:22,height:22,borderRadius:6,backgroundColor:c.primary,alignItems:'center',justifyContent:'center'},
  quotedName:{fontSize:14,fontWeight:'700',color:c.text,flex:1},
  quotedLocationRow:{flexDirection:'row',alignItems:'center',gap:4,marginBottom:4},
  quotedAddr:{fontSize:12,color:c.textMuted,flex:1},
  quotedDesc:{fontSize:12,color:c.textSecondary,lineHeight:17,marginBottom:6},
  quotedFooter:{borderTopWidth:1,borderTopColor:c.border,paddingTop:8,marginTop:4},
  quotedLink:{fontSize:12,color:c.gold,fontWeight:'600'},
  shareOrRow:{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:16,marginVertical:16},
  shareOrLine:{flex:1,height:1,backgroundColor:c.border},
  shareOrTxt:{fontSize:12,color:c.textMuted,fontWeight:'500'},
  externalOptions:{flexDirection:'row',justifyContent:'space-around',paddingHorizontal:20,paddingBottom:30},
  externalOption:{alignItems:'center',gap:8},
  externalOptionIcon:{width:54,height:54,borderRadius:16,alignItems:'center',justifyContent:'center'},
  externalOptionLabel:{fontSize:12,color:c.text,fontWeight:'600'},
  // Comment Modal
  overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.4)'},
  commentSheet:{backgroundColor:c.card,borderTopLeftRadius:24,borderTopRightRadius:24,padding:16,maxHeight:500},
  commentSheetHdr:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:16},
  commentSheetTitle:{fontSize:17,fontWeight:'700',color:c.text},
  commentList:{maxHeight:300},
  commentItem:{flexDirection:'row',gap:10,marginBottom:12},
  commentAvatar:{width:36,height:36,borderRadius:18,backgroundColor:c.primary,alignItems:'center',justifyContent:'center'},
  commentAvatarTxt:{color:'#fff',fontWeight:'700'},
  commentBubble:{flex:1,backgroundColor:c.cardAlt,borderRadius:12,padding:10},
  commentBubbleAuthor:{fontSize:13,fontWeight:'700',color:c.text,marginBottom:2},
  commentBubbleText:{fontSize:13,color:c.textSecondary},
  commentInputRow:{flexDirection:'row',gap:10,alignItems:'center',borderTopWidth:1,borderTopColor:c.border,paddingTop:12},
  commentInput:{flex:1,borderWidth:1.5,borderColor:c.border,borderRadius:20,paddingHorizontal:14,paddingVertical:10,fontSize:14,color:c.text},
  commentSendBtn:{width:40,height:40,borderRadius:20,backgroundColor:c.primary,alignItems:'center',justifyContent:'center'},
});
