#!/bin/bash
cd ~/Desktop/FaithFinderApp

# ── Events Actions Store ─────────────────────────────────
cat > src/lib/eventActionsStore.ts << 'EOF'
import { useState, useEffect } from 'react';

let savedEvents: string[] = [];
let attendingEvents: string[] = [];
const listeners: Array<() => void> = [];
function notify() { listeners.forEach(fn => fn()); }

export function getSavedEvents() { return [...savedEvents]; }
export function getAttendingEvents() { return [...attendingEvents]; }
export function isEventSaved(id: string) { return savedEvents.includes(id); }
export function isEventAttending(id: string) { return attendingEvents.includes(id); }

export function toggleSaveEvent(id: string) {
  if (savedEvents.includes(id)) {
    savedEvents = savedEvents.filter(e => e !== id);
  } else {
    savedEvents = [...savedEvents, id];
  }
  notify();
}

export function addAttending(id: string) {
  if (!attendingEvents.includes(id)) {
    attendingEvents = [...attendingEvents, id];
    notify();
  }
}

export function removeAttending(id: string) {
  attendingEvents = attendingEvents.filter(e => e !== id);
  notify();
}

export function useEventActions() {
  const [saved, setSaved] = useState(getSavedEvents());
  const [attending, setAttending] = useState(getAttendingEvents());
  useEffect(() => {
    const fn = () => { setSaved(getSavedEvents()); setAttending(getAttendingEvents()); };
    listeners.push(fn);
    return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };
  }, []);
  return { saved, attending };
}
EOF
echo "eventActionsStore done"

# ── Full Events Tab ──────────────────────────────────────
cat > "app/(tabs)/events.tsx" << 'EOF'
import { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Modal, Share } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../src/components/Header';
import { COLORS, EVENTS } from '../../src/lib/constants';
import { useEvents } from '../../src/lib/eventsStore';
import { useEventActions, toggleSaveEvent, addAttending, removeAttending } from '../../src/lib/eventActionsStore';

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

export default function EventsScreen() {
  const [activeTab, setActiveTab] = useState('List');
  const [search, setSearch] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const userEvents = useEvents();
  const { saved, attending } = useEventActions();

  const allEvents = useMemo(() => [
    ...userEvents.filter(e => e.status !== 'draft').map((e: any) => ({
      ...e, attending: 0,
    })),
    ...EVENTS,
  ], [userEvents]);

  const filtered = useMemo(() => {
    let result = allEvents;

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((e: any) =>
        e.title?.toLowerCase().includes(q) ||
        e.location?.toLowerCase().includes(q) ||
        e.city?.toLowerCase().includes(q) ||
        e.type?.toLowerCase().includes(q) ||
        e.organizer?.toLowerCase().includes(q)
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

      {/* Verse */}
      <View style={s.verseBar}>
        <Text style={s.verseTxt}>"For I know the plans I have for you," declares the Lord. — Jeremiah 29:11</Text>
      </View>

      {/* Search + Filter */}
      <View style={s.searchRow}>
        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={17} color={COLORS.gold} />
          <TextInput
            style={s.searchInput}
            placeholder="Search events, location, type..."
            placeholderTextColor="#bbb"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={17} color="#ccc" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[s.filterBtn, activeFilters.length > 0 && s.filterBtnActive]}
          onPress={() => setShowFilter(true)}
        >
          <Ionicons name="options-outline" size={15} color={activeFilters.length > 0 ? COLORS.white : '#555'} />
          <Text style={[s.filterBtnTxt, activeFilters.length > 0 && {color: COLORS.white}]}>
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
              <Ionicons name="close" size={12} color={COLORS.navy} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={s.clearAllPill} onPress={() => setActiveFilters([])}>
            <Text style={s.clearAllTxt}>Clear all</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Tabs */}
      <View style={s.tabsWrap}>
        <View style={s.tabsToggle}>
          {TABS.map(t => (
            <TouchableOpacity key={t} style={[s.tabBtn, activeTab===t && s.tabBtnActive]} onPress={() => setActiveTab(t)}>
              <Text style={[s.tabTxt, activeTab===t && s.tabTxtActive]}>
                {t}
                {t === 'Saved' && saved.length > 0 ? ` (${saved.length})` : ''}
                {t === 'Attending' && attending.length > 0 ? ` (${attending.length})` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.resultCount}>{filtered.length} event{filtered.length !== 1 ? 's' : ''} found</Text>

        {filtered.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="calendar-outline" size={44} color="#ddd" />
            <Text style={s.emptyTxt}>
              {activeTab === 'Saved' ? 'No saved events' :
               activeTab === 'Attending' ? 'No events yet' :
               'No events found'}
            </Text>
            <Text style={s.emptySub}>
              {activeTab === 'Saved' ? 'Tap ♥ on any event to save it' :
               activeTab === 'Attending' ? 'Register for an event to see it here' :
               'Try adjusting your search or filters'}
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
              <LinearGradient colors={gradient} style={s.cardBanner} start={{x:0,y:0}} end={{x:1,y:1}}>
                <TouchableOpacity style={s.heartBtn} onPress={e => { e.stopPropagation(); toggleSaveEvent(event.id); }}>
                  <Ionicons name={isSaved ? 'heart' : 'heart-outline'} size={20} color={isSaved ? COLORS.red : COLORS.white} />
                </TouchableOpacity>
                <View style={s.bannerBadges}>
                  <View style={s.badgeType}><Text style={s.badgeTypeTxt}>{event.type}</Text></View>
                  {event.price === 'Free'
                    ? <View style={s.badgeFree}><Text style={s.badgeFreeTxt}>Free</Text></View>
                    : <View style={s.badgePaid}><Text style={s.badgePaidTxt}>{event.price}</Text></View>
                  }
                  {isAttending && (
                    <View style={s.badgeAttending}>
                      <Ionicons name="checkmark-circle" size={11} color={COLORS.white} />
                      <Text style={s.badgeAttendingTxt}>Attending</Text>
                    </View>
                  )}
                </View>
              </LinearGradient>

              <View style={s.cardBody}>
                <Text style={s.eventTitle}>{event.title}</Text>
                {!!event.organizer && <Text style={s.eventOrganizer}>by {event.organizer}</Text>}
                <View style={s.eventMeta}>
                  <View style={s.metaRow}>
                    <Ionicons name="calendar-outline" size={13} color="#888" />
                    <Text style={s.metaTxt}>{event.date}</Text>
                  </View>
                  <View style={s.metaRow}>
                    <Ionicons name="location-outline" size={13} color="#888" />
                    <Text style={s.metaTxt} numberOfLines={1}>{event.location}</Text>
                  </View>
                </View>
                <View style={s.cardDivider} />
                <View style={s.cardFooter}>
                  <View style={s.footerLeft}>
                    <TouchableOpacity style={s.footerIconBtn} onPress={e => { e.stopPropagation(); toggleSaveEvent(event.id); }}>
                      <Ionicons name={isSaved ? 'heart' : 'heart-outline'} size={18} color={isSaved ? COLORS.red : '#888'} />
                    </TouchableOpacity>
                    <TouchableOpacity style={s.footerIconBtn} onPress={e => {
                      e.stopPropagation();
                      Share.share({ message: event.title + ' — ' + event.date + ' at ' + event.location });
                    }}>
                      <Ionicons name="share-social-outline" size={18} color="#888" />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity style={s.ticketBtn} onPress={e => {
                    e.stopPropagation();
                    router.push({
                      pathname: '/event-detail',
                      params: { id:event.id, title:event.title, description:event.description||event.summary||'', date:event.date, location:event.location, type:event.type, price:event.price }
                    });
                  }}>
                    <Text style={s.ticketBtnTxt}>{isAttending ? '✓ Attending' : 'Get Ticket'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
        <View style={{height:20}} />
      </ScrollView>

      {/* Filter Modal */}
      <Modal visible={showFilter} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.filterRoot} edges={['top']}>
          <View style={s.filterHdr}>
            <Text style={s.filterTitle}>Filter Events</Text>
            <TouchableOpacity style={s.filterCloseBtn} onPress={() => setShowFilter(false)}>
              <Ionicons name="close" size={20} color={COLORS.navy} />
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
                      {activeFilters.includes(opt.id) && <Ionicons name="checkmark" size={13} color={COLORS.white} />}
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
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:COLORS.white},
  verseBar:{paddingHorizontal:20,paddingVertical:10,borderBottomWidth:1,borderBottomColor:COLORS.border},
  verseTxt:{fontFamily:'PlayfairDisplay_400Regular_Italic',fontSize:12,color:'#999',textAlign:'center',lineHeight:18},
  searchRow:{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:16,paddingVertical:10,borderBottomWidth:1,borderBottomColor:COLORS.border},
  searchBar:{flex:1,flexDirection:'row',alignItems:'center',gap:8,backgroundColor:COLORS.white,borderRadius:100,paddingHorizontal:14,paddingVertical:11,borderWidth:1.5,borderColor:'#e8e3da'},
  searchInput:{flex:1,fontSize:14,color:COLORS.navy},
  filterBtn:{flexDirection:'row',alignItems:'center',gap:5,backgroundColor:COLORS.lightBg,borderWidth:1.5,borderColor:'#e8e3da',borderRadius:100,paddingHorizontal:14,paddingVertical:11},
  filterBtnActive:{backgroundColor:COLORS.navy,borderColor:COLORS.navy},
  filterBtnTxt:{fontSize:12,fontWeight:'600',color:'#555'},
  activePillsRow:{backgroundColor:COLORS.white,borderBottomWidth:1,borderBottomColor:COLORS.border,maxHeight:44},
  activePillsContent:{paddingHorizontal:16,paddingVertical:8,gap:8,flexDirection:'row',alignItems:'center'},
  activePill:{flexDirection:'row',alignItems:'center',gap:5,backgroundColor:'rgba(26,26,46,0.08)',borderRadius:100,paddingHorizontal:12,paddingVertical:5},
  activePillTxt:{fontSize:12,fontWeight:'600',color:COLORS.navy},
  clearAllPill:{borderRadius:100,paddingHorizontal:12,paddingVertical:5},
  clearAllTxt:{fontSize:12,fontWeight:'600',color:COLORS.red},
  tabsWrap:{paddingHorizontal:16,paddingVertical:10,backgroundColor:COLORS.white,borderBottomWidth:1,borderBottomColor:COLORS.border},
  tabsToggle:{flexDirection:'row',backgroundColor:'#f0ede8',borderRadius:100,padding:3},
  tabBtn:{flex:1,paddingVertical:8,borderRadius:100,alignItems:'center'},
  tabBtnActive:{backgroundColor:COLORS.white,shadowColor:'#000',shadowOffset:{width:0,height:1},shadowOpacity:0.1,shadowRadius:3},
  tabTxt:{fontSize:12,fontWeight:'600',color:'#888'},
  tabTxtActive:{color:COLORS.navy,fontWeight:'700'},
  scroll:{flex:1,backgroundColor:COLORS.white},
  resultCount:{fontSize:11,fontWeight:'700',color:'#bbb',letterSpacing:0.5,textTransform:'uppercase',paddingHorizontal:16,paddingTop:12,paddingBottom:8},
  empty:{paddingVertical:50,alignItems:'center',gap:10,paddingHorizontal:32},
  emptyTxt:{fontSize:15,color:'#bbb',fontWeight:'700'},
  emptySub:{fontSize:13,color:'#ddd',textAlign:'center'},
  card:{backgroundColor:COLORS.white,marginHorizontal:16,marginBottom:16,borderRadius:20,overflow:'hidden',borderWidth:1,borderColor:COLORS.border,shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.06,shadowRadius:8},
  cardBanner:{height:160,justifyContent:'space-between',padding:14},
  heartBtn:{alignSelf:'flex-end',width:36,height:36,borderRadius:18,backgroundColor:'rgba(255,255,255,0.15)',alignItems:'center',justifyContent:'center'},
  bannerBadges:{flexDirection:'row',gap:6,flexWrap:'wrap'},
  badgeType:{backgroundColor:'rgba(0,0,0,0.5)',borderRadius:8,paddingHorizontal:10,paddingVertical:4},
  badgeTypeTxt:{color:COLORS.white,fontSize:11,fontWeight:'700'},
  badgeFree:{backgroundColor:COLORS.green,borderRadius:8,paddingHorizontal:10,paddingVertical:4},
  badgeFreeTxt:{color:COLORS.white,fontSize:11,fontWeight:'700'},
  badgePaid:{backgroundColor:'#e65100',borderRadius:8,paddingHorizontal:10,paddingVertical:4},
  badgePaidTxt:{color:COLORS.white,fontSize:11,fontWeight:'700'},
  badgeAttending:{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:'rgba(46,125,50,0.8)',borderRadius:8,paddingHorizontal:10,paddingVertical:4},
  badgeAttendingTxt:{color:COLORS.white,fontSize:11,fontWeight:'700'},
  cardBody:{padding:14},
  eventTitle:{fontFamily:'PlayfairDisplay_700Bold',fontSize:18,color:COLORS.navy,marginBottom:3},
  eventOrganizer:{fontSize:12,color:COLORS.gold,fontWeight:'600',marginBottom:8},
  eventMeta:{gap:5,marginBottom:10},
  metaRow:{flexDirection:'row',alignItems:'center',gap:6},
  metaTxt:{fontSize:12,color:'#666',flex:1},
  cardDivider:{height:1,backgroundColor:COLORS.border,marginBottom:10},
  cardFooter:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  footerLeft:{flexDirection:'row',gap:4},
  footerIconBtn:{width:36,height:36,borderRadius:18,borderWidth:1,borderColor:COLORS.border,alignItems:'center',justifyContent:'center'},
  ticketBtn:{backgroundColor:COLORS.navy,borderRadius:100,paddingHorizontal:20,paddingVertical:10},
  ticketBtnTxt:{color:COLORS.white,fontSize:13,fontWeight:'700'},
  // Filter modal
  filterRoot:{flex:1,backgroundColor:COLORS.white},
  filterHdr:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:20,paddingVertical:16,borderBottomWidth:1,borderBottomColor:COLORS.border},
  filterTitle:{fontSize:20,fontWeight:'700',color:COLORS.navy},
  filterCloseBtn:{width:34,height:34,borderRadius:17,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'},
  filterScroll:{padding:20},
  filterGroup:{marginBottom:20},
  filterGroupTitle:{fontSize:12,fontWeight:'700',color:'#aaa',textTransform:'uppercase',letterSpacing:0.5,marginBottom:10},
  filterPills:{flexDirection:'row',flexWrap:'wrap',gap:8},
  filterPill:{flexDirection:'row',alignItems:'center',gap:5,borderWidth:1.5,borderColor:COLORS.border,borderRadius:100,paddingHorizontal:14,paddingVertical:8,backgroundColor:COLORS.white},
  filterPillActive:{backgroundColor:COLORS.navy,borderColor:COLORS.navy},
  filterPillTxt:{fontSize:13,fontWeight:'600',color:'#555'},
  filterPillTxtActive:{color:COLORS.white},
  filterFooter:{flexDirection:'row',gap:10,padding:16,borderTopWidth:1,borderTopColor:COLORS.border},
  filterClearBtn:{flex:1,borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,paddingVertical:14,alignItems:'center'},
  filterClearTxt:{fontSize:14,fontWeight:'700',color:'#888'},
  filterApplyBtn:{flex:2,backgroundColor:COLORS.navy,borderRadius:14,paddingVertical:14,alignItems:'center'},
  filterApplyTxt:{fontSize:14,fontWeight:'700',color:COLORS.white},
});
EOF
echo "events tab done"

# ── Update event-detail to use eventActionsStore ─────────
python3 << 'PYEOF'
content = open('app/event-detail.tsx').read()

# Add import for eventActionsStore
if 'eventActionsStore' not in content:
    content = content.replace(
        "import { getUser } from '../src/lib/userStore';",
        "import { getUser } from '../src/lib/userStore';\nimport { isEventSaved, isEventAttending, toggleSaveEvent, addAttending, removeAttending } from '../src/lib/eventActionsStore';"
    )

# Replace local saved/attending state with store
content = content.replace(
    "  const [saved, setSaved] = useState(false);\n  const [attending, setAttending] = useState(false);",
    "  const [saved, setSaved] = useState(() => isEventSaved(params.id || ''));\n  const [attending, setAttending] = useState(() => isEventAttending(params.id || ''));"
)

# Update save toggle to use store
content = content.replace(
    "onPress={() => setSaved(!saved)}",
    "onPress={() => { const newSaved = !saved; setSaved(newSaved); toggleSaveEvent(params.id || ''); }}"
)

# Update register to use store
content = content.replace(
    "setAttending(true);\n              Alert.alert('Registered!', \"You're in!\");",
    "setAttending(true);\n              addAttending(params.id || '');\n              Alert.alert('Registered!', \"You're in!\");"
)

open('app/event-detail.tsx', 'w').write(content)
print('event-detail updated')
PYEOF

echo "ALL DONE"
