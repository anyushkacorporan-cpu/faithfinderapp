import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ImageBackground } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors, ThemeColors } from '../src/lib/theme';
import { useTranslation } from '../src/lib/i18n';
import { useConfirm } from '../src/components/Confirm';
import { useUserEvents, deleteEvent, updateEvent } from '../src/lib/eventsStore';

const STATUS_TABS = ['All', 'Upcoming', 'Active', 'Past', 'Drafts'];

export default function MyEventsScreen() {
  const c = useThemeColors();
  const s = makeStyles(c);
  const { t } = useTranslation();
  const { showConfirm } = useConfirm();
  const events = useUserEvents();
  const [activeTab, setActiveTab] = useState('All');

  const filtered = events.filter(e => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Upcoming') return e.status === 'upcoming';
    if (activeTab === 'Active') return e.status === 'active';
    if (activeTab === 'Past') return e.status === 'past';
    if (activeTab === 'Drafts') return e.status === 'draft';
    return true;
  });

  function handleDelete(id: string, title: string) {
    showConfirm({
      title: t('deleteEventTitle'),
      message: t('deleteEventMsg').replace('{title}', title),
      buttons: [
        { text: t('cancel'), style: 'cancel' },
        { text: t('delete'), style: 'destructive', onPress: () => deleteEvent(id) },
      ],
    });
  }

  function handlePublishDraft(id: string) {
    updateEvent(id, { status: 'upcoming' });
    Alert.alert(t('publishedTitle'), t('publishedBody'));
  }

  const STATUS_COLORS: Record<string, string> = {
    upcoming: '#667eea',
    active: c.green,
    past: c.textMuted,
    draft: c.gold,
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>{t('myEvents')}</Text>
        <TouchableOpacity style={s.createBtn} onPress={() => router.push('/create-event')}>
          <Ionicons name="add" size={20} color={c.onPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsScroll} contentContainerStyle={s.tabsContent}>
        {STATUS_TABS.map(t => (
          <TouchableOpacity key={t} style={[s.tab, activeTab===t && s.tabActive]} onPress={() => setActiveTab(t)}>
            <Text style={[s.tabTxt, activeTab===t && s.tabTxtActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="calendar-outline" size={48} color={c.placeholder} />
            <Text style={s.emptyTxt}>{t('noEventsYet')}</Text>
            <Text style={s.emptySub}>Tap + to create your first event</Text>
            <TouchableOpacity style={s.createFirstBtn} onPress={() => router.push('/create-event')}>
              <Text style={s.createFirstBtnTxt}>{t('createEvent')}</Text>
            </TouchableOpacity>
          </View>
        ) : filtered.map(event => (
          <View key={event.id} style={s.card}>
            {event.bannerImage ? (
              <ImageBackground source={{uri: event.bannerImage}} style={s.cardBanner} resizeMode="cover">
                <View style={[s.statusBadge, {backgroundColor: STATUS_COLORS[event.status] + '33'}]}>
                  <Text style={[s.statusTxt, {color: STATUS_COLORS[event.status]}]}>{event.status.toUpperCase()}</Text>
                </View>
              </ImageBackground>
            ) : (
              <LinearGradient colors={event.bannerColor} style={s.cardBanner} start={{x:0,y:0}} end={{x:1,y:1}}>
                <View style={[s.statusBadge, {backgroundColor: STATUS_COLORS[event.status] + '33'}]}>
                  <Text style={[s.statusTxt, {color: STATUS_COLORS[event.status]}]}>{event.status.toUpperCase()}</Text>
                </View>
              </LinearGradient>
            )}
            <View style={s.cardBody}>
              <Text style={s.eventTitle} numberOfLines={1}>{event.title}</Text>
              {!!event.organizer && <Text style={s.eventOrganizer}>by {event.organizer}</Text>}
              <View style={s.eventMeta}>
                <View style={s.eventMetaItem}>
                  <Ionicons name="calendar-outline" size={13} color={c.textMuted} />
                  <Text style={s.eventMetaTxt}>{event.date}</Text>
                </View>
                {!!(event.city||event.location) && (
                  <View style={s.eventMetaItem}>
                    <Ionicons name="location-outline" size={13} color={c.textMuted} />
                    <Text style={s.eventMetaTxt}>{event.city||event.location}{event.state?', '+event.state:''}</Text>
                  </View>
                )}
              </View>
              <View style={s.cardInfoRow}>
                <View style={s.cardInfo}>
                  <Ionicons name="ticket-outline" size={13} color={c.textMuted} />
                  <Text style={s.cardInfoTxt}>{event.ticketsSold} tickets sold</Text>
                </View>
                <View style={s.cardInfo}>
                  <Ionicons name="cash-outline" size={13} color={c.textMuted} />
                  <Text style={s.cardInfoTxt}>{event.isPaid ? '$' + (event.ticketPrice * event.ticketsSold).toFixed(2) : 'Free'}</Text>
                </View>
                <View style={s.cardInfo}>
                  <Ionicons name="people-outline" size={13} color={c.textMuted} />
                  <Text style={s.cardInfoTxt}>{event.attending} attending</Text>
                </View>
              </View>
              <View style={s.cardActions}>
                {event.status === 'draft' && (
                  <TouchableOpacity style={s.publishBtn} onPress={() => handlePublishDraft(event.id)}>
                    <Text style={s.publishBtnTxt}>{t('publish')}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={s.editBtn} onPress={() => router.push({ pathname: '/edit-event' as any, params: { id: event.id } })}>
                  <Ionicons name="create-outline" size={16} color={c.text} />
                  <Text style={s.editBtnTxt}>{t('edit')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(event.id, event.title)}>
                  <Ionicons name="trash-outline" size={16} color={c.red} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
        <View style={{height:20}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root:{flex:1,backgroundColor:c.bg},
  hdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:12,borderBottomWidth:1,borderBottomColor:c.border,backgroundColor:c.card},
  backBtn:{width:36,height:36,borderRadius:18,backgroundColor:c.cardAlt,alignItems:'center',justifyContent:'center'},
  hdrTitle:{fontSize:16,fontWeight:'700',color:c.text},
  createBtn:{width:36,height:36,borderRadius:18,backgroundColor:c.primary,alignItems:'center',justifyContent:'center'},
  tabsScroll:{backgroundColor:c.card,borderBottomWidth:1,borderBottomColor:c.border,maxHeight:48},
  tabsContent:{paddingHorizontal:16,paddingVertical:8,gap:8},
  tab:{borderRadius:100,paddingHorizontal:16,paddingVertical:6,backgroundColor:c.cardAlt},
  tabActive:{backgroundColor:c.primary},
  tabTxt:{fontSize:13,fontWeight:'600',color:c.textMuted},
  tabTxtActive:{color:c.onPrimary},
  scroll:{flex:1},
  empty:{paddingVertical:60,alignItems:'center',gap:10},
  emptyTxt:{fontSize:16,fontWeight:'700',color:c.textMuted},
  emptySub:{fontSize:13,color:c.placeholder},
  createFirstBtn:{marginTop:8,backgroundColor:c.primary,borderRadius:100,paddingHorizontal:24,paddingVertical:12},
  createFirstBtnTxt:{color:c.onPrimary,fontWeight:'700',fontSize:14},
  card:{backgroundColor:c.card,marginHorizontal:16,marginTop:16,borderRadius:20,overflow:'hidden',borderWidth:1,borderColor:c.border,shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.06,shadowRadius:8},
  cardBanner:{aspectRatio:16/9,padding:14,justifyContent:'flex-start'},
  eventTitle:{fontFamily:'PlayfairDisplay_700Bold',fontSize:18,color:c.text,marginBottom:3},
  eventOrganizer:{fontSize:12,color:c.gold,fontWeight:'600',marginBottom:8},
  eventMeta:{gap:5,marginBottom:10},
  eventMetaItem:{flexDirection:'row',alignItems:'center',gap:6},
  eventMetaTxt:{fontSize:12,color:c.textMuted},
  statusBadge:{alignSelf:'flex-start',borderRadius:100,paddingHorizontal:10,paddingVertical:3},
  statusTxt:{fontSize:10,fontWeight:'700'},
  cardTitle:{fontSize:16,fontWeight:'700',color:c.onPrimary,fontFamily:'PlayfairDisplay_700Bold'},
  cardBody:{padding:14},
  cardInfoRow:{flexDirection:'row',gap:12,marginBottom:12,flexWrap:'wrap'},
  cardInfo:{flexDirection:'row',alignItems:'center',gap:4},
  cardInfoTxt:{fontSize:12,color:c.textMuted},
  cardActions:{flexDirection:'row',gap:8,alignItems:'center'},
  publishBtn:{backgroundColor:c.green,borderRadius:100,paddingHorizontal:16,paddingVertical:7},
  publishBtnTxt:{color:c.onPrimary,fontSize:12,fontWeight:'700'},
  editBtn:{flexDirection:'row',alignItems:'center',gap:4,borderWidth:1.5,borderColor:c.border,borderRadius:100,paddingHorizontal:14,paddingVertical:7},
  editBtnTxt:{fontSize:12,fontWeight:'700',color:c.text},
  deleteBtn:{width:34,height:34,borderRadius:17,borderWidth:1.5,borderColor:'#fee2e2',backgroundColor:'#fff5f5',alignItems:'center',justifyContent:'center',marginLeft:'auto'},
});
