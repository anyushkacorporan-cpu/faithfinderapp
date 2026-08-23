import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Share, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, ImageBackground, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EVENT_DETAILS } from '../src/lib/constants';
import { useThemeColors, ThemeColors } from '../src/lib/theme';
import { buildEventShareText } from '../src/lib/shareLinks';
import { addPost } from '../src/lib/postsStore';
import { addNotification } from '../src/lib/notificationsStore';
import { getUser } from '../src/lib/userStore';
import { isEventSaved, isEventAttending, toggleSaveEvent, addAttending, removeAttending } from '../src/lib/eventActionsStore';
import { getEvents } from '../src/lib/eventsStore';
import { useSettings } from '../src/lib/settingsStore';
import { useTranslation } from '../src/lib/i18n';

const FF_USERS = [
  { id: '1', name: 'Sarah Johnson', initials: 'SJ', color: '#667eea' },
  { id: '2', name: 'David Okonkwo', initials: 'DO', color: '#ce93d8' },
  { id: '3', name: 'Isaiah Williams', initials: 'IW', color: '#ef9a9a' },
  { id: '4', name: 'Rachel Park', initials: 'RP', color: '#b39ddb' },
  { id: '5', name: 'Marcus Johnson', initials: 'MJ', color: '#80cbc4' },
];

export default function EventDetailScreen() {
  const c = useThemeColors();
  const s = makeStyles(c);
  const params = useLocalSearchParams<{ id:string; title:string; description:string; date:string; location:string; type:string; price:string; organizer:string; }>();
  const fullEvent = getEvents().find(e => e.id === params.id);
  const user = getUser();
  const appSettings = useSettings();
  const { t, tx } = useTranslation();
  const [saved, setSaved] = useState(() => isEventSaved(params.id || ''));
  const [showFullPhoto, setShowFullPhoto] = useState(false);
  const [attending, setAttending] = useState(() => isEventAttending(params.id || ''));
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showShareComposer, setShowShareComposer] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const [sharedToast, setSharedToast] = useState(false);
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

  function handleShare() { setShowShareComposer(true); }

  async function handleExternalShare() {
    Share.share({
      title: (fullEvent?.title || params.title),
      message: 'Check out ' + (fullEvent?.title || params.title) + ' on FaithFinder! ' + (fullEvent?.date || params.date) + ' at ' + (fullEvent?.location || params.location),
    });
  }

  async function handlePostToFeed() {
    const { getUser } = require('../src/lib/userStore');
    const { addPost } = require('../src/lib/postsStore');
    const { getCurrentCityState } = require('../src/lib/userLocation');
    const u = getUser();
    let city: string | undefined;
    let state: string | undefined;
    if (appSettings.location.locationEnabled) {
      const loc = await getCurrentCityState();
      if (loc) { city = loc.city; state = loc.state; }
    }
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
      authorPhoto: u.profilePhoto,
      city,
      state,
      content: shareMessage.trim(),
      time: 'now',
      eventShareData: {
        id: params.id,
        title: fullEvent?.title || params.title,
        date: fullEvent?.date || params.date,
        time: fullEvent?.time,
        location: fullEvent?.location || params.location,
        type: fullEvent?.type || params.type,
        price: fullEvent?.price || params.price,
        organizer: fullEvent?.organizer,
        bannerImage: fullEvent?.bannerImage,
        bannerColor: fullEvent?.bannerColor,
      },
    });
    setShowShareComposer(false);
    setShareMessage('');
    setSharedToast(true);
    setTimeout(() => setSharedToast(false), 3000);
  }

  function handleInvite() { setShowInviteModal(true); }

  function toggleUserSelect(userId: string) {
    setSelectedUsers(p => p.includes(userId) ? p.filter(id => id !== userId) : [...p, userId]);
  }

  function handleSendInvites() {
    if (selectedUsers.length === 0) { Alert.alert(tx('Select users'), tx('Please select at least one person.')); return; }
    setInviteSent(true);
    setTimeout(() => { setShowInviteModal(false); setSelectedUsers([]); setInviteSent(false); }, 1500);
  }

  async function handleAddToCalendar() {
    try {
      const Cal = await import('expo-calendar');
      const { status } = await Cal.requestCalendarPermissionsAsync();
      if (status !== 'granted') { Alert.alert(tx('Permission needed')); return; }
      const calendars = await Cal.getCalendarsAsync(Cal.EntityTypes.EVENT);
      const cal = calendars.find((c: any) => c.allowsModifications) || calendars[0];
      if (!cal) { Alert.alert(tx('No calendar found')); return; }
      await Cal.createEventAsync(cal.id, {
        title: (fullEvent?.title || params.title) || 'FaithFinder Event',
        notes: params.description || '',
        location: (fullEvent?.location || params.location) || '',
        startDate: new Date(),
        endDate: new Date(Date.now() + 2 * 60 * 60 * 1000),
        timeZone: 'GMT',
      });
      Alert.alert(tx('Added!'), tx('Event added to your calendar.'));
    } catch { Alert.alert(tx('Could not add to calendar.')); }
  }

  function handleGetTicket() {
    if (attending) { Alert.alert(tx('Already Attending'), "You already have a ticket for this event!"); return; }
    router.push({ pathname: '/event-checkout' as any, params: { id: params.id, title: (fullEvent?.title || params.title), date: (fullEvent?.date || params.date), location: (fullEvent?.location || params.location), price: (fullEvent?.price || params.price), type: (fullEvent?.type || params.type), organizer: params.organizer || '' } });
  }

  function handleDirections() {
    const q = encodeURIComponent((fullEvent?.location || params.location) || '');
    Linking.openURL('maps://?q=' + q).catch(() => Linking.openURL('https://maps.google.com/?q=' + q));
  }

  return (
    <>
    <SafeAreaView style={s.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Banner */}
        {fullEvent?.bannerImage ? (
          <TouchableOpacity activeOpacity={0.95} onPress={() => setShowFullPhoto(true)} style={s.banner}>
          <ImageBackground source={{uri: fullEvent.bannerImage}} style={{flex:1}} resizeMode="cover">
            <View style={s.bannerTop}>
              <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={20} color={c.onPrimary} />
              </TouchableOpacity>
              <View style={s.bannerTopRight}>
                <TouchableOpacity style={s.bannerIconBtn} onPress={() => { const newSaved = !saved; setSaved(newSaved); toggleSaveEvent(params.id || ''); }}>
                  <Ionicons name={saved ? 'heart' : 'heart-outline'} size={22} color={saved ? c.red : c.white} />
                </TouchableOpacity>
                <TouchableOpacity style={s.bannerIconBtn} onPress={handleShare}>
                  <Ionicons name="share-social-outline" size={22} color={c.onPrimary} />
                </TouchableOpacity>
              </View>
            </View>
          </ImageBackground>
          </TouchableOpacity>
        ) : (
          <LinearGradient colors={fullEvent?.bannerColor || details.bannerColor} style={s.banner} start={{x:0,y:0}} end={{x:1,y:1}}>
            <View style={s.bannerTop}>
              <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={20} color={c.onPrimary} />
              </TouchableOpacity>
              <View style={s.bannerTopRight}>
                <TouchableOpacity style={s.bannerIconBtn} onPress={() => { const newSaved = !saved; setSaved(newSaved); toggleSaveEvent(params.id || ''); }}>
                  <Ionicons name={saved ? 'heart' : 'heart-outline'} size={22} color={saved ? c.red : c.white} />
                </TouchableOpacity>
                <TouchableOpacity style={s.bannerIconBtn} onPress={handleShare}>
                  <Ionicons name="share-social-outline" size={22} color={c.onPrimary} />
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        )}

        <View style={s.body}>

          <View style={{flexDirection:'row', gap:8, marginBottom:12}}>
            <View style={s.typePill}><Text style={s.typePillTxt}>{(fullEvent?.type || params.type)}</Text></View>
            {(fullEvent?.price || params.price) === 'Free'
              ? <View style={s.freePill}><Text style={s.freePillTxt}>{t('freeAdmission')}</Text></View>
              : <View style={s.pricePill}><Text style={s.pricePillTxt}>{(fullEvent?.price || params.price)}</Text></View>
            }
          </View>
          <Text style={{fontFamily:'PlayfairDisplay_700Bold', fontSize:24, color: c.text, lineHeight:30, marginBottom:4}}>{(fullEvent?.title || params.title)}</Text>
          {!!fullEvent?.organizer && (
            <Text style={{fontSize:14, color: c.gold, fontWeight:'600', marginBottom:16}}>by {fullEvent.organizer}</Text>
          )}

          {/* Date & Location */}
          <View style={s.infoCard}>
            <View style={s.infoRow}>
              <View style={s.infoIconWrap}><Ionicons name="calendar-outline" size={18} color={c.text} /></View>
              <View style={s.infoContent}>
                <Text style={s.infoLabel}>{t('dateAndTime')}</Text>
                <Text style={s.infoValue}>{(fullEvent?.date || params.date)}</Text>
              </View>
            </View>
            <View style={s.infoDivider} />
            <View style={s.infoRow}>
              <View style={s.infoIconWrap}><Ionicons name="location-outline" size={18} color={c.text} /></View>
              <View style={s.infoContent}>
                <Text style={s.infoLabel}>{t('location')}</Text>
                <Text style={s.infoValue}>{(fullEvent?.location || params.location)}</Text>

              </View>
              <TouchableOpacity style={s.dirBtn} onPress={handleDirections}>
                <Ionicons name="navigate" size={13} color="#fff" />
                <Text style={s.dirBtnTxt}>{t('directions')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Summary */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('aboutEvent')}</Text>
            <Text style={s.summaryTxt}>{details.summary}</Text>
          </View>

          {/* Speakers */}
          {details.speakers.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>{t('speakersAndGuests')}</Text>
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
            <Text style={s.sectionTitle}>{t('whatToExpect')}</Text>
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
            <Text style={s.sectionTitle}>{t('whoShouldAttend')}</Text>
            <View style={s.audienceCard}>
              <Ionicons name="people-outline" size={22} color={c.gold} />
              <Text style={s.audienceTxt}>{details.audience}</Text>
            </View>
          </View>

          {/* Notes */}
          {details.notes.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>{t('additionalInfo')}</Text>
              <View style={s.notesCard}>
                {details.notes.map((note: any, i: number) => (
                  <View key={i} style={[s.noteRow, i < details.notes.length-1 && s.noteBorder]}>
                    <View style={s.noteIconWrap}>
                      <Ionicons name={note.icon as any} size={18} color={c.text} />
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
              <View style={s.actionBtnIcon}><Ionicons name="calendar" size={20} color={c.text} /></View>
              <Text style={s.actionBtnTxt}>{t('calendar')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn} onPress={handleInvite}>
              <View style={s.actionBtnIcon}><Ionicons name="person-add-outline" size={20} color={c.text} /></View>
              <Text style={s.actionBtnTxt}>{t('invite')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn} onPress={handleShare}>
              <View style={s.actionBtnIcon}><Ionicons name="share-outline" size={20} color={c.text} /></View>
              <Text style={s.actionBtnTxt}>{t('share')}</Text>
            </TouchableOpacity>
          </View>

          {/* Get Ticket */}
          <TouchableOpacity style={[s.ticketBtn, attending && s.ticketBtnActive]} onPress={handleGetTicket} activeOpacity={0.88}>
            <Ionicons name={attending ? 'checkmark-circle' : 'ticket-outline'} size={22} color={c.onPrimary} />
            <Text style={s.ticketBtnTxt}>
              {attending ? t('youreRegistered') : t('register')}
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
              <Text style={s.inviteTitle}>{t('inviteFriends')}</Text>
              <TouchableOpacity style={s.closeBtn} onPress={() => setShowInviteModal(false)}>
                <Ionicons name="close" size={20} color={c.text} />
              </TouchableOpacity>
            </View>
            <Text style={s.inviteSubtitle}>{(fullEvent?.title || params.title)}</Text>
            {FF_USERS.map(u => {
              const selected = selectedUsers.includes(u.id);
              return (
                <TouchableOpacity key={u.id} style={[s.inviteUserRow, selected && s.inviteUserRowSelected]} onPress={() => toggleUserSelect(u.id)}>
                  <View style={[s.inviteAvatar, {backgroundColor: u.color}]}>
                    <Text style={s.inviteAvatarTxt}>{u.initials}</Text>
                  </View>
                  <Text style={s.inviteUserName}>{u.name}</Text>
                  <View style={[s.inviteCheck, selected && s.inviteCheckSelected]}>
                    {selected && <Ionicons name="checkmark" size={14} color={c.onPrimary} />}
                  </View>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={[s.sendInviteBtn, inviteSent && s.sendInviteBtnSent]} onPress={handleSendInvites}>
              <Ionicons name={inviteSent ? 'checkmark-circle' : 'send-outline'} size={18} color={c.onPrimary} />
              <Text style={s.sendInviteTxt}>{inviteSent ? 'Invites Sent!' : 'Send Invites' + (selectedUsers.length > 0 ? ' (' + selectedUsers.length + ')' : '')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {/* Share Composer Modal */}
      <Modal visible={showShareComposer} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{flex:1,backgroundColor:c.card}} edges={['top']}>
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:14,borderBottomWidth:1,borderBottomColor:c.border}}>
            <TouchableOpacity onPress={() => { setShowShareComposer(false); setShareMessage(''); }}>
              <Text style={{fontSize:15,color:c.textMuted,fontWeight:'500'}}>{t('cancel')}</Text>
            </TouchableOpacity>
            <Text style={{fontSize:16,fontWeight:'700',color:c.text}}>{t('newPost')}</Text>
            <TouchableOpacity
              style={{backgroundColor:c.primary,borderRadius:100,paddingHorizontal:20,paddingVertical:9}}
              onPress={handlePostToFeed}
            >
              <Text style={{color:'#fff',fontSize:14,fontWeight:'700'}}>{t('share')}</Text>
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
            <ScrollView contentContainerStyle={{paddingBottom:40}} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={{flexDirection:'row',paddingHorizontal:16,paddingTop:16,paddingBottom:8}}>
                <View style={{alignItems:'center',marginRight:12}}>
                  <View style={{width:42,height:42,borderRadius:21,backgroundColor:c.primary,alignItems:'center',justifyContent:'center'}}>
                    <Ionicons name="person" size={18} color={c.onPrimary}/>
                  </View>
                  <View style={{width:2,flex:1,backgroundColor:c.border,marginTop:8,borderRadius:1}}/>
                </View>
                <View style={{flex:1}}>
                  <TextInput
                    style={{fontSize:16,color:c.text,minHeight:50,textAlignVertical:'top',marginBottom:10,lineHeight:24,paddingTop:4}}
                    placeholder={tx('Add your thoughts...')}
                    placeholderTextColor={c.placeholder}
                    value={shareMessage}
                    onChangeText={setShareMessage}
                    multiline
                    autoFocus
                  />
                  <View style={{borderWidth:1.5,borderColor:c.border,borderRadius:14,padding:12,marginBottom:10,backgroundColor:c.cardAlt}}>
                    <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:8}}>
                      <View style={{width:26,height:26,borderRadius:8,backgroundColor:c.primary,alignItems:'center',justifyContent:'center'}}>
                        <Ionicons name="calendar" size={14} color={c.gold}/>
                      </View>
                      <Text style={{flex:1,fontSize:14,fontWeight:'700',color:c.text}} numberOfLines={1}>{(fullEvent?.title || params.title)}</Text>
                    </View>
                    <View style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:4}}>
                      <Ionicons name="calendar-outline" size={11} color={c.textMuted}/>
                      <Text style={{fontSize:12,color:c.textMuted}}>{(fullEvent?.date || params.date)}</Text>
                    </View>
                    <View style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:8}}>
                      <Ionicons name="location-outline" size={11} color={c.textMuted}/>
                      <Text style={{fontSize:12,color:c.textMuted,flex:1}} numberOfLines={1}>{(fullEvent?.location || params.location)}</Text>
                    </View>
                    <View style={{borderTopWidth:1,borderTopColor:c.border,paddingTop:8}}>
                      <Text style={{fontSize:12,color:c.gold,fontWeight:'700'}}>View event on FaithFinder →</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:16,marginVertical:16}}>
                <View style={{flex:1,height:1,backgroundColor:c.border}}/>
                <Text style={{fontSize:12,color:c.textMuted}}>or share outside FaithFinder</Text>
                <View style={{flex:1,height:1,backgroundColor:c.border}}/>
              </View>

              <View style={{flexDirection:'row',justifyContent:'space-around',paddingHorizontal:20,paddingBottom:20}}>
                <TouchableOpacity style={{alignItems:'center',gap:8}} onPress={() => {
                  const msg = buildEventShareText({ title: (fullEvent?.title || params.title) || '', date: (fullEvent?.date || params.date), location: (fullEvent?.location || params.location), eventId: params.id || (fullEvent?.title || params.title) || '' });
                  Linking.openURL('sms:&body=' + encodeURIComponent(msg)).catch(() => {});
                }}>
                  <View style={{width:54,height:54,borderRadius:16,backgroundColor:'#e8f8f0',alignItems:'center',justifyContent:'center'}}>
                    <Ionicons name="chatbubble-outline" size={22} color="#2ecc71"/>
                  </View>
                  <Text style={{fontSize:12,color:c.text,fontWeight:'600'}}>{t('messages')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{alignItems:'center',gap:8}} onPress={() => {
                  const msg = buildEventShareText({ title: (fullEvent?.title || params.title) || '', date: (fullEvent?.date || params.date), location: (fullEvent?.location || params.location), eventId: params.id || (fullEvent?.title || params.title) || '' });
                  Linking.openURL('mailto:?subject=' + encodeURIComponent(String((fullEvent?.title || params.title) || '')) + '&body=' + encodeURIComponent(msg)).catch(() => {});
                }}>
                  <View style={{width:54,height:54,borderRadius:16,backgroundColor:'#eaf4fb',alignItems:'center',justifyContent:'center'}}>
                    <Ionicons name="mail-outline" size={22} color="#3498db"/>
                  </View>
                  <Text style={{fontSize:12,color:c.text,fontWeight:'600'}}>{t('email')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{alignItems:'center',gap:8}} onPress={() => {
                  const t = (fullEvent?.title || params.title) || '';
                  const d = (fullEvent?.date || params.date) || '';
                  const l = (fullEvent?.location || params.location) || '';
                  const fullMsg = buildEventShareText({ title: t, date: d, location: l, eventId: params.id || t });
                  setShowShareComposer(false);
                  setTimeout(() => {
                    Share.share({ title: t, message: fullMsg }).catch(() => {});
                  }, 600);
                }}>
                  <View style={{width:54,height:54,borderRadius:16,backgroundColor:'#f5eefb',alignItems:'center',justifyContent:'center'}}>
                    <Ionicons name="share-social-outline" size={22} color="#9b59b6"/>
                  </View>
                  <Text style={{fontSize:12,color:c.text,fontWeight:'600'}}>{t('moreOptions')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Shared Toast */}
      {sharedToast && (
        <View style={{position:'absolute',bottom:40,left:16,right:16,backgroundColor:c.card,borderRadius:16,padding:16,flexDirection:'row',alignItems:'center',gap:12,shadowColor:'#000',shadowOffset:{width:0,height:8},shadowOpacity:0.15,shadowRadius:16,borderWidth:1,borderColor:c.border}}>
          <View style={{width:44,height:44,borderRadius:22,backgroundColor:'#e8f5e9',alignItems:'center',justifyContent:'center'}}>
            <Ionicons name="checkmark-circle" size={28} color={c.green} />
          </View>
          <Text style={{flex:1,fontSize:15,fontWeight:'700',color:c.text}}>{t('sharedToCommunity')}</Text>
          <TouchableOpacity onPress={() => setSharedToast(false)}>
            <Ionicons name="close" size={18} color={c.textMuted} />
          </TouchableOpacity>
        </View>
      )}
      {/* Share Composer Modal */}
      <Modal visible={showShareComposer} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{flex:1,backgroundColor:c.card}} edges={['top']}>
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:14,borderBottomWidth:1,borderBottomColor:c.border}}>
            <TouchableOpacity onPress={() => { setShowShareComposer(false); setShareMessage(''); }}>
              <Text style={{fontSize:15,color:c.textMuted,fontWeight:'500'}}>{t('cancel')}</Text>
            </TouchableOpacity>
            <Text style={{fontSize:16,fontWeight:'700',color:c.text}}>{t('newPost')}</Text>
            <TouchableOpacity
              style={{backgroundColor:c.primary,borderRadius:100,paddingHorizontal:20,paddingVertical:9}}
              onPress={handlePostToFeed}
            >
              <Text style={{color:'#fff',fontSize:14,fontWeight:'700'}}>{t('share')}</Text>
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
            <ScrollView contentContainerStyle={{paddingBottom:40}} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={{flexDirection:'row',paddingHorizontal:16,paddingTop:16,paddingBottom:8}}>
                <View style={{alignItems:'center',marginRight:12}}>
                  <View style={{width:42,height:42,borderRadius:21,backgroundColor:c.primary,alignItems:'center',justifyContent:'center'}}>
                    <Ionicons name="person" size={18} color={c.onPrimary}/>
                  </View>
                  <View style={{width:2,flex:1,backgroundColor:c.border,marginTop:8,borderRadius:1}}/>
                </View>
                <View style={{flex:1}}>
                  <TextInput
                    style={{fontSize:16,color:c.text,minHeight:50,textAlignVertical:'top',marginBottom:10,lineHeight:24,paddingTop:4}}
                    placeholder={tx('Add your thoughts...')}
                    placeholderTextColor={c.placeholder}
                    value={shareMessage}
                    onChangeText={setShareMessage}
                    multiline
                    autoFocus
                  />
                  <View style={{borderWidth:1.5,borderColor:c.border,borderRadius:14,padding:12,marginBottom:10,backgroundColor:c.cardAlt}}>
                    <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:8}}>
                      <View style={{width:26,height:26,borderRadius:8,backgroundColor:c.primary,alignItems:'center',justifyContent:'center'}}>
                        <Ionicons name="calendar" size={14} color={c.gold}/>
                      </View>
                      <Text style={{flex:1,fontSize:14,fontWeight:'700',color:c.text}} numberOfLines={1}>{(fullEvent?.title || params.title)}</Text>
                    </View>
                    <View style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:4}}>
                      <Ionicons name="calendar-outline" size={11} color={c.textMuted}/>
                      <Text style={{fontSize:12,color:c.textMuted}}>{(fullEvent?.date || params.date)}</Text>
                    </View>
                    <View style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:8}}>
                      <Ionicons name="location-outline" size={11} color={c.textMuted}/>
                      <Text style={{fontSize:12,color:c.textMuted,flex:1}} numberOfLines={1}>{(fullEvent?.location || params.location)}</Text>
                    </View>
                    <View style={{borderTopWidth:1,borderTopColor:c.border,paddingTop:8}}>
                      <Text style={{fontSize:12,color:c.gold,fontWeight:'700'}}>View event on FaithFinder →</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:16,marginVertical:16}}>
                <View style={{flex:1,height:1,backgroundColor:c.border}}/>
                <Text style={{fontSize:12,color:c.textMuted}}>or share outside FaithFinder</Text>
                <View style={{flex:1,height:1,backgroundColor:c.border}}/>
              </View>

              <View style={{flexDirection:'row',justifyContent:'space-around',paddingHorizontal:20,paddingBottom:20}}>
                <TouchableOpacity style={{alignItems:'center',gap:8}} onPress={() => {
                  const msg = buildEventShareText({ title: (fullEvent?.title || params.title) || '', date: (fullEvent?.date || params.date), location: (fullEvent?.location || params.location), eventId: params.id || (fullEvent?.title || params.title) || '' });
                  Linking.openURL('sms:&body=' + encodeURIComponent(msg)).catch(() => {});
                }}>
                  <View style={{width:54,height:54,borderRadius:16,backgroundColor:'#e8f8f0',alignItems:'center',justifyContent:'center'}}>
                    <Ionicons name="chatbubble-outline" size={22} color="#2ecc71"/>
                  </View>
                  <Text style={{fontSize:12,color:c.text,fontWeight:'600'}}>{t('messages')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{alignItems:'center',gap:8}} onPress={() => {
                  const msg = buildEventShareText({ title: (fullEvent?.title || params.title) || '', date: (fullEvent?.date || params.date), location: (fullEvent?.location || params.location), eventId: params.id || (fullEvent?.title || params.title) || '' });
                  Linking.openURL('mailto:?subject=' + encodeURIComponent(String((fullEvent?.title || params.title) || '')) + '&body=' + encodeURIComponent(msg)).catch(() => {});
                }}>
                  <View style={{width:54,height:54,borderRadius:16,backgroundColor:'#eaf4fb',alignItems:'center',justifyContent:'center'}}>
                    <Ionicons name="mail-outline" size={22} color="#3498db"/>
                  </View>
                  <Text style={{fontSize:12,color:c.text,fontWeight:'600'}}>{t('email')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{alignItems:'center',gap:8}} onPress={() => {
                  const t = (fullEvent?.title || params.title) || '';
                  const d = (fullEvent?.date || params.date) || '';
                  const l = (fullEvent?.location || params.location) || '';
                  const fullMsg = buildEventShareText({ title: t, date: d, location: l, eventId: params.id || t });
                  setShowShareComposer(false);
                  setTimeout(() => {
                    Share.share({ title: t, message: fullMsg }).catch(() => {});
                  }, 600);
                }}>
                  <View style={{width:54,height:54,borderRadius:16,backgroundColor:'#f5eefb',alignItems:'center',justifyContent:'center'}}>
                    <Ionicons name="share-social-outline" size={22} color="#9b59b6"/>
                  </View>
                  <Text style={{fontSize:12,color:c.text,fontWeight:'600'}}>{t('moreOptions')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Shared Toast */}
      {sharedToast && (
        <View style={{position:'absolute',bottom:40,left:16,right:16,backgroundColor:c.card,borderRadius:16,padding:16,flexDirection:'row',alignItems:'center',gap:12,shadowColor:'#000',shadowOffset:{width:0,height:8},shadowOpacity:0.15,shadowRadius:16,borderWidth:1,borderColor:c.border}}>
          <View style={{width:44,height:44,borderRadius:22,backgroundColor:'#e8f5e9',alignItems:'center',justifyContent:'center'}}>
            <Ionicons name="checkmark-circle" size={28} color={c.green} />
          </View>
          <Text style={{flex:1,fontSize:15,fontWeight:'700',color:c.text}}>{t('sharedToCommunity')}</Text>
          <TouchableOpacity onPress={() => setSharedToast(false)}>
            <Ionicons name="close" size={18} color={c.textMuted} />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>

      <Modal visible={showFullPhoto} transparent animationType="fade" onRequestClose={() => setShowFullPhoto(false)}>
        <View style={{flex:1, backgroundColor:'rgba(0,0,0,0.95)', justifyContent:'center', alignItems:'center'}}>
          <TouchableOpacity
            style={{position:'absolute', top:60, right:20, zIndex:1, width:40, height:40, borderRadius:20, backgroundColor:'rgba(255,255,255,0.2)', alignItems:'center', justifyContent:'center'}}
            onPress={() => setShowFullPhoto(false)}
          >
            <Ionicons name="close" size={24} color={c.onPrimary} />
          </TouchableOpacity>
          {!!fullEvent?.bannerImage && (
            <Image source={{uri: fullEvent.bannerImage}} style={{width:'100%', height:'80%'}} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root:{flex:1,backgroundColor:c.card},
  banner:{aspectRatio:16/9,justifyContent:'flex-start',padding:16},
  bannerTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  backBtn:{width:38,height:38,borderRadius:19,backgroundColor:'rgba(0,0,0,0.3)',alignItems:'center',justifyContent:'center'},
  bannerTopRight:{flexDirection:'row',gap:8},
  bannerIconBtn:{width:38,height:38,borderRadius:19,backgroundColor:'rgba(0,0,0,0.3)',alignItems:'center',justifyContent:'center'},
  bannerBottom:{gap:8},
  typePill:{alignSelf:'flex-start',backgroundColor:c.primary,borderRadius:100,paddingHorizontal:12,paddingVertical:5},
  typePillTxt:{color:c.onPrimary,fontSize:12,fontWeight:'700'},
  bannerTitle:{fontFamily:'PlayfairDisplay_700Bold',fontSize:26,color:c.onPrimary,lineHeight:32},
  freePill:{alignSelf:'flex-start',backgroundColor:c.green,borderRadius:100,paddingHorizontal:12,paddingVertical:5},
  freePillTxt:{color:c.onPrimary,fontSize:13,fontWeight:'600'},
  pricePill:{alignSelf:'flex-start',backgroundColor:'#e67e22',borderRadius:100,paddingHorizontal:12,paddingVertical:5},
  pricePillTxt:{color:c.onPrimary,fontSize:13,fontWeight:'600'},
  body:{padding:16},
  infoCard:{borderWidth:1,borderColor:c.border,borderRadius:16,overflow:'hidden',marginBottom:20},
  infoRow:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:14,gap:12},
  infoDivider:{height:1,backgroundColor:c.cardAlt,marginLeft:62},
  infoIconWrap:{width:36,height:36,borderRadius:10,backgroundColor:c.cardAlt,alignItems:'center',justifyContent:'center'},
  infoContent:{flex:1},
  infoLabel:{fontSize:11,color:c.textMuted,fontWeight:'600',textTransform:'uppercase',letterSpacing:0.4,marginBottom:2},
  infoValue:{fontSize:14,color:c.text,fontWeight:'500'},
  dirBtn:{flexDirection:'row',alignItems:'center',gap:5,backgroundColor:c.primary,borderRadius:100,paddingHorizontal:14,paddingVertical:8},
  dirBtnTxt:{color:'#fff',fontSize:12,fontWeight:'700'},
  section:{marginBottom:20},
  sectionTitle:{fontSize:17,fontWeight:'700',color:c.text,marginBottom:12},
  summaryTxt:{fontSize:15,color:c.textSecondary,lineHeight:24},
  speakersWrap:{flexDirection:'row',flexWrap:'wrap',gap:12},
  speakerCard:{alignItems:'center',gap:8,width:100},
  speakerAvatar:{width:64,height:64,borderRadius:32,alignItems:'center',justifyContent:'center'},
  speakerInitials:{color:c.onPrimary,fontWeight:'700',fontSize:20},
  speakerName:{fontSize:13,fontWeight:'700',color:c.text,textAlign:'center'},
  speakerRole:{fontSize:11,color:c.textMuted,textAlign:'center'},
  experienceCard:{borderWidth:1,borderColor:c.border,borderRadius:16,overflow:'hidden'},
  experienceRow:{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:16,paddingVertical:13},
  experienceBorder:{borderBottomWidth:1,borderBottomColor:c.cardAlt},
  experienceDot:{width:8,height:8,borderRadius:4,backgroundColor:c.gold},
  experienceTxt:{fontSize:14,color:c.text,flex:1},
  audienceCard:{flexDirection:'row',alignItems:'center',gap:12,borderWidth:1,borderColor:c.border,borderRadius:16,padding:16,backgroundColor:c.cardAlt},
  audienceTxt:{fontSize:15,color:c.text,fontWeight:'600',flex:1},
  notesCard:{borderWidth:1,borderColor:c.border,borderRadius:16,overflow:'hidden'},
  noteRow:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:14,gap:12},
  noteBorder:{borderBottomWidth:1,borderBottomColor:c.cardAlt},
  noteIconWrap:{width:36,height:36,borderRadius:10,backgroundColor:c.cardAlt,alignItems:'center',justifyContent:'center'},
  noteContent:{flex:1},
  noteLabel:{fontSize:11,color:c.textMuted,fontWeight:'600',textTransform:'uppercase',letterSpacing:0.4,marginBottom:2},
  noteValue:{fontSize:14,color:c.text,fontWeight:'500'},
  actionRow:{flexDirection:'row',gap:10,marginBottom:16},
  actionBtn:{flex:1,alignItems:'center',gap:6,borderWidth:1.5,borderColor:c.border,borderRadius:14,paddingVertical:14},
  actionBtnIcon:{width:40,height:40,borderRadius:12,backgroundColor:c.cardAlt,alignItems:'center',justifyContent:'center'},
  actionBtnTxt:{fontSize:12,fontWeight:'700',color:c.text},
  ticketBtn:{backgroundColor:c.primary,borderRadius:16,paddingVertical:16,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10,shadowColor:c.navy,shadowOffset:{width:0,height:4},shadowOpacity:0.3,shadowRadius:8},
  ticketBtnActive:{backgroundColor:c.green},
  ticketBtnTxt:{color:c.onPrimary,fontSize:16,fontWeight:'700'},
  modalOverlay:{position:'absolute',top:0,left:0,right:0,bottom:0,justifyContent:'flex-end'},
  modalBg:{position:'absolute',top:0,left:0,right:0,bottom:0,backgroundColor:'rgba(0,0,0,0.5)'},
  inviteSheet:{backgroundColor:c.card,borderTopLeftRadius:28,borderTopRightRadius:28,padding:20,maxHeight:'80%'},
  inviteHdr:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:4},
  inviteTitle:{fontSize:20,fontWeight:'700',color:c.text},
  closeBtn:{width:32,height:32,borderRadius:16,backgroundColor:c.cardAlt,alignItems:'center',justifyContent:'center'},
  inviteSubtitle:{fontSize:13,color:c.gold,fontWeight:'600',marginBottom:16},
  inviteUserRow:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:12,borderBottomWidth:1,borderBottomColor:c.border},
  inviteUserRowSelected:{backgroundColor:'rgba(201,169,110,0.05)'},
  inviteAvatar:{width:42,height:42,borderRadius:21,alignItems:'center',justifyContent:'center'},
  inviteAvatarTxt:{color:c.onPrimary,fontWeight:'700',fontSize:14},
  inviteUserName:{flex:1,fontSize:15,color:c.text,fontWeight:'500'},
  inviteCheck:{width:24,height:24,borderRadius:12,borderWidth:1.5,borderColor:c.placeholder,alignItems:'center',justifyContent:'center'},
  inviteCheckSelected:{backgroundColor:c.primary,borderColor:c.primary},
  sendInviteBtn:{backgroundColor:c.primary,borderRadius:16,paddingVertical:15,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,marginTop:16},
  sendInviteBtnSent:{backgroundColor:c.green},
  sendInviteTxt:{color:c.onPrimary,fontSize:15,fontWeight:'700'},
});
