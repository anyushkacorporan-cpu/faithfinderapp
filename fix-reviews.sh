#!/bin/bash
cd ~/Desktop/FaithFinderApp

# Create the updated church-detail with collapsible reviews
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

const KEY = 'AIzaSyAHZO8wyxyCmx0k8u059QSX7QpsEvZ82sU';
const { width: W } = Dimensions.get('window');

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

export default function ChurchDetailScreen() {
  const params = useLocalSearchParams<{ id: string; placeId?: string; name?: string; address?: string; phone?: string; rating?: string; count?: string; website?: string; }>();
  const staticChurch = CHURCHES.find(c => c.id === params.id);
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);
  const [showReviews, setShowReviews] = useState(false);
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

        {/* Stars — tap to see reviews */}
        {church.rating > 0 && (
          <View style={s.starsRow}>
            {[1,2,3,4,5].map(i => <Ionicons key={i} name={i <= Math.round(church.rating) ? 'star' : 'star-outline'} size={20} color={COLORS.gold} />)}
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

        <View style={s.divider} />

        {/* Information Card */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Information</Text>
          <View style={s.infoCard}>
            <View style={s.infoRow}>
              <View style={s.infoIconWrap}>
                <Ionicons name="location-outline" size={18} color={COLORS.navy} />
              </View>
              <View style={s.infoContent}>
                <Text style={s.infoLabel}>Address</Text>
                <Text style={s.infoValue}>{church.address}</Text>
              </View>
              <TouchableOpacity style={s.actionBadge} onPress={handleDirections}>
                <Text style={s.actionBadgeTxt}>Directions</Text>
              </TouchableOpacity>
            </View>

            <View style={s.infoDivider} />

            <TouchableOpacity style={s.infoRow} onPress={handlePhone} activeOpacity={church.phone ? 0.7 : 1}>
              <View style={s.infoIconWrap}>
                <Ionicons name="call-outline" size={18} color={church.phone ? COLORS.navy : '#bbb'} />
              </View>
              <View style={s.infoContent}>
                <Text style={s.infoLabel}>Phone</Text>
                <Text style={[s.infoValue, church.phone ? s.tappable : s.muted]}>
                  {church.phone || 'Not available'}
                </Text>
              </View>
              {!!church.phone && <View style={s.callBadge}><Text style={s.callBadgeTxt}>Call</Text></View>}
            </TouchableOpacity>

            <View style={s.infoDivider} />

            <TouchableOpacity style={s.infoRow} onPress={handleWebsite} activeOpacity={church.website ? 0.7 : 1}>
              <View style={s.infoIconWrap}>
                <Ionicons name="globe-outline" size={18} color={church.website ? COLORS.navy : '#bbb'} />
              </View>
              <View style={s.infoContent}>
                <Text style={s.infoLabel}>Website</Text>
                <Text style={[s.infoValue, church.website ? s.goldTxt : s.muted]} numberOfLines={1}>
                  {church.website ? church.website.replace(/^https?:\/\//,'').replace(/\/$/,'') : 'Not available'}
                </Text>
              </View>
              {!!church.website && <View style={s.visitBadge}><Text style={s.visitBadgeTxt}>Visit</Text></View>}
            </TouchableOpacity>

            <View style={s.infoDivider} />

            <View style={s.infoRow}>
              <View style={s.infoIconWrap}>
                <Ionicons name="mail-outline" size={18} color="#bbb" />
              </View>
              <View style={s.infoContent}>
                <Text style={s.infoLabel}>Email</Text>
                <Text style={s.muted}>Not available</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={s.divider} />

        {/* Service Hours */}
        {church.hours.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Service Hours</Text>
            <View style={s.hoursCard}>
              {church.hours.map((h: string, i: number) => {
                const colonIdx = h.indexOf(': ');
                const day = colonIdx > -1 ? h.slice(0, colonIdx) : h;
                const time = colonIdx > -1 ? h.slice(colonIdx + 2) : 'Closed';
                const isToday = today === day;
                return (
                  <View key={i} style={[s.hourRow, i < church.hours.length - 1 && s.hourBorder, isToday && s.hourRowToday]}>
                    <View style={s.hourLeft}>
                      {isToday && <View style={s.todayDot} />}
                      <Text style={[s.hourDay, isToday && s.todayTxt]}>{day}</Text>
                    </View>
                    <Text style={[s.hourTime, isToday && s.todayTxt]}>{time}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {church.hours.length > 0 && <View style={s.divider} />}

        {/* Amenities */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Amenities</Text>
          <View style={s.amenitiesCard}>
            {TAGS.map((tag, i) => (
              <View key={i} style={[s.amenityRow, i < TAGS.length - 1 && s.amenityBorder]}>
                <View style={s.amenityLeft}>
                  <View style={s.amenityIconWrap}>
                    <Ionicons name={tag.icon as any} size={16} color={COLORS.navy} />
                  </View>
                  <Text style={s.amenityTxt}>{tag.label}</Text>
                </View>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.green} />
              </View>
            ))}
          </View>
        </View>

        <View style={s.divider} />

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

        {isSaved && (
          <View style={s.savedBanner}>
            <Ionicons name="heart" size={16} color={COLORS.red} />
            <Text style={s.savedBannerTxt}>Saved to your churches</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Reviews Modal */}
      <Modal visible={showReviews} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modalRoot} edges={['top']}>
          <View style={s.modalHdr}>
            <View>
              <Text style={s.modalTitle}>Reviews</Text>
              <View style={s.modalStarsRow}>
                {[1,2,3,4,5].map(i => <Ionicons key={i} name={i <= Math.round(church.rating) ? 'star' : 'star-outline'} size={16} color={COLORS.gold} />)}
                <Text style={s.modalRating}>{church.rating.toFixed(1)} · {church.count} reviews</Text>
              </View>
            </View>
            <TouchableOpacity style={s.closeBtn} onPress={() => setShowReviews(false)}>
              <Ionicons name="close" size={20} color={COLORS.navy} />
            </TouchableOpacity>
          </View>
          <ScrollView style={s.modalScroll} showsVerticalScrollIndicator={false}>
            {church.reviews.length > 0 ? church.reviews.map((r: any, i: number) => (
              <View key={i} style={s.reviewCard}>
                <View style={s.reviewHdr}>
                  {r.profile_photo_url
                    ? <Image source={{ uri: r.profile_photo_url }} style={s.reviewAvatar} />
                    : <View style={[s.reviewAvatar, s.reviewAvatarFallback]}><Text style={s.reviewAvatarTxt}>{r.author_name?.[0] || '?'}</Text></View>
                  }
                  <View style={s.reviewMeta}>
                    <Text style={s.reviewName}>{r.author_name}</Text>
                    <View style={s.reviewStarsRow}>
                      {[1,2,3,4,5].map(j => <Ionicons key={j} name={j <= r.rating ? 'star' : 'star-outline'} size={13} color={COLORS.gold} />)}
                      <Text style={s.reviewTime}> · {r.relative_time_description}</Text>
                    </View>
                  </View>
                </View>
                <Text style={s.reviewTxt}>{r.text}</Text>
              </View>
            )) : (
              <View style={s.noReviews}>
                <Ionicons name="star-outline" size={40} color="#ddd" />
                <Text style={s.noReviewsTxt}>No reviews yet</Text>
              </View>
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

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
  seeReviewsBtn: { marginLeft:'auto', flexDirection:'row', alignItems:'center', gap:3, backgroundColor:'rgba(201,169,110,0.12)', borderRadius:100, paddingHorizontal:12, paddingVertical:6 },
  seeReviewsTxt: { fontSize:13, color:COLORS.gold, fontWeight:'700' },
  descBox: { paddingHorizontal:16, marginBottom:12 },
  descTxt: { fontSize:14, color:'#555', lineHeight:22 },
  divider: { height:1, backgroundColor:COLORS.border, marginHorizontal:16, marginVertical:16 },
  section: { paddingHorizontal:16, marginBottom:4 },
  sectionTitle: { fontSize:17, fontWeight:'700', color:COLORS.navy, marginBottom:14 },
  infoCard: { borderWidth:1, borderColor:COLORS.border, borderRadius:16, overflow:'hidden', backgroundColor:COLORS.white },
  infoRow: { flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingVertical:14, gap:12 },
  infoDivider: { height:1, backgroundColor:'#f5f3ef', marginLeft:62 },
  infoIconWrap: { width:36, height:36, borderRadius:10, backgroundColor:COLORS.lightBg, alignItems:'center', justifyContent:'center' },
  infoContent: { flex:1 },
  infoLabel: { fontSize:11, color:'#bbb', fontWeight:'600', textTransform:'uppercase', letterSpacing:0.4, marginBottom:2 },
  infoValue: { fontSize:14, color:COLORS.navy, fontWeight:'500' },
  tappable: { color:COLORS.navy, fontWeight:'600' },
  goldTxt: { color:COLORS.gold },
  muted: { color:'#bbb', fontSize:14 },
  actionBadge: { backgroundColor:COLORS.navy, borderRadius:100, paddingHorizontal:14, paddingVertical:7 },
  actionBadgeTxt: { color:'#fff', fontSize:12, fontWeight:'700' },
  callBadge: { backgroundColor:'#e8f5e9', borderRadius:100, paddingHorizontal:14, paddingVertical:7 },
  callBadgeTxt: { color:COLORS.green, fontSize:12, fontWeight:'700' },
  visitBadge: { backgroundColor:'rgba(201,169,110,0.12)', borderRadius:100, paddingHorizontal:14, paddingVertical:7 },
  visitBadgeTxt: { color:COLORS.gold, fontSize:12, fontWeight:'700' },
  hoursCard: { borderWidth:1, borderColor:COLORS.border, borderRadius:16, overflow:'hidden' },
  hourRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:16, paddingVertical:13 },
  hourBorder: { borderBottomWidth:1, borderBottomColor:'#f5f3ef' },
  hourRowToday: { backgroundColor:'rgba(201,169,110,0.06)' },
  hourLeft: { flexDirection:'row', alignItems:'center', gap:8 },
  todayDot: { width:6, height:6, borderRadius:3, backgroundColor:COLORS.gold },
  hourDay: { fontSize:14, color:'#555' },
  hourTime: { fontSize:14, color:'#555' },
  todayTxt: { color:COLORS.navy, fontWeight:'700' },
  amenitiesCard: { borderWidth:1, borderColor:COLORS.border, borderRadius:16, overflow:'hidden', backgroundColor:COLORS.white },
  amenityRow: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:14 },
  amenityBorder: { borderBottomWidth:1, borderBottomColor:'#f5f3ef' },
  amenityLeft: { flexDirection:'row', alignItems:'center', gap:12 },
  amenityIconWrap: { width:36, height:36, borderRadius:10, backgroundColor:COLORS.lightBg, alignItems:'center', justifyContent:'center' },
  amenityTxt: { fontSize:14, color:COLORS.navy, fontWeight:'500' },
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
  directionsBtn: { flexDirection:'row', alignItems:'center', gap:5, backgroundColor:COLORS.navy, borderRadius:100, paddingHorizontal:14, paddingVertical:9 },
  directionsTxt: { color:'#fff', fontSize:12, fontWeight:'700' },
  savedBanner: { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, marginHorizontal:16, marginTop:16, backgroundColor:'#fff0f3', borderRadius:12, paddingVertical:12 },
  savedBannerTxt: { fontSize:14, fontWeight:'600', color:COLORS.red },
  modalRoot: { flex:1, backgroundColor:COLORS.white },
  modalHdr: { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', paddingHorizontal:20, paddingVertical:16, borderBottomWidth:1, borderBottomColor:COLORS.border },
  modalTitle: { fontSize:20, fontWeight:'700', color:COLORS.navy, marginBottom:4 },
  modalStarsRow: { flexDirection:'row', alignItems:'center', gap:4 },
  modalRating: { fontSize:13, color:'#888', marginLeft:4 },
  closeBtn: { width:36, height:36, borderRadius:18, backgroundColor:COLORS.lightBg, alignItems:'center', justifyContent:'center' },
  modalScroll: { flex:1, padding:16 },
  reviewCard: { backgroundColor:COLORS.lightBg, borderRadius:16, padding:14, marginBottom:12 },
  reviewHdr: { flexDirection:'row', alignItems:'center', gap:10, marginBottom:10 },
  reviewAvatar: { width:44, height:44, borderRadius:22 },
  reviewAvatarFallback: { backgroundColor:COLORS.navy, alignItems:'center', justifyContent:'center' },
  reviewAvatarTxt: { color:'#fff', fontWeight:'700', fontSize:16 },
  reviewMeta: { flex:1 },
  reviewName: { fontSize:15, fontWeight:'700', color:COLORS.navy, marginBottom:3 },
  reviewStarsRow: { flexDirection:'row', alignItems:'center' },
  reviewTime: { fontSize:12, color:'#999' },
  reviewTxt: { fontSize:14, color:'#555', lineHeight:22 },
  noReviews: { alignItems:'center', paddingVertical:60, gap:10 },
  noReviewsTxt: { fontSize:16, color:'#bbb', fontWeight:'600' },
});
EOF
echo "ALL DONE"
