import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Modal, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../src/components/Header';
import { COLORS, CHURCHES } from '../../src/lib/constants';
import { useSavedChurches, toggleSavedChurch } from '../../src/lib/store';
import { DENOMINATIONS, STATES } from '../../src/lib/filters';
import { useSettings } from '../../src/lib/settingsStore';
import { useTranslation } from '../../src/lib/i18n';

const KEY = 'AIzaSyAHZO8wyxyCmx0k8u059QSX7QpsEvZ82sU';

async function getPhotoRef(placeId: string): Promise<string> {
  try {
    const res = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&key=${KEY}`);
    const data = await res.json();
    return data?.result?.photos?.[0]?.photo_reference || '';
  } catch { return ''; }
}

function photoUrl(ref: string) {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${ref}&key=${KEY}`;
}

async function searchByQuery(query: string) {
  try {
    const res = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query + ' church')}&type=church&key=${KEY}`);
    const data = await res.json();
    return (data.results || []).slice(0, 20).map((p: any, i: number) => ({
      id: `s${i}_${p.place_id}`, name: p.name, address: p.formatted_address || '',
      phone: '', type: 'Church', rating: p.rating || 0, count: p.user_ratings_total || 0,
      hours: '', website: '', placeId: p.place_id, gradient: ['#667eea','#764ba2'] as [string,string], state: '',
    }));
  } catch { return []; }
}

async function searchNearby(lat: number, lng: number) {
  try {
    const res = await fetch(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=50000&type=church&key=${KEY}`);
    const data = await res.json();
    return (data.results || []).slice(0, 20).map((p: any, i: number) => ({
      id: `n${i}_${p.place_id}`, name: p.name, address: p.vicinity || '',
      phone: '', type: 'Church', rating: p.rating || 0, count: p.user_ratings_total || 0,
      hours: '', website: '', placeId: p.place_id, gradient: ['#43e97b','#38f9d7'] as [string,string], state: '',
    }));
  } catch { return []; }
}

async function searchByState(stateCode: string) {
  try {
    const res = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent('church ' + stateCode)}&type=church&key=${KEY}`);
    const data = await res.json();
    return (data.results || []).slice(0, 20).map((p: any, i: number) => ({
      id: `st${i}_${p.place_id}`, name: p.name, address: p.formatted_address || '',
      phone: '', type: 'Church', rating: p.rating || 0, count: p.user_ratings_total || 0,
      hours: '', website: '', placeId: p.place_id, gradient: ['#667eea','#764ba2'] as [string,string], state: stateCode,
    }));
  } catch { return []; }
}

export default function ChurchesScreen() {
  const appSettings = useSettings();
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('List');
  const [filterVisible, setFilterVisible] = useState(false);
  const [filterSection, setFilterSection] = useState<'denom'|'state'>('denom');
  const [activeDenom, setActiveDenom] = useState('All');
  const [activeState, setActiveState] = useState('All States');
  const [photoRefs, setPhotoRefs] = useState<Record<string,string>>({});
  const [searchResults, setSearchResults] = useState<any[]|null>(null);
  const [searching, setSearching] = useState(false);
  const [locationLabel, setLocationLabel] = useState('Near you');
  const [nearbyChurches, setNearbyChurches] = useState<any[]|null>(null);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const { saved } = useSavedChurches();
  const timer = useRef<any>(null);

  const hasActiveFilter = activeDenom !== 'All' || activeState !== 'All States';
  const activeFilterCount = (activeDenom !== 'All' ? 1 : 0) + (activeState !== 'All States' ? 1 : 0);

  useEffect(() => {
    async function loadDefaultPhotos() {
      const refs: Record<string,string> = {};
      for (const c of CHURCHES.slice(0,10)) {
        const ref = await getPhotoRef(c.placeId);
        if (ref) refs[c.id] = ref;
      }
      setPhotoRefs(refs);
    }
    loadDefaultPhotos();
  }, []);

  useEffect(() => {
    async function getLocation() {
      if (!appSettings.location.locationEnabled || !appSettings.location.nearbyChurches) { setNearbyChurches(null); setLoadingNearby(false); return; }
      setLoadingNearby(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') { setLoadingNearby(false); return; }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const { latitude, longitude } = loc.coords;
        const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geo[0]) {
          const city = geo[0].city || geo[0].subregion || '';
          const state = geo[0].region || '';
          setLocationLabel(`Near ${city}, ${state}`);
        }
        const nearby = await searchNearby(latitude, longitude);
        setNearbyChurches(nearby);
        const refs: Record<string,string> = {};
        for (const c of nearby.slice(0,10)) {
          const ref = await getPhotoRef(c.placeId);
          if (ref) refs[c.id] = ref;
        }
        setPhotoRefs(p => ({ ...p, ...refs }));
      } catch {}
      setLoadingNearby(false);
    }
    getLocation();
  }, [appSettings.location.nearbyChurches, appSettings.location.locationEnabled]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!search.trim()) { setSearchResults(null); return; }
    timer.current = setTimeout(async () => {
      setSearching(true);
      const results = await searchByQuery(search);
      setSearchResults(results);
      const refs: Record<string,string> = {};
      for (const c of results.slice(0,8)) {
        const ref = await getPhotoRef(c.placeId);
        if (ref) refs[c.id] = ref;
      }
      setPhotoRefs(p => ({ ...p, ...refs }));
      setSearching(false);
    }, 800);
  }, [search]);

  async function applyFilters() {
    setFilterVisible(false);
    if (activeState !== 'All States') {
      const stateCode = activeState.split(' - ')[0];
      setSearching(true);
      const results = await searchByState(stateCode);
      setSearchResults(results);
      const refs: Record<string,string> = {};
      for (const c of results.slice(0,8)) {
        const ref = await getPhotoRef(c.placeId);
        if (ref) refs[c.id] = ref;
      }
      setPhotoRefs(p => ({ ...p, ...refs }));
      setSearching(false);
    }
  }

  function resetFilters() {
    setActiveDenom('All');
    setActiveState('All States');
    setSearchResults(null);
    setFilterVisible(false);
  }

  let displayed: any[] = [];
  if (activeTab === 'Saved') {
    // Build a pool combining static churches + any nearby/search results
    // the user has saved, so saved nearby/Google-Places churches aren't lost.
    const pool = new Map<string, any>();
    CHURCHES.forEach(c => pool.set(c.id, c));
    (nearbyChurches || []).forEach((c: any) => pool.set(c.id, c));
    (searchResults || []).forEach((c: any) => pool.set(c.id, c));
    console.log('DEBUG saved:', saved);
    console.log('DEBUG pool size:', pool.size, 'pool keys sample:', Array.from(pool.keys()).slice(0,5));
    displayed = saved.map(id => pool.get(id)).filter(Boolean);
    console.log('DEBUG displayed:', displayed.length);
  } else if (searchResults !== null) {
    displayed = searchResults;
    if (activeDenom !== 'All') {
      displayed = displayed.filter(c => c.type === activeDenom);
    }
  } else if (nearbyChurches !== null) {
    displayed = nearbyChurches;
  } else {
    displayed = CHURCHES.filter(c => activeDenom === 'All' || c.type === activeDenom);
  }

  function ChurchCard({ church }: { church: any }) {
    const params = {
      id: church.id, placeId: church.placeId, name: church.name,
      address: church.address, phone: church.phone || '',
      rating: String(church.rating), count: String(church.count),
      website: church.website || '', hours: church.hours || '',
    };
    return (
      <TouchableOpacity style={s.card} onPress={() => router.push({ pathname: '/church-detail', params })} activeOpacity={0.92}>
        <View style={s.banner}>
          {photoRefs[church.id] ? (
            <Image source={{ uri: photoUrl(photoRefs[church.id]) }} style={s.bannerImg} resizeMode="cover" />
          ) : (
            <LinearGradient colors={church.gradient || ['#667eea','#764ba2']} style={StyleSheet.absoluteFill} start={{x:0,y:0}} end={{x:1,y:1}}>
              <View style={s.loadingWrap}><ActivityIndicator color="rgba(255,255,255,0.6)" size="small" /></View>
            </LinearGradient>
          )}
          <View style={s.nearbyBadge}>
            <Text style={s.nearbyTxt}>{church.state || t('nearbyBadge')}</Text>
          </View>
          {church.rating > 0 && (
            <View style={s.ratingBadge}>
              <Text style={s.ratingTxt}>★ {church.rating} ({church.count})</Text>
            </View>
          )}
          <TouchableOpacity
            style={[s.savedIndicator, {zIndex:10}]}
            hitSlop={{top:10,bottom:10,left:10,right:10}}
            onPress={() => toggleSavedChurch(church.id)}
          >
            <Ionicons
              name={saved.includes(church.id) ? 'heart' : 'heart-outline'}
              size={16}
              color={saved.includes(church.id) ? COLORS.red : '#fff'}
            />
          </TouchableOpacity>
        </View>
        <View style={s.cardBody}>
          <Text style={s.churchName}>{church.name}</Text>
          <View style={s.addrRow}>
            <Ionicons name="location-outline" size={13} color="#999" />
            <Text style={s.addrTxt} numberOfLines={1}>{church.address}</Text>
          </View>
          <View style={s.cardFooter}>
            <Text style={s.websiteTxt} numberOfLines={1}>{church.website || ''}</Text>
            <View style={s.detailsRow}>
              <Text style={s.detailsBtn}>{t('details')}</Text>
              <Ionicons name="chevron-forward" size={13} color={COLORS.gold} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <Header />
      <View style={s.searchSection}>
        <View style={s.locationRow}>
          <Ionicons name="location-outline" size={16} color={COLORS.gold} />
          <Text style={s.locationTxt}>{locationLabel}</Text>
          {loadingNearby && <ActivityIndicator size="small" color={COLORS.gold} style={{ marginLeft: 8 }} />}
        </View>
        <View style={s.searchRow}>
          <View style={s.searchBar}>
            <Ionicons name="search-outline" size={18} color={COLORS.gold} />
            <TextInput
              style={s.searchInput}
              placeholder="Search city, state, zip, denomination..."
              placeholderTextColor={COLORS.placeholder}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {searching && <ActivityIndicator size="small" color={COLORS.gold} />}
            {search.length > 0 && !searching && (
              <TouchableOpacity onPress={() => { setSearch(''); setSearchResults(null); }}>
                <Ionicons name="close-circle" size={18} color="#ccc" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={[s.filterBtn, hasActiveFilter && s.filterBtnActive]} onPress={() => setFilterVisible(true)}>
            <Ionicons name="options-outline" size={14} color={hasActiveFilter ? COLORS.white : '#555'} />
            <Text style={[s.filterTxt, hasActiveFilter && s.filterTxtActive]}>
              Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.toggleRow}>
        <View style={s.toggle}>
          {['List','Saved'].map(t => (
            <TouchableOpacity key={t} style={[s.toggleBtn, activeTab===t && s.toggleBtnActive]} onPress={() => { setActiveTab(t); setSearch(''); setSearchResults(null); }}>
              <Text style={[s.toggleTxt, activeTab===t && s.toggleTxtActive]}>{t}{t==='Saved'&&saved.length>0?` (${saved.length})`:''}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.sectionHdr}>
          <View style={s.greenPin}><Ionicons name="location" size={14} color={COLORS.green} /></View>
          <Text style={s.sectionTitle}>
            {activeTab === 'Saved' ? t('savedChurches') : searchResults !== null ? `${t('resultsFor')} "${search || activeState}"` : nearbyChurches !== null ? t('nearbyChurches') : t('allChurches')}
          </Text>
          <Text style={s.sectionSub}>{displayed.length} found</Text>
        </View>

        {hasActiveFilter && activeState !== 'All States' && (
          <View style={s.activeFilterBar}>
            <Ionicons name="filter" size={14} color={COLORS.gold} />
            <Text style={s.activeFilterTxt}>
              {activeState !== 'All States' ? activeState.split(' - ')[1] : ''}
              {activeDenom !== 'All' ? (activeState !== 'All States' ? ' · ' : '') + activeDenom : ''}
            </Text>
            <TouchableOpacity onPress={resetFilters}>
              <Ionicons name="close-circle" size={16} color={COLORS.gold} />
            </TouchableOpacity>
          </View>
        )}

        {displayed.length === 0 && !searching && !loadingNearby && (
          <View style={s.emptyState}>
            <Ionicons name={activeTab === 'Saved' ? 'heart-outline' : 'search-outline'} size={48} color="#ddd" />
            <Text style={s.emptyTxt}>{activeTab === 'Saved' ? 'No saved churches yet' : 'No churches found'}</Text>
            <Text style={s.emptySub}>{activeTab === 'Saved' ? 'Tap the heart on a church to save it' : 'Try a different search'}</Text>
          </View>
        )}

        {displayed.map(church => <ChurchCard key={church.id} church={church} />)}
        <View style={{height:20}} />
      </ScrollView>

      {/* Filter Modal */}
      <Modal visible={filterVisible} transparent animationType="slide">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setFilterVisible(false)} />
        <View style={s.sheet}>
          <View style={s.handle} />
          <View style={s.sheetHdr}>
            <Text style={s.sheetTitle}>Filter Churches</Text>
            <TouchableOpacity onPress={resetFilters}>
              <Text style={s.resetTxt}>Reset All</Text>
            </TouchableOpacity>
          </View>

          {/* Section tabs */}
          <View style={s.sectionTabs}>
            <TouchableOpacity style={[s.sectionTab, filterSection==='denom' && s.sectionTabActive]} onPress={() => setFilterSection('denom')}>
              <Text style={[s.sectionTabTxt, filterSection==='denom' && s.sectionTabTxtActive]}>
                Denomination{activeDenom !== 'All' ? ' ✓' : ''}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.sectionTab, filterSection==='state' && s.sectionTabActive]} onPress={() => setFilterSection('state')}>
              <Text style={[s.sectionTabTxt, filterSection==='state' && s.sectionTabTxtActive]}>
                State{activeState !== 'All States' ? ' ✓' : ''}
              </Text>
            </TouchableOpacity>
          </View>

          {filterSection === 'denom' ? (
            <ScrollView style={s.filterScroll} showsVerticalScrollIndicator={false}>
              <View style={s.denomGrid}>
                {DENOMINATIONS.map(d => (
                  <TouchableOpacity key={d} style={[s.denomBtn, activeDenom===d && s.denomBtnActive]} onPress={() => setActiveDenom(d)}>
                    <Text style={[s.denomTxt, activeDenom===d && s.denomTxtActive]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          ) : (
            <ScrollView style={s.filterScroll} showsVerticalScrollIndicator={false}>
              {STATES.map(state => (
                <TouchableOpacity key={state} style={[s.stateRow, activeState===state && s.stateRowActive]} onPress={() => setActiveState(state)}>
                  <Text style={[s.stateTxt, activeState===state && s.stateTxtActive]}>{state}</Text>
                  {activeState===state && <Ionicons name="checkmark" size={18} color={COLORS.gold} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <TouchableOpacity style={s.applyBtn} onPress={applyFilters}>
            <Text style={s.applyTxt}>Apply Filters</Text>
          </TouchableOpacity>
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
  locationTxt:{fontSize:13,color:'#666',fontWeight:'600'},
  searchRow:{flexDirection:'row',gap:8,alignItems:'center',marginBottom:12},
  searchBar:{flex:1,flexDirection:'row',alignItems:'center',gap:8,backgroundColor:COLORS.white,borderRadius:100,paddingHorizontal:14,paddingVertical:12,borderWidth:1.5,borderColor:'#e8e3da'},
  searchInput:{flex:1,fontSize:13,color:COLORS.navy},
  filterBtn:{flexDirection:'row',alignItems:'center',gap:5,backgroundColor:COLORS.lightBg,borderWidth:1.5,borderColor:'#e8e3da',borderRadius:100,paddingHorizontal:14,paddingVertical:12},
  filterBtnActive:{backgroundColor:COLORS.navy,borderColor:COLORS.navy},
  filterTxt:{fontSize:12,fontWeight:'600',color:'#555'},
  filterTxtActive:{color:COLORS.white},
  toggleRow:{paddingHorizontal:16,paddingBottom:12,backgroundColor:COLORS.white,borderBottomWidth:1,borderBottomColor:COLORS.border},
  toggle:{flexDirection:'row',backgroundColor:'#f0ede8',borderRadius:100,padding:3,alignSelf:'center'},
  toggleBtn:{paddingHorizontal:32,paddingVertical:8,borderRadius:100},
  toggleBtnActive:{backgroundColor:COLORS.white,shadowColor:'#000',shadowOffset:{width:0,height:1},shadowOpacity:0.1,shadowRadius:3},
  toggleTxt:{fontSize:13,fontWeight:'600',color:'#888'},
  toggleTxtActive:{color:COLORS.navy,fontWeight:'700'},
  scroll:{flex:1,backgroundColor:COLORS.white},
  sectionHdr:{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:16,paddingVertical:14},
  greenPin:{width:28,height:28,backgroundColor:COLORS.lightGreen,borderRadius:14,alignItems:'center',justifyContent:'center'},
  sectionTitle:{fontSize:15,fontWeight:'700',color:COLORS.navy,flex:1},
  sectionSub:{fontSize:13,color:'#999'},
  activeFilterBar:{flexDirection:'row',alignItems:'center',gap:8,marginHorizontal:16,marginBottom:8,backgroundColor:'rgba(201,169,110,0.1)',borderRadius:10,paddingHorizontal:12,paddingVertical:8},
  activeFilterTxt:{flex:1,fontSize:13,color:COLORS.gold,fontWeight:'600'},
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
  websiteTxt:{fontSize:12,color:'#bbb',flex:1},
  detailsRow:{flexDirection:'row',alignItems:'center',gap:2},
  detailsBtn:{fontSize:13,fontWeight:'700',color:COLORS.gold},
  overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.4)'},
  sheet:{backgroundColor:COLORS.white,borderTopLeftRadius:24,borderTopRightRadius:24,padding:24,paddingBottom:40,maxHeight:'85%'},
  handle:{width:40,height:4,backgroundColor:'#ddd',borderRadius:2,alignSelf:'center',marginBottom:16},
  sheetHdr:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:16},
  sheetTitle:{fontSize:20,fontWeight:'700',color:COLORS.navy},
  resetTxt:{fontSize:14,color:COLORS.gold,fontWeight:'600'},
  sectionTabs:{flexDirection:'row',backgroundColor:'#f0ede8',borderRadius:100,padding:3,marginBottom:16},
  sectionTab:{flex:1,paddingVertical:9,borderRadius:100,alignItems:'center'},
  sectionTabActive:{backgroundColor:COLORS.white,shadowColor:'#000',shadowOffset:{width:0,height:1},shadowOpacity:0.1,shadowRadius:3},
  sectionTabTxt:{fontSize:14,fontWeight:'600',color:'#888'},
  sectionTabTxtActive:{color:COLORS.navy,fontWeight:'700'},
  filterScroll:{maxHeight:320},
  denomGrid:{flexDirection:'row',flexWrap:'wrap',gap:8,paddingBottom:16},
  denomBtn:{borderWidth:1.5,borderColor:COLORS.border,borderRadius:100,paddingHorizontal:14,paddingVertical:7},
  denomBtnActive:{backgroundColor:COLORS.navy,borderColor:COLORS.navy},
  denomTxt:{fontSize:13,fontWeight:'600',color:'#555'},
  denomTxtActive:{color:COLORS.white},
  stateRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:13,borderBottomWidth:1,borderBottomColor:'#f5f3ef'},
  stateRowActive:{backgroundColor:'rgba(201,169,110,0.08)'},
  stateTxt:{fontSize:15,color:'#444'},
  stateTxtActive:{color:COLORS.navy,fontWeight:'700'},
  applyBtn:{backgroundColor:COLORS.navy,borderRadius:100,paddingVertical:16,alignItems:'center',marginTop:16},
  applyTxt:{color:COLORS.white,fontSize:15,fontWeight:'700'},
});
