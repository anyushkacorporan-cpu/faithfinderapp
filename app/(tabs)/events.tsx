import { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Modal, Share, KeyboardAvoidingView, Platform, ImageBackground } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../src/components/Header';
import { EVENTS } from '../../src/lib/constants';
import { useThemeColors, ThemeColors } from '../../src/lib/theme';
import { getUser } from '../../src/lib/userStore';
import * as Location from 'expo-location';
import { useEvents } from '../../src/lib/eventsStore';
import { useEventActions, toggleSaveEvent, addAttending, removeAttending } from '../../src/lib/eventActionsStore';
import { useSettings } from '../../src/lib/settingsStore';
import { useTranslation } from '../../src/lib/i18n';

const TABS = ['List', 'Attending', 'Saved'];
const GRADIENTS: Record<string,[string,string]> = {
  Conference:['#1a1a2e','#2d2240'],
  Festival:['#2d2240','#1a1a2e'],
  Workshop:['#1a1a2e','#16213e'],
  Revival:['#0f3460','#1a1a2e'],
  Service:['#2d2240','#0f3460'],
  Concert:['#c9a96e','#1a1a2e'],
  Retreat:['#667eea','#764ba2'],
  Other:['#1a1a2e','#2d2240'],
};

const FILTER_OPTIONS = [
  { id:'today', label:'Today', group:'Date' },
  { id:'week', label:'This Week', group:'Date' },
  { id:'month', label:'This Month', group:'Date' },
  { id:'free', label:'Free Events', group:'Price' },
  { id:'paid', label:'Paid Events', group:'Price' },
  { id:'in-person', label:'In-Person', group:'Format' },
  { id:'online', label:'Online', group:'Format' },
  { id:'hybrid', label:'Hybrid', group:'Format' },
  { id:'Conference', label:'Conference', group:'Category' },
  { id:'Festival', label:'Festival', group:'Category' },
  { id:'Workshop', label:'Workshop', group:'Category' },
  { id:'Revival', label:'Revival', group:'Category' },
  { id:'Service', label:'Service', group:'Category' },
  { id:'Concert', label:'Concert', group:'Category' },
  { id:'Retreat', label:'Retreat', group:'Category' },
];

const STATE_LIST = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
];

export default function EventsScreen() {
  const c = useThemeColors();
  const s = makeStyles(c);
  const appSettings = useSettings();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('List');
  const [search, setSearch] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const userEvents = useEvents();
  const { saved, attending } = useEventActions();
  const [filterState, setFilterState] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [showStateFilter, setShowStateFilter] = useState(false);
  const user = getUser();
  const [locationLabel, setLocationLabel] = useState(user.location || 'Near you');

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({});
        const geo = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        if (geo[0]) {
          const city = geo[0].city || geo[0].subregion || '';
          const state = geo[0].region || '';
          if (city) setLocationLabel(`Near ${city}, ${state}`);
        }
      } catch {}
    })();
  }, []);
  const [shareEvent, setShareEvent] = useState<any>(null);
  const [shareMessage, setShareMessage] = useState('');
  const [sharedToast, setSharedToast] = useState(false);

  const allEvents = useMemo(() =>
    userEvents.filter(e => e.status !== 'draft')
  , [userEvents]);

  // Nearby events - match user's city/state from locationLabel
  const nearbyEvents = useMemo(() => {
    if (!appSettings.location.locationEnabled || !appSettings.location.nearbyEvents) return [];
    if (activeTab === 'Attending') return [];
    if (activeTab === 'Saved') return [];
    const loc = locationLabel.replace('Near ', '').toLowerCase();
    const parts = loc.split(',').map((s: string) => s.trim());
    const city = parts[0] || '';
    const state = parts[1] || '';
    if (!city || city === 'near you' || city === 'set your location') return [];
    return allEvents.filter((e: any) =>
      e.city?.toLowerCase().includes(city) ||
      e.location?.toLowerCase().includes(city) ||
      (state && (e.state?.toLowerCase().includes(state) || e.location?.toLowerCase().includes(state)))
    ).slice(0, 5);
  }, [allEvents, locationLabel, activeTab, appSettings.location.nearbyEvents, appSettings.location.locationEnabled]);

  const filtered = useMemo(() => {
    let result = allEvents;

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((e: any) =>
        e.title?.toLowerCase().includes(q) ||
        e.location?.toLowerCase().includes(q) ||
        e.city?.toLowerCase().includes(q) ||
        e.state?.toLowerCase().includes(q) ||
        e.type?.toLowerCase().includes(q) ||
        e.organizer?.toLowerCase().includes(q) ||
        e.venue?.toLowerCase().includes(q) ||
        e.church?.toLowerCase().includes(q)
      );
    }
    // State/City filter
    if (filterState) {
      result = result.filter((e: any) =>
        e.state?.toLowerCase() === filterState.toLowerCase() ||
        e.location?.toLowerCase().includes(filterState.toLowerCase())
      );
    }
    if (filterCity) {
      result = result.filter((e: any) =>
        e.city?.toLowerCase().includes(filterCity.toLowerCase()) ||
        e.location?.toLowerCase().includes(filterCity.toLowerCase())
      );
    }

    // Filters
    if (activeFilters.length > 0) {
      result = result.filter((e: any) => {
        return activeFilters.every(f => {
          if (f === 'free') return e.price === 'Free';
          if (f === 'paid') return e.price !== 'Free';
          if (f === 'in-person') return !e.venueType || e.venueType === 'in-person';
          if (f === 'online') return e.venueType === 'online';
          if (f === 'hybrid') return e.venueType === 'hybrid';
          // Category filters
          if (['Conference','Festival','Workshop','Revival','Service','Concert','Retreat'].includes(f)) return e.type === f;
          return true;
        });
      });
    }

    // Tab filter
    if (activeTab === 'Saved') result = result.filter((e: any) => saved.includes(e.id));
    if (activeTab === 'Attending') result = result.filter((e: any) => attending.includes(e.id));

    return result;
  }, [allEvents, search, activeFilters, activeTab, saved, attending]);

  function toggleFilter(id: string) {
    setActiveFilters(p => p.includes(id) ? p.filter(f => f !== id) : [...p, id]);
  }

  const filterGroups = ['Date','Price','Format','Category'];

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <Header />

      {/* Location */}
      <View style={s.locationRow}>
        <Ionicons name="location-outline" size={16} color={c.gold} />
        <Text style={s.locationTxt}>{locationLabel}</Text>
      </View>

      {/* Search + Filter */}
      <View style={s.searchRow}>
        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={17} color={c.gold} />
          <TextInput
            style={s.searchInput}
            placeholder="Search by name, city, state, venue..."
            placeholderTextColor={c.placeholder}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={17} color={c.placeholder} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[s.filterBtn, activeFilters.length > 0 && s.filterBtnActive]}
          onPress={() => setShowFilter(true)}
        >
          <Ionicons name="options-outline" size={15} color={activeFilters.length > 0 ? c.onPrimary : c.textSecondary} />
          <Text style={[s.filterBtnTxt, activeFilters.length > 0 && {color: c.onPrimary}]}>
            Filter{activeFilters.length > 0 ? ` (${activeFilters.length})` : ''}
          </Text>
        </TouchableOpacity>

      </View>

      {/* Active filter pills */}
      {activeFilters.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.activePillsRow} contentContainerStyle={s.activePillsContent}>
          {activeFilters.map(f => (
            <TouchableOpacity key={f} style={s.activePill} onPress={() => toggleFilter(f)}>
              <Text style={s.activePillTxt}>{FILTER_OPTIONS.find(o => o.id === f)?.label || f}</Text>
              <Ionicons name="close" size={12} color={c.text} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={s.clearAllPill} onPress={() => setActiveFilters([])}>
            <Text style={s.clearAllTxt}>Clear all</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Tabs */}
      <View style={s.toggleRow}>
        <View style={s.toggle}>
          {TABS.map(tab => (
            <TouchableOpacity key={tab} style={[s.toggleBtn, activeTab===tab && s.toggleBtnActive]} onPress={() => setActiveTab(tab)}>
              <Text style={[s.toggleTxt, activeTab===tab && s.toggleTxtActive]}>
                {tab==='List'?t('list'):tab==='Attending'?t('attending'):t('saved')}{tab==='Attending'&&attending.length>0?` (${attending.length})`:''}{tab==='Saved'&&saved.length>0?` (${saved.length})`:''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Nearby Events */}
        {nearbyEvents.length > 0 && (
          <View>
            <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingTop:16,paddingBottom:8}}>
              <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
                <View style={{width:28,height:28,borderRadius:14,backgroundColor:c.lightGreen,alignItems:'center',justifyContent:'center'}}>
                  <Ionicons name="location" size={14} color={c.green} />
                </View>
                <Text style={{fontSize:15,fontWeight:'700',color:c.text}}>Nearby Events</Text>
              </View>
              <Text style={{fontSize:12,color:c.textMuted}}>{nearbyEvents.length} found</Text>
            </View>
            {nearbyEvents.map((event: any) => {
              const gradient = (event.bannerColor || GRADIENTS[event.type] || GRADIENTS['Other']) as [string,string];
              return (
                <TouchableOpacity key={'nb-'+event.id} style={s.card} activeOpacity={0.92} onPress={() => router.push({pathname:'/event-detail',params:{id:event.id,title:event.title,date:event.date,location:event.location,type:event.type,price:event.price,organizer:event.organizer||'',description:event.description||event.summary||''}})}>
                  {event.bannerImage ? (
                    <ImageBackground source={{uri: event.bannerImage}} style={s.cardBanner} resizeMode="cover">
                    <View style={{position:'absolute',top:12,right:12,backgroundColor:c.green,borderRadius:6,paddingHorizontal:10,paddingVertical:4}}>
                      <Text style={{color:'#fff',fontSize:11,fontWeight:'700',letterSpacing:0.5}}>NEARBY</Text>
                    </View>
                    </ImageBackground>
                  ) : (
                    <LinearGradient colors={gradient} style={s.cardBanner} start={{x:0,y:0}} end={{x:1,y:1}}>
                    <View style={{position:'absolute',top:12,right:12,backgroundColor:c.green,borderRadius:6,paddingHorizontal:10,paddingVertical:4}}>
                      <Text style={{color:'#fff',fontSize:11,fontWeight:'700',letterSpacing:0.5}}>NEARBY</Text>
                    </View>
                    </LinearGradient>
                  )}
                  <View style={s.cardBody}>
                    <View style={{flexDirection:'row',gap:8,marginBottom:8}}>
                      <View style={s.badgeType}><Text style={s.badgeTypeTxt}>{event.type}</Text></View>
                      {event.price==='Free'
                        ? <View style={s.badgeFree}><Text style={s.badgeFreeTxt}>{t('free')}</Text></View>
                        : <View style={s.badgePaid}><Text style={s.badgePaidTxt}>{event.price}</Text></View>
                      }
                    </View>
                    <Text style={s.eventTitle}>{event.title}</Text>
                    {!!event.organizer&&<Text style={s.eventOrganizer}>by {event.organizer}</Text>}
                    <View style={s.eventMeta}>
                      <View style={s.eventMetaItem}>
                        <Ionicons name="calendar-outline" size={13} color={c.textMuted}/>
                        <Text style={s.eventMetaTxt}>{event.date}</Text>
                      </View>
                      {!!(event.city||event.location)&&(
                        <View style={s.eventMetaItem}>
                          <Ionicons name="location-outline" size={13} color={c.textMuted}/>
                          <Text style={s.eventMetaTxt}>{event.city||event.location}{event.state?', '+event.state:''}</Text>
                        </View>
                      )}
                    </View>
                    <View style={s.cardDivider}/>
                    <View style={s.cardFooter}>
                      <TouchableOpacity style={s.saveBtn} onPress={() => toggleSaveEvent(event.id)}>
                        <Ionicons name={saved.includes(event.id)?'heart':'heart-outline'} size={18} color={saved.includes(event.id)?c.red:c.textMuted}/>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.ticketBtn} onPress={() => router.push({pathname:'/event-detail',params:{id:event.id,title:event.title,price:event.price,date:event.date,location:event.location||event.city||'',type:event.type||'',organizer:event.organizer||'',description:event.description||event.summary||''}})}>
                        <Text style={s.ticketBtnTxt}>{t('register')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* All Events Header */}
        <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingTop:20,paddingBottom:10,borderTopWidth:nearbyEvents.length>0?1:0,borderTopColor:c.border,marginTop:nearbyEvents.length>0?8:0}}>
          <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
            <View style={{width:24,height:24,borderRadius:8,backgroundColor:'rgba(201,169,110,0.18)',alignItems:'center',justifyContent:'center'}}>
              <Ionicons name="calendar" size={14} color={c.gold} />
            </View>
            <Text style={{fontSize:16,fontWeight:'700',color:c.text}}>All Events</Text>
          </View>
          <Text style={{fontSize:12,color:c.textMuted,fontWeight:'600'}}>{filtered.length} found</Text>
        </View>

        <Text style={{display:'none'}}>{filtered.length} event{filtered.length !== 1 ? 's' : ''} found</Text>

        {filtered.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="calendar-outline" size={44} color={c.placeholder} />
            <Text style={s.emptyTxt}>
              {activeTab === 'Saved' ? t('noSavedEvents') :
               activeTab === 'Attending' ? t('noEventsYet') :
               t('noEventsFound')}
            </Text>
            <Text style={s.emptySub}>
              {activeTab === 'Saved' ? t('tapHeartToSave') :
               activeTab === 'Attending' ? t('registerToSeeHere') :
               t('tryAdjustingSearch')}
            </Text>
          </View>
        )}

        {filtered.map((event: any) => {
          const gradient = (event.bannerColor || GRADIENTS[event.type] || GRADIENTS['Other']) as [string,string];
          const isSaved = saved.includes(event.id);
          const isAttending = attending.includes(event.id);

          return (
            <TouchableOpacity
              key={event.id}
              style={s.card}
              activeOpacity={0.92}
              onPress={() => router.push({
                pathname: '/event-detail',
                params: {
                  id: event.id,
                  title: event.title,
                  description: event.description || event.summary || '',
                  date: event.date,
                  location: event.location,
                  type: event.type,
                  price: event.price,
                }
              })}
            >
              {event.bannerImage ? (
                <ImageBackground source={{uri: event.bannerImage}} style={s.cardBanner} resizeMode="cover">
                {nearbyEvents.some((ne) => ne.id === event.id) && (
                <View style={{position:'absolute',top:12,right:12,backgroundColor:c.green,borderRadius:6,paddingHorizontal:10,paddingVertical:4}}>
                    <Text style={{color:'#fff',fontSize:11,fontWeight:'700',letterSpacing:0.5}}>NEARBY</Text>
                  </View>
                )}
                </ImageBackground>
              ) : (
                <LinearGradient colors={gradient} style={s.cardBanner} start={{x:0,y:0}} end={{x:1,y:1}}>
                {nearbyEvents.some((ne) => ne.id === event.id) && (
                <View style={{position:'absolute',top:12,right:12,backgroundColor:c.green,borderRadius:6,paddingHorizontal:10,paddingVertical:4}}>
                    <Text style={{color:'#fff',fontSize:11,fontWeight:'700',letterSpacing:0.5}}>NEARBY</Text>
                  </View>
                )}
                </LinearGradient>
              )}

              <View style={s.cardBody}>
                <View style={{flexDirection:'row',gap:8,marginBottom:8}}>
                      <View style={s.badgeType}><Text style={s.badgeTypeTxt}>{event.type}</Text></View>
                      {event.price==='Free'
                        ? <View style={s.badgeFree}><Text style={s.badgeFreeTxt}>{t('free')}</Text></View>
                        : <View style={s.badgePaid}><Text style={s.badgePaidTxt}>{event.price}</Text></View>
                      }
                    </View>
                    <Text style={s.eventTitle}>{event.title}</Text>
                {!!event.organizer && <Text style={s.eventOrganizer}>by {event.organizer}</Text>}
                <View style={s.eventMeta}>
                  <View style={s.metaRow}>
                    <Ionicons name="calendar-outline" size={13} color={c.textMuted} />
                    <Text style={s.metaTxt}>{event.date}</Text>
                  </View>
                  <View style={s.metaRow}>
                    <Ionicons name="location-outline" size={13} color={c.textMuted} />
                    <Text style={s.metaTxt} numberOfLines={1}>{event.location}</Text>
                  </View>
                </View>
                <View style={s.cardDivider} />
                <View style={s.cardFooter}>
                  <View style={s.footerLeft}>
                    <TouchableOpacity style={s.footerIconBtn} onPress={e => { e.stopPropagation(); toggleSaveEvent(event.id); }}>
                      <Ionicons name={isSaved ? 'heart' : 'heart-outline'} size={18} color={isSaved ? c.red : c.textMuted} />
                    </TouchableOpacity>

                  </View>
                  <TouchableOpacity style={s.ticketBtn} onPress={e => {
                    e.stopPropagation();
                    router.push({
                      pathname: '/event-detail',
                      params: { id:event.id, title:event.title, price:event.price, date:event.date, location:event.location||event.city||'', type:event.type||'', organizer:event.organizer||'', description:event.description||event.summary||'' }
                    });
                  }}>
                    <Text style={s.ticketBtnTxt}>{isAttending ? t('attendingChecked') : t('register')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
        <View style={{height:20}} />
      </ScrollView>

      {/* Share Composer Modal — same as church share */}
      <Modal visible={!!shareEvent} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.shareModalRoot} edges={['top']}>
          {/* Header */}
          <View style={s.shareHdr}>
            <TouchableOpacity style={s.shareCancelBtn} onPress={() => { setShareEvent(null); setShareMessage(''); }}>
              <Text style={s.shareCancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <Text style={s.shareHdrTitle}>New Post</Text>
            <TouchableOpacity
              style={s.sharePostBtn}
              onPress={() => {
                if (!shareEvent) return;
                const { getUser } = require('../../src/lib/userStore');
                const { addPost } = require('../../src/lib/postsStore');
                const u = getUser();
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
                  authorColor: '#667eea',
                  content: shareMessage.trim(),
                  time: 'now',
                  eventShareData: {
                    id: shareEvent.id,
                    title: shareEvent.title,
                    date: shareEvent.date,
                    time: shareEvent.time,
                    location: shareEvent.location,
                    type: shareEvent.type,
                    price: shareEvent.price,
                    organizer: shareEvent.organizer,
                    bannerImage: shareEvent.bannerImage,
                    bannerColor: shareEvent.bannerColor,
                  },
                });
                setShareEvent(null);
                setShareMessage('');
                setSharedToast(true);
                setTimeout(() => setSharedToast(false), 3000);
              }}
            >
              <Text style={s.sharePostBtnTxt}>Share</Text>
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
            <ScrollView style={s.shareScroll} contentContainerStyle={{paddingBottom:40}} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {/* Composer row */}
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
                    placeholder="Add your thoughts about this event..."
                    placeholderTextColor={c.placeholder}
                    value={shareMessage}
                    onChangeText={setShareMessage}
                    multiline
                    autoFocus
                  />
                  {/* Quoted event card */}
                  {shareEvent && (
                    <View style={s.quotedCard}>
                      <View style={s.quotedTop}>
                        <View style={s.quotedIconWrap}>
                          <Ionicons name="calendar" size={14} color={c.gold} />
                        </View>
                        <Text style={s.quotedTitle} numberOfLines={1}>{shareEvent.title}</Text>
                      </View>
                      <View style={s.quotedRow}>
                        <Ionicons name="calendar-outline" size={11} color={c.textMuted} />
                        <Text style={s.quotedTxt}>{shareEvent.date}</Text>
                      </View>
                      <View style={s.quotedRow}>
                        <Ionicons name="location-outline" size={11} color={c.textMuted} />
                        <Text style={s.quotedTxt} numberOfLines={1}>{shareEvent.location}</Text>
                      </View>
                      <View style={s.quotedFooter}>
                        <Text style={s.quotedLink}>View Event Details →</Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>

              <View style={{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:16,marginVertical:16}}>
                <View style={{flex:1,height:1,backgroundColor:c.border}}/>
                <Text style={{fontSize:12,color:c.textMuted}}>or share outside FaithFinder</Text>
                <View style={{flex:1,height:1,backgroundColor:c.border}}/>
              </View>

              <View style={{flexDirection:'row',justifyContent:'space-around',paddingHorizontal:20,paddingBottom:30}}>
                <TouchableOpacity style={{alignItems:'center',gap:8}} onPress={() => {
                  const ev = shareEvent;
                  if (!ev) return;
                  const msg = ev.title + ' — ' + ev.date + ' at ' + ev.location;
                  require('react-native').Linking.openURL('sms:&body=' + encodeURIComponent(msg)).catch(() => {});
                }}>
                  <View style={{width:54,height:54,borderRadius:16,backgroundColor:'#e8f8f0',alignItems:'center',justifyContent:'center'}}>
                    <Ionicons name="chatbubble-outline" size={22} color="#2ecc71"/>
                  </View>
                  <Text style={{fontSize:12,color:c.text,fontWeight:'600'}}>Messages</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{alignItems:'center',gap:8}} onPress={() => {
                  const ev = shareEvent;
                  if (!ev) return;
                  const msg = ev.title + ' — ' + ev.date + ' at ' + ev.location;
                  require('react-native').Linking.openURL('mailto:?subject=' + encodeURIComponent(ev.title) + '&body=' + encodeURIComponent(msg)).catch(() => {});
                }}>
                  <View style={{width:54,height:54,borderRadius:16,backgroundColor:'#eaf4fb',alignItems:'center',justifyContent:'center'}}>
                    <Ionicons name="mail-outline" size={22} color="#3498db"/>
                  </View>
                  <Text style={{fontSize:12,color:c.text,fontWeight:'600'}}>Email</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{alignItems:'center',gap:8}} onPress={() => {
                  const ev = shareEvent;
                  if (!ev) return;
                  setShareEvent(null);
                  setTimeout(() => {
                    require('react-native').Share.share({ title: ev.title, message: ev.title + ' — ' + ev.date + ' at ' + ev.location + '. Find it on FaithFinder!' });
                  }, 400);
                }}>
                  <View style={{width:54,height:54,borderRadius:16,backgroundColor:'#f5eefb',alignItems:'center',justifyContent:'center'}}>
                    <Ionicons name="share-social-outline" size={22} color="#9b59b6"/>
                  </View>
                  <Text style={{fontSize:12,color:c.text,fontWeight:'600'}}>More Options</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Shared Toast */}
      {sharedToast && (
        <View style={{position:'absolute',bottom:100,left:16,right:16,backgroundColor:c.card,borderRadius:16,padding:16,flexDirection:'row',alignItems:'center',gap:12,shadowColor:'#000',shadowOffset:{width:0,height:8},shadowOpacity:0.15,shadowRadius:16,zIndex:999,borderWidth:1,borderColor:c.border}}>
          <View style={{width:44,height:44,borderRadius:22,backgroundColor:c.lightGreen,alignItems:'center',justifyContent:'center'}}>
            <Ionicons name="checkmark-circle" size={28} color={c.green} />
          </View>
          <Text style={{flex:1,fontSize:15,fontWeight:'700',color:c.text}}>Shared to Community</Text>
          <TouchableOpacity onPress={() => setSharedToast(false)}>
            <Ionicons name="close" size={18} color={c.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Filter Modal */}
      <Modal visible={showFilter} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.filterRoot} edges={['top']}>
          <View style={s.filterHdr}>
            <Text style={s.filterTitle}>Filter Events</Text>
            <TouchableOpacity style={s.filterCloseBtn} onPress={() => setShowFilter(false)}>
              <Ionicons name="close" size={20} color={c.text} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.filterScroll}>
            {filterGroups.map(group => (
              <View key={group} style={s.filterGroup}>
                <Text style={s.filterGroupTitle}>{group}</Text>
                <View style={s.filterPills}>
                  {FILTER_OPTIONS.filter(o => o.group === group).map(opt => (
                    <TouchableOpacity
                      key={opt.id}
                      style={[s.filterPill, activeFilters.includes(opt.id) && s.filterPillActive]}
                      onPress={() => toggleFilter(opt.id)}
                    >
                      {activeFilters.includes(opt.id) && <Ionicons name="checkmark" size={13} color={c.onPrimary} />}
                      <Text style={[s.filterPillTxt, activeFilters.includes(opt.id) && s.filterPillTxtActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={s.filterFooter}>
            <TouchableOpacity style={s.filterClearBtn} onPress={() => setActiveFilters([])}>
              <Text style={s.filterClearTxt}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.filterApplyBtn} onPress={() => setShowFilter(false)}>
              <Text style={s.filterApplyTxt}>Show {filtered.length} Events</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* State Filter Modal */}
      <Modal visible={showStateFilter} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{flex:1,backgroundColor:c.bg}} edges={['top']}>
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:14,borderBottomWidth:1,borderBottomColor:c.border}}>

            <Text style={{fontSize:16,fontWeight:'700',color:c.text}}>Filter by State</Text>
            <TouchableOpacity onPress={() => { setFilterState(''); setFilterCity(''); setShowStateFilter(false); }}>
              <Text style={{fontSize:15,color:c.gold,fontWeight:'600'}}>Clear</Text>
            </TouchableOpacity>
          </View>
          <View style={{paddingHorizontal:16,paddingVertical:12}}>
            <TextInput
              style={{borderWidth:1.5,borderColor:c.border,borderRadius:12,paddingHorizontal:14,paddingVertical:10,fontSize:14,color:c.text,marginBottom:12}}
              placeholder="Filter by city..."
              placeholderTextColor={c.placeholder}
              value={filterCity}
              onChangeText={setFilterCity}
            />
          </View>
          <ScrollView contentContainerStyle={{paddingHorizontal:16,paddingBottom:40}}>
            <View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}>
              {STATE_LIST.map(state => (
                <TouchableOpacity
                  key={state}
                  style={{paddingHorizontal:16,paddingVertical:10,borderRadius:100,borderWidth:1.5,borderColor:filterState===state?c.primary:c.border,backgroundColor:filterState===state?c.primary:'transparent'}}
                  onPress={() => { setFilterState(filterState===state?'':state); }}
                >
                  <Text style={{fontSize:13,fontWeight:'600',color:filterState===state?c.onPrimary:c.text}}>{state}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <View style={{padding:16,borderTopWidth:1,borderTopColor:c.border}}>
            <TouchableOpacity
              style={{backgroundColor:c.primary,borderRadius:14,paddingVertical:14,alignItems:'center'}}
              onPress={() => setShowStateFilter(false)}
            >
              <Text style={{color:c.onPrimary,fontSize:15,fontWeight:'700'}}>Apply Filter</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root:{flex:1,backgroundColor:c.bg},
  cardGradient:{padding:16,minHeight:120,justifyContent:'flex-start',gap:6},
  cardTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  cardTypePill:{backgroundColor:'rgba(255,255,255,0.2)',borderRadius:100,paddingHorizontal:10,paddingVertical:4,alignSelf:'flex-start'},
  cardTypeTxt:{color:'#fff',fontSize:11,fontWeight:'700'},
  cardTitle:{fontSize:16,fontWeight:'700',color:'#fff',lineHeight:22},
  cardMeta:{fontSize:12,color:'rgba(255,255,255,0.8)'},
  verseBar:{paddingHorizontal:20,paddingVertical:10,borderBottomWidth:1,borderBottomColor:c.border},
  verseTxt:{fontFamily:'PlayfairDisplay_400Regular_Italic',fontSize:12,color:c.textMuted,textAlign:'center',lineHeight:18},
  searchRow:{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:16,paddingVertical:10,borderBottomWidth:1,borderBottomColor:c.border},
  searchBar:{flex:1,flexDirection:'row',alignItems:'center',gap:8,backgroundColor:c.card,borderRadius:100,paddingHorizontal:14,paddingVertical:11,borderWidth:1.5,borderColor:c.border},
  searchInput:{flex:1,fontSize:13,color:c.text},
  filterBtn:{flexDirection:'row',alignItems:'center',gap:5,backgroundColor:c.cardAlt,borderWidth:1.5,borderColor:c.border,borderRadius:100,paddingHorizontal:14,paddingVertical:11},
  filterBtnActive:{backgroundColor:c.primary,borderColor:c.primary},
  filterBtnTxt:{fontSize:12,fontWeight:'600',color:c.textSecondary},
  activePillsRow:{backgroundColor:c.card,borderBottomWidth:1,borderBottomColor:c.border,maxHeight:44},
  activePillsContent:{paddingHorizontal:16,paddingVertical:8,gap:8,flexDirection:'row',alignItems:'center'},
  activePill:{flexDirection:'row',alignItems:'center',gap:5,backgroundColor:c.cardAlt,borderRadius:100,paddingHorizontal:12,paddingVertical:5},
  activePillTxt:{fontSize:12,fontWeight:'600',color:c.text},
  clearAllPill:{borderRadius:100,paddingHorizontal:12,paddingVertical:5},
  clearAllTxt:{fontSize:12,fontWeight:'600',color:c.red},
  tabsWrap:{paddingHorizontal:16,paddingVertical:10,backgroundColor:c.card,borderBottomWidth:1,borderBottomColor:c.border},
  tabsToggle:{flexDirection:'row',backgroundColor:c.cardAlt,borderRadius:100,padding:3},
  tabBtn:{flex:1,paddingVertical:8,borderRadius:100,alignItems:'center'},
  tabBtnActive:{backgroundColor:c.card,shadowColor:'#000',shadowOffset:{width:0,height:1},shadowOpacity:0.1,shadowRadius:3},
  tabTxt:{fontSize:12,fontWeight:'600',color:c.textMuted},
  tabTxtActive:{color:c.text,fontWeight:'700'},
  scroll:{flex:1,backgroundColor:c.bg},
  resultCount:{fontSize:11,fontWeight:'700',color:c.textMuted,letterSpacing:0.5,textTransform:'uppercase',paddingHorizontal:16,paddingTop:12,paddingBottom:8},
  empty:{paddingVertical:50,alignItems:'center',gap:10,paddingHorizontal:32},
  emptyTxt:{fontSize:15,color:c.textMuted,fontWeight:'700'},
  emptySub:{fontSize:13,color:c.placeholder,textAlign:'center'},
  card:{backgroundColor:c.card,marginHorizontal:16,marginBottom:16,borderRadius:20,overflow:'hidden',borderWidth:1,borderColor:c.border,shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.06,shadowRadius:8},
  cardBanner:{aspectRatio:16/9,justifyContent:'flex-start',padding:14},
  heartBtn:{alignSelf:'flex-end',width:36,height:36,borderRadius:18,backgroundColor:'rgba(255,255,255,0.15)',alignItems:'center',justifyContent:'center'},
  bannerBadges:{flexDirection:'row',gap:6,flexWrap:'wrap'},
  badgeType:{backgroundColor:'rgba(0,0,0,0.5)',borderRadius:8,paddingHorizontal:10,paddingVertical:4},
  badgeTypeTxt:{color:'#fff',fontSize:11,fontWeight:'700'},
  badgeFree:{backgroundColor:c.green,borderRadius:8,paddingHorizontal:10,paddingVertical:4},
  badgeFreeTxt:{color:'#fff',fontSize:11,fontWeight:'700'},
  badgePaid:{backgroundColor:'#e65100',borderRadius:8,paddingHorizontal:10,paddingVertical:4},
  badgePaidTxt:{color:'#fff',fontSize:11,fontWeight:'700'},
  badgeAttending:{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:'rgba(46,125,50,0.8)',borderRadius:8,paddingHorizontal:10,paddingVertical:4},
  badgeAttendingTxt:{color:'#fff',fontSize:11,fontWeight:'700'},
  cardBody:{padding:14},
  eventTitle:{fontFamily:'PlayfairDisplay_700Bold',fontSize:18,color:c.text,marginBottom:3},
  eventOrganizer:{fontSize:12,color:c.gold,fontWeight:'600',marginBottom:8},
  eventMeta:{gap:5,marginBottom:10},
  eventMetaItem:{flexDirection:'row',alignItems:'center',gap:6},
  eventMetaTxt:{fontSize:12,color:c.textMuted},
  metaRow:{flexDirection:'row',alignItems:'center',gap:6},
  metaTxt:{fontSize:12,color:c.textSecondary,flex:1},
  cardDivider:{height:1,backgroundColor:c.border,marginBottom:10},
  cardFooter:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  footerLeft:{flexDirection:'row',gap:4},
  footerIconBtn:{width:36,height:36,borderRadius:18,borderWidth:1,borderColor:c.border,alignItems:'center',justifyContent:'center'},
  saveBtn:{width:36,height:36,borderRadius:18,borderWidth:1,borderColor:c.border,alignItems:'center',justifyContent:'center'},
  ticketBtn:{backgroundColor:c.primary,borderRadius:100,paddingHorizontal:20,paddingVertical:10},
  ticketBtnTxt:{color:c.onPrimary,fontSize:13,fontWeight:'700'},
  // Filter modal
  filterRoot:{flex:1,backgroundColor:c.bg},
  filterHdr:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:20,paddingVertical:16,borderBottomWidth:1,borderBottomColor:c.border},
  filterTitle:{fontSize:20,fontWeight:'700',color:c.text},
  filterCloseBtn:{width:34,height:34,borderRadius:17,backgroundColor:c.cardAlt,alignItems:'center',justifyContent:'center'},
  filterScroll:{padding:20},
  filterGroup:{marginBottom:20},
  filterGroupTitle:{fontSize:12,fontWeight:'700',color:c.textMuted,textTransform:'uppercase',letterSpacing:0.5,marginBottom:10},
  filterPills:{flexDirection:'row',flexWrap:'wrap',gap:8},
  filterPill:{flexDirection:'row',alignItems:'center',gap:5,borderWidth:1.5,borderColor:c.border,borderRadius:100,paddingHorizontal:14,paddingVertical:8,backgroundColor:c.card},
  filterPillActive:{backgroundColor:c.primary,borderColor:c.primary},
  filterPillTxt:{fontSize:13,fontWeight:'600',color:c.textSecondary},
  filterPillTxtActive:{color:c.onPrimary},
  filterFooter:{flexDirection:'row',gap:10,padding:16,borderTopWidth:1,borderTopColor:c.border},
  filterClearBtn:{flex:1,borderWidth:1.5,borderColor:c.border,borderRadius:14,paddingVertical:14,alignItems:'center'},
  filterClearTxt:{fontSize:14,fontWeight:'700',color:c.textMuted},
  filterApplyBtn:{flex:2,backgroundColor:c.primary,borderRadius:14,paddingVertical:14,alignItems:'center'},
  filterApplyTxt:{fontSize:14,fontWeight:'700',color:c.onPrimary},
  shareModalRoot:{flex:1,backgroundColor:c.bg},
  shareHdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:14,borderBottomWidth:1,borderBottomColor:c.border},
  shareCancelBtn:{paddingVertical:4},
  shareCancelTxt:{fontSize:15,color:c.textMuted,fontWeight:'500'},
  shareHdrTitle:{fontSize:16,fontWeight:'700',color:c.text},
  sharePostBtn:{backgroundColor:c.primary,borderRadius:100,paddingHorizontal:20,paddingVertical:9},
  sharePostBtnTxt:{color:c.onPrimary,fontSize:14,fontWeight:'700'},
  shareScroll:{flex:1},
  composerRow:{flexDirection:'row',paddingHorizontal:16,paddingTop:16,paddingBottom:8},
  composerAvatarWrap:{alignItems:'center',marginRight:12},
  composerAvatar:{width:42,height:42,borderRadius:21,backgroundColor:c.navy,alignItems:'center',justifyContent:'center'},
  composerAvatarLine:{width:2,flex:1,backgroundColor:c.border,marginTop:8,borderRadius:1},
  composerRight:{flex:1},
  composerInput:{fontSize:16,color:c.text,minHeight:50,textAlignVertical:'top',marginBottom:10,lineHeight:24,paddingTop:4},
  quotedCard:{borderWidth:1.5,borderColor:c.border,borderRadius:14,padding:10,marginBottom:10,backgroundColor:c.cardAlt},
  quotedTop:{flexDirection:'row',alignItems:'center',gap:6,marginBottom:6},
  quotedIconWrap:{width:22,height:22,borderRadius:6,backgroundColor:c.navy,alignItems:'center',justifyContent:'center'},
  quotedTitle:{flex:1,fontSize:14,fontWeight:'700',color:c.text},
  quotedRow:{flexDirection:'row',alignItems:'center',gap:4,marginBottom:4},
  quotedTxt:{fontSize:12,color:c.textMuted,flex:1},
  quotedFooter:{borderTopWidth:1,borderTopColor:c.border,paddingTop:8,marginTop:4},
  quotedLink:{fontSize:12,color:c.gold,fontWeight:'700'},

  locationRow:{flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:16,paddingVertical:8,backgroundColor:c.card},
  locationTxt:{fontSize:13,color:c.textSecondary,fontWeight:'600'},
  toggleRow:{paddingHorizontal:16,paddingVertical:10,backgroundColor:c.card,borderBottomWidth:1,borderBottomColor:c.border},
  toggle:{flexDirection:'row',backgroundColor:c.cardAlt,borderRadius:100,padding:3},
  toggleBtn:{flex:1,paddingVertical:8,borderRadius:100,alignItems:'center'},
  toggleBtnActive:{backgroundColor:c.card,shadowColor:'#000',shadowOffset:{width:0,height:1},shadowOpacity:0.08,shadowRadius:3},
  toggleTxt:{fontSize:13,fontWeight:'600',color:c.textMuted},
  toggleTxtActive:{color:c.text,fontWeight:'700'},
});
