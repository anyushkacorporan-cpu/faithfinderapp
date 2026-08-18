import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, ThemeColors } from '../../src/lib/theme';
import { useTranslation } from '../../src/lib/i18n';

function TabIcon({ focused, name, label, c, s }: { focused: boolean; name: any; label: string; c: ThemeColors; s: ReturnType<typeof makeStyles> }) {
  return (
    <View style={s.tabItem}>
      <View style={[s.iconWrap, focused && s.iconWrapActive]}>
        <Ionicons name={name} size={26} color={focused ? c.gold : c.textMuted} />
      </View>
      <Text style={[s.label, focused && s.labelActive]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export default function TabLayout() {
  const { t } = useTranslation();
  const c = useThemeColors();
  const s = makeStyles(c);
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: s.tabBar, tabBarShowLabel: false }}>
      <Tabs.Screen name="index" options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} name={focused ? 'home' : 'home-outline'} label={t('churches')} c={c} s={s} /> }} />
      <Tabs.Screen name="events" options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} name={focused ? 'calendar' : 'calendar-outline'} label={t('events')} c={c} s={s} /> }} />
      <Tabs.Screen name="community" options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} name={focused ? 'people' : 'people-outline'} label={t('community')} c={c} s={s} /> }} />
      <Tabs.Screen name="profile" options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} name={focused ? 'person' : 'person-outline'} label={t('profile')} c={c} s={s} /> }} />
    </Tabs>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  tabBar: {
    backgroundColor: c.card,
    borderTopWidth: 1,
    borderTopColor: c.border,
    height: 80,
    paddingBottom: 8,
    paddingTop: 4,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    width: 72,
  },
  iconWrap: {
    width: 52,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: 'rgba(201,169,110,0.16)',
  },
  label: {
    fontSize: 11,
    color: c.textMuted,
    fontWeight: '500',
    textAlign: 'center',
  },
  labelActive: {
    color: c.gold,
    fontWeight: '600',
  },
});
