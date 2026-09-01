import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Modal, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeaderIcons } from '../../src/components/Header';
import { CHURCHES } from '../../src/lib/constants';
import { getCachedPhotoRef, setCachedPhotoRef, getCachedNearby, setCachedNearby, nearbyKey } from '../../src/lib/placesCache';
import { useThemeColors, ThemeColors } from '../../src/lib/theme';
import { TAB_BAR_CLEARANCE } from '../../src/lib/tabBar';
import { useSavedChurches, toggleSavedChurch } from '../../src/lib/store';
import { DENOMINATIONS, US_STATES, CA_PROVINCES, COUNTRY_NAME, regionLabel, Region } from '../../src/lib/filters';
import { gradientFor } from '../../src/lib/constants';
import { nearbyChurches as dbNearby, churchesInRegion, hasDatabase, formatDistance } from '../../src/lib/churchesApi';
import { useSettings } from '../../src/lib/settingsStore';
import { useTranslation } from '../../src/lib/i18n';

import { KeyboardScreen, KEYBOARD_SCROLL_PROPS } from '../../src/components/KeyboardScreen';
const KEY = 'AIzaSyAHZO8wyxyCmx0k8u059QSX7QpsEvZ82sU';

async function getPhotoRef(placeId: string): Promise<string> {
  // Churches from our own database carry no Places id. Without this the
  // request still goes out as `place_id=`, which Google bills for and answers
  // with nothing — ten wasted calls per search, precisely on the path meant to
  // stop paying Google.
  if (!placeId) return '';
  // A place's photo does not change between app launches. Asking Google again
  // costs the same as asking the first time, so ask once.
  const cached = getCachedPhotoRef(placeId);
  if (cached !== undefined) return cached;
  try {
    const res = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&key=${KEY}`);
    const data = await res.json();
    const ref = data?.result?.photos?.[0]?.photo_reference || '';
    setCachedPhotoRef(placeId, ref);
    return ref;
  } catch {
    // A failure is not cached: the next launch should be free to retry.
    return '';
  }
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
      hours: '', website: '', placeId: p.place_id, gradient: gradientFor(p.name || ''), state: '',
    }));
  } catch { return []; }
}

/**
 * Returns the churches within 50km, [] if Google genuinely found none, or null
 * if the lookup itself failed.
 *
 * That third case used to also return [], which the screen then rendered as
 * "0 found" - so a blocked network, a rejected API key or billing being off
 * looked exactly like an empty neighbourhood. Callers need to tell those apart
 * to fall back to the full list instead of showing a blank screen.
 */
async function searchNearby(lat: number, lng: number): Promise<any[] | null> {
  try {
    const res = await fetch(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=50000&type=church&key=${KEY}`);
    const data = await res.json();
    // Places reports its own failures in the body with a 200, so the HTTP
    // status alone does not tell us whether this worked.
    if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') return null;
    return (data.results || []).slice(0, 20).map((p: any, i: number) => ({
      id: `n${i}_${p.place_id}`, name: p.name, address: p.vicinity || '',
      phone: '', type: 'Church', rating: p.rating || 0, count: p.user_ratings_total || 0,
      hours: '', website: '', placeId: p.place_id, gradient: gradientFor(p.name || ''), state: '',
    }));
  } catch { return null; }
}

// Searched by full name and country, not by code. "church ON" returns very
// little; "church in Ontario, Canada" returns Ontario churches. The bare code
// only ever half-worked for the US because Google could guess from the key's
// own region.
async function searchByRegion(region: Region) {
  try {
    const q = `church in ${region.name}, ${COUNTRY_NAME[region.country]}`;
    const res = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(q)}&type=church&key=${KEY}`);
    const data = await res.json();
    return (data.results || []).slice(0, 20).map((p: any, i: number) => ({
      id: `st${i}_${p.place_id}`, name: p.name, address: p.formatted_address || '',
      phone: '', type: 'Church', rating: p.rating || 0, count: p.user_ratings_total || 0,
      hours: '', website: '', placeId: p.place_id, gradient: gradientFor(p.name || ''), state: region.code,
    }));
  } catch { return []; }
}

export default function ChurchesScreen() {
  const c = useThemeColors();
  const s = makeStyles(c);
  const appSettings = useSettings();
  const { t, tx } = useTranslation();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('List');
  const [filterVisible, setFilterVisible] = useState(false);
  const [filterSection, setFilterSection] = useState<'denom'|'region'>('denom');
  const [activeDenom, setActiveDenom] = useState('All');
  const [activeRegion, setActiveRegion] = useState<Region | null>(null);
  const [photoRefs, setPhotoRefs] = useState<Record<string,string>>({});
  const [searchResults, setSearchResults] = useState<any[]|null>(null);
  const [searching, setSearching] = useState(false);
  const [locationLabel, setLocationLabel] = useState('Near you');
  const [nearbyChurches, setNearbyChurches] = useState<any[]|null>(null);
  // Why we are not showing a nearby list, when we are not. Drives the note
  // above the fallback list so an empty result is never unexplained.
  const [nearbyNote, setNearbyNote] = useState<'off'|'denied'|'failed'|'none'|null>(null);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const { saved } = useSavedChurches();
  const timer = useRef<any>(null);

  const hasActiveFilter = activeDenom !== 'All' || !!activeRegion;
  const activeFilterCount = (activeDenom !== 'All' ? 1 : 0) + (activeRegion ? 1 : 0);

  // Photos for the built-in list. This used to fetch ten Place Details on
  // every single mount - including the usual case, where nearby results
  // replace this list before the user ever sees it. Now it serves whatever the
  // cache already holds and asks Google for nothing; the fallback list gets its
  // photos filled in only once a card is actually shown without one.
  useEffect(() => {
    const refs: Record<string,string> = {};
    for (const c of CHURCHES.slice(0, 10)) {
      const ref = getCachedPhotoRef(c.placeId);
      if (ref) refs[c.id] = ref;
    }
    if (Object.keys(refs).length) setPhotoRefs(p => ({ ...p, ...refs }));
  }, []);

  useEffect(() => {
    async function getLocation() {
      if (!appSettings.location.locationEnabled || !appSettings.location.nearbyChurches) {
        setNearbyChurches(null); setNearbyNote('off'); setLoadingNearby(false); return;
      }
      setLoadingNearby(true);
      setNearbyNote(null);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') { setNearbyChurches(null); setNearbyNote('denied'); setLoadingNearby(false); return; }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const { latitude, longitude } = loc.coords;
        const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geo[0]) {
          const city = geo[0].city || geo[0].subregion || '';
          const state = geo[0].region || '';
          setLocationLabel(`Near ${city}, ${state}`);
        }
        // Which churches sit within 50km of a street corner does not change
        // between sessions. Reuse the answer rather than buying it again.
        // Our own database first. It is one request against a spatial index,
        // costs nothing per search, and needs no cache — the cache below
        // exists only because the Google path is billed per call.
        let nearby: any[] | null = null;
        if (hasDatabase()) {
          nearby = await dbNearby(latitude, longitude, { radiusKm: 50 });
        }

        // Google stays as the fallback while the directory is still filling
        // out: no credentials configured, the request failed, or this corner
        // of the map has no imported churches yet.
        if (!nearby || nearby.length === 0) {
          const key = nearbyKey(latitude, longitude);
          const cached = getCachedNearby(key) ?? null;
          const fromGoogle = cached ?? await searchNearby(latitude, longitude);
          if (!cached && fromGoogle && fromGoogle.length) setCachedNearby(key, fromGoogle);
          if (fromGoogle && fromGoogle.length) nearby = fromGoogle;
          else if (nearby === null) nearby = fromGoogle;
        }
        if (nearby === null) {
          // Lookup failed. Fall back to the full list rather than an empty
          // screen, and say why.
          setNearbyChurches(null); setNearbyNote('failed'); setLoadingNearby(false); return;
        }
        if (nearby.length === 0) {
          setNearbyChurches(null); setNearbyNote('none'); setLoadingNearby(false); return;
        }
        setNearbyChurches(nearby);
        const refs: Record<string,string> = {};
        for (const c of nearby.slice(0,10)) {
          const ref = await getPhotoRef(c.placeId);
          if (ref) refs[c.id] = ref;
        }
        setPhotoRefs(p => ({ ...p, ...refs }));
      } catch {
        // Location itself failed (services off, timeout). Same treatment.
        setNearbyChurches(null);
        setNearbyNote(n => n ?? 'failed');
      }
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
    if (activeRegion) {
      setSearching(true);
      let results: any[] | null = null;
      if (hasDatabase()) {
        results = await churchesInRegion(activeRegion.code, activeRegion.country);
      }
      // searchByRegion returns [] rather than null, so this is always an array
      // by here — but the compiler cannot see that through the branch above.
      if (!results || results.length === 0) results = await searchByRegion(activeRegion);
      const list = results ?? [];
      setSearchResults(list);
      const refs: Record<string,string> = {};
      // Photo lookups only apply to Google results; database rows carry an
      // empty placeId and getPhotoRef declines them rather than calling out.
      for (const c of list.slice(0,8)) {
        const ref = await getPhotoRef(c.placeId);
        if (ref) refs[c.id] = ref;
      }
      setPhotoRefs(p => ({ ...p, ...refs }));
      setSearching(false);
    }
  }

  function resetFilters() {
    setActiveDenom('All');
    setActiveRegion(null);
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
    displayed = saved.map(id => pool.get(id)).filter(Boolean);
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
          {church.photo ? (
            // A church that claimed its listing and uploaded a photo.
            <Image source={{ uri: church.photo }} style={s.bannerImg} resizeMode="cover" />
          ) : photoRefs[church.id] ? (
            <Image source={{ uri: photoUrl(photoRefs[church.id]) }} style={s.bannerImg} resizeMode="cover" />
          ) : (
            <LinearGradient colors={church.gradient || ['#667eea','#764ba2']} style={StyleSheet.absoluteFill} start={{x:0,y:0}} end={{x:1,y:1}}>
              {/* Spin only while a photo could still arrive. A church from our
                  own database carries no Places id, so nothing is ever coming
                  and the spinner would turn forever — which reads as a card
                  that failed to load rather than one that has no picture. */}
              {!!church.placeId && (
                <View style={s.loadingWrap}><ActivityIndicator color="rgba(255,255,255,0.6)" size="small" /></View>
              )}
            </LinearGradient>
          )}
          <View style={s.nearbyBadge}>
            <Text style={s.nearbyTxt}>{church.state || t('nearbyBadge')}</Text>
          </View>
          {church.rating > 0 ? (
            <View style={s.ratingBadge}>
              <Text style={s.ratingTxt}>★ {church.rating} ({church.count})</Text>
            </View>
          ) : !!church.type && church.type !== 'Church' ? (
            <View style={s.denomBadge}>
              <Text style={s.denomBadgeTxt}>{church.type}</Text>
            </View>
          ) : null}

          {/* Commons licences require attribution wherever the image appears,
              so the credit travels with the photo rather than living in an
              about screen nobody opens. Absent on a church's own upload. */}
          {!!church.photo && !!church.photoCredit && (
            <View style={s.creditBadge}>
              <Text style={s.creditTxt}>{church.photoCredit}</Text>
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
              color={saved.includes(church.id) ? c.red : '#fff'}
            />
          </TouchableOpacity>
        </View>
        <View style={s.cardBody}>
          <Text style={s.churchName}>{church.name}</Text>
          <View style={s.addrRow}>
            <Ionicons name="location-outline" size={13} color={c.textMuted} />
            <Text style={s.addrTxt} numberOfLines={1}>{church.address}</Text>
            {typeof church.distanceKm === 'number' && (
              <Text style={s.distTxt}>{formatDistance(church.distanceKm)}</Text>
            )}
          </View>
          <View style={s.cardFooter}>
            <Text style={s.websiteTxt} numberOfLines={1}>{church.website || ''}</Text>
            <View style={s.detailsRow}>
              <Text style={s.detailsBtn}>{t('details')}</Text>
              <Ionicons name="chevron-forward" size={13} color={c.gold} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
    <KeyboardScreen>
      <View style={s.searchSection}>
        {/* The bell and gear ride on the location line rather than a bar of
            their own, so removing the wordmark costs the screen no height. */}
        <View style={s.locationRow}>
          <Ionicons name="location-outline" size={19} color={c.gold} />
          <Text style={s.locationTxt} numberOfLines={1}>{locationLabel}</Text>
          {loadingNearby && <ActivityIndicator size="small" color={c.gold} style={{ marginLeft: 8 }} />}
          <HeaderIcons />
        </View>
        <View style={s.searchRow}>
          <View style={s.searchBar}>
            <Ionicons name="search-outline" size={18} color={c.gold} />
            <TextInput
              style={s.searchInput}
              placeholder={tx('Search city, state or province, denomination...')}
              placeholderTextColor={c.placeholder}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {searching && <ActivityIndicator size="small" color={c.gold} />}
            {search.length > 0 && !searching && (
              <TouchableOpacity onPress={() => { setSearch(''); setSearchResults(null); }}>
                <Ionicons name="close-circle" size={18} color={c.placeholder} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={[s.filterBtn, hasActiveFilter && s.filterBtnActive]} onPress={() => setFilterVisible(true)}>
            <Ionicons name="options-outline" size={14} color={hasActiveFilter ? c.onPrimary : c.textSecondary} />
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

      <ScrollView
            {...KEYBOARD_SCROLL_PROPS} style={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.sectionHdr}>
          <View style={s.greenPin}><Ionicons name="location" size={14} color={c.green} /></View>
          <Text style={s.sectionTitle}>
            {activeTab === 'Saved' ? t('savedChurches') : searchResults !== null ? `${t('resultsFor')} "${search || activeRegion?.name || ''}"` : nearbyChurches !== null ? t('nearbyChurches') : t('allChurches')}
          </Text>
          <Text style={s.sectionSub}>{displayed.length} found</Text>
        </View>

        {/* When there is no nearby list, say why rather than quietly showing the
            full directory as though it were local results. */}
        {activeTab !== 'Saved' && searchResults === null && nearbyChurches === null && !loadingNearby && !!nearbyNote && (
          <View style={s.nearbyNote}>
            <Ionicons
              name={nearbyNote === 'none' ? 'information-circle-outline' : 'location-outline'}
              size={15}
              color={c.textMuted}
            />
            <Text style={s.nearbyNoteTxt}>
              {nearbyNote === 'off'
                ? tx('Nearby churches are turned off. Turn on location in Settings to see churches around you.')
                : nearbyNote === 'denied'
                ? tx('FaithFinder needs location access to find churches near you. You can allow it in your phone settings.')
                : nearbyNote === 'none'
                ? tx('No churches found within 30 miles. Showing all churches instead.')
                : tx("Couldn't load churches near you. Showing all churches instead.")}
            </Text>
          </View>
        )}

        {hasActiveFilter && !!activeRegion && (
          <View style={s.activeFilterBar}>
            <Ionicons name="filter" size={14} color={c.gold} />
            <Text style={s.activeFilterTxt}>
              {activeRegion.name}
              {activeDenom !== 'All' ? ' · ' + activeDenom : ''}
            </Text>
            <TouchableOpacity onPress={resetFilters}>
              <Ionicons name="close-circle" size={16} color={c.gold} />
            </TouchableOpacity>
          </View>
        )}

        {displayed.length === 0 && !searching && !loadingNearby && (
          <View style={s.emptyState}>
            <Ionicons name={activeTab === 'Saved' ? 'heart-outline' : 'search-outline'} size={48} color={c.placeholder} />
            <Text style={s.emptyTxt}>{activeTab === 'Saved' ? 'No saved churches yet' : 'No churches found'}</Text>
            <Text style={s.emptySub}>{activeTab === 'Saved' ? 'Tap the heart on a church to save it' : 'Try a different search'}</Text>
          </View>
        )}

        {displayed.map(church => <ChurchCard key={church.id} church={church} />)}
        <View style={{height:TAB_BAR_CLEARANCE}} />
      </ScrollView>

      {/* Filter Modal */}
      <Modal visible={filterVisible} transparent animationType="slide">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setFilterVisible(false)} />
        <View style={s.sheet}>
          <View style={s.handle} />
          <View style={s.sheetHdr}>
            <Text style={s.sheetTitle}>{t('filterChurches')}</Text>
            <TouchableOpacity onPress={resetFilters}>
              <Text style={s.resetTxt}>{t('resetAll')}</Text>
            </TouchableOpacity>
          </View>

          {/* Section tabs */}
          <View style={s.sectionTabs}>
            <TouchableOpacity style={[s.sectionTab, filterSection==='denom' && s.sectionTabActive]} onPress={() => setFilterSection('denom')}>
              <Text style={[s.sectionTabTxt, filterSection==='denom' && s.sectionTabTxtActive]}>
                Denomination{activeDenom !== 'All' ? ' ✓' : ''}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.sectionTab, filterSection==='region' && s.sectionTabActive]} onPress={() => setFilterSection('region')}>
              <Text style={[s.sectionTabTxt, filterSection==='region' && s.sectionTabTxtActive]}>
                State / Province{activeRegion ? ' ✓' : ''}
              </Text>
            </TouchableOpacity>
          </View>

          {filterSection === 'denom' ? (
            <ScrollView
            {...KEYBOARD_SCROLL_PROPS} style={s.filterScroll} showsVerticalScrollIndicator={false}>
              <View style={s.denomGrid}>
                {DENOMINATIONS.map(d => (
                  <TouchableOpacity key={d} style={[s.denomBtn, activeDenom===d && s.denomBtnActive]} onPress={() => setActiveDenom(d)}>
                    <Text style={[s.denomTxt, activeDenom===d && s.denomTxtActive]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          ) : (
            <ScrollView
            {...KEYBOARD_SCROLL_PROPS} style={s.filterScroll} showsVerticalScrollIndicator={false}>
              <TouchableOpacity style={[s.stateRow, !activeRegion && s.stateRowActive]} onPress={() => setActiveRegion(null)}>
                <Text style={[s.stateTxt, !activeRegion && s.stateTxtActive]}>All Regions</Text>
                {!activeRegion && <Ionicons name="checkmark" size={18} color={c.gold} />}
              </TouchableOpacity>
              {/* Grouped by country and left in each country's own order rather
                  than merged alphabetically, where "AB - Alberta" would land
                  above Alabama and read as a typo. */}
              {([['United States', US_STATES], ['Canada', CA_PROVINCES]] as const).map(([country, list]) => (
                <View key={country}>
                  <Text style={s.regionHeader}>{country}</Text>
                  {list.map(r => (
                    <TouchableOpacity
                      key={r.country + r.code}
                      style={[s.stateRow, activeRegion?.code===r.code && activeRegion?.country===r.country && s.stateRowActive]}
                      onPress={() => setActiveRegion(r)}
                    >
                      <Text style={[s.stateTxt, activeRegion?.code===r.code && activeRegion?.country===r.country && s.stateTxtActive]}>
                        {regionLabel(r)}
                      </Text>
                      {activeRegion?.code===r.code && activeRegion?.country===r.country && (
                        <Ionicons name="checkmark" size={18} color={c.gold} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </ScrollView>
          )}

          <TouchableOpacity style={s.applyBtn} onPress={applyFilters}>
            <Text style={s.applyTxt}>{t('applyFilters')}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </KeyboardScreen>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root:{flex:1,backgroundColor:c.bg},
  searchSection:{backgroundColor:c.card,paddingHorizontal:16,paddingTop:6},
  locationRow:{flexDirection:'row',alignItems:'center',gap:5,marginBottom:10,minHeight:38},
  locationTxt:{flex:1,fontSize:15,color:c.textSecondary,fontWeight:'600'},
  searchRow:{flexDirection:'row',gap:8,alignItems:'center',marginBottom:12},
  searchBar:{flex:1,flexDirection:'row',alignItems:'center',gap:8,backgroundColor:c.card,borderRadius:100,paddingHorizontal:14,paddingVertical:12,borderWidth:1.5,borderColor:c.border},
  searchInput:{flex:1,fontSize:13,color:c.text},
  filterBtn:{flexDirection:'row',alignItems:'center',gap:5,backgroundColor:c.cardAlt,borderWidth:1.5,borderColor:c.border,borderRadius:100,paddingHorizontal:14,paddingVertical:12},
  filterBtnActive:{backgroundColor:c.primary,borderColor:c.primary},
  filterTxt:{fontSize:12,fontWeight:'600',color:c.textSecondary},
  filterTxtActive:{color:c.onPrimary},
  toggleRow:{paddingHorizontal:16,paddingBottom:12,backgroundColor:c.card,borderBottomWidth:1,borderBottomColor:c.border},
  toggle:{flexDirection:'row',backgroundColor:c.cardAlt,borderRadius:100,padding:3,alignSelf:'center'},
  toggleBtn:{paddingHorizontal:32,paddingVertical:8,borderRadius:100},
  toggleBtnActive:{backgroundColor:c.card,shadowColor:'#000',shadowOffset:{width:0,height:1},shadowOpacity:0.1,shadowRadius:3},
  toggleTxt:{fontSize:13,fontWeight:'600',color:c.textMuted},
  toggleTxtActive:{color:c.text,fontWeight:'700'},
  scroll:{flex:1,backgroundColor:c.bg},
  sectionHdr:{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:16,paddingVertical:14},
  greenPin:{width:28,height:28,backgroundColor:c.lightGreen,borderRadius:14,alignItems:'center',justifyContent:'center'},
  sectionTitle:{fontSize:15,fontWeight:'700',color:c.text,flex:1},
  sectionSub:{fontSize:13,color:c.textMuted},
  nearbyNote:{flexDirection:'row',alignItems:'flex-start',gap:8,marginHorizontal:16,marginBottom:12,paddingHorizontal:12,paddingVertical:10,borderRadius:12,backgroundColor:c.cardAlt,borderWidth:1,borderColor:c.border},
  nearbyNoteTxt:{flex:1,fontSize:12,lineHeight:17,color:c.textMuted},
  activeFilterBar:{flexDirection:'row',alignItems:'center',gap:8,marginHorizontal:16,marginBottom:8,backgroundColor:'rgba(201,169,110,0.12)',borderRadius:10,paddingHorizontal:12,paddingVertical:8},
  activeFilterTxt:{flex:1,fontSize:13,color:c.gold,fontWeight:'600'},
  emptyState:{alignItems:'center',paddingVertical:60,gap:10},
  emptyTxt:{fontSize:16,fontWeight:'700',color:c.textMuted},
  emptySub:{fontSize:13,color:c.placeholder,textAlign:'center',paddingHorizontal:40},
  card:{backgroundColor:c.card,marginHorizontal:16,marginBottom:16,borderRadius:16,overflow:'hidden',borderWidth:1,borderColor:c.border,shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.06,shadowRadius:8,elevation:2},
  banner:{height:200,position:'relative'},
  bannerImg:{width:'100%',height:'100%'},
  loadingWrap:{flex:1,alignItems:'center',justifyContent:'center'},
  nearbyBadge:{position:'absolute',top:12,right:12,backgroundColor:c.green,borderRadius:6,paddingHorizontal:10,paddingVertical:4},
  nearbyTxt:{color:'#fff',fontSize:11,fontWeight:'700',letterSpacing:0.5},
  ratingBadge:{position:'absolute',bottom:10,left:12,backgroundColor:'rgba(0,0,0,0.55)',borderRadius:8,paddingHorizontal:10,paddingVertical:5},
  ratingTxt:{color:'#fff',fontSize:13,fontWeight:'700'},
  denomBadge:{position:'absolute',bottom:10,left:12,backgroundColor:'rgba(0,0,0,0.55)',borderRadius:8,paddingHorizontal:10,paddingVertical:5},
  denomBadgeTxt:{color:'#fff',fontSize:12,fontWeight:'700',letterSpacing:0.2},
  creditBadge:{position:'absolute',bottom:10,right:12,backgroundColor:'rgba(0,0,0,0.45)',borderRadius:6,paddingHorizontal:7,paddingVertical:3},
  creditTxt:{color:'rgba(255,255,255,0.85)',fontSize:9,fontWeight:'600'},
  distTxt:{fontSize:12,fontWeight:'700',color:c.gold},
  savedIndicator:{position:'absolute',top:12,left:12,width:30,height:30,borderRadius:15,backgroundColor:'rgba(0,0,0,0.3)',alignItems:'center',justifyContent:'center'},
  cardBody:{padding:16},
  churchName:{fontSize:18,fontWeight:'700',color:c.text,marginBottom:8},
  addrRow:{flexDirection:'row',alignItems:'center',gap:6,marginBottom:10},
  addrTxt:{fontSize:13,color:c.textSecondary,flex:1},
  cardFooter:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingTop:10,borderTopWidth:1,borderTopColor:c.border},
  websiteTxt:{fontSize:12,color:c.textMuted,flex:1},
  detailsRow:{flexDirection:'row',alignItems:'center',gap:2},
  detailsBtn:{fontSize:13,fontWeight:'700',color:c.gold},
  overlay:{flex:1,backgroundColor:c.overlay},
  sheet:{backgroundColor:c.card,borderTopLeftRadius:24,borderTopRightRadius:24,padding:24,paddingBottom:40,maxHeight:'85%'},
  handle:{width:40,height:4,backgroundColor:c.border,borderRadius:2,alignSelf:'center',marginBottom:16},
  sheetHdr:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:16},
  sheetTitle:{fontSize:20,fontWeight:'700',color:c.text},
  resetTxt:{fontSize:14,color:c.gold,fontWeight:'600'},
  sectionTabs:{flexDirection:'row',backgroundColor:c.cardAlt,borderRadius:100,padding:3,marginBottom:16},
  sectionTab:{flex:1,paddingVertical:9,borderRadius:100,alignItems:'center'},
  sectionTabActive:{backgroundColor:c.card,shadowColor:'#000',shadowOffset:{width:0,height:1},shadowOpacity:0.1,shadowRadius:3},
  sectionTabTxt:{fontSize:14,fontWeight:'600',color:c.textMuted},
  sectionTabTxtActive:{color:c.text,fontWeight:'700'},
  filterScroll:{maxHeight:320},
  denomGrid:{flexDirection:'row',flexWrap:'wrap',gap:8,paddingBottom:16},
  denomBtn:{borderWidth:1.5,borderColor:c.border,borderRadius:100,paddingHorizontal:14,paddingVertical:7},
  denomBtnActive:{backgroundColor:c.primary,borderColor:c.primary},
  denomTxt:{fontSize:13,fontWeight:'600',color:c.textSecondary},
  denomTxtActive:{color:c.onPrimary},
  stateRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:13,borderBottomWidth:1,borderBottomColor:c.rowBorder},
  stateRowActive:{backgroundColor:'rgba(201,169,110,0.10)'},
  regionHeader:{fontSize:11,fontWeight:'700',letterSpacing:0.8,textTransform:'uppercase',color:c.textMuted,paddingTop:16,paddingBottom:7},
  stateTxt:{fontSize:15,color:c.textSecondary},
  stateTxtActive:{color:c.text,fontWeight:'700'},
  applyBtn:{backgroundColor:c.primary,borderRadius:100,paddingVertical:16,alignItems:'center',marginTop:16},
  applyTxt:{color:c.onPrimary,fontSize:15,fontWeight:'700'},
});
