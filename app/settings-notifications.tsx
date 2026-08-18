import { View, Text, Switch, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../src/lib/constants';
import { useSettings, updateNotificationPrefs, NotificationPrefs } from '../src/lib/settingsStore';
import { useTranslation } from '../src/lib/i18n';

export default function NotificationSettingsScreen() {
  const { t } = useTranslation();
  const settings = useSettings();
  const prefs = settings.notifications;

  function toggle(key: keyof NotificationPrefs) {
    updateNotificationPrefs({ [key]: !prefs[key] });
  }

  const items = [
    { key: 'likes', labelKey: 'notifLikes', descKey: 'notifLikesDesc', icon: 'heart-outline', color: COLORS.red },
    { key: 'comments', labelKey: 'notifComments', descKey: 'notifCommentsDesc', icon: 'chatbubble-outline', color: '#667eea' },
    { key: 'shares', labelKey: 'notifShares', descKey: 'notifSharesDesc', icon: 'share-social-outline', color: '#43e97b' },
    { key: 'churchPosts', labelKey: 'notifChurchPosts', descKey: 'notifChurchPostsDesc', icon: 'home-outline', color: COLORS.gold },
    { key: 'events', labelKey: 'notifEvents', descKey: 'notifEventsDesc', icon: 'calendar-outline', color: COLORS.navy },
    { key: 'invites', labelKey: 'notifInvites', descKey: 'notifInvitesDesc', icon: 'person-add-outline', color: '#9b59b6' },
    { key: 'verification', labelKey: 'notifVerification', descKey: 'notifVerificationDesc', icon: 'shield-checkmark-outline', color: COLORS.green },
    { key: 'announcements', labelKey: 'notifAnnouncements', descKey: 'notifAnnouncementsDesc', icon: 'megaphone-outline', color: '#e67e22' },
  ] as const;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.navy} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>{t('notificationPreferences')}</Text>
        <View style={{width:36}} />
      </View>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.sectionDesc}>{t('chooseNotifications')}</Text>
        <View style={s.card}>
          {items.map((item, i) => (
            <View key={item.key} style={[s.row, i < items.length-1 && s.rowBorder]}>
              <View style={[s.iconWrap, { backgroundColor: item.color + '18' }]}>
                <Ionicons name={item.icon as any} size={20} color={item.color} />
              </View>
              <View style={s.rowInfo}>
                <Text style={s.rowLabel}>{t(item.labelKey)}</Text>
                <Text style={s.rowDesc}>{t(item.descKey)}</Text>
              </View>
              <Switch
                value={prefs[item.key]}
                onValueChange={() => toggle(item.key)}
                trackColor={{ false: '#ddd', true: COLORS.navy }}
                thumbColor={COLORS.white}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:'#f8f7f4'},
  hdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:12,borderBottomWidth:1,borderBottomColor:COLORS.border,backgroundColor:COLORS.white},
  backBtn:{width:36,height:36,borderRadius:18,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'},
  hdrTitle:{fontSize:16,fontWeight:'700',color:COLORS.navy},
  scroll:{padding:20},
  sectionDesc:{fontSize:14,color:'#888',marginBottom:16,lineHeight:20},
  card:{backgroundColor:COLORS.white,borderRadius:16,borderWidth:1,borderColor:COLORS.border,overflow:'hidden',marginBottom:20},
  row:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:14,gap:12},
  rowBorder:{borderBottomWidth:1,borderBottomColor:'#f5f3ef'},
  iconWrap:{width:40,height:40,borderRadius:12,alignItems:'center',justifyContent:'center'},
  rowInfo:{flex:1},
  rowLabel:{fontSize:14,fontWeight:'600',color:COLORS.navy,marginBottom:2},
  rowDesc:{fontSize:12,color:'#aaa'},
});
