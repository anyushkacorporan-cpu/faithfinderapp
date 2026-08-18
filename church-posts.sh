#!/bin/bash
cd ~/Desktop/FaithFinderApp

# Update postsStore to link posts to churches by placeId
cat > src/lib/postsStore.ts << 'EOF'
import { useState, useEffect } from 'react';

export type Post = {
  id: string;
  authorName: string;
  authorInitials: string;
  authorType: 'personal' | 'church';
  authorColor: string;
  content: string;
  image?: string;
  likes: string[];
  comments: { id: string; author: string; text: string; time: string }[];
  time: string;
  createdAt: number;
  churchPlaceId?: string;
  churchName?: string;
};

let posts: Post[] = [
  {
    id: '1',
    authorName: 'Grace Community Church',
    authorInitials: 'GC',
    authorType: 'church',
    authorColor: '#c9a96e',
    content: 'What an incredible Sunday! Over 50 people came forward during altar call. God is moving! Join us next week, all are welcome.',
    likes: [],
    comments: [],
    time: '2h',
    createdAt: Date.now() - 7200000,
    churchPlaceId: 'ChIJL-v7OcmWwoARLWQTr2JBIgw',
    churchName: 'Grace Community Church',
  },
  {
    id: '2',
    authorName: 'Lakewood Church',
    authorInitials: 'LC',
    authorType: 'church',
    authorColor: '#1a1a2e',
    content: 'Night of Hope is coming! Join Joel and Victoria Osteen for an unforgettable evening of worship and encouragement. Free admission.',
    likes: [],
    comments: [],
    time: '1d',
    createdAt: Date.now() - 86400000,
    churchPlaceId: 'ChIJVUsKgcH0OxARBJlw13Qgw2w',
    churchName: 'Lakewood Church',
  },
  {
    id: '3',
    authorName: 'Jasmine Carter',
    authorInitials: 'JC',
    authorType: 'personal',
    authorColor: '#667eea',
    content: 'Just finished writing "Unshakeable". God gave me every lyric at 3am! So grateful for this gift.',
    likes: [],
    comments: [],
    time: '4h',
    createdAt: Date.now() - 14400000,
  },
];

const listeners: Array<() => void> = [];
function notify() { listeners.forEach(fn => fn()); }

export function getPosts() { return [...posts].sort((a,b) => b.createdAt - a.createdAt); }
export function getPostsByChurch(placeId: string) {
  return posts.filter(p => p.churchPlaceId === placeId).sort((a,b) => b.createdAt - a.createdAt);
}

export function addPost(post: Omit<Post, 'id' | 'likes' | 'comments' | 'createdAt'>) {
  posts = [{ ...post, id: Date.now().toString(), likes: [], comments: [], createdAt: Date.now() }, ...posts];
  notify();
}

export function toggleLike(postId: string, userId: string) {
  posts = posts.map(p => {
    if (p.id !== postId) return p;
    const liked = p.likes.includes(userId);
    return { ...p, likes: liked ? p.likes.filter(id => id !== userId) : [...p.likes, userId] };
  });
  notify();
}

export function addComment(postId: string, author: string, text: string) {
  posts = posts.map(p => {
    if (p.id !== postId) return p;
    return { ...p, comments: [...p.comments, { id: Date.now().toString(), author, text, time: 'now' }] };
  });
  notify();
}

export function usePosts() {
  const [state, setState] = useState(getPosts());
  useEffect(() => {
    const fn = () => setState(getPosts());
    listeners.push(fn);
    return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };
  }, []);
  return state;
}

export function useChurchPosts(placeId: string) {
  const [state, setState] = useState(getPostsByChurch(placeId));
  useEffect(() => {
    const fn = () => setState(getPostsByChurch(placeId));
    listeners.push(fn);
    return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };
  }, [placeId]);
  return state;
}
EOF
echo "postsStore done"

# Update church-detail to include Posts tab
cat > app/church-detail.tsx << 'EOF'
import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Share, Alert, Image, FlatList, Dimensions, ActivityIndicator, Modal } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../src/components/Header';
import { COLORS, CHURCHES } from '../src/lib/constants';
import { useSavedChurches } from '../src/lib/store';
import { isConnected, addConnection, removeConnection } from '../src/lib/connectionsStore';
import { useChurchPosts, toggleLike, addComment } from '../src/lib/postsStore';

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
  const [open, setOpen] = useState(false);
  return (
    <View style={cs.wrap}>
      <TouchableOpacity style={cs.header} onPress={() => setOpen(!open)} activeOpacity={0.7}>
        <View style={cs.left}>
          <Text style={cs.title}>{title}</Text>
          {!open && !!preview && <Text style={cs.preview}>{preview}</Text>}
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.gold} />
      </TouchableOpacity>
      {open && <View style={cs.body}>{children}</View>}
    </View>
  );
}

const cs = StyleSheet.create({
  wrap:{borderWidth:1,borderColor:COLORS.border,borderRadius:16,overflow:'hidden'},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:16,backgroundColor:COLORS.white},
  left:{flex:1},
  title:{fontSize:15,fontWeight:'700',color:COLORS.navy},
  preview:{fontSize:12,color:'#aaa',marginTop:3},
  body:{borderTopWidth:1,borderTopColor:COLORS.border},
});

export default function ChurchDetailScreen() {
  const params = useLocalSearchParams<{ id:string; placeId?:string; name?:string; address?:string; phone?:string; rating?:string; count?:string; website?:string; }>();
  const staticChurch = CHURCHES.find(c => c.id === params.id);
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);
  const [showReviews, setShowReviews] = useState(false);
  const [activeTab, setActiveTab] = useState('About');
  const [commentModal, setCommentModal] = useState<string|null>(null);
  const [commentText, setCommentText] = useState('');
  const { saved, toggle } = useSavedChurches();
  const placeId = params.placeId || staticChurch?.placeId || '';
  const isSaved = saved.includes(params.id || '');
  const [connected, setConnected] = useState(isConnected(params.id || placeId || ''));
  const churchPosts = useChurchPosts(placeId);

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
        color: COLORS.gold,
        initials: church.name?.slice(0,2).toUpperCase() || 'CH',
      });
      setConnected(true);
    }
  }

  async function handleShare() {
    try {
      await Share.share({
        title: church.name,
        message: `Check out ${church.name} on FaithFinder!\n📍 ${church.address}${church.phone ? '\n📞 ' + church.phone : ''}${church.website ? '\n🌐 ' + church.website : ''}`,
      });
    } catch {}
  }

  function handlePhone() {
    if (!church.phone) { Alert.alert('No phone number available'); return; }
    Linking.openURL(`tel:${church.phone.replace(/\D/g, '')}`);
  }

  function handleWebsite() {
    if (!church.website) { Alert.alert('No website available'); return; }
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
            <Text style={s.loadingTxt}>Loading details...</Text>
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
            <Ionicons name="arrow-back" size={22} color={COLORS.navy} />
          </TouchableOpacity>
          <View style={s.actionBtns}>
            <TouchableOpacity onPress={() => toggle(church.id)}>
              <Ionicons name={isSaved ? 'heart' : 'heart-outline'} size={24} color={isSaved ? COLORS.red : '#888'} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShare}>
              <Ionicons name="share-social-outline" size={24} color="#888" />
            </TouchableOpacity>
            <TouchableOpacity style={[s.connectBtn, connected && s.connectBtnActive]} onPress={handleConnect}>
              <Text style={s.connectBtnTxt}>{connected ? '✓ Connected' : 'Connect'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Identity */}
        <View style={s.identityRow}>
          <LinearGradient colors={[COLORS.navy,'#2d2240']} style={s.churchIcon} start={{x:0,y:0}} end={{x:1,y:1}}>
            <Ionicons name="home" size={28} color={COLORS.gold} />
          </LinearGradient>
          <View style={s.identityInfo}>
            <Text style={s.churchName}>{church.name}</Text>
            <View style={s.metaRow}>
              <Text style={s.typeLabel}>Church</Text>
              <Text style={s.metaDot}> · </Text>
              <Ionicons name="location-outline" size={13} color="#888" />
              <Text style={s.metaTxt} numberOfLines={1}>{church.address.split(',').slice(-2).join(',').trim()}</Text>
            </View>
            {church.count > 0 && <Text style={s.reviewCount}><Text style={s.reviewNum}>{church.count}</Text> Google reviews</Text>}
          </View>
        </View>

        {/* Stars */}
        {church.rating > 0 && (
          <View style={s.starsRow}>
            {[1,2,3,4,5].map(i => <Ionicons key={i} name={i<=Math.round(church.rating)?'star':'star-outline'} size={20} color={COLORS.gold} />)}
            <Text style={s.ratingNum}>{church.rating.toFixed(1)}</Text>
            <TouchableOpacity style={s.seeReviewsBtn} onPress={() => setShowReviews(true)}>
              <Text style={s.seeReviewsTxt}>See reviews</Text>
              <Ionicons name="chevron-forward" size={14} color={COLORS.gold} />
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
                {t}{t==='Posts' && churchPosts.length > 0 ? ` (${churchPosts.length})` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ABOUT TAB */}
        {activeTab === 'About' && (
          <>
            <View style={s.divider} />
            <View style={s.section}>
              <Text style={s.sectionTitle}>Information</Text>
              <View style={s.infoCard}>
                <View style={s.infoRow}>
                  <View style={s.infoIconWrap}><Ionicons name="location-outline" size={18} color={COLORS.navy} /></View>
                  <View style={s.infoContent}>
                    <Text style={s.infoLabel}>Address</Text>
                    <Text style={s.infoValue}>{church.address}</Text>
                  </View>
                  <TouchableOpacity style={s.actionBadge} onPress={handleDirections}>
                    <Text style={s.actionBadgeTxt}>Directions</Text>
                  </TouchableOpacity>
                </View>
                <View style={s.infoDivider} />
                <TouchableOpacity style={s.infoRow} onPress={handlePhone} activeOpacity={church.phone?0.7:1}>
                  <View style={s.infoIconWrap}><Ionicons name="call-outline" size={18} color={church.phone?COLORS.navy:'#bbb'} /></View>
                  <View style={s.infoContent}>
                    <Text style={s.infoLabel}>Phone</Text>
                    <Text style={[s.infoValue, church.phone?s.tappable:s.muted]}>{church.phone||'Not available'}</Text>
                  </View>
                  {!!church.phone && <View style={s.callBadge}><Text style={s.callBadgeTxt}>Call</Text></View>}
                </TouchableOpacity>
                <View style={s.infoDivider} />
                <TouchableOpacity style={s.infoRow} onPress={handleWebsite} activeOpacity={church.website?0.7:1}>
                  <View style={s.infoIconWrap}><Ionicons name="globe-outline" size={18} color={church.website?COLORS.navy:'#bbb'} /></View>
                  <View style={s.infoContent}>
                    <Text style={s.infoLabel}>Website</Text>
                    <Text style={[s.infoValue, church.website?s.goldTxt:s.muted]} numberOfLines={1}>{church.website?church.website.replace(/^https?:\/\//,'').replace(/\/$/,''):'Not available'}</Text>
                  </View>
                  {!!church.website && <View style={s.visitBadge}><Text style={s.visitBadgeTxt}>Visit</Text></View>}
                </TouchableOpacity>
                <View style={s.infoDivider} />
                <View style={s.infoRow}>
                  <View style={s.infoIconWrap}><Ionicons name="mail-outline" size={18} color="#bbb" /></View>
                  <View style={s.infoContent}>
                    <Text style={s.infoLabel}>Email</Text>
                    <Text style={s.muted}>Not available</Text>
                  </View>
                </View>
              </View>
            </View>
            <View style={s.divider} />
            {church.hours.length > 0 && (
              <View style={s.section}>
                <Collapsible title="Service Hours" preview={todayTime?`Today: ${todayTime}`:'Tap to see hours'}>
                  {church.hours.map((h: string, i: number) => {
                    const colonIdx = h.indexOf(': ');
                    const day = colonIdx>-1?h.slice(0,colonIdx):h;
                    const time = colonIdx>-1?h.slice(colonIdx+2):'Closed';
                    const isToday = today===day;
                    return (
                      <View key={i} style={[s.hourRow, i<church.hours.length-1&&s.hourBorder, isToday&&s.hourRowToday]}>
                        <View style={s.hourLeft}>
                          {isToday&&<View style={s.todayDot}/>}
                          <Text style={[s.hourDay, isToday&&s.todayTxt]}>{day}</Text>
                        </View>
                        <Text style={[s.hourTime, isToday&&s.todayTxt]}>{time}</Text>
                      </View>
                    );
                  })}
                </Collapsible>
              </View>
            )}
            {church.hours.length>0&&<View style={s.divider}/>}
            <View style={s.section}>
              <Collapsible title="Amenities" preview="Parking, Wheelchair, Children Ministry & more">
                {TAGS.map((tag,i) => (
                  <View key={i} style={[s.amenityRow, i<TAGS.length-1&&s.amenityBorder]}>
                    <View style={s.amenityLeft}>
                      <View style={s.amenityIconWrap}><Ionicons name={tag.icon as any} size={16} color={COLORS.navy}/></View>
                      <Text style={s.amenityTxt}>{tag.label}</Text>
                    </View>
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.green}/>
                  </View>
                ))}
              </Collapsible>
            </View>
            <View style={s.divider} />
            <View style={s.mapBox}>
              <TouchableOpacity style={s.mapArea} onPress={handleDirections} activeOpacity={0.8}>
                <View style={s.mapPin}><Ionicons name="location" size={20} color={COLORS.gold}/></View>
                <View style={s.mapPinShadow}/>
                <Text style={s.mapHint}>Tap to open in Maps</Text>
              </TouchableOpacity>
              <View style={s.mapFooter}>
                <Text style={s.mapCity} numberOfLines={1}>{church.address.split(',')[0]}</Text>
                <TouchableOpacity style={s.directionsBtn} onPress={handleDirections}>
                  <Ionicons name="navigate" size={13} color="#fff"/>
                  <Text style={s.directionsTxt}>Directions</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {/* POSTS TAB */}
        {activeTab === 'Posts' && (
          <View style={s.postsSection}>
            {churchPosts.length === 0 ? (
              <View style={s.emptyPosts}>
                <Ionicons name="document-text-outline" size={40} color="#ddd" />
                <Text style={s.emptyPostsTxt}>No posts yet</Text>
                <Text style={s.emptyPostsSub}>This church hasn't posted anything yet</Text>
              </View>
            ) : (
              churchPosts.map(post => {
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
                        <Ionicons name={liked?'heart':'heart-outline'} size={18} color={liked?COLORS.red:'#888'}/>
                        <Text style={[s.actionTxt, liked&&{color:COLORS.red}]}>Like</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.actionBtn} onPress={() => setCommentModal(post.id)}>
                        <Ionicons name="chatbubble-outline" size={18} color="#888"/>
                        <Text style={s.actionTxt}>Comment</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.actionBtn} onPress={() => Share.share({message:`${post.authorName}: ${post.content}`})}>
                        <Ionicons name="share-social-outline" size={18} color="#888"/>
                        <Text style={s.actionTxt}>Share</Text>
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
            <Ionicons name="heart" size={16} color={COLORS.red}/>
            <Text style={s.savedBannerTxt}>Saved to your churches</Text>
          </View>
        )}
        <View style={{height:40}}/>
      </ScrollView>

      {/* Reviews Modal */}
      <Modal visible={showReviews} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modalRoot} edges={['top']}>
          <View style={s.modalHdr}>
            <View>
              <Text style={s.modalTitle}>Reviews</Text>
              <View style={s.modalStarsRow}>
                {[1,2,3,4,5].map(i=><Ionicons key={i} name={i<=Math.round(church.rating)?'star':'star-outline'} size={16} color={COLORS.gold}/>)}
                <Text style={s.modalRating}>{church.rating.toFixed(1)} · {church.count} reviews</Text>
              </View>
            </View>
            <TouchableOpacity style={s.closeBtn} onPress={() => setShowReviews(false)}>
              <Ionicons name="close" size={20} color={COLORS.navy}/>
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
                      {[1,2,3,4,5].map(j=><Ionicons key={j} name={j<=r.rating?'star':'star-outline'} size={13} color={COLORS.gold}/>)}
                      <Text style={s.reviewTime}> · {r.relative_time_description}</Text>
                    </View>
                  </View>
                </View>
                <Text style={s.reviewTxt}>{r.text}</Text>
              </View>
            )):(
              <View style={s.noReviews}>
                <Ionicons name="star-outline" size={40} color="#ddd"/>
                <Text style={s.noReviewsTxt}>No reviews available</Text>
              </View>
            )}
            <View style={{height:40}}/>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Comment Modal */}
      <Modal visible={!!commentModal} transparent animationType="slide">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setCommentModal(null)}/>
        <View style={s.commentSheet}>
          <View style={s.commentSheetHdr}>
            <Text style={s.commentSheetTitle}>Comments</Text>
            <TouchableOpacity onPress={() => setCommentModal(null)}>
              <Ionicons name="close" size={22} color={COLORS.navy}/>
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
            <TextInput style={s.commentInput} placeholder="Write a comment..." placeholderTextColor="#bbb" value={commentText} onChangeText={setCommentText}/>
            <TouchableOpacity style={s.commentSendBtn} onPress={() => { if(commentModal){addComment(commentModal,'You',commentText);setCommentText('');setCommentModal(null);} }}>
              <Ionicons name="send" size={18} color={COLORS.white}/>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:COLORS.white},
  photoPlaceholder:{height:280,alignItems:'center',justifyContent:'center',gap:10},
  loadingTxt:{color:'rgba(255,255,255,0.8)',fontSize:14,fontWeight:'600'},
  galleryWrap:{height:280,position:'relative'},
  dots:{position:'absolute',bottom:12,left:0,right:0,flexDirection:'row',justifyContent:'center',gap:6},
  dot:{width:6,height:6,borderRadius:3,backgroundColor:'rgba(255,255,255,0.4)'},
  dotActive:{backgroundColor:'#fff',width:18},
  photoCount:{position:'absolute',top:12,right:12,backgroundColor:'rgba(0,0,0,0.5)',borderRadius:12,paddingHorizontal:10,paddingVertical:4,flexDirection:'row',alignItems:'center',gap:4},
  photoCountTxt:{color:'#fff',fontSize:12,fontWeight:'600'},
  actionsRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:16,paddingVertical:14},
  actionBtns:{flexDirection:'row',alignItems:'center',gap:16},
  connectBtn:{backgroundColor:COLORS.navy,borderRadius:100,paddingHorizontal:20,paddingVertical:9},
  connectBtnActive:{backgroundColor:COLORS.green},
  connectBtnTxt:{color:'#fff',fontSize:14,fontWeight:'700'},
  identityRow:{flexDirection:'row',alignItems:'flex-start',gap:14,paddingHorizontal:16,paddingBottom:16},
  churchIcon:{width:76,height:76,borderRadius:18,alignItems:'center',justifyContent:'center'},
  identityInfo:{flex:1},
  churchName:{fontSize:20,fontWeight:'700',color:COLORS.navy,marginBottom:5},
  metaRow:{flexDirection:'row',alignItems:'center',marginBottom:5,flexWrap:'wrap'},
  typeLabel:{fontSize:14,color:COLORS.gold,fontWeight:'600'},
  metaDot:{color:'#ddd',fontSize:14},
  metaTxt:{fontSize:13,color:'#888',flex:1},
  reviewCount:{fontSize:13,color:'#888'},
  reviewNum:{fontWeight:'700',color:COLORS.navy},
  starsRow:{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:16,marginBottom:12,flexWrap:'wrap'},
  ratingNum:{fontSize:16,fontWeight:'700',color:COLORS.navy,marginLeft:4},
  seeReviewsBtn:{marginLeft:'auto',flexDirection:'row',alignItems:'center',gap:3,backgroundColor:'rgba(201,169,110,0.12)',borderRadius:100,paddingHorizontal:12,paddingVertical:6},
  seeReviewsTxt:{fontSize:13,color:COLORS.gold,fontWeight:'700'},
  descBox:{paddingHorizontal:16,marginBottom:12},
  descTxt:{fontSize:14,color:'#555',lineHeight:22},
  tabsRow:{flexDirection:'row',borderTopWidth:1,borderBottomWidth:1,borderColor:COLORS.border,marginTop:8},
  tab:{flex:1,paddingVertical:13,alignItems:'center',borderBottomWidth:2,borderBottomColor:'transparent'},
  tabActive:{borderBottomColor:COLORS.navy},
  tabTxt:{fontSize:14,fontWeight:'600',color:'#aaa'},
  tabTxtActive:{color:COLORS.navy,fontWeight:'700'},
  divider:{height:1,backgroundColor:COLORS.border,marginHorizontal:16,marginVertical:16},
  section:{paddingHorizontal:16,marginBottom:4},
  sectionTitle:{fontSize:17,fontWeight:'700',color:COLORS.navy,marginBottom:14},
  infoCard:{borderWidth:1,borderColor:COLORS.border,borderRadius:16,overflow:'hidden'},
  infoRow:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:14,gap:12},
  infoDivider:{height:1,backgroundColor:'#f5f3ef',marginLeft:62},
  infoIconWrap:{width:36,height:36,borderRadius:10,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'},
  infoContent:{flex:1},
  infoLabel:{fontSize:11,color:'#bbb',fontWeight:'600',textTransform:'uppercase',letterSpacing:0.4,marginBottom:2},
  infoValue:{fontSize:14,color:COLORS.navy,fontWeight:'500'},
  tappable:{color:COLORS.navy,fontWeight:'600'},
  goldTxt:{color:COLORS.gold},
  muted:{color:'#bbb',fontSize:14},
  actionBadge:{backgroundColor:COLORS.navy,borderRadius:100,paddingHorizontal:14,paddingVertical:7},
  actionBadgeTxt:{color:'#fff',fontSize:12,fontWeight:'700'},
  callBadge:{backgroundColor:'#e8f5e9',borderRadius:100,paddingHorizontal:14,paddingVertical:7},
  callBadgeTxt:{color:COLORS.green,fontSize:12,fontWeight:'700'},
  visitBadge:{backgroundColor:'rgba(201,169,110,0.12)',borderRadius:100,paddingHorizontal:14,paddingVertical:7},
  visitBadgeTxt:{color:COLORS.gold,fontSize:12,fontWeight:'700'},
  hourRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:16,paddingVertical:13},
  hourBorder:{borderBottomWidth:1,borderBottomColor:'#f5f3ef'},
  hourRowToday:{backgroundColor:'rgba(201,169,110,0.06)'},
  hourLeft:{flexDirection:'row',alignItems:'center',gap:8},
  todayDot:{width:6,height:6,borderRadius:3,backgroundColor:COLORS.gold},
  hourDay:{fontSize:14,color:'#555'},
  hourTime:{fontSize:14,color:'#555'},
  todayTxt:{color:COLORS.navy,fontWeight:'700'},
  amenityRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:14},
  amenityBorder:{borderBottomWidth:1,borderBottomColor:'#f5f3ef'},
  amenityLeft:{flexDirection:'row',alignItems:'center',gap:12},
  amenityIconWrap:{width:36,height:36,borderRadius:10,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'},
  amenityTxt:{fontSize:14,color:COLORS.navy,fontWeight:'500'},
  mapBox:{marginHorizontal:16,borderRadius:16,overflow:'hidden',borderWidth:1,borderColor:COLORS.border},
  mapArea:{height:180,backgroundColor:'#e8e8e8',alignItems:'center',justifyContent:'center',gap:8},
  mapPin:{width:40,height:40,borderRadius:20,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center'},
  mapPinShadow:{width:10,height:6,borderRadius:5,backgroundColor:'rgba(0,0,0,0.2)'},
  mapHint:{fontSize:12,color:'#999',marginTop:4},
  mapFooter:{backgroundColor:'#fff',padding:14,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  mapCity:{fontSize:15,fontWeight:'700',color:COLORS.navy,flex:1},
  directionsBtn:{flexDirection:'row',alignItems:'center',gap:5,backgroundColor:COLORS.navy,borderRadius:100,paddingHorizontal:14,paddingVertical:9},
  directionsTxt:{color:'#fff',fontSize:12,fontWeight:'700'},
  // Posts tab
  postsSection:{padding:16},
  emptyPosts:{paddingVertical:40,alignItems:'center',gap:8},
  emptyPostsTxt:{fontSize:15,color:'#bbb',fontWeight:'600'},
  emptyPostsSub:{fontSize:13,color:'#ddd',textAlign:'center'},
  postCard:{backgroundColor:COLORS.white,borderRadius:16,padding:14,marginBottom:12,borderWidth:1,borderColor:COLORS.border},
  postHdr:{flexDirection:'row',gap:10,marginBottom:10},
  postAvatar:{width:44,height:44,borderRadius:22,alignItems:'center',justifyContent:'center'},
  postAvatarTxt:{color:COLORS.white,fontWeight:'700',fontSize:15},
  postMeta:{flex:1},
  postAuthor:{fontSize:15,fontWeight:'700',color:COLORS.navy},
  postTime:{fontSize:12,color:'#aaa',marginTop:2},
  postContent:{fontSize:14,color:'#333',lineHeight:21,marginBottom:10},
  postImage:{width:'100%',height:200,borderRadius:12,marginBottom:10},
  postStats:{flexDirection:'row',gap:12,marginBottom:8},
  statTxt:{fontSize:12,color:'#aaa'},
  postActions:{flexDirection:'row',borderTopWidth:1,borderTopColor:COLORS.border,paddingTop:10},
  actionBtn:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:5},
  actionTxt:{fontSize:13,color:'#888',fontWeight:'600'},
  // Saved banner
  savedBanner:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,marginHorizontal:16,marginTop:16,backgroundColor:'#fff0f3',borderRadius:12,paddingVertical:12},
  savedBannerTxt:{fontSize:14,fontWeight:'600',color:COLORS.red},
  // Reviews Modal
  modalRoot:{flex:1,backgroundColor:COLORS.white},
  modalHdr:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',paddingHorizontal:20,paddingVertical:16,borderBottomWidth:1,borderBottomColor:COLORS.border},
  modalTitle:{fontSize:20,fontWeight:'700',color:COLORS.navy,marginBottom:4},
  modalStarsRow:{flexDirection:'row',alignItems:'center',gap:4},
  modalRating:{fontSize:13,color:'#888',marginLeft:4},
  closeBtn:{width:36,height:36,borderRadius:18,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'},
  modalScroll:{flex:1,padding:16},
  reviewCard:{backgroundColor:COLORS.lightBg,borderRadius:16,padding:14,marginBottom:12},
  reviewHdr:{flexDirection:'row',alignItems:'center',gap:10,marginBottom:10},
  reviewAvatar:{width:44,height:44,borderRadius:22},
  reviewAvatarFallback:{backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center'},
  reviewAvatarTxt:{color:'#fff',fontWeight:'700',fontSize:16},
  reviewMeta:{flex:1},
  reviewName:{fontSize:15,fontWeight:'700',color:COLORS.navy,marginBottom:3},
  reviewStarsRow:{flexDirection:'row',alignItems:'center'},
  reviewTime:{fontSize:12,color:'#999'},
  reviewTxt:{fontSize:14,color:'#555',lineHeight:22},
  noReviews:{alignItems:'center',paddingVertical:60,gap:10},
  noReviewsTxt:{fontSize:16,color:'#bbb',fontWeight:'600'},
  // Comment Modal
  overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.4)'},
  commentSheet:{backgroundColor:COLORS.white,borderTopLeftRadius:24,borderTopRightRadius:24,padding:16,maxHeight:500},
  commentSheetHdr:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:16},
  commentSheetTitle:{fontSize:17,fontWeight:'700',color:COLORS.navy},
  commentList:{maxHeight:300},
  commentItem:{flexDirection:'row',gap:10,marginBottom:12},
  commentAvatar:{width:36,height:36,borderRadius:18,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center'},
  commentAvatarTxt:{color:'#fff',fontWeight:'700'},
  commentBubble:{flex:1,backgroundColor:COLORS.lightBg,borderRadius:12,padding:10},
  commentBubbleAuthor:{fontSize:13,fontWeight:'700',color:COLORS.navy,marginBottom:2},
  commentBubbleText:{fontSize:13,color:'#555'},
  commentInputRow:{flexDirection:'row',gap:10,alignItems:'center',borderTopWidth:1,borderTopColor:COLORS.border,paddingTop:12},
  commentInput:{flex:1,borderWidth:1.5,borderColor:COLORS.border,borderRadius:20,paddingHorizontal:14,paddingVertical:10,fontSize:14,color:COLORS.navy},
  commentSendBtn:{width:40,height:40,borderRadius:20,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center'},
});
EOF
echo "ALL DONE"
