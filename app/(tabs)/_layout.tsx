import { Tabs } from 'expo-router';
import { Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors, ThemeColors } from '../../src/lib/theme';
import { useTranslation } from '../../src/lib/i18n';
import { TAB_BAR_HEIGHT, tabBarBottom } from '../../src/lib/tabBar';

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
 *
 * Icon and label are handed to React Navigation as separate options rather than
 * drawn together inside one View in `tabBarIcon`. That earlier arrangement made
 * the column shrink to the icon's width and truncated every label to "Chu…";
 * when the library owns the label it lays it out across the whole tab slot.
 */
export default function TabLayout() {
  const { t } = useTranslation();
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const s = makeStyles(c);

  const bottom = tabBarBottom(insets.bottom);

  const tab = (name: string, icon: string, label: string) => (
    <Tabs.Screen
      key={name}
      name={name}
      options={{
        tabBarIcon: ({ focused }) => (
          <Ionicons name={(focused ? icon : `${icon}-outline`) as any} size={21} color={c.text} />
        ),
        tabBarLabel: ({ focused }) => (
          <Text style={[s.label, focused && s.labelActive]} numberOfLines={1}>{label}</Text>
        ),
      }}
    />
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarItemStyle: s.tabBarItem,
        tabBarIconStyle: s.iconStyle,
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
    paddingTop: 9,
    paddingBottom: 9,
    // A hairline keeps the capsule's edge defined on a white background, where
    // a shadow alone leaves it looking as though it is dissolving.
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    // The shadow is what makes it read as floating rather than pasted on, and
    // it has to survive the worst case: sitting over a photograph, where a
    // faint one vanishes into the image. Wide and soft rather than dark and
    // tight - a tight shadow reads as a drop shadow, a wide one as height.
    ...Platform.select({
      ios: {
        shadowColor: '#1a1a2e',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: c.isDark ? 0.55 : 0.20,
        shadowRadius: 22,
      },
      android: { elevation: 16 },
      default: {},
    }),
  },
  // No horizontal padding: the label needs the full slot to stay whole.
  tabBarItem: { paddingHorizontal: 0 },
  iconStyle: { marginTop: 0 },
  label: {
    fontSize: 10.5,
    color: c.text,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.1,
    marginTop: 2,
  },
  labelActive: { fontWeight: '700' },
});
