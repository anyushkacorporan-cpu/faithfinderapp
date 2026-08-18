#!/bin/bash
cd ~/Desktop/FaithFinderApp

# ── 1. NOTIFICATIONS STORE ──────────────────────────────
cat > src/lib/notificationsStore.ts << 'EOF'
import { useState, useEffect } from 'react';

export type Notification = {
  id: string;
  type: 'like' | 'church_post' | 'event' | 'comment' | 'share' | 'invite' | 'verification';
  title: string;
  body: string;
  time: string;
  read: boolean;
  icon: string;
  color: string;
  navigateTo?: string;
  navigateParams?: Record<string, string>;
};

let notifications: Notification[] = [
  {
    id: '1',
    type: 'like',
    title: 'John Smith liked your post',
    body: 'Your post is getting attention!',
    time: '2m ago',
    read: false,
    icon: 'heart',
    color: '#e74c6f',
    navigateTo: '/(tabs)/community',
  },
  {
    id: '2',
    type: 'church_post',
    title: 'Grace Community Church posted an update',
    body: 'What an incredible Sunday! Over 50 people came forward...',
    time: '1h ago',
    read: false,
    icon: 'home',
    color: '#c9a96e',
    navigateTo: '/(tabs)/community',
  },
  {
    id: '3',
    type: 'event',
    title: 'New event near you',
    body: 'Women of Purpose Conference — Apr 18-19 in Valley Stream, NY',
    time: '3h ago',
    read: false,
    icon: 'calendar',
    color: '#1a1a2e',
    navigateTo: '/event-detail',
    navigateParams: {
      id: '1',
      title: 'Women of Purpose Conference',
      description: 'Worship and fellowship for women.',
      date: 'Apr 18-19, 2026',
      location: 'Valley Stream, NY',
      type: 'Conference',
      price: 'Free',
    },
  },
  {
    id: '4',
    type: 'verification',
    title: 'Church verification under review',
    body: 'FaithFinder is reviewing your submission. 3-5 business days.',
    time: '5h ago',
    read: true,
    icon: 'shield-checkmark',
    color: '#2e7d32',
    navigateTo: '/(tabs)/profile',
  },
  {
    id: '5',
    type: 'comment',
    title: 'Sarah Johnson commented on your post',
    body: '"Amen! God is so good 🙏"',
    time: '1d ago',
    read: true,
    icon: 'chatbubble',
    color: '#667eea',
    navigateTo: '/(tabs)/community',
  },
];

const listeners: Array<() => void> = [];
function notify() { listeners.forEach(fn => fn()); }

export function getNotifications() { return [...notifications]; }
export function getUnreadCount() { return notifications.filter(n => !n.read).length; }

export function markRead(id: string) {
  notifications = notifications.map(n => n.id === id ? { ...n, read: true } : n);
  notify();
}

export function markAllRead() {
  notifications = notifications.map(n => ({ ...n, read: true }));
  notify();
}

export function addNotification(notif: Omit<Notification, 'id' | 'read'>) {
  notifications = [{ ...notif, id: Date.now().toString(), read: false }, ...notifications];
  notify();
}

export function useNotifications() {
  const [state, setState] = useState(getNotifications());
  useEffect(() => {
    const fn = () => setState(getNotifications());
    listeners.push(fn);
    return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };
  }, []);
  return state;
}

export function useUnreadCount() {
  const [count, setCount] = useState(getUnreadCount());
  useEffect(() => {
    const fn = () => setCount(getUnreadCount());
    listeners.push(fn);
    return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };
  }, []);
  return count;
}
EOF
echo "notificationsStore done"

# ── 2. UPDATED HEADER with actionable notifications ──
cat > src/components/Header.tsx << 'EOF'
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS } from '../lib/constants';
import { useNotifications, useUnreadCount, markRead, markAllRead } from '../lib/notificationsStore';

export default function Header() {
  const [showNotifs, setShowNotifs] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const notifications = useNotifications();
  const unread = useUnreadCount();

  function handleNotifOpen() {
    setShowNotifs(true);
  }

  function handleNotifTap(notif: any) {
    markRead(notif.id);
    setShowNotifs(false);
    if (notif.navigateTo) {
      if (notif.navigateParams) {
        router.push({ pathname: notif.navigateTo as any, params: notif.navigateParams });
      } else {
        router.push(notif.navigateTo as any);
      }
    }
  }

  const TYPE_LABELS: Record<string, string> = {
    like: 'Like',
    church_post: 'Church Post',
    event: 'Event',
    comment: 'Comment',
    share: 'Share',
    invite: 'Invite',
    verification: 'Verification',
  };

  return (
    <>
      <View style={s.header}>
        <Text style={s.logo}><Text style={s.gold}>Faith</Text>Finder App</Text>
        <View style={s.icons}>
          <TouchableOpacity style={s.iconBtn} onPress={handleNotifOpen}>
            <Ionicons name="notifications-outline" size={22} color={COLORS.navy} />
            {unread > 0 && (
              <View style={s.badge}><Text style={s.badgeTxt}>{unread > 9 ? '9+' : unread}</Text></View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} onPress={() => setShowSettings(true)}>
            <Ionicons name="settings-outline" size={22} color={COLORS.navy} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Notifications Modal */}
      <Modal visible={showNotifs} transparent animationType="slide">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowNotifs(false)} />
        <View style={s.sheet}>
          <View style={s.sheetHdr}>
            <Text style={s.sheetTitle}>Notifications</Text>
            <View style={s.sheetHdrRight}>
              {unread > 0 && (
                <TouchableOpacity style={s.markAllBtn} onPress={markAllRead}>
                  <Text style={s.markAllTxt}>Mark all read</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={s.closeBtn} onPress={() => setShowNotifs(false)}>
                <Ionicons name="close" size={20} color={COLORS.navy} />
              </TouchableOpacity>
            </View>
          </View>

          {notifications.length === 0 ? (
            <View style={s.emptyNotifs}>
              <Ionicons name="notifications-outline" size={40} color="#ddd" />
              <Text style={s.emptyNotifsTxt}>No notifications yet</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {notifications.map(n => (
                <TouchableOpacity
                  key={n.id}
                  style={[s.notifRow, !n.read && s.notifRowUnread]}
                  onPress={() => handleNotifTap(n)}
                  activeOpacity={0.75}
                >
                  <View style={[s.notifIconWrap, { backgroundColor: n.color + '20' }]}>
                    <Ionicons name={n.icon as any} size={20} color={n.color} />
                  </View>
                  <View style={s.notifContent}>
                    <View style={s.notifTopRow}>
                      <Text style={s.notifTitle} numberOfLines={1}>{n.title}</Text>
                      {!n.read && <View style={s.unreadDot} />}
                    </View>
                    <Text style={s.notifBody} numberOfLines={2}>{n.body}</Text>
                    <View style={s.notifBottomRow}>
                      <View style={[s.typePill, { backgroundColor: n.color + '18' }]}>
                        <Text style={[s.typePillTxt, { color: n.color }]}>{TYPE_LABELS[n.type]}</Text>
                      </View>
                      <Text style={s.notifTime}>{n.time}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#ddd" />
                </TouchableOpacity>
              ))}
              <View style={{ height: 20 }} />
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={showSettings} transparent animationType="slide">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowSettings(false)} />
        <View style={s.sheet}>
          <View style={s.sheetHdr}>
            <Text style={s.sheetTitle}>Settings</Text>
            <TouchableOpacity style={s.closeBtn} onPress={() => setShowSettings(false)}>
              <Ionicons name="close" size={20} color={COLORS.navy} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {[
              { icon:'person-outline', label:'Edit Profile', color:'#667eea' },
              { icon:'notifications-outline', label:'Notification Preferences', color:COLORS.gold },
              { icon:'location-outline', label:'Location Settings', color:COLORS.green },
              { icon:'shield-outline', label:'Privacy & Security', color:COLORS.navy },
              { icon:'moon-outline', label:'Appearance', color:'#9b59b6' },
              { icon:'help-circle-outline', label:'Help & Support', color:'#e67e22' },
              { icon:'information-circle-outline', label:'About FaithFinder', color:'#aaa' },
              { icon:'log-out-outline', label:'Sign Out', color:COLORS.red },
            ].map((item, i) => (
              <TouchableOpacity key={i} style={s.settingRow} onPress={() => {
                setShowSettings(false);
                if (item.label === 'Sign Out') { router.replace('/login'); }
                else { Alert.alert(item.label, 'Coming soon!'); }
              }}>
                <View style={[s.settingIconWrap, { backgroundColor: item.color + '18' }]}>
                  <Ionicons name={item.icon as any} size={20} color={item.color} />
                </View>
                <Text style={[s.settingLabel, item.label === 'Sign Out' && { color: COLORS.red }]}>{item.label}</Text>
                {item.label !== 'Sign Out' && <Ionicons name="chevron-forward" size={16} color="#ddd" />}
              </TouchableOpacity>
            ))}
            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:16,paddingVertical:12,borderBottomWidth:1,borderBottomColor:COLORS.border,backgroundColor:COLORS.white},
  logo:{fontFamily:'PlayfairDisplay_700Bold',fontSize:20,color:COLORS.navy},
  gold:{color:COLORS.gold},
  icons:{flexDirection:'row',gap:6},
  iconBtn:{width:38,height:38,borderRadius:12,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center',position:'relative'},
  badge:{position:'absolute',top:-4,right:-4,minWidth:18,height:18,borderRadius:9,backgroundColor:COLORS.red,alignItems:'center',justifyContent:'center',paddingHorizontal:3,borderWidth:2,borderColor:COLORS.white},
  badgeTxt:{color:COLORS.white,fontSize:9,fontWeight:'700'},
  overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.4)'},
  sheet:{backgroundColor:COLORS.white,borderTopLeftRadius:28,borderTopRightRadius:28,padding:20,maxHeight:'80%'},
  sheetHdr:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:20},
  sheetHdrRight:{flexDirection:'row',alignItems:'center',gap:10},
  sheetTitle:{fontSize:20,fontWeight:'700',color:COLORS.navy},
  markAllBtn:{backgroundColor:COLORS.lightBg,borderRadius:100,paddingHorizontal:12,paddingVertical:6},
  markAllTxt:{fontSize:12,fontWeight:'600',color:COLORS.navy},
  closeBtn:{width:32,height:32,borderRadius:16,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'},
  emptyNotifs:{paddingVertical:40,alignItems:'center',gap:10},
  emptyNotifsTxt:{fontSize:14,color:'#bbb',fontWeight:'600'},
  notifRow:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:14,paddingHorizontal:4,borderBottomWidth:1,borderBottomColor:'#f5f3ef'},
  notifRowUnread:{backgroundColor:'rgba(201,169,110,0.04)'},
  notifIconWrap:{width:46,height:46,borderRadius:14,alignItems:'center',justifyContent:'center',flexShrink:0},
  notifContent:{flex:1},
  notifTopRow:{flexDirection:'row',alignItems:'center',gap:6,marginBottom:3},
  notifTitle:{fontSize:14,fontWeight:'700',color:COLORS.navy,flex:1},
  unreadDot:{width:8,height:8,borderRadius:4,backgroundColor:COLORS.gold,flexShrink:0},
  notifBody:{fontSize:13,color:'#666',lineHeight:18,marginBottom:6},
  notifBottomRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  typePill:{borderRadius:100,paddingHorizontal:8,paddingVertical:3},
  typePillTxt:{fontSize:10,fontWeight:'700'},
  notifTime:{fontSize:11,color:'#bbb'},
  settingRow:{flexDirection:'row',alignItems:'center',gap:14,paddingVertical:14,borderBottomWidth:1,borderBottomColor:'#f5f3ef'},
  settingIconWrap:{width:42,height:42,borderRadius:12,alignItems:'center',justifyContent:'center'},
  settingLabel:{flex:1,fontSize:15,color:COLORS.navy,fontWeight:'500'},
});
EOF
echo "header done"

# ── 3. EVENT DETAIL — fix all buttons ──
cat > app/event-detail.tsx << 'EOF'
import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Share, Alert, Modal, TextInput, FlatList } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../src/lib/constants';
import { addPost } from '../src/lib/postsStore';
import { addNotification } from '../src/lib/notificationsStore';
import { getUser } from '../src/lib/userStore';

// Mock FaithFinder users to invite
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

  const GRADIENT_COLORS: Record<string, [string,string]> = {
    Conference: ['#1a1a2e','#2d2240'],
    Festival: ['#2d2240','#1a1a2e'],
    Workshop: ['#1a1a2e','#16213e'],
    Revival: ['#0f3460','#1a1a2e'],
    Service: ['#2d2240','#0f3460'],
  };
  const gradient = GRADIENT_COLORS[params.type || ''] || ['#1a1a2e','#2d2240'] as [string,string];

  function handleShare() {
    // Share to Community Discover + external share
    Alert.alert(
      'Share Event',
      'How would you like to share this event?',
      [
        {
          text: 'Post to Community',
          onPress: () => {
            const displayName = user.accountType === 'church'
              ? (user.churchName || 'Church')
              : `${user.firstName || 'User'} ${user.lastName || ''}`.trim();
            const initials = user.accountType === 'church'
              ? (user.churchName?.[0] || 'C')
              : `${user.firstName?.[0] || 'U'}${user.lastName?.[0] || ''}`;
            addPost({
              authorName: displayName,
              authorInitials: initials.toUpperCase(),
              authorType: user.accountType === 'church' ? 'church' : 'personal',
              authorColor: '#667eea',
              content: `📅 Sharing this event with the community!\n\n${params.title}\n📍 ${params.location}\n🗓 ${params.date}${params.price === 'Free' ? '\n✅ Free admission' : `\n🎟 ${params.price}`}`,
              time: 'now',
            });
            Alert.alert('Shared!', 'Event has been posted to the Community Discover section.');
          }
        },
        {
          text: 'Share Externally',
          onPress: () => {
            Share.share({
              title: params.title,
              message: `Check out this event on FaithFinder!\n\n${params.title}\n📍 ${params.location}\n📅 ${params.date}${params.price !== 'Free' ? '\n🎟 ' + params.price : '\n✅ Free'}`,
            });
          }
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }

  function handleInvite() {
    setShowInviteModal(true);
  }

  function toggleUserSelect(userId: string) {
    setSelectedUsers(p => p.includes(userId) ? p.filter(id => id !== userId) : [...p, userId]);
  }

  function handleSendInvites() {
    if (selectedUsers.length === 0) { Alert.alert('Select users', 'Please select at least one person to invite.'); return; }
    // Add notification for each invited user (simulated)
    selectedUsers.forEach(uid => {
      const user = FF_USERS.find(u => u.id === uid);
      if (user) {
        addNotification({
          type: 'invite',
          title: `You invited ${user.name}`,
          body: `Invite sent for ${params.title}`,
          time: 'now',
          icon: 'person-add',
          color: '#667eea',
          navigateTo: '/event-detail',
          navigateParams: { id: params.id, title: params.title, description: params.description, date: params.date, location: params.location, type: params.type, price: params.price },
        });
      }
    });
    setInviteSent(true);
    setTimeout(() => {
      setShowInviteModal(false);
      setSelectedUsers([]);
      setInviteSent(false);
    }, 1500);
  }

  function handleExternalShare() {
    Share.share({
      message: `Join me at ${params.title}! 📅 ${params.date} 📍 ${params.location}\n\nFind it on FaithFinder.`,
    });
  }

  async function handleAddToCalendar() {
    try {
      const { default: Calendar } = await import('expo-calendar');
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow calendar access.'); return; }
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const defaultCal = calendars.find(c => c.allowsModifications) || calendars[0];
      if (!defaultCal) { Alert.alert('No calendar found'); return; }
      await Calendar.createEventAsync(defaultCal.id, {
        title: params.title || 'FaithFinder Event',
        notes: params.description || '',
        location: params.location || '',
        startDate: new Date(),
        endDate: new Date(Date.now() + 2 * 60 * 60 * 1000),
        timeZone: 'GMT',
      });
      Alert.alert('Added!', 'Event added to your calendar.');
    } catch {
      Alert.alert('Calendar', 'Could not add to calendar. Please try again.');
    }
  }

  function handleGetTicket() {
    if (params.price === 'Free') {
      if (attending) {
        Alert.alert('Already Registered', "You're already registered for this event.");
        return;
      }
      Alert.alert(
        'Register for Free Event',
        `Register for ${params.title}?\n\n📍 ${params.location}\n📅 ${params.date}`,
        [
          {
            text: 'Register',
            onPress: () => {
              setAttending(true);
              addNotification({
                type: 'event',
                title: `Registered for ${params.title}`,
                body: `${params.date} · ${params.location}`,
                time: 'now',
                icon: 'calendar',
                color: COLORS.green,
                navigateTo: '/event-detail',
                navigateParams: { id: params.id, title: params.title, description: params.description || '', date: params.date, location: params.location, type: params.type, price: params.price },
              });
              Alert.alert('Registered! 🎉', "You're registered for this event. It has been added to your calendar.");
            }
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } else {
      Alert.alert(
        'Get Tickets',
        `Tickets for ${params.title} are ${params.price}.\n\n📍 ${params.location}\n📅 ${params.date}`,
        [
          {
            text: 'Buy Tickets',
            onPress: () => Linking.openURL('https://faithfinderapp.com/tickets').catch(() => Alert.alert('Opening ticket page...'))
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  }

  function handleDirections() {
    const q = encodeURIComponent(params.location || '');
    Linking.openURL(`maps://?q=${q}`).catch(() => Linking.openURL(`https://maps.google.com/?q=${q}`));
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Banner */}
        <LinearGradient colors={gradient} style={s.banner} start={{x:0,y:0}} end={{x:1,y:1}}>
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
              ? <View style={s.freePill}><Text style={s.freePillTxt}>✅ Free Admission</Text></View>
              : <View style={s.pricePill}><Text style={s.pricePillTxt}>🎟 {params.price}</Text></View>
            }
          </View>
        </LinearGradient>

        <View style={s.body}>

          {/* Info card */}
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
                <Ionicons name="navigate" size={13} color={COLORS.white} />
                <Text style={s.dirBtnTxt}>Directions</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Description */}
          {!!params.description && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>About this Event</Text>
              <Text style={s.descTxt}>{params.description}</Text>
            </View>
          )}

          {/* Action buttons row */}
          <View style={s.actionRow}>
            <TouchableOpacity style={s.actionBtn} onPress={handleAddToCalendar}>
              <View style={s.actionBtnIcon}><Ionicons name="calendar" size={20} color={COLORS.navy} /></View>
              <Text style={s.actionBtnTxt}>Calendar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn} onPress={handleInvite}>
              <View style={s.actionBtnIcon}><Ionicons name="person-add-outline" size={20} color={COLORS.navy} /></View>
              <Text style={s.actionBtnTxt}>Invite</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn} onPress={handleExternalShare}>
              <View style={s.actionBtnIcon}><Ionicons name="share-outline" size={20} color={COLORS.navy} /></View>
              <Text style={s.actionBtnTxt}>Share</Text>
            </TouchableOpacity>
          </View>

          {/* Get Ticket CTA */}
          <TouchableOpacity
            style={[s.ticketBtn, attending && s.ticketBtnActive]}
            onPress={handleGetTicket}
            activeOpacity={0.88}
          >
            <Ionicons name={attending ? 'checkmark-circle' : 'ticket-outline'} size={22} color={COLORS.white} />
            <Text style={s.ticketBtnTxt}>
              {attending ? "You're Registered!" : params.price === 'Free' ? 'Register — Free' : `Get Tickets — ${params.price}`}
            </Text>
          </TouchableOpacity>

        </View>
      </ScrollView>

      {/* Invite Modal */}
      <Modal visible={showInviteModal} transparent animationType="slide">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowInviteModal(false)} />
        <View style={s.inviteSheet}>
          <View style={s.inviteHdr}>
            <Text style={s.inviteTitle}>Invite to Event</Text>
            <TouchableOpacity style={s.closeBtn} onPress={() => setShowInviteModal(false)}>
              <Ionicons name="close" size={20} color={COLORS.navy} />
            </TouchableOpacity>
          </View>
          <Text style={s.inviteSubtitle}>{params.title}</Text>

          <Text style={s.inviteSectionLabel}>FaithFinder Members</Text>
          {FF_USERS.map(u => {
            const selected = selectedUsers.includes(u.id);
            return (
              <TouchableOpacity key={u.id} style={[s.inviteUserRow, selected && s.inviteUserRowSelected]} onPress={() => toggleUserSelect(u.id)}>
                <View style={[s.inviteAvatar, { backgroundColor: u.color }]}>
                  <Text style={s.inviteAvatarTxt}>{u.initials}</Text>
                </View>
                <Text style={s.inviteUserName}>{u.name}</Text>
                <View style={[s.inviteCheck, selected && s.inviteCheckSelected]}>
                  {selected && <Ionicons name="checkmark" size={14} color={COLORS.white} />}
                </View>
              </TouchableOpacity>
            );
          })}

          <View style={s.inviteDivider} />
          <Text style={s.inviteSectionLabel}>Share Externally</Text>
          <TouchableOpacity style={s.externalShareBtn} onPress={() => { setShowInviteModal(false); handleExternalShare(); }}>
            <Ionicons name="share-social-outline" size={18} color={COLORS.navy} />
            <Text style={s.externalShareTxt}>Share via Messages, Email & More</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.sendInviteBtn, inviteSent && s.sendInviteBtnSent]}
            onPress={handleSendInvites}
          >
            <Ionicons name={inviteSent ? 'checkmark-circle' : 'send-outline'} size={18} color={COLORS.white} />
            <Text style={s.sendInviteTxt}>{inviteSent ? 'Invites Sent!' : `Send Invites${selectedUsers.length > 0 ? ` (${selectedUsers.length})` : ''}`}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:COLORS.white},
  banner:{height:300,justifyContent:'space-between',padding:16,paddingBottom:20},
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
  dirBtnTxt:{color:COLORS.white,fontSize:12,fontWeight:'700'},
  section:{marginBottom:20},
  sectionTitle:{fontSize:17,fontWeight:'700',color:COLORS.navy,marginBottom:8},
  descTxt:{fontSize:14,color:'#555',lineHeight:22},
  actionRow:{flexDirection:'row',gap:10,marginBottom:16},
  actionBtn:{flex:1,alignItems:'center',gap:6,borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,paddingVertical:14},
  actionBtnIcon:{width:40,height:40,borderRadius:12,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'},
  actionBtnTxt:{fontSize:12,fontWeight:'700',color:COLORS.navy},
  ticketBtn:{backgroundColor:COLORS.navy,borderRadius:16,paddingVertical:16,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10,shadowColor:COLORS.navy,shadowOffset:{width:0,height:4},shadowOpacity:0.3,shadowRadius:8},
  ticketBtnActive:{backgroundColor:COLORS.green},
  ticketBtnTxt:{color:COLORS.white,fontSize:16,fontWeight:'700'},
  overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.5)'},
  inviteSheet:{backgroundColor:COLORS.white,borderTopLeftRadius:28,borderTopRightRadius:28,padding:20,maxHeight:'80%'},
  inviteHdr:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:4},
  inviteTitle:{fontSize:20,fontWeight:'700',color:COLORS.navy},
  closeBtn:{width:32,height:32,borderRadius:16,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'},
  inviteSubtitle:{fontSize:13,color:COLORS.gold,fontWeight:'600',marginBottom:16},
  inviteSectionLabel:{fontSize:11,fontWeight:'700',color:'#bbb',textTransform:'uppercase',letterSpacing:0.5,marginBottom:10},
  inviteUserRow:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:12,borderBottomWidth:1,borderBottomColor:COLORS.border},
  inviteUserRowSelected:{backgroundColor:'rgba(201,169,110,0.05)'},
  inviteAvatar:{width:42,height:42,borderRadius:21,alignItems:'center',justifyContent:'center'},
  inviteAvatarTxt:{color:COLORS.white,fontWeight:'700',fontSize:14},
  inviteUserName:{flex:1,fontSize:15,color:COLORS.navy,fontWeight:'500'},
  inviteCheck:{width:24,height:24,borderRadius:12,borderWidth:1.5,borderColor:'#ddd',alignItems:'center',justifyContent:'center'},
  inviteCheckSelected:{backgroundColor:COLORS.navy,borderColor:COLORS.navy},
  inviteDivider:{height:1,backgroundColor:COLORS.border,marginVertical:16},
  externalShareBtn:{flexDirection:'row',alignItems:'center',gap:10,borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,padding:14,marginBottom:16},
  externalShareTxt:{fontSize:14,fontWeight:'600',color:COLORS.navy},
  sendInviteBtn:{backgroundColor:COLORS.navy,borderRadius:16,paddingVertical:15,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},
  sendInviteBtnSent:{backgroundColor:COLORS.green},
  sendInviteTxt:{color:COLORS.white,fontSize:15,fontWeight:'700'},
});
EOF
echo "event-detail done"

echo "ALL DONE"
