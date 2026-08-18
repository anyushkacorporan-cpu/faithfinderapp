#!/bin/bash
cd ~/Desktop/FaithFinderApp

cat > "app/(tabs)/events.tsx" << 'EOF'
import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Share } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../src/components/Header';
import { COLORS, EVENTS } from '../../src/lib/constants';

const TABS = ['List', 'Attending', 'Saved'];

const GRADIENTS: Record<string, [string,string]> = {
  Conference: ['#1a1a2e','#2d2240'],
  Festival: ['#2d2240','#1a1a2e'],
  Workshop: ['#1a1a2e','#16213e'],
  Revival: ['#0f3460','#1a1a2e'],
  Service: ['#2d2240','#0f3460'],
};

export default function EventsScreen() {
  const [activeTab, setActiveTab] = useState('List');
  const [search, setSearch] = useState('');
  const [savedEvents, setSavedEvents] = useState<string[]>([]);
  const [attendingEvents, setAttendingEvents] = useState<string[]>([]);

  let filtered = EVENTS.filter(e => {
    const matchesSearch = !search.trim() ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.location.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  if (activeTab === 'Saved') filtered = filtered.filter(e => savedEvents.includes(e.id));
  if (activeTab === 'Attending') filtered = filtered.filter(e => attendingEvents.includes(e.id));

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
          <Ionicons name="search-outline" size={18} color={COLORS.gold} />
          <TextInput
            style={s.searchInput}
            placeholder="Search events, locations..."
            placeholderTextColor="#bbb"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#ccc" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={s.filterBtn}>
          <Ionicons name="options-outline" size={14} color="#555" />
          <Text style={s.filterTxt}>Filter</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={s.tabsWrap}>
        <View style={s.tabsToggle}>
          {TABS.map(t => (
            <TouchableOpacity key={t} style={[s.tabBtn, activeTab===t && s.tabBtnActive]} onPress={() => setActiveTab(t)}>
              <Text style={[s.tabTxt, activeTab===t && s.tabTxtActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="calendar-outline" size={40} color="#ddd" />
            <Text style={s.emptyTxt}>{activeTab === 'Saved' ? 'No saved events' : activeTab === 'Attending' ? "You're not attending any events" : 'No events found'}</Text>
          </View>
        )}

        {filtered.map(event => {
          const gradient = GRADIENTS[event.type] || ['#1a1a2e','#2d2240'] as [string,string];
          const isSaved = savedEvents.includes(event.id);

          return (
            <TouchableOpacity
              key={event.id}
              style={s.card}
              activeOpacity={0.92}
              onPress={() => router.push({
                pathname: '/event-detail',
                params: { id:event.id, title:event.title, description:event.description, date:event.date, location:event.location, type:event.type, price:event.price }
              })}
            >
              {/* Dark banner */}
              <LinearGradient colors={gradient} style={s.cardBanner} start={{x:0,y:0}} end={{x:1,y:1}}>
                {/* Heart */}
                <TouchableOpacity
                  style={s.heartBtn}
                  onPress={e => {
                    e.stopPropagation();
                    setSavedEvents(p => p.includes(event.id) ? p.filter(i=>i!==event.id) : [...p, event.id]);
                  }}
                >
                  <Ionicons name={isSaved ? 'heart' : 'heart-outline'} size={22} color={isSaved ? COLORS.red : COLORS.white} />
                </TouchableOpacity>

                {/* Type + Price badges at bottom */}
                <View style={s.bannerBadges}>
                  <View style={s.badgeType}><Text style={s.badgeTypeTxt}>{event.type}</Text></View>
                  {event.price === 'Free'
                    ? <View style={s.badgeFree}><Text style={s.badgeFreeTxt}>Free</Text></View>
                    : <View style={s.badgePaid}><Text style={s.badgePaidTxt}>{event.price}</Text></View>
                  }
                </View>
              </LinearGradient>

              {/* Card body */}
              <View style={s.cardBody}>
                <Text style={s.eventTitle}>{event.title}</Text>
                <Text style={s.eventDesc} numberOfLines={1}>{event.description}</Text>

                <View style={s.eventMeta}>
                  <View style={s.metaRow}>
                    <Ionicons name="calendar-outline" size={14} color="#888" />
                    <Text style={s.metaTxt}>{event.date}</Text>
                  </View>
                  <View style={s.metaRow}>
                    <Ionicons name="location-outline" size={14} color="#888" />
                    <Text style={s.metaTxt}>{event.location}</Text>
                  </View>
                </View>

                <View style={s.cardDivider} />

                <View style={s.cardFooter}>
                  <Text style={s.attendingTxt}>{event.attending || 0} attending</Text>
                  <View style={s.footerBtns}>
                    <TouchableOpacity style={s.shareBtn} onPress={e => {
                      e.stopPropagation();
                      Share.share({ message: `${event.title} — ${event.date} at ${event.location}` });
                    }}>
                      <Ionicons name="share-social-outline" size={18} color="#555" />
                    </TouchableOpacity>
                    <TouchableOpacity style={s.ticketBtn} onPress={e => {
                      e.stopPropagation();
                      router.push({ pathname:'/event-detail', params:{ id:event.id, title:event.title, description:event.description, date:event.date, location:event.location, type:event.type, price:event.price }});
                    }}>
                      <Text style={s.ticketBtnTxt}>Get Ticket</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={{height:20}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:COLORS.white},
  verseBar:{paddingHorizontal:20,paddingVertical:12,borderBottomWidth:1,borderBottomColor:COLORS.border},
  verseTxt:{fontFamily:'PlayfairDisplay_400Regular_Italic',fontSize:13,color:'#888',textAlign:'center',lineHeight:20},
  searchRow:{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:16,paddingVertical:10,borderBottomWidth:1,borderBottomColor:COLORS.border},
  searchBar:{flex:1,flexDirection:'row',alignItems:'center',gap:8,backgroundColor:COLORS.white,borderRadius:100,paddingHorizontal:14,paddingVertical:11,borderWidth:1.5,borderColor:'#e8e3da'},
  searchInput:{flex:1,fontSize:14,color:COLORS.navy},
  filterBtn:{flexDirection:'row',alignItems:'center',gap:5,backgroundColor:COLORS.lightBg,borderWidth:1.5,borderColor:'#e8e3da',borderRadius:100,paddingHorizontal:14,paddingVertical:11},
  filterTxt:{fontSize:12,fontWeight:'600',color:'#555'},
  tabsWrap:{paddingHorizontal:16,paddingVertical:10,borderBottomWidth:1,borderBottomColor:COLORS.border},
  tabsToggle:{flexDirection:'row',backgroundColor:'#f0ede8',borderRadius:100,padding:3},
  tabBtn:{flex:1,paddingVertical:8,borderRadius:100,alignItems:'center'},
  tabBtnActive:{backgroundColor:COLORS.white,shadowColor:'#000',shadowOffset:{width:0,height:1},shadowOpacity:0.1,shadowRadius:3},
  tabTxt:{fontSize:13,fontWeight:'600',color:'#888'},
  tabTxtActive:{color:COLORS.navy,fontWeight:'700'},
  scroll:{flex:1,backgroundColor:COLORS.white},
  empty:{paddingVertical:60,alignItems:'center',gap:10},
  emptyTxt:{fontSize:14,color:'#bbb',fontWeight:'600'},
  card:{backgroundColor:COLORS.white,marginHorizontal:16,marginBottom:20,borderRadius:20,overflow:'hidden',borderWidth:1,borderColor:COLORS.border,shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.06,shadowRadius:8},
  cardBanner:{height:180,justifyContent:'space-between',padding:14},
  heartBtn:{alignSelf:'flex-end',width:38,height:38,borderRadius:19,backgroundColor:'rgba(255,255,255,0.15)',alignItems:'center',justifyContent:'center'},
  bannerBadges:{flexDirection:'row',gap:8},
  badgeType:{backgroundColor:'rgba(0,0,0,0.5)',borderRadius:8,paddingHorizontal:12,paddingVertical:5},
  badgeTypeTxt:{color:COLORS.white,fontSize:12,fontWeight:'700'},
  badgeFree:{backgroundColor:COLORS.green,borderRadius:8,paddingHorizontal:12,paddingVertical:5},
  badgeFreeTxt:{color:COLORS.white,fontSize:12,fontWeight:'700'},
  badgePaid:{backgroundColor:'#e65100',borderRadius:8,paddingHorizontal:12,paddingVertical:5},
  badgePaidTxt:{color:COLORS.white,fontSize:12,fontWeight:'700'},
  cardBody:{padding:16},
  eventTitle:{fontFamily:'PlayfairDisplay_700Bold',fontSize:20,color:COLORS.navy,marginBottom:4},
  eventDesc:{fontSize:13,color:'#888',marginBottom:12},
  eventMeta:{gap:6,marginBottom:12},
  metaRow:{flexDirection:'row',alignItems:'center',gap:6},
  metaTxt:{fontSize:13,color:'#666'},
  cardDivider:{height:1,backgroundColor:COLORS.border,marginBottom:12},
  cardFooter:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  attendingTxt:{fontSize:13,color:'#aaa'},
  footerBtns:{flexDirection:'row',alignItems:'center',gap:10},
  shareBtn:{width:38,height:38,borderRadius:19,borderWidth:1.5,borderColor:COLORS.border,alignItems:'center',justifyContent:'center'},
  ticketBtn:{backgroundColor:COLORS.navy,borderRadius:100,paddingHorizontal:20,paddingVertical:10},
  ticketBtnTxt:{color:COLORS.white,fontSize:13,fontWeight:'700'},
});
EOF
echo "ALL DONE"
