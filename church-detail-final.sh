#!/bin/bash
cd ~/Desktop/FaithFinderApp

cat > app/church-detail.tsx << 'EOF'
import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Share, Alert, Image, FlatList, Dimensions, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../src/components/Header';
import { COLORS, CHURCHES } from '../src/lib/constants';
import { useSavedChurches } from '../src/lib/store';

const KEY = 'AIzaSyAHZO8wyxyCmx0k8u059QSX7QpsEvZ82sU';
const { width: W } = Dimensions.get('window');

const TAG_ICONS: Record<string, any> = {
  'Parking Available': 'car-outline',
  'Wheelchair Accessible': 'accessibility-outline',
  'Children Ministry': 'people-outline',
  'Live Worship': 'musical-notes-outline',
  'Bible Study': 'book-outline',
  'Youth Ministry': 'school-outline',
  'Online Services': 'globe-outline',
  'Community Outreach': 'heart-outline',
  'Hours Available': 'time-outline',
  'Phone Available': 'call-outline',
  'Website Available': 'globe-outline',
};

const DEFAULT_TAGS = [
  'Parking Available',
  'Wheelchair Accessible',
  'Children Ministry',
  'Live Worship',
  'Bible Study',
  'Youth Ministry',
  'Online Services',
  'Community Outreach',
];

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

export default function ChurchDetailScreen() {
  const params = useLocalSearchParams<{ id: string; placeId?: string; name?: string; address?: string; phone?: string; rating?: string; count?: string; website?: string; hours?: string; }>();
  const staticChurch = CHURCHES.find(c => c.id === params.id);
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);
  const [showAllHours, setShowAllHours] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const { saved, toggle } = useSavedChurches();

  const placeId = params.placeId || staticChurch?.placeId || '';
  const isSaved = saved.includes(params.id || '');

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

  const tags = [
    ...DEFAULT_TAGS,
    ...(church.hours.length > 0 ? ['Hours Available'] : []),
    ...(church.phone ? ['Phone Available'] : []),
    ...(church.website ? ['Website Available'] : []),
  ];

  useEffect(() => {
    async function load() {
      if (!placeId) { setLoading(false); return; }
      const result = await fetchDetails(placeId);
      setDetails(result);
      setLoading(false);
    }
    load();
  }, [placeId]);

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
              {church.photos.map((_: any, i: number) => <View key={i} style={[s.dot, i === activePhoto && s.dotActive]} />)}
            </View>
            <View style={s.photoCount}>
              <Ionicons name="images-outline" size={13} color="#fff" />
              <Text style={s.photoCountTxt}>{activePhoto + 1}/{church.photos.length}</Text>
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
            <TouchableOpacity style={s.connectBtn}>
              <Text style={s.connectBtnTxt}>Connect</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Identity */}
        <View style={s.identityRow}>
          <LinearGradient colors={[COLORS.navy, '#2d2240']} style={s.churchIcon} start={{x:0,y:0}} end={{x:1,y:1}}>
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
            {[1,2,3,4,5].map(i => <Ionicons key={i} name={i <= Math.round(church.rating) ? 'star' : 'star-outline'} size={20} color={COLORS.gold} />)}
            <Text style={s.ratingNum}>{church.rating.toFixed(1)}</Text>
            <TouchableOpacity style={s.writeReview}><Text style={s.writeReviewTxt}>Write a review</Text></TouchableOpacity>
          </View>
        )}

        {/* Description */}
        {!!church.description && (
          <View style={s.descBox}><Text style={s.descTxt}>{church.description}</Text></View>
        )}

        {/* Tags — clean, no emoji */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tagsScroll}>
          {tags.map((tag, i) => (
            <View key={i} style={s.tag}>
              <Ionicons name={TAG_ICONS[tag] || 'checkmark-outline'} size={13} color={COLORS.navy} />
              <Text style={s.tagTxt}>{tag}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={s.divider} />

        {/* Info rows */}
        <View style={s.infoSection}>
          <View style={s.infoRow}>
            <View style={s.infoLeft}>
              <Ionicons name="location-outline" size={18} color="#888" />
              <Text style={s.infoTxt}>{church.address}</Text>
            </View>
            <TouchableOpacity style={s.directionsBtn} onPress={handleDirections}>
              <Ionicons name="navigate" size={13} color="#fff" />
              <Text style={s.directionsTxt}>Directions</Text>
            </TouchableOpacity>
          </View>

          {!!church.phone && (
            <TouchableOpacity style={s.infoRow} onPress={handlePhone} activeOpacity={0.7}>
              <View style={s.infoLeft}>
                <Ionicons name="call-outline" size={18} color="#888" />
                <Text style={[s.infoTxt, s.tappable]}>{church.phone}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#ddd" />
            </TouchableOpacity>
          )}

          {!!church.website && (
            <TouchableOpacity style={s.infoRow} onPress={handleWebsite} activeOpacity={0.7}>
              <View style={s.infoLeft}>
                <Ionicons name="globe-outline" size={18} color="#888" />
                <Text style={[s.infoTxt, s.websiteTxt]} numberOfLines={1}>{church.website.replace(/^https?:\/\//,'').replace(/\/$/,'')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#ddd" />
            </TouchableOpacity>
          )}

          <View style={[s.infoRow, s.noBorder]}>
            <View style={s.infoLeft}>
              <Ionicons name="mail-outline" size={18} color="#bbb" />
              <Text style={[s.infoTxt, { color: '#bbb' }]}>Email not available</Text>
            </View>
          </View>
        </View>

        <View style={s.divider} />

        {/* Hours */}
        {church.hours.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Service Hours</Text>
            <View style={s.hoursCard}>
              {(showAllHours ? church.hours : church.hours.slice(0, 3)).map((h: string, i: number) => {
                const parts = h.split(': ');
                const day = parts[0];
                const time = parts.slice(1).join(': ');
                const isToday = today === day;
                return (
                  <View key={i} style={[s.hourRow, i < (showAllHours ? church.hours.length : 3) - 1 && s.hourBorder]}>
                    <Text style={[s.hourDay, isToday && s.today]}>{day}</Text>
                    <Text style={[s.hourTime, isToday && s.today]}>{time || 'Closed'}</Text>
                  </View>
                );
              })}
              <TouchableOpacity style={s.showMoreBtn} onPress={() => setShowAllHours(!showAllHours)}>
                <Text style={s.showMoreTxt}>{showAllHours ? 'Show less' : `Show all ${church.hours.length} days`}</Text>
                <Ionicons name={showAllHours ? 'chevron-up' : 'chevron-down'} size={14} color={COLORS.gold} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {church.hours.length > 0 && <View style={s.divider} />}

        {/* Map */}
        <View style={s.mapBox}>
          <TouchableOpacity style={s.mapArea} onPress={handleDirections} activeOpacity={0.8}>
            <View style={s.mapPin}><Ionicons name="location" size={20} color={COLORS.gold} /></View>
            <View style={s.mapPinShadow} />
            <Text style={s.mapHint}>Tap to open in Maps</Text>
          </TouchableOpacity>
          <View style={s.mapFooter}>
            <Text style={s.mapCity} numberOfLines={1}>{church.address.split(',')[0]}</Text>
            <View style={s.mapBtns}>
              <TouchableOpacity style={s.viewBtn} onPress={handleWebsite}>
                <Ionicons name="search-outline" size={13} color="#555" />
                <Text style={s.viewBtnTxt}>View</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.directionsBtn} onPress={handleDirections}>
                <Ionicons name="navigate" size={13} color="#fff" />
                <Text style={s.directionsTxt}>Directions</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={s.divider} />

        {/* Reviews */}
        {church.reviews.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Google Reviews</Text>
            {(showAllReviews ? church.reviews : church.reviews.slice(0, 3)).map((r: any, i: number) => (
              <View key={i} style={s.reviewCard}>
                <View style={s.reviewHdr}>
                  {r.profile_photo_url
                    ? <Image source={{ uri: r.profile_photo_url }} style={s.reviewAvatar} />
                    : <View style={[s.reviewAvatar, s.reviewAvatarFallback]}><Text style={s.reviewAvatarTxt}>{r.author_name?.[0] || '?'}</Text></View>
                  }
                  <View style={s.reviewMeta}>
                    <Text style={s.reviewName}>{r.author_name}</Text>
                    <View style={s.reviewStarsRow}>
                      {[1,2,3,4,5].map(j => <Ionicons key={j} name={j <= r.rating ? 'star' : 'star-outline'} size={12} color={COLORS.gold} />)}
                      <Text style={s.reviewTime}> · {r.relative_time_description}</Text>
                    </View>
                  </View>
                </View>
                <Text style={s.reviewTxt} numberOfLines={showAllReviews ? undefined : 3}>{r.text}</Text>
              </View>
            ))}
            {church.reviews.length > 3 && (
              <TouchableOpacity style={s.showMoreBtn} onPress={() => setShowAllReviews(!showAllReviews)}>
                <Text style={s.showMoreTxt}>{showAllReviews ? 'Show fewer reviews' : `Show all ${church.reviews.length} reviews`}</Text>
                <Ionicons name={showAllReviews ? 'chevron-up' : 'chevron-down'} size={14} color={COLORS.gold} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {isSaved && (
          <View style={s.savedBanner}>
            <Ionicons name="heart" size={16} color={COLORS.red} />
            <Text style={s.savedBannerTxt}>Saved to your churches</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex:1, backgroundColor:COLORS.white },
  photoPlaceholder: { height:280, alignItems:'center', justifyContent:'center', gap:10 },
  loadingTxt: { color:'rgba(255,255,255,0.8)', fontSize:14, fontWeight:'600' },
  galleryWrap: { height:280, position:'relative' },
  dots: { position:'absolute', bottom:12, left:0, right:0, flexDirection:'row', justifyContent:'center', gap:6 },
  dot: { width:6, height:6, borderRadius:3, backgroundColor:'rgba(255,255,255,0.4)' },
  dotActive: { backgroundColor:'#fff', width:18 },
  photoCount: { position:'absolute', top:12, right:12, backgroundColor:'rgba(0,0,0,0.5)', borderRadius:12, paddingHorizontal:10, paddingVertical:4, flexDirection:'row', alignItems:'center', gap:4 },
  photoCountTxt: { color:'#fff', fontSize:12, fontWeight:'600' },
  actionsRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:16, paddingVertical:14 },
  actionBtns: { flexDirection:'row', alignItems:'center', gap:16 },
  connectBtn: { backgroundColor:COLORS.navy, borderRadius:100, paddingHorizontal:20, paddingVertical:9 },
  connectBtnTxt: { color:'#fff', fontSize:14, fontWeight:'700' },
  identityRow: { flexDirection:'row', alignItems:'flex-start', gap:14, paddingHorizontal:16, paddingBottom:16 },
  churchIcon: { width:76, height:76, borderRadius:18, alignItems:'center', justifyContent:'center' },
  identityInfo: { flex:1 },
  churchName: { fontSize:20, fontWeight:'700', color:COLORS.navy, marginBottom:5 },
  metaRow: { flexDirection:'row', alignItems:'center', marginBottom:5, flexWrap:'wrap' },
  typeLabel: { fontSize:14, color:COLORS.gold, fontWeight:'600' },
  metaDot: { color:'#ddd', fontSize:14 },
  metaTxt: { fontSize:13, color:'#888', flex:1 },
  reviewCount: { fontSize:13, color:'#888' },
  reviewNum: { fontWeight:'700', color:COLORS.navy },
  starsRow: { flexDirection:'row', alignItems:'center', gap:4, paddingHorizontal:16, marginBottom:12, flexWrap:'wrap' },
  ratingNum: { fontSize:16, fontWeight:'700', color:COLORS.navy, marginLeft:4 },
  writeReview: { marginLeft:'auto' },
  writeReviewTxt: { fontSize:13, color:COLORS.gold, fontWeight:'700' },
  descBox: { paddingHorizontal:16, marginBottom:12 },
  descTxt: { fontSize:14, color:'#555', lineHeight:22 },
  tagsScroll: { paddingHorizontal:16, paddingVertical:10, gap:8 },
  tag: { flexDirection:'row', alignItems:'center', gap:6, borderWidth:1, borderColor:'#e0ddd8', borderRadius:8, paddingHorizontal:12, paddingVertical:8, backgroundColor:COLORS.white },
  tagTxt: { fontSize:12, fontWeight:'600', color:COLORS.navy },
  divider: { height:1, backgroundColor:COLORS.border, marginHorizontal:16, marginVertical:12 },
  infoSection: { paddingHorizontal:16 },
  infoRow: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingVertical:14, borderBottomWidth:1, borderBottomColor:'#f5f3ef' },
  noBorder: { borderBottomWidth:0 },
  infoLeft: { flexDirection:'row', alignItems:'center', gap:12, flex:1 },
  infoTxt: { fontSize:14, color:'#333', flex:1 },
  tappable: { color:COLORS.navy, fontWeight:'600' },
  websiteTxt: { color:COLORS.gold },
  directionsBtn: { flexDirection:'row', alignItems:'center', gap:5, backgroundColor:COLORS.navy, borderRadius:100, paddingHorizontal:14, paddingVertical:9 },
  directionsTxt: { color:'#fff', fontSize:12, fontWeight:'700' },
  section: { paddingHorizontal:16, marginBottom:8 },
  sectionTitle: { fontSize:17, fontWeight:'700', color:COLORS.navy, marginBottom:12 },
  hoursCard: { borderWidth:1, borderColor:COLORS.border, borderRadius:16, overflow:'hidden' },
  hourRow: { flexDirection:'row', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:13 },
  hourBorder: { borderBottomWidth:1, borderBottomColor:'#f5f3ef' },
  hourDay: { fontSize:14, color:'#555' },
  hourTime: { fontSize:14, color:'#555' },
  today: { color:COLORS.navy, fontWeight:'700' },
  showMoreBtn: { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:6, paddingVertical:12, borderTopWidth:1, borderTopColor:COLORS.border },
  showMoreTxt: { fontSize:13, color:COLORS.gold, fontWeight:'600' },
  mapBox: { marginHorizontal:16, borderRadius:16, overflow:'hidden', borderWidth:1, borderColor:COLORS.border },
  mapArea: { height:180, backgroundColor:'#e8e8e8', alignItems:'center', justifyContent:'center', gap:8 },
  mapPin: { width:40, height:40, borderRadius:20, backgroundColor:COLORS.navy, alignItems:'center', justifyContent:'center' },
  mapPinShadow: { width:10, height:6, borderRadius:5, backgroundColor:'rgba(0,0,0,0.2)' },
  mapHint: { fontSize:12, color:'#999', marginTop:4 },
  mapFooter: { backgroundColor:'#fff', padding:14, flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  mapCity: { fontSize:15, fontWeight:'700', color:COLORS.navy, flex:1 },
  mapBtns: { flexDirection:'row', gap:10 },
  viewBtn: { flexDirection:'row', alignItems:'center', gap:5, borderWidth:1.5, borderColor:'#e0ddd8', borderRadius:100, paddingHorizontal:14, paddingVertical:8 },
  viewBtnTxt: { fontSize:12, fontWeight:'600', color:'#555' },
  reviewCard: { backgroundColor:COLORS.lightBg, borderRadius:16, padding:14, marginBottom:10 },
  reviewHdr: { flexDirection:'row', alignItems:'center', gap:10, marginBottom:8 },
  reviewAvatar: { width:40, height:40, borderRadius:20 },
  reviewAvatarFallback: { backgroundColor:COLORS.navy, alignItems:'center', justifyContent:'center' },
  reviewAvatarTxt: { color:'#fff', fontWeight:'700', fontSize:16 },
  reviewMeta: { flex:1 },
  reviewName: { fontSize:14, fontWeight:'700', color:COLORS.navy },
  reviewStarsRow: { flexDirection:'row', alignItems:'center', marginTop:2 },
  reviewTime: { fontSize:11, color:'#999' },
  reviewTxt: { fontSize:13, color:'#555', lineHeight:20 },
  savedBanner: { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, marginHorizontal:16, marginTop:16, backgroundColor:'#fff0f3', borderRadius:12, paddingVertical:12 },
  savedBannerTxt: { fontSize:14, fontWeight:'600', color:COLORS.red },
});
EOF
echo "ALL DONE"
