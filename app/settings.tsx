import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors, ThemeColors } from '../src/lib/theme';
import { signOut } from '../src/lib/userStore';
import { signOut as signOutServer } from '../src/lib/auth';
import { useTranslation } from '../src/lib/i18n';

/**
 * Settings, as a screen rather than a sheet.
 *
 * This was a bottom sheet capped at 80% height, so opening it left the tab
 * underneath showing along the top - the Community header bleeding through
 * above what was supposed to be a settings page. Every row here already
 * navigated to a full screen, so the menu was the only part of the flow that
 * was not one.
 *
 * As a route it covers the screen the way its own destinations do, carries a
 * back button instead of a close cross, and sits inside a SafeAreaView so the
 * title clears the notch on any device rather than depending on a percentage.
 */
const ROWS = [
  { icon: 'calendar-outline',            key: 'createEvent',             route: '/create-event' },
  { icon: 'list-outline',                key: 'myEvents',                route: '/my-events' },
  { icon: 'cash-outline',                key: 'earnings',                route: '/earnings' },
  { icon: 'notifications-outline',       key: 'notificationPreferences', route: '/settings-notifications' },
  { icon: 'location-outline',            key: 'locationSettings',        route: '/settings-location' },
  { icon: 'shield-outline',              key: 'privacySecurity',         route: '/settings-privacy' },
  { icon: 'ban-outline',                 key: 'blockedUsers',            route: '/settings-blocked' },
  { icon: 'moon-outline',                key: 'appearance',              route: '/settings-appearance' },
  { icon: 'help-circle-outline',         key: 'helpSupport',             route: '/settings-help' },
  { icon: 'information-circle-outline',  key: 'aboutApp',                route: '/settings-about' },
  { icon: 'log-out-outline',             key: 'signOut',                 route: null },
] as const;

export default function SettingsScreen() {
  const c = useThemeColors();
  const s = makeStyles(c);
  const { t } = useTranslation();

  const colorFor = (key: string) => ({
    createEvent: '#c9a96e', myEvents: '#667eea', earnings: c.green,
    notificationPreferences: c.gold, locationSettings: c.green,
    privacySecurity: c.navy, blockedUsers: c.red, appearance: '#9b59b6',
    helpSupport: '#e67e22', aboutApp: c.textMuted, signOut: c.red,
  } as Record<string, string>)[key] || c.textMuted;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>{t('settings')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {ROWS.map(item => {
          const color = colorFor(item.key);
          return (
            <TouchableOpacity
              key={item.key}
              style={s.row}
              onPress={() => {
                if (item.route) { router.push(item.route as any); return; }
                // Both halves: the device's idea of who is signed in, and the
                // session on the server. Without the second, the next launch
                // restores the session and signing out did nothing.
                signOutServer();
                signOut();
                router.replace('/login');
              }}
            >
              <View style={[s.iconWrap, { backgroundColor: color + '22' }]}>
                <Ionicons name={item.icon as any} size={20} color={color} />
              </View>
              <Text style={[s.label, item.key === 'signOut' && { color: c.red }]}>
                {t(item.key as any)}
              </Text>
              {item.key !== 'signOut' && (
                <Ionicons name="chevron-forward" size={16} color={c.placeholder} />
              )}
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 28 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root:{flex:1,backgroundColor:c.bg},
  hdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:12,borderBottomWidth:1,borderBottomColor:c.border,backgroundColor:c.card},
  backBtn:{width:36,height:36,borderRadius:18,backgroundColor:c.cardAlt,alignItems:'center',justifyContent:'center'},
  hdrTitle:{fontSize:16,fontWeight:'700',color:c.text},
  scroll:{paddingHorizontal:20,paddingTop:8},
  row:{flexDirection:'row',alignItems:'center',gap:14,paddingVertical:14,borderBottomWidth:1,borderBottomColor:c.rowBorder},
  iconWrap:{width:38,height:38,borderRadius:12,alignItems:'center',justifyContent:'center'},
  label:{flex:1,fontSize:15,color:c.text,fontWeight:'500'},
});
