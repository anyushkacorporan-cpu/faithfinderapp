import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors, ThemeColors } from '../src/lib/theme';
import { useNotifications, useUnreadCount, markRead, markAllRead, clearAllNotifications, clearNotification } from '../src/lib/notificationsStore';
import { useTranslation } from '../src/lib/i18n';

const TYPE_KEYS: Record<string, string> = {
  like: 'typeLike', church_post: 'typeChurchPost', event: 'typeEvent',
  comment: 'typeComment', share: 'typeShare', invite: 'typeInvite', verification: 'typeVerification',
};

export default function NotificationsScreen() {
  const c = useThemeColors();
  const s = makeStyles(c);
  const { t } = useTranslation();
  const notifications = useNotifications();
  const unread = useUnreadCount();

  function handleNotifTap(notif: any) {
    markRead(notif.id);
    if (notif.navigateTo) {
      if (notif.navigateParams) {
        router.push({ pathname: notif.navigateTo as any, params: notif.navigateParams });
      } else {
        router.push(notif.navigateTo as any);
      }
    }
  }

  return (
    <GestureHandlerRootView style={{flex:1}}>
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={c.text} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>{t('notifications')}</Text>
        <View style={s.hdrRight}>
          {unread > 0 && (
            <TouchableOpacity style={s.markAllBtn} onPress={markAllRead}>
              <Text style={s.markAllTxt}>{t('markAllRead')}</Text>
            </TouchableOpacity>
          )}
          {notifications.length > 0 && (
            <TouchableOpacity style={s.clearAllBtn} onPress={clearAllNotifications}>
              <Text style={s.clearAllTxt}>{t('clearAll')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {notifications.length === 0 ? (
        <View style={s.emptyNotifs}>
          <Ionicons name="notifications-outline" size={48} color={c.placeholder} />
          <Text style={s.emptyNotifsTxt}>{t('noNotificationsYet')}</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingHorizontal:16}}>
          {notifications.map(n => (
            <Swipeable
              key={n.id}
              friction={2}
              rightThreshold={40}
              renderRightActions={() => (
                <TouchableOpacity
                  style={s.deleteAction}
                  onPress={() => clearNotification(n.id)}
                >
                  <Ionicons name="trash-outline" size={22} color="#fff" />
                  <Text style={s.deleteActionTxt}>{t('delete')}</Text>
                </TouchableOpacity>
              )}
            >
              <TouchableOpacity style={[s.notifRow, !n.read && s.notifRowUnread]} onPress={() => handleNotifTap(n)} activeOpacity={0.75}>
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
                      <Text style={[s.typePillTxt, { color: n.color }]}>{t(TYPE_KEYS[n.type] as any)}</Text>
                    </View>
                    <Text style={s.notifTime}>{n.time}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={c.placeholder} />
              </TouchableOpacity>
            </Swipeable>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root:{flex:1,backgroundColor:c.card},
  hdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:12,borderBottomWidth:1,borderBottomColor:c.border},
  backBtn:{width:36,height:36,borderRadius:12,backgroundColor:c.cardAlt,alignItems:'center',justifyContent:'center'},
  hdrTitle:{fontSize:18,fontWeight:'700',color:c.text},
  hdrRight:{flexDirection:'row',alignItems:'center',gap:8},
  markAllBtn:{backgroundColor:c.cardAlt,borderRadius:100,paddingHorizontal:10,paddingVertical:6},
  markAllTxt:{fontSize:11,fontWeight:'600',color:c.text},
  clearAllBtn:{backgroundColor:'rgba(231,76,111,0.1)',borderRadius:100,paddingHorizontal:10,paddingVertical:6},
  clearAllTxt:{fontSize:11,fontWeight:'600',color:c.red},
  emptyNotifs:{flex:1,alignItems:'center',justifyContent:'center',gap:10,paddingBottom:100},
  emptyNotifsTxt:{fontSize:14,color:c.textMuted,fontWeight:'600'},
  notifRow:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:14,borderBottomWidth:1,borderBottomColor:c.cardAlt},
  deleteAction:{backgroundColor:'#ef4444',justifyContent:'center',alignItems:'center',width:80,gap:4},
  deleteActionTxt:{color:'#fff',fontSize:11,fontWeight:'700'},
  notifRowUnread:{backgroundColor:'rgba(201,169,110,0.04)'},
  notifIconWrap:{width:46,height:46,borderRadius:14,alignItems:'center',justifyContent:'center',flexShrink:0},
  notifContent:{flex:1},
  notifTopRow:{flexDirection:'row',alignItems:'center',gap:6,marginBottom:3},
  notifTitle:{fontSize:14,fontWeight:'700',color:c.text,flex:1},
  unreadDot:{width:8,height:8,borderRadius:4,backgroundColor:c.gold,flexShrink:0},
  notifBody:{fontSize:13,color:c.textSecondary,lineHeight:18,marginBottom:6},
  notifBottomRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  typePill:{borderRadius:100,paddingHorizontal:8,paddingVertical:3},
  typePillTxt:{fontSize:10,fontWeight:'700'},
  notifTime:{fontSize:11,color:c.textMuted},
});
