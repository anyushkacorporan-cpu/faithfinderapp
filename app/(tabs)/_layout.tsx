import { Tabs } from 'expo-router';
import { StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors, ThemeColors } from '../../src/lib/theme';
import { useTranslation } from '../../src/lib/i18n';
import { TAB_BAR_HEIGHT, TAB_BAR_GAP } from '../../src/lib/tabBar';

/**
 * A floating capsule of icons, no labels.
 *
 * The old bar put a tinted rounded rectangle behind the active icon — Material
 * Design's selection indicator, which reads as borrowed on iOS — and marked the
 * active tab three ways at once: filled glyph, gold tint, and that box. The
 * filled glyph now does it alone, in one ink colour.
 *
 * Gold is deliberately absent. It stays the accent for content — verses,
 * ratings, links — so navigation reads as chrome rather than competing with
 * what it navigates to.
 *
 * The labels are gone, so the icons carry the meaning and get the room the
 * text used to take. `tabBarAccessibilityLabel` keeps each tab named for
 * VoiceOver, which is what the visible text was doing for screen readers.
 */
export default function TabLayout() {
  const { t } = useTranslation();
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const s = makeStyles(c);

  // Sit above the home indicator where there is one, and keep a sensible margin
  // where there isn't, instead of the hardcoded height this used to use.
  const bottom = Math.max(insets.bottom, 12) + TAB_BAR_GAP;

  const tab = (name: string, icon: string, label: string) => (
    <Tabs.Screen
      key={name}
      name={name}
      options={{
        tabBarAccessibilityLabel: label,
        tabBarIcon: ({ focused }) => (
          <Ionicons name={(focused ? icon : `${icon}-outline`) as any} size={25} color={c.text} />
        ),
      }}
    />
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarItemStyle: s.tabBarItem,
        tabBarStyle: [s.tabBar, { bottom }],
      }}
    >
      {tab('index', 'home', t('churches'))}
      {tab('events', 'calendar', t('events'))}
      {tab('community', 'people', t('community'))}
      {tab('profile', 'person', t('profile'))}
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
  // With no label the icon should sit dead centre, not high in the capsule.
  tabBarItem: { height: TAB_BAR_HEIGHT, paddingVertical: 0 },
});
