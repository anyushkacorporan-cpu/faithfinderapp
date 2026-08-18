import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS } from '../lib/constants';
import { useNotifications, useUnreadCount, markRead, markAllRead, clearAllNotifications, clearNotification } from '../lib/notificationsStore';
import { signOut } from '../lib/userStore';
import Logo from './Logo';
import { useTranslation } from '../lib/i18n';

export default function Header() {
  const { t } = useTranslation();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const notifications = useNotifications();
  const unread = useUnreadCount();

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
    like: 'Like', church_post: 'Church Post', event: 'Event',
    comment: 'Comment', share: 'Share', invite: 'Invite', verification: 'Verification',
  };

  return (
    <>
      <View style={s.header}>
        <Logo size="small" />
        <View style={s.icons}>
          <TouchableOpacity style={s.iconBtn} onPress={() => router.push('/notifications' as any)}>
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

      {/* Settings Modal */}
      <Modal visible={showSettings} transparent animationType="slide">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowSettings(false)} />
        <View style={s.sheet}>
          <View style={s.sheetHdr}>
            <Text style={s.sheetTitle}>{t('settings')}</Text>
            <TouchableOpacity style={s.closeBtn} onPress={() => setShowSettings(false)}>
              <Ionicons name="close" size={20} color={COLORS.navy} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {[
              { icon:'calendar-outline', key:'createEvent', color:'#c9a96e' },
              { icon:'list-outline', key:'myEvents', color:'#667eea' },
              { icon:'cash-outline', key:'earnings', color:COLORS.green },
              { icon:'notifications-outline', key:'notificationPreferences', color:COLORS.gold },
              { icon:'location-outline', key:'locationSettings', color:COLORS.green },
              { icon:'shield-outline', key:'privacySecurity', color:COLORS.navy },
              { icon:'moon-outline', key:'appearance', color:'#9b59b6' },
              { icon:'help-circle-outline', key:'helpSupport', color:'#e67e22' },
              { icon:'information-circle-outline', key:'aboutApp', color:'#aaa' },
              { icon:'log-out-outline', key:'signOut', color:COLORS.red },
            ].map((item, i) => (
              <TouchableOpacity key={i} style={s.settingRow} onPress={() => {
                setShowSettings(false);
                if (item.key === 'signOut') {
                  signOut();
                  router.replace('/login');
                } else if (item.key === 'createEvent') {
                  router.push('/create-event');
                } else if (item.key === 'myEvents') {
                  router.push('/my-events');
                } else if (item.key === 'earnings') {
                  router.push('/earnings');
                } else if (item.key === 'notificationPreferences') {
                  router.push('/settings-notifications');
                } else if (item.key === 'locationSettings') {
                  router.push('/settings-location');
                } else if (item.key === 'privacySecurity') {
                  router.push('/settings-privacy');
                } else if (item.key === 'appearance') {
                  router.push('/settings-appearance');
                } else if (item.key === 'helpSupport') {
                  router.push('/settings-help');
                } else if (item.key === 'aboutApp') {
                  router.push('/settings-about');
                }
              }}>
                <View style={[s.settingIconWrap, { backgroundColor: item.color + '18' }]}>
                  <Ionicons name={item.icon as any} size={20} color={item.color} />
                </View>
                <Text style={[s.settingLabel, item.key === 'signOut' && { color: COLORS.red }]}>{t(item.key as any)}</Text>
                {item.key !== 'signOut' && <Ionicons name="chevron-forward" size={16} color="#ddd" />}
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
