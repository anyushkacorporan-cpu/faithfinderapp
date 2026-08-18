#!/bin/bash
cd ~/Desktop/FaithFinderApp

cat > src/lib/constants.ts << 'ENDOFFILE'
export const COLORS = {
  navy: '#1a1a2e', gold: '#c9a96e', cream: '#faf9f6', border: '#f0ede8',
  muted: '#888', lightBg: '#f5f3ef', green: '#2e7d32', lightGreen: '#e8f5e9',
  red: '#e74c6f', white: '#ffffff', text: '#333', placeholder: '#bbb',
};

const KEY = 'AIzaSyAHZO8wyxyCmx0k8u059QSX7QpsEvZ82sU';

export const CHURCHES = [
  { id: '1', name: 'Church of Saint Rocco', address: '18 3rd St, Glen Cove, NY 11542', phone: '(516) 676-2482', type: 'Catholic', rating: 4.8, count: 97, hours: 'Call for service times', website: 'www.glencovecatholic.org/rocco', placeId: 'ChIJ2TZZXK-FwokRVPAZkU8sQQk', gradient: ['#667eea','#764ba2'] as [string,string], review: 'Felt the presence of JESUS — absolutely beautiful.' },
  { id: '2', name: 'Glen Cove Christian Church', address: '74 Walnut Rd, Glen Cove, NY 11542', phone: '(516) 676-2055', type: 'Christian', rating: 4.9, count: 10, hours: 'Sunday Service', website: 'glencovechristian.org', placeId: 'ChIJ06Harw-FwokRNEnTcZAg1BE', gradient: ['#43e97b','#38f9d7'] as [string,string], review: 'Pastors Tommy and Joe are amazing. You feel like you are home with family.' },
  { id: '3', name: "St. Patrick's Church", address: '235 Glen St, Glen Cove, NY 11542', phone: '(516) 676-0276', type: 'Catholic', rating: 4.5, count: 107, hours: 'Mon-Thu: 9AM-5PM', website: 'saintpatrickgc.org', placeId: 'ChIJTyGtZqeFwokRbU5xJYHfw_8', gradient: ['#4facfe','#00f2fe'] as [string,string], review: 'Beautiful stained glass windows. The grounds are beautifully maintained.' },
  { id: '4', name: "St Paul's Episcopal Church", address: '28 Highland Rd, Glen Cove, NY 11542', phone: '(516) 676-0015', type: 'Episcopal', rating: 4.9, count: 7, hours: 'Sun: 8AM-12PM', website: 'stpaulsgc.org', placeId: 'ChIJfzZHVAmFwokRLW9YQHi6jjE', gradient: ['#fa709a','#fee140'] as [string,string], review: 'Very welcoming parish. The people are friendly and make you feel at home.' },
  { id: '5', name: 'Calvary AME Church', address: '80 Cottage Row, Glen Cove, NY 11542', phone: '(516) 759-9060', type: 'AME', rating: 4.6, count: 10, hours: 'Sunday Service', website: 'calvaryamegc.org', placeId: 'ChIJs0R463OFwokRc7KSduspyiY', gradient: ['#a18cd1','#fbc2eb'] as [string,string], review: 'When I came to Calvary AME I simply knew in my heart I was home!' },
  { id: '6', name: 'First Baptist Church', address: '7 Continental Pl, Glen Cove, NY 11542', phone: '(516) 671-2090', type: 'Baptist', rating: 4.5, count: 11, hours: 'Sunday Service', website: 'firstbaptistgc.org', placeId: 'ChIJmQZn3Z-FwokRXGasLIM4dLc', gradient: ['#f093fb','#f5576c'] as [string,string], review: 'The Word is very easy to understand and relatable to life situations.' },
];

export function getPhotoUrl(placeId: string, maxWidth = 800): string {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&place_id=${placeId}&key=${KEY}`;
}

export const EVENTS = [
  { id: '1', title: 'Women of Purpose Conference', description: 'Worship and fellowship for women.', date: 'Apr 18-19, 2026', location: 'Valley Stream, NY', type: 'Conference', price: 'Free', attending: 0 },
  { id: '2', title: 'NYC Gospel Music Festival', description: 'A celebration of gospel music.', date: 'May 2, 2026', location: 'Brooklyn, NY', type: 'Festival', price: '$15', attending: 0 },
  { id: '3', title: 'Faith & Finance Workshop', description: 'Learn to manage money with faith.', date: 'Apr 5, 2026', location: 'Glen Cove, NY', type: 'Workshop', price: 'Free', attending: 0 },
  { id: '4', title: 'Passion Conference 2026', description: 'A conference for the next generation.', date: 'Jun 12-14, 2026', location: 'Atlanta, GA', type: 'Conference', price: '$125', attending: 0 },
  { id: '5', title: 'Red Rocks Worship Night', description: 'An unforgettable night of worship.', date: 'Jun 27, 2026', location: 'Morrison, CO', type: 'Service', price: '$30', attending: 0 },
];

export const POSTS = [
  { id: '1', author: 'Grace Community Church', initials: 'GC', type: 'Church', time: '2h', content: 'What an incredible Sunday! Over 50 people came forward during altar call. God is moving in Glen Cove! Join us next week, all are welcome.', likes: 2, comments: 2, color: '#e74c6f' },
  { id: '2', author: 'Lakewood Church', initials: 'LC', type: 'Church', time: '1d', content: 'Night of Hope is coming to Chicago on June 5th! Free admission. Join Joel and Victoria Osteen for an unforgettable evening of worship and encouragement.', likes: 2, comments: 2, color: '#c9a96e' },
  { id: '3', author: 'Jasmine Carter', initials: 'JC', type: 'Member', time: '4h', content: 'Just finished writing Unshakeable. God gave me every lyric at 3am!', likes: 8, comments: 1, color: '#667eea' },
];

export const PEOPLE = [
  { id: '1', name: 'Jasmine Carter', initials: 'JC', role: 'Unknown', color: '#64b5f6' },
  { id: '2', name: 'David Okonkwo', initials: 'DO', role: 'Unknown', color: '#ce93d8' },
  { id: '3', name: 'Isaiah Williams', initials: 'IW', role: 'Unknown', color: '#ef9a9a' },
  { id: '4', name: 'Rachel Park', initials: 'RP', role: 'Unknown', color: '#b39ddb' },
];
ENDOFFILE

cat > "app/(tabs)/index.tsx" << 'ENDOFFILE'
import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Modal, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../src/components/Header';
import { COLORS, CHURCHES } from '../../src/lib/constants';
import { useSavedChurches } from '../../src/lib/store';

const KEY = 'AIzaSyAHZO8wyxyCmx0k8u059QSX7QpsEvZ82sU';
const DENOMS = ['All','Catholic','Christian','Episcopal','AME','Baptist'];

async function getPhotoRef(placeId: string): Promise<string> {
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&key=${KEY}`
    );
    const data = await res.json();
    const ref = data?.result?.photos?.[0]?.photo_reference;
    return ref || '';
  } catch { return ''; }
}

function photoUrl(ref: string) {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${ref}&key=${KEY}`;
}

export default function ChurchesScreen() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('List');
  const [filterVisible, setFilterVisible] = useState(false);
  const [activeDenom, setActiveDenom] = useState('All');
  const [photoRefs, setPhotoRefs] = useState<Record<string, string>>({});
  const { saved } = useSavedChurches();

  useEffect(() => {
    async function load() {
      const refs: Record<string, string> = {};
      for (const c of CHURCHES) {
        const ref = await getPhotoRef(c.placeId);
        if (ref) refs[c.id] = ref;
      }
      setPhotoRefs(refs);
    }
    load();
  }, []);

  const allFiltered = CHURCHES.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.address.toLowerCase().includes(search.toLowerCase());
    const matchDenom = activeDenom === 'All' || c.type === activeDenom;
    return matchSearch && matchDenom;
  });

  const displayed = activeTab === 'Saved' ? CHURCHES.filter(c => saved.includes(c.id)) : allFiltered;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <Header />
      <View style={s.verseBar}>
        <Text style={s.verseTxt}>"For I know the plans I have for you," declares the Lord. — Jeremiah 29:11</Text>
      </View>
      <View style={s.searchSection}>
        <View style={s.locationRow}>
          <Ionicons name="location-outline" size={16} color={COLORS.gold} />
          <Text style={s.locationTxt}>Near you <Text style={s.locationBold}>(Glen Cove)</Text></Text>
        </View>
        <View style={s.searchRow}>
          <View style={s.searchBar}>
            <Ionicons name="search-outline" size={18} color={COLORS.gold} />
            <TextInput style={s.searchInput} placeholder="Search churches, cities, denomi..." placeholderTextColor={COLORS.placeholder} value={search} onChangeText={setSearch} />
          </View>
          <TouchableOpacity style={s.filterBtn} onPress={() => setFilterVisible(true)}>
            <Ionicons name="options-outline" size={14} color="#555" />
            <Text style={s.filterTxt}>Filter</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={s.toggleRow}>
        <View style={s.toggle}>
          {['List','Saved'].map(t => (
            <TouchableOpacity key={t} style={[s.toggleBtn, activeTab===t && s.toggleBtnActive]} onPress={() => setActiveTab(t)}>
              <Text style={[s.toggleTxt, activeTab===t && s.toggleTxtActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.sectionHdr}>
          <View style={s.greenPin}><Ionicons name="location" size={14} color={COLORS.green} /></View>
          <Text style={s.sectionTitle}>{activeTab === 'Saved' ? 'Saved Churches' : 'Nearby Churches'}</Text>
          <Text style={s.sectionSub}>near Glen Cove</Text>
        </View>
        {displayed.length === 0 && (
          <View style={s.emptyState}>
            <Ionicons name="heart-outline" size={48} color="#ddd" />
            <Text style={s.emptyTxt}>{activeTab === 'Saved' ? 'No saved churches yet' : 'No churches found'}</Text>
            <Text style={s.emptySub}>{activeTab === 'Saved' ? 'Tap the heart on a church detail page to save it' : 'Try a different search'}</Text>
          </View>
        )}
        {displayed.map(church => (
          <TouchableOpacity key={church.id} style={s.card} onPress={() => router.push({ pathname: '/church-detail', params: { id: church.id } })} activeOpacity={0.92}>
            <View style={s.banner}>
              {photoRefs[church.id] ? (
                <Image source={{ uri: photoUrl(photoRefs[church.id]) }} style={s.bannerImg} resizeMode="cover" />
              ) : (
                <LinearGradient colors={church.gradient} style={StyleSheet.absoluteFill} start={{x:0,y:0}} end={{x:1,y:1}}>
                  <View style={s.loadingWrap}><ActivityIndicator color="rgba(255,255,255,0.6)" size="small" /></View>
                </LinearGradient>
              )}
              <View style={s.nearbyBadge}><Text style={s.nearbyTxt}>NEARBY</Text></View>
              <View style={s.ratingBadge}><Text style={s.ratingTxt}>{church.rating} ({church.count})</Text></View>
              {saved.includes(church.id) && <View style={s.savedIndicator}><Ionicons name="heart" size={14} color={COLORS.red} /></View>}
            </View>
            <View style={s.cardBody}>
              <Text style={s.churchName}>{church.name}</Text>
              <View style={s.addrRow}><Ionicons name="location-outline" size={13} color="#999" /><Text style={s.addrTxt}>{church.address}</Text></View>
              <View style={s.cardFooter}>
                <Text style={s.websiteTxt}>{church.website}</Text>
                <View style={s.detailsRow}><Text style={s.detailsBtn}>Details</Text><Ionicons name="chevron-forward" size={13} color={COLORS.gold} /></View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
        <View style={{height:20}} />
      </ScrollView>
      <Modal visible={filterVisible} transparent animationType="slide">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setFilterVisible(false)} />
        <View style={s.sheet}>
          <View style={s.handle} />
          <Text style={s.sheetTitle}>Filter Churches</Text>
          <Text style={s.sheetLabel}>Denomination</Text>
          <View style={s.denomGrid}>
            {DENOMS.map(d => (
              <TouchableOpacity key={d} style={[s.denomBtn, activeDenom===d && s.denomBtnActive]} onPress={() => setActiveDenom(d)}>
                <Text style={[s.denomTxt, activeDenom===d && s.denomTxtActive]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={s.applyBtn} onPress={() => setFilterVisible(false)}><Text style={s.applyTxt}>Apply Filter</Text></TouchableOpacity>
          <TouchableOpacity style={s.resetBtn} onPress={() => { setActiveDenom('All'); setFilterVisible(false); }}><Text style={s.resetTxt}>Reset</Text></TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:COLORS.white},
  verseBar:{paddingHorizontal:20,paddingVertical:12,borderBottomWidth:1,borderBottomColor:COLORS.border},
  verseTxt:{fontFamily:'PlayfairDisplay_400Regular_Italic',fontSize:13,color:'#888',textAlign:'center',lineHeight:20},
  searchSection:{backgroundColor:COLORS.white,paddingHorizontal:16,paddingTop:12},
  locationRow:{flexDirection:'row',alignItems:'center',gap:5,marginBottom:10},
  locationTxt:{fontSize:13,color:'#666'},
  locationBold:{fontWeight:'700',color:COLORS.navy},
  searchRow:{flexDirection:'row',gap:8,alignItems:'center',marginBottom:12},
  searchBar:{flex:1,flexDirection:'row',alignItems:'center',gap:8,backgroundColor:COLORS.white,borderRadius:100,paddingHorizontal:14,paddingVertical:12,borderWidth:1.5,borderColor:'#e8e3da'},
  searchInput:{flex:1,fontSize:13,color:COLORS.navy},
  filterBtn:{flexDirection:'row',alignItems:'center',gap:5,backgroundColor:COLORS.lightBg,borderWidth:1.5,borderColor:'#e8e3da',borderRadius:100,paddingHorizontal:14,paddingVertical:12},
  filterTxt:{fontSize:12,fontWeight:'600',color:'#555'},
  toggleRow:{paddingHorizontal:16,paddingBottom:12,backgroundColor:COLORS.white,borderBottomWidth:1,borderBottomColor:COLORS.border},
  toggle:{flexDirection:'row',backgroundColor:'#f0ede8',borderRadius:100,padding:3,alignSelf:'center'},
  toggleBtn:{paddingHorizontal:32,paddingVertical:8,borderRadius:100},
  toggleBtnActive:{backgroundColor:COLORS.white,shadowColor:'#000',shadowOffset:{width:0,height:1},shadowOpacity:0.1,shadowRadius:3},
  toggleTxt:{fontSize:13,fontWeight:'600',color:'#888'},
  toggleTxtActive:{color:COLORS.navy,fontWeight:'700'},
  scroll:{flex:1,backgroundColor:COLORS.white},
  sectionHdr:{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:16,paddingVertical:14},
  greenPin:{width:28,height:28,backgroundColor:COLORS.lightGreen,borderRadius:14,alignItems:'center',justifyContent:'center'},
  sectionTitle:{fontSize:16,fontWeight:'700',color:COLORS.navy},
  sectionSub:{fontSize:13,color:'#999'},
  emptyState:{alignItems:'center',paddingVertical:60,gap:10},
  emptyTxt:{fontSize:16,fontWeight:'700',color:'#bbb'},
  emptySub:{fontSize:13,color:'#ddd',textAlign:'center',paddingHorizontal:40},
  card:{backgroundColor:COLORS.white,marginHorizontal:16,marginBottom:16,borderRadius:16,overflow:'hidden',borderWidth:1,borderColor:COLORS.border,shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.06,shadowRadius:8,elevation:2},
  banner:{height:200,position:'relative'},
  bannerImg:{width:'100%',height:'100%'},
  loadingWrap:{flex:1,alignItems:'center',justifyContent:'center'},
  nearbyBadge:{position:'absolute',top:12,right:12,backgroundColor:COLORS.green,borderRadius:6,paddingHorizontal:10,paddingVertical:4},
  nearbyTxt:{color:COLORS.white,fontSize:11,fontWeight:'700',letterSpacing:0.5},
  ratingBadge:{position:'absolute',bottom:10,left:12,backgroundColor:'rgba(0,0,0,0.55)',borderRadius:8,paddingHorizontal:10,paddingVertical:5},
  ratingTxt:{color:COLORS.white,fontSize:13,fontWeight:'700'},
  savedIndicator:{position:'absolute',top:12,left:12,width:30,height:30,borderRadius:15,backgroundColor:'rgba(0,0,0,0.3)',alignItems:'center',justifyContent:'center'},
  cardBody:{padding:16},
  churchName:{fontSize:18,fontWeight:'700',color:COLORS.navy,marginBottom:8},
  addrRow:{flexDirection:'row',alignItems:'center',gap:6,marginBottom:10},
  addrTxt:{fontSize:13,color:'#666',flex:1},
  cardFooter:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingTop:10,borderTopWidth:1,borderTopColor:COLORS.border},
  websiteTxt:{fontSize:12,color:'#bbb'},
  detailsRow:{flexDirection:'row',alignItems:'center',gap:2},
  detailsBtn:{fontSize:13,fontWeight:'700',color:COLORS.gold},
  overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.4)'},
  sheet:{backgroundColor:COLORS.white,borderTopLeftRadius:24,borderTopRightRadius:24,padding:24,paddingBottom:40},
  handle:{width:40,height:4,backgroundColor:'#ddd',borderRadius:2,alignSelf:'center',marginBottom:20},
  sheetTitle:{fontSize:20,fontWeight:'700',color:COLORS.navy,marginBottom:20},
  sheetLabel:{fontSize:13,fontWeight:'700',color:'#888',textTransform:'uppercase',letterSpacing:0.5,marginBottom:12},
  denomGrid:{flexDirection:'row',flexWrap:'wrap',gap:10,marginBottom:24},
  denomBtn:{borderWidth:1.5,borderColor:COLORS.border,borderRadius:100,paddingHorizontal:16,paddingVertical:8},
  denomBtnActive:{backgroundColor:COLORS.navy,borderColor:COLORS.navy},
  denomTxt:{fontSize:13,fontWeight:'600',color:'#555'},
  denomTxtActive:{color:COLORS.white},
  applyBtn:{backgroundColor:COLORS.navy,borderRadius:100,paddingVertical:16,alignItems:'center',marginBottom:12},
  applyTxt:{color:COLORS.white,fontSize:15,fontWeight:'700'},
  resetBtn:{alignItems:'center',paddingVertical:10},
  resetTxt:{fontSize:14,color:'#999'},
});
ENDOFFILE

echo "ALL DONE"
