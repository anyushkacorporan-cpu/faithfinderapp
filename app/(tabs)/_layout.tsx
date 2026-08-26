import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors, ThemeColors } from '../../src/lib/theme';
import { useTranslation } from '../../src/lib/i18n';
import { TAB_BAR_HEIGHT, TAB_BAR_GAP } from '../../src/lib/tabBar';

/**
 * A floating capsule rather than a full-width bar.
 *
 * The old bar put a tinted rounded rectangle behind the active icon — Material
 * Design's selection indicator, which reads as borrowed on iOS — and marked the
 * active tab three ways at once: filled glyph, gold tint, and that box. The
 * filled glyph now does it alone, in one ink colour.
 *
 * Gold is deliberately absent. It stays the accent for content — verses,
 * ratings, links — so navigation reads as chrome rather than competing with
 * what it navigates to.
 */
function TabIcon({ focused, name, label, s }: {
  focused: boolean; name: any; label: string; s: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={s.tabItem}>
      <Ionicons name={name} size={21} style={s.icon} />
      <Text style={[s.label, focused && s.labelActive]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export default function TabLayout() {
  const { t } = useTranslation();
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const s = makeStyles(c);

  // Sit above the home indicator where there is one, and keep a sensible margin
  // where there isn't, instead of the hardcoded height this screen used to use.
  const bottom = Math.max(insets.bottom, 12) + TAB_BAR_GAP;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarItemStyle: s.tabBarItem,
        tabBarStyle: [s.tabBar, { bottom }],
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
    left: 20,
    right: 20,
    height: TAB_BAR_HEIGHT,
    borderRadius: TAB_BAR_HEIGHT / 2,
    backgroundColor: c.card,
    borderTopWidth: 0,
    paddingTop: 0,
    paddingBottom: 0,
    // A hairline keeps the capsule's edge defined on a white background, where
    // a shadow alone leaves it looking as though it is dissolving.
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    // The shadow is what makes it read as floating rather than pasted on.
    ...Platform.select({
      ios: {
        shadowColor: '#1a1a2e',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: c.isDark ? 0.5 : 0.12,
        shadowRadius: 14,
      },
      android: { elevation: 10 },
      default: {},
    }),
  },
  tabBarItem: {
    height: TAB_BAR_HEIGHT,
    paddingVertical: 0,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    // Stretch to fill the slot React Navigation hands us. Without this the
    // column shrinks to the width of the 21px icon and the label truncates to
    // "Chu…"; with a fixed width instead it would overflow on a small phone.
    alignSelf: 'stretch',
    paddingHorizontal: 2,
  },
  // One ink colour throughout: the filled glyph marks the active tab, not hue.
  icon: { color: c.text },
  label: {
    fontSize: 10.5,
    color: c.text,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  labelActive: { fontWeight: '700' },
});
