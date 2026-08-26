import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors, ThemeColors } from '../../src/lib/theme';
import { useTranslation } from '../../src/lib/i18n';

/**
 * A floating capsule rather than a full-width bar.
 *
 * The previous bar put a tinted rounded rectangle behind the active icon —
 * Material Design's selection indicator, which reads as borrowed on iOS — and
 * signalled the active tab three ways at once: filled glyph, gold tint, and
 * that box. Here the filled glyph does it alone, in one ink colour, which is
 * how the reference and Apple's own apps behave.
 *
 * Gold is deliberately absent. It stays the accent for content — verses,
 * ratings, links — so navigation reads as chrome rather than competing with
 * the things it navigates to.
 */
const BAR_HEIGHT = 68;   // the capsule itself
const BAR_GAP = 12;      // breathing room below it
/** What screens must clear so a scroll can end above the floating bar. */
export const TAB_BAR_CLEARANCE = BAR_HEIGHT + BAR_GAP + 12;

function TabIcon({ focused, name, label, s }: {
  focused: boolean; name: any; label: string; s: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={s.tabItem}>
      <Ionicons name={name} size={25} style={s.icon} />
      <Text style={[s.label, focused && s.labelActive]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export default function TabLayout() {
  const { t } = useTranslation();
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const s = makeStyles(c);

  // Sit above the home indicator on phones that have one, and keep a sensible
  // margin on those that don't, instead of the hardcoded height this used.
  const bottom = Math.max(insets.bottom, 10) + BAR_GAP - 8;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarItemStyle: s.tabBarItem,
        tabBarStyle: [s.tabBar, { bottom, height: BAR_HEIGHT }],
      }}
    >
      <Tabs.Screen name="index"     options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} name={focused ? 'home'     : 'home-outline'}     label={t('churches')}  s={s} /> }} />
      <Tabs.Screen name="events"    options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} name={focused ? 'calendar' : 'calendar-outline'} label={t('events')}    s={s} /> }} />
      <Tabs.Screen name="community" options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} name={focused ? 'people'   : 'people-outline'}   label={t('community')} s={s} /> }} />
      <Tabs.Screen name="profile"   options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} name={focused ? 'person'   : 'person-outline'}   label={t('profile')}   s={s} /> }} />
    </Tabs>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: BAR_HEIGHT / 2,
    backgroundColor: c.card,
    borderTopWidth: 0,
    paddingTop: 6,
    paddingBottom: 0,
    // The shadow is what makes it read as floating rather than pasted on.
    ...Platform.select({
      ios: {
        shadowColor: '#1a1a2e',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: c.isDark ? 0.5 : 0.14,
        shadowRadius: 16,
      },
      android: { elevation: 12 },
      default: {},
    }),
  },
  tabBarItem: {
    // React Navigation centres items in a taller bar by default; the capsule
    // is short, so the item owns its own vertical rhythm.
    height: BAR_HEIGHT,
    paddingVertical: 0,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    width: 78,
  },
  // One ink colour throughout: the filled glyph marks the active tab, not hue.
  icon: { color: c.text },
  label: {
    fontSize: 12.5,
    color: c.text,
    fontWeight: '500',
    textAlign: 'center',
  },
  labelActive: { fontWeight: '700' },
});
