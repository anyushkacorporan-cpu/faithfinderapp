import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

# Step 1: Create the new full-page notifications screen
notifications_page = '''import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../src/lib/constants';
import { useNotifications, useUnreadCount, markRead, markAllRead, clearAllNotifications, clearNotification } from '../src/lib/notificationsStore';

const TYPE_LABELS: Record<string, string> = {
  like: 'Like', church_post: 'Church Post', event: 'Event',
  comment: 'Comment', share: 'Share', invite: 'Invite', verification: 'Verification',
};

export default function NotificationsScreen() {
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
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.navy} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>Notifications</Text>
        <View style={s.hdrRight}>
          {unread > 0 && (
            <TouchableOpacity style={s.markAllBtn} onPress={markAllRead}>
              <Text style={s.markAllTxt}>Mark all read</Text>
            </TouchableOpacity>
          )}
          {notifications.length > 0 && (
            <TouchableOpacity style={s.clearAllBtn} onPress={clearAllNotifications}>
              <Text style={s.clearAllTxt}>Clear all</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {notifications.length === 0 ? (
        <View style={s.emptyNotifs}>
          <Ionicons name="notifications-outline" size={48} color="#ddd" />
          <Text style={s.emptyNotifsTxt}>No notifications yet</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingHorizontal:16}}>
          {notifications.map(n => (
            <TouchableOpacity key={n.id} style={[s.notifRow, !n.read && s.notifRowUnread]} onPress={() => handleNotifTap(n)} onLongPress={() => clearNotification(n.id)} activeOpacity={0.75}>
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
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:COLORS.white},
  hdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:12,borderBottomWidth:1,borderBottomColor:COLORS.border},
  backBtn:{width:36,height:36,borderRadius:12,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'},
  hdrTitle:{fontSize:18,fontWeight:'700',color:COLORS.navy},
  hdrRight:{flexDirection:'row',alignItems:'center',gap:8},
  markAllBtn:{backgroundColor:COLORS.lightBg,borderRadius:100,paddingHorizontal:10,paddingVertical:6},
  markAllTxt:{fontSize:11,fontWeight:'600',color:COLORS.navy},
  clearAllBtn:{backgroundColor:'rgba(231,76,111,0.1)',borderRadius:100,paddingHorizontal:10,paddingVertical:6},
  clearAllTxt:{fontSize:11,fontWeight:'600',color:COLORS.red},
  emptyNotifs:{flex:1,alignItems:'center',justifyContent:'center',gap:10,paddingBottom:100},
  emptyNotifsTxt:{fontSize:14,color:'#bbb',fontWeight:'600'},
  notifRow:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:14,borderBottomWidth:1,borderBottomColor:'#f5f3ef'},
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
});
'''

with open('app/notifications.tsx', 'w', encoding='utf-8') as f:
    f.write(notifications_page)
print('Created app/notifications.tsx')

# Step 2: Update Header.tsx - bell icon navigates to page instead of opening modal
with open('src/components/Header.tsx', 'r', encoding='utf-8') as f:
    header = f.read()

old_bell = '''          <TouchableOpacity style={s.iconBtn} onPress={() => setShowNotifs(true)}>'''
new_bell = '''          <TouchableOpacity style={s.iconBtn} onPress={() => router.push('/notifications' as any)}>'''

if old_bell in header:
    header = header.replace(old_bell, new_bell)
    print('Bell icon updated to navigate to page')
else:
    print('WARNING: bell button not found')

# Step 3: Remove the entire Notifications Modal block (no longer needed)
modal_start = header.find('      {/* Notifications Modal */}')
modal_end = header.find('      {/* Settings Modal */}')
if modal_start != -1 and modal_end != -1:
    removed = header[modal_start:modal_end]
    header = header[:modal_start] + header[modal_end:]
    print('Removed Notifications Modal block, length:', len(removed))
else:
    print('WARNING: modal block markers not found')

with open('src/components/Header.tsx', 'w', encoding='utf-8') as f:
    f.write(header)

print('ALL DONE')
