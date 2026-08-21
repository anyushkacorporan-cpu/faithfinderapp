import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useThemeColors, ThemeColors } from '../lib/theme';
import { useUnreadCount } from '../lib/notificationsStore';
import { signOut } from '../lib/userStore';
import { useTranslation } from '../lib/i18n';

/**
 * The app's two global controls — notification bell (with unread badge) and the
 * settings gear that opens the settings sheet. This is the single definition of
 * both; place it wherever a screen needs them:
 *   - on its own slim row via <Header /> below (Community, Profile)
 *   - inline in a row the screen already has (the location line on Churches and
 *     Events), which costs no extra height. Pass `compact` there.
 *   - floating over a cover photo (Profile). Pass `overlay` there: the buttons
 *     become dark translucent circles with white glyphs so they stay readable
 *     over a light or a dark photo.
 */
export function HeaderIcons({ compact = false, overlay = false }: { compact?: boolean; overlay?: boolean } = {}) {
  const { t } = useTranslation();
  const c = useThemeColors();
  const s = makeStyles(c);
  const [showSettings, setShowSettings] = useState(false);
  const unread = useUnreadCount();

  return (
    <>
      <View style={s.icons}>
        <TouchableOpacity style={[s.iconBtn, compact && s.iconBtnCompact, overlay && s.iconBtnOverlay]} onPress={() => router.push('/notifications' as any)}>
          <Ionicons name="notifications-outline" size={compact ? 19 : 22} color={overlay ? '#fff' : c.text} />
          {unread > 0 && (
            <View style={s.badge}><Text style={s.badgeTxt}>{unread > 9 ? '9+' : unread}</Text></View>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={[s.iconBtn, compact && s.iconBtnCompact, overlay && s.iconBtnOverlay]} onPress={() => setShowSettings(true)}>
          <Ionicons name="settings-outline" size={compact ? 19 : 22} color={overlay ? '#fff' : c.text} />
        </TouchableOpacity>
      </View>

      {/* Settings Modal */}
      <Modal visible={showSettings} transparent animationType="slide">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowSettings(false)} />
        <View style={s.sheet}>
          <View style={s.sheetHdr}>
            <Text style={s.sheetTitle}>{t('settings')}</Text>
            <TouchableOpacity style={s.closeBtn} onPress={() => setShowSettings(false)}>
              <Ionicons name="close" size={20} color={c.text} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {[
              { icon:'calendar-outline', key:'createEvent', color:'#c9a96e' },
              { icon:'list-outline', key:'myEvents', color:'#667eea' },
              { icon:'cash-outline', key:'earnings', color:c.green },
              { icon:'notifications-outline', key:'notificationPreferences', color:c.gold },
              { icon:'location-outline', key:'locationSettings', color:c.green },
              { icon:'shield-outline', key:'privacySecurity', color:c.navy },
              { icon:'moon-outline', key:'appearance', color:'#9b59b6' },
              { icon:'help-circle-outline', key:'helpSupport', color:'#e67e22' },
              { icon:'information-circle-outline', key:'aboutApp', color:c.textMuted },
              { icon:'log-out-outline', key:'signOut', color:c.red },
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
                <View style={[s.settingIconWrap, { backgroundColor: item.color + '22' }]}>
                  <Ionicons name={item.icon as any} size={20} color={item.color} />
                </View>
                <Text style={[s.settingLabel, item.key === 'signOut' && { color: c.red }]}>{t(item.key as any)}</Text>
                {item.key !== 'signOut' && <Ionicons name="chevron-forward" size={16} color={c.placeholder} />}
              </TouchableOpacity>
            ))}
            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

/**
 * A slim, right-aligned row carrying HeaderIcons. Replaces the old wordmark bar:
 * same controls, no repeated "FaithFinder App" on every tab.
 */
export default function Header() {
  const c = useThemeColors();
  const s = makeStyles(c);
  return (
    <View style={s.header}>
      <HeaderIcons />
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  header:{flexDirection:'row',justifyContent:'flex-end',alignItems:'center',paddingHorizontal:16,paddingTop:6,paddingBottom:8,backgroundColor:c.card},
  icons:{flexDirection:'row',gap:6},
  iconBtn:{width:38,height:38,borderRadius:12,backgroundColor:c.cardAlt,alignItems:'center',justifyContent:'center',position:'relative'},
  iconBtnCompact:{width:32,height:32,borderRadius:10},
  iconBtnOverlay:{backgroundColor:'rgba(0,0,0,0.42)',borderRadius:19},
  badge:{position:'absolute',top:-4,right:-4,minWidth:18,height:18,borderRadius:9,backgroundColor:c.red,alignItems:'center',justifyContent:'center',paddingHorizontal:3,borderWidth:2,borderColor:c.card},
  badgeTxt:{color:c.white,fontSize:9,fontWeight:'700'},
  overlay:{flex:1,backgroundColor:c.overlay},
  sheet:{backgroundColor:c.card,borderTopLeftRadius:28,borderTopRightRadius:28,padding:20,maxHeight:'80%'},
  sheetHdr:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:20},
  sheetTitle:{fontSize:20,fontWeight:'700',color:c.text},
  closeBtn:{width:32,height:32,borderRadius:16,backgroundColor:c.cardAlt,alignItems:'center',justifyContent:'center'},
  settingRow:{flexDirection:'row',alignItems:'center',gap:14,paddingVertical:14,borderBottomWidth:1,borderBottomColor:c.rowBorder},
  settingIconWrap:{width:42,height:42,borderRadius:12,alignItems:'center',justifyContent:'center'},
  settingLabel:{flex:1,fontSize:15,color:c.text,fontWeight:'500'},
});
