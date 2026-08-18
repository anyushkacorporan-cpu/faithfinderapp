#!/bin/bash
cd ~/Desktop/FaithFinderApp

# Update EVENTS in constants to include rich data
cat >> src/lib/constants.ts << 'EOF2'

export const EVENT_DETAILS: Record<string, any> = {
  '1': {
    bannerColor: ['#667eea', '#764ba2'],
    summary: 'A powerful two-day conference designed to inspire and equip women of faith to walk boldly in their God-given purpose.',
    experience: ['Powerful worship sessions', 'Keynote messages from faith leaders', 'Breakout workshops', 'Prayer and intercession time', 'Fellowship and networking'],
    speakers: [
      { name: 'Pastor Sarah Williams', role: 'Keynote Speaker', initials: 'SW', color: '#667eea' },
      { name: 'Dr. Joyce Carter', role: 'Workshop Leader', initials: 'JC', color: '#f093fb' },
    ],
    audience: 'Women of all ages and backgrounds',
    notes: [
      { icon: 'wifi-outline', label: 'Live Stream', value: 'Available on FaithFinder App' },
      { icon: 'car-outline', label: 'Parking', value: 'Free parking available on site' },
      { icon: 'shirt-outline', label: 'Dress Code', value: 'Smart casual' },
    ],
  },
  '2': {
    bannerColor: ['#f093fb', '#f5576c'],
    summary: 'A joyful celebration of gospel music featuring choirs, soloists, and worship bands from across the tri-state area.',
    experience: ['Live gospel performances', 'Community choir showcase', 'Worship and praise', 'Food vendors on site', 'Children\'s activities area'],
    speakers: [
      { name: 'Minister David Okonkwo', role: 'Host & Worship Leader', initials: 'DO', color: '#f5576c' },
      { name: 'Brooklyn Gospel Choir', role: 'Featured Performance', initials: 'BC', color: '#f093fb' },
    ],
    audience: 'All ages — families welcome',
    notes: [
      { icon: 'ticket-outline', label: 'Tickets', value: '$15 at door or online' },
      { icon: 'car-outline', label: 'Parking', value: 'Street parking available nearby' },
      { icon: 'restaurant-outline', label: 'Food', value: 'Food vendors on site' },
    ],
  },
  '3': {
    bannerColor: ['#4facfe', '#00f2fe'],
    summary: 'Learn practical biblical principles for managing finances, giving, saving, and building generational wealth.',
    experience: ['Interactive teaching sessions', 'Q&A with financial advisors', 'Faith-based budgeting tools', 'Small group discussions'],
    speakers: [
      { name: 'Bishop Marcus Johnson', role: 'Lead Teacher', initials: 'MJ', color: '#4facfe' },
    ],
    audience: 'Adults, couples, and young professionals',
    notes: [
      { icon: 'book-outline', label: 'Bring', value: 'Notebook and pen' },
      { icon: 'wifi-outline', label: 'Live Stream', value: 'Available on YouTube' },
      { icon: 'cafe-outline', label: 'Refreshments', value: 'Light refreshments provided' },
    ],
  },
  '4': {
    bannerColor: ['#43e97b', '#38f9d7'],
    summary: 'Passion Conference is the premier gathering for the next generation of believers, featuring world-class worship and teaching.',
    experience: ['Mainstage worship sessions', 'Breakout sessions by topic', 'Late-night prayer gatherings', 'Merchandise and resources', 'Communion service'],
    speakers: [
      { name: 'Louie Giglio', role: 'Founder & Speaker', initials: 'LG', color: '#43e97b' },
      { name: 'Christine Caine', role: 'Guest Speaker', initials: 'CC', color: '#38f9d7' },
      { name: 'Hillsong Worship', role: 'Worship Leaders', initials: 'HW', color: '#667eea' },
    ],
    audience: 'College students and young adults (18-25)',
    notes: [
      { icon: 'bed-outline', label: 'Lodging', value: 'Hotel blocks available nearby' },
      { icon: 'wifi-outline', label: 'Live Stream', value: 'Streaming on Passion App' },
      { icon: 'bag-outline', label: 'What to Bring', value: 'Bible, journal, open heart' },
    ],
  },
  '5': {
    bannerColor: ['#fa709a', '#fee140'],
    summary: 'An unforgettable evening of worship under the stars at Red Rocks Amphitheatre — one of the most iconic venues in the world.',
    experience: ['Sunset worship experience', 'Live band performance', 'Acoustic sets', 'Outdoor prayer walk', 'Communion at sunset'],
    speakers: [
      { name: 'Red Rocks Worship Band', role: 'Worship Leaders', initials: 'RR', color: '#fa709a' },
    ],
    audience: 'All ages — outdoor event',
    notes: [
      { icon: 'cloudy-outline', label: 'Weather', value: 'Bring layers — evenings can be cool' },
      { icon: 'car-outline', label: 'Parking', value: 'Arrive early — limited spaces' },
      { icon: 'accessibility-outline', label: 'Accessibility', value: 'Accessible seating available' },
    ],
  },
};
EOF2
echo "constants updated"

cat > app/event-detail.tsx << 'EOF'
import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Share, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, EVENT_DETAILS } from '../src/lib/constants';
import { addPost } from '../src/lib/postsStore';
import { addNotification } from '../src/lib/notificationsStore';
import { getUser } from '../src/lib/userStore';

const FF_USERS = [
  { id: '1', name: 'Sarah Johnson', initials: 'SJ', color: '#667eea' },
  { id: '2', name: 'David Okonkwo', initials: 'DO', color: '#ce93d8' },
  { id: '3', name: 'Isaiah Williams', initials: 'IW', color: '#ef9a9a' },
  { id: '4', name: 'Rachel Park', initials: 'RP', color: '#b39ddb' },
  { id: '5', name: 'Marcus Johnson', initials: 'MJ', color: '#80cbc4' },
];

export default function EventDetailScreen() {
  const params = useLocalSearchParams<{ id:string; title:string; description:string; date:string; location:string; type:string; price:string; }>();
  const user = getUser();
  const [saved, setSaved] = useState(false);
  const [attending, setAttending] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [inviteSent, setInviteSent] = useState(false);

  const details = EVENT_DETAILS[params.id] || {
    bannerColor: ['#667eea', '#764ba2'],
    summary: params.description || 'Join us for this special faith event.',
    experience: ['Worship', 'Teaching', 'Fellowship', 'Prayer'],
    speakers: [],
    audience: 'All are welcome',
    notes: [],
  };

  function handleShare() {
    Share.share({
      title: params.title,
      message: 'Check out ' + params.title + ' on FaithFinder! ' + params.date + ' at ' + params.location,
    });
  }

  function handleInvite() { setShowInviteModal(true); }

  function toggleUserSelect(userId: string) {
    setSelectedUsers(p => p.includes(userId) ? p.filter(id => id !== userId) : [...p, userId]);
  }

  function handleSendInvites() {
    if (selectedUsers.length === 0) { Alert.alert('Select users', 'Please select at least one person.'); return; }
    setInviteSent(true);
    setTimeout(() => { setShowInviteModal(false); setSelectedUsers([]); setInviteSent(false); }, 1500);
  }

  async function handleAddToCalendar() {
    try {
      const Cal = await import('expo-calendar');
      const { status } = await Cal.requestCalendarPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission needed'); return; }
      const calendars = await Cal.getCalendarsAsync(Cal.EntityTypes.EVENT);
      const cal = calendars.find((c: any) => c.allowsModifications) || calendars[0];
      if (!cal) { Alert.alert('No calendar found'); return; }
      await Cal.createEventAsync(cal.id, {
        title: params.title || 'FaithFinder Event',
        notes: params.description || '',
        location: params.location || '',
        startDate: new Date(),
        endDate: new Date(Date.now() + 2 * 60 * 60 * 1000),
        timeZone: 'GMT',
      });
      Alert.alert('Added!', 'Event added to your calendar.');
    } catch { Alert.alert('Could not add to calendar.'); }
  }

  function handleGetTicket() {
    if (attending) { Alert.alert('Already Registered', "You're already registered!"); return; }
    if (params.price === 'Free') {
      Alert.alert('Register', 'Register for ' + params.title + '?', [
        { text: 'Register', onPress: () => { setAttending(true); Alert.alert('Registered!', "You're in!"); } },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      Alert.alert('Get Tickets', 'Tickets are ' + params.price, [
        { text: 'Buy Tickets', onPress: () => Linking.openURL('https://faithfinderapp.com/tickets') },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }

  function handleDirections() {
    const q = encodeURIComponent(params.location || '');
    Linking.openURL('maps://?q=' + q).catch(() => Linking.openURL('https://maps.google.com/?q=' + q));
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Banner */}
        <LinearGradient colors={details.bannerColor} style={s.banner} start={{x:0,y:0}} end={{x:1,y:1}}>
          <View style={s.bannerTop}>
            <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color={COLORS.white} />
            </TouchableOpacity>
            <View style={s.bannerTopRight}>
              <TouchableOpacity style={s.bannerIconBtn} onPress={() => setSaved(!saved)}>
                <Ionicons name={saved ? 'heart' : 'heart-outline'} size={22} color={saved ? COLORS.red : COLORS.white} />
              </TouchableOpacity>
              <TouchableOpacity style={s.bannerIconBtn} onPress={handleShare}>
                <Ionicons name="share-social-outline" size={22} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={s.bannerBottom}>
            <View style={s.typePill}><Text style={s.typePillTxt}>{params.type}</Text></View>
            <Text style={s.bannerTitle}>{params.title}</Text>
            {params.price === 'Free'
              ? <View style={s.freePill}><Text style={s.freePillTxt}>Free Admission</Text></View>
              : <View style={s.pricePill}><Text style={s.pricePillTxt}>{params.price}</Text></View>
            }
          </View>
        </LinearGradient>

        <View style={s.body}>

          {/* Date & Location */}
          <View style={s.infoCard}>
            <View style={s.infoRow}>
              <View style={s.infoIconWrap}><Ionicons name="calendar-outline" size={18} color={COLORS.navy} /></View>
              <View style={s.infoContent}>
                <Text style={s.infoLabel}>Date & Time</Text>
                <Text style={s.infoValue}>{params.date}</Text>
              </View>
            </View>
            <View style={s.infoDivider} />
            <View style={s.infoRow}>
              <View style={s.infoIconWrap}><Ionicons name="location-outline" size={18} color={COLORS.navy} /></View>
              <View style={s.infoContent}>
                <Text style={s.infoLabel}>Location</Text>
                <Text style={s.infoValue}>{params.location}</Text>
              </View>
              <TouchableOpacity style={s.dirBtn} onPress={handleDirections}>
                <Ionicons name="navigate" size={13} color="#fff" />
                <Text style={s.dirBtnTxt}>Directions</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Summary */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>About this Event</Text>
            <Text style={s.summaryTxt}>{details.summary}</Text>
          </View>

          {/* Speakers */}
          {details.speakers.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Speakers & Guests</Text>
              <View style={s.speakersWrap}>
                {details.speakers.map((sp: any, i: number) => (
                  <View key={i} style={s.speakerCard}>
                    <View style={[s.speakerAvatar, {backgroundColor: sp.color}]}>
                      <Text style={s.speakerInitials}>{sp.initials}</Text>
                    </View>
                    <Text style={s.speakerName}>{sp.name}</Text>
                    <Text style={s.speakerRole}>{sp.role}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Experience */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>What to Expect</Text>
            <View style={s.experienceCard}>
              {details.experience.map((item: string, i: number) => (
                <View key={i} style={[s.experienceRow, i < details.experience.length-1 && s.experienceBorder]}>
                  <View style={s.experienceDot} />
                  <Text style={s.experienceTxt}>{item}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Audience */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Who Should Attend</Text>
            <View style={s.audienceCard}>
              <Ionicons name="people-outline" size={22} color={COLORS.gold} />
              <Text style={s.audienceTxt}>{details.audience}</Text>
            </View>
          </View>

          {/* Notes */}
          {details.notes.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Additional Information</Text>
              <View style={s.notesCard}>
                {details.notes.map((note: any, i: number) => (
                  <View key={i} style={[s.noteRow, i < details.notes.length-1 && s.noteBorder]}>
                    <View style={s.noteIconWrap}>
                      <Ionicons name={note.icon as any} size={18} color={COLORS.navy} />
                    </View>
                    <View style={s.noteContent}>
                      <Text style={s.noteLabel}>{note.label}</Text>
                      <Text style={s.noteValue}>{note.value}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Action buttons */}
          <View style={s.actionRow}>
            <TouchableOpacity style={s.actionBtn} onPress={handleAddToCalendar}>
              <View style={s.actionBtnIcon}><Ionicons name="calendar" size={20} color={COLORS.navy} /></View>
              <Text style={s.actionBtnTxt}>Calendar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn} onPress={handleInvite}>
              <View style={s.actionBtnIcon}><Ionicons name="person-add-outline" size={20} color={COLORS.navy} /></View>
              <Text style={s.actionBtnTxt}>Invite</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn} onPress={handleShare}>
              <View style={s.actionBtnIcon}><Ionicons name="share-outline" size={20} color={COLORS.navy} /></View>
              <Text style={s.actionBtnTxt}>Share</Text>
            </TouchableOpacity>
          </View>

          {/* Get Ticket */}
          <TouchableOpacity style={[s.ticketBtn, attending && s.ticketBtnActive]} onPress={handleGetTicket} activeOpacity={0.88}>
            <Ionicons name={attending ? 'checkmark-circle' : 'ticket-outline'} size={22} color={COLORS.white} />
            <Text style={s.ticketBtnTxt}>
              {attending ? "You're Registered!" : params.price === 'Free' ? 'Register — Free' : 'Get Tickets — ' + params.price}
            </Text>
          </TouchableOpacity>

        </View>
      </ScrollView>

      {/* Invite Modal */}
      {showInviteModal && (
        <View style={s.modalOverlay}>
          <TouchableOpacity style={s.modalBg} onPress={() => setShowInviteModal(false)} />
          <View style={s.inviteSheet}>
            <View style={s.inviteHdr}>
              <Text style={s.inviteTitle}>Invite Friends</Text>
              <TouchableOpacity style={s.closeBtn} onPress={() => setShowInviteModal(false)}>
                <Ionicons name="close" size={20} color={COLORS.navy} />
              </TouchableOpacity>
            </View>
            <Text style={s.inviteSubtitle}>{params.title}</Text>
            {FF_USERS.map(u => {
              const selected = selectedUsers.includes(u.id);
              return (
                <TouchableOpacity key={u.id} style={[s.inviteUserRow, selected && s.inviteUserRowSelected]} onPress={() => toggleUserSelect(u.id)}>
                  <View style={[s.inviteAvatar, {backgroundColor: u.color}]}>
                    <Text style={s.inviteAvatarTxt}>{u.initials}</Text>
                  </View>
                  <Text style={s.inviteUserName}>{u.name}</Text>
                  <View style={[s.inviteCheck, selected && s.inviteCheckSelected]}>
                    {selected && <Ionicons name="checkmark" size={14} color={COLORS.white} />}
                  </View>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={[s.sendInviteBtn, inviteSent && s.sendInviteBtnSent]} onPress={handleSendInvites}>
              <Ionicons name={inviteSent ? 'checkmark-circle' : 'send-outline'} size={18} color={COLORS.white} />
              <Text style={s.sendInviteTxt}>{inviteSent ? 'Invites Sent!' : 'Send Invites' + (selectedUsers.length > 0 ? ' (' + selectedUsers.length + ')' : '')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:COLORS.white},
  banner:{height:320,justifyContent:'space-between',padding:16,paddingBottom:24},
  bannerTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  backBtn:{width:38,height:38,borderRadius:19,backgroundColor:'rgba(0,0,0,0.3)',alignItems:'center',justifyContent:'center'},
  bannerTopRight:{flexDirection:'row',gap:8},
  bannerIconBtn:{width:38,height:38,borderRadius:19,backgroundColor:'rgba(0,0,0,0.3)',alignItems:'center',justifyContent:'center'},
  bannerBottom:{gap:8},
  typePill:{alignSelf:'flex-start',backgroundColor:'rgba(255,255,255,0.2)',borderRadius:100,paddingHorizontal:12,paddingVertical:5},
  typePillTxt:{color:COLORS.white,fontSize:12,fontWeight:'700'},
  bannerTitle:{fontFamily:'PlayfairDisplay_700Bold',fontSize:26,color:COLORS.white,lineHeight:32},
  freePill:{alignSelf:'flex-start',backgroundColor:'rgba(46,125,50,0.8)',borderRadius:100,paddingHorizontal:12,paddingVertical:5},
  freePillTxt:{color:COLORS.white,fontSize:13,fontWeight:'600'},
  pricePill:{alignSelf:'flex-start',backgroundColor:'rgba(0,0,0,0.4)',borderRadius:100,paddingHorizontal:12,paddingVertical:5},
  pricePillTxt:{color:COLORS.white,fontSize:13,fontWeight:'600'},
  body:{padding:16},
  infoCard:{borderWidth:1,borderColor:COLORS.border,borderRadius:16,overflow:'hidden',marginBottom:20},
  infoRow:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:14,gap:12},
  infoDivider:{height:1,backgroundColor:'#f5f3ef',marginLeft:62},
  infoIconWrap:{width:36,height:36,borderRadius:10,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'},
  infoContent:{flex:1},
  infoLabel:{fontSize:11,color:'#bbb',fontWeight:'600',textTransform:'uppercase',letterSpacing:0.4,marginBottom:2},
  infoValue:{fontSize:14,color:COLORS.navy,fontWeight:'500'},
  dirBtn:{flexDirection:'row',alignItems:'center',gap:5,backgroundColor:COLORS.navy,borderRadius:100,paddingHorizontal:14,paddingVertical:8},
  dirBtnTxt:{color:'#fff',fontSize:12,fontWeight:'700'},
  section:{marginBottom:20},
  sectionTitle:{fontSize:17,fontWeight:'700',color:COLORS.navy,marginBottom:12},
  summaryTxt:{fontSize:15,color:'#555',lineHeight:24},
  speakersWrap:{flexDirection:'row',flexWrap:'wrap',gap:12},
  speakerCard:{alignItems:'center',gap:8,width:100},
  speakerAvatar:{width:64,height:64,borderRadius:32,alignItems:'center',justifyContent:'center'},
  speakerInitials:{color:COLORS.white,fontWeight:'700',fontSize:20},
  speakerName:{fontSize:13,fontWeight:'700',color:COLORS.navy,textAlign:'center'},
  speakerRole:{fontSize:11,color:'#888',textAlign:'center'},
  experienceCard:{borderWidth:1,borderColor:COLORS.border,borderRadius:16,overflow:'hidden'},
  experienceRow:{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:16,paddingVertical:13},
  experienceBorder:{borderBottomWidth:1,borderBottomColor:'#f5f3ef'},
  experienceDot:{width:8,height:8,borderRadius:4,backgroundColor:COLORS.gold},
  experienceTxt:{fontSize:14,color:COLORS.navy,flex:1},
  audienceCard:{flexDirection:'row',alignItems:'center',gap:12,borderWidth:1,borderColor:COLORS.border,borderRadius:16,padding:16,backgroundColor:COLORS.lightBg},
  audienceTxt:{fontSize:15,color:COLORS.navy,fontWeight:'600',flex:1},
  notesCard:{borderWidth:1,borderColor:COLORS.border,borderRadius:16,overflow:'hidden'},
  noteRow:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:14,gap:12},
  noteBorder:{borderBottomWidth:1,borderBottomColor:'#f5f3ef'},
  noteIconWrap:{width:36,height:36,borderRadius:10,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'},
  noteContent:{flex:1},
  noteLabel:{fontSize:11,color:'#bbb',fontWeight:'600',textTransform:'uppercase',letterSpacing:0.4,marginBottom:2},
  noteValue:{fontSize:14,color:COLORS.navy,fontWeight:'500'},
  actionRow:{flexDirection:'row',gap:10,marginBottom:16},
  actionBtn:{flex:1,alignItems:'center',gap:6,borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,paddingVertical:14},
  actionBtnIcon:{width:40,height:40,borderRadius:12,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'},
  actionBtnTxt:{fontSize:12,fontWeight:'700',color:COLORS.navy},
  ticketBtn:{backgroundColor:COLORS.navy,borderRadius:16,paddingVertical:16,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10,shadowColor:COLORS.navy,shadowOffset:{width:0,height:4},shadowOpacity:0.3,shadowRadius:8},
  ticketBtnActive:{backgroundColor:COLORS.green},
  ticketBtnTxt:{color:COLORS.white,fontSize:16,fontWeight:'700'},
  modalOverlay:{position:'absolute',top:0,left:0,right:0,bottom:0,justifyContent:'flex-end'},
  modalBg:{position:'absolute',top:0,left:0,right:0,bottom:0,backgroundColor:'rgba(0,0,0,0.5)'},
  inviteSheet:{backgroundColor:COLORS.white,borderTopLeftRadius:28,borderTopRightRadius:28,padding:20,maxHeight:'80%'},
  inviteHdr:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:4},
  inviteTitle:{fontSize:20,fontWeight:'700',color:COLORS.navy},
  closeBtn:{width:32,height:32,borderRadius:16,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'},
  inviteSubtitle:{fontSize:13,color:COLORS.gold,fontWeight:'600',marginBottom:16},
  inviteUserRow:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:12,borderBottomWidth:1,borderBottomColor:COLORS.border},
  inviteUserRowSelected:{backgroundColor:'rgba(201,169,110,0.05)'},
  inviteAvatar:{width:42,height:42,borderRadius:21,alignItems:'center',justifyContent:'center'},
  inviteAvatarTxt:{color:COLORS.white,fontWeight:'700',fontSize:14},
  inviteUserName:{flex:1,fontSize:15,color:COLORS.navy,fontWeight:'500'},
  inviteCheck:{width:24,height:24,borderRadius:12,borderWidth:1.5,borderColor:'#ddd',alignItems:'center',justifyContent:'center'},
  inviteCheckSelected:{backgroundColor:COLORS.navy,borderColor:COLORS.navy},
  sendInviteBtn:{backgroundColor:COLORS.navy,borderRadius:16,paddingVertical:15,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,marginTop:16},
  sendInviteBtnSent:{backgroundColor:COLORS.green},
  sendInviteTxt:{color:COLORS.white,fontSize:15,fontWeight:'700'},
});
EOF
echo "ALL DONE"
