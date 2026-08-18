import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/lib/constants';
import { useTranslation } from '../../src/lib/i18n';

function TabIcon({ focused, name, label }: { focused: boolean; name: any; label: string }) {
  return (
    <View style={s.tabItem}>
      <View style={[s.iconWrap, focused && s.iconWrapActive]}>
        <Ionicons name={name} size={26} color={focused ? COLORS.gold : '#aaa'} />
      </View>
      <Text style={[s.label, focused && s.labelActive]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export default function TabLayout() {
  const { t } = useTranslation();
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: s.tabBar, tabBarShowLabel: false }}>
      <Tabs.Screen name="index" options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} name={focused ? 'home' : 'home-outline'} label={t('churches')} /> }} />
      <Tabs.Screen name="events" options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} name={focused ? 'calendar' : 'calendar-outline'} label={t('events')} /> }} />
      <Tabs.Screen name="community" options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} name={focused ? 'people' : 'people-outline'} label={t('community')} /> }} />
      <Tabs.Screen name="profile" options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} name={focused ? 'person' : 'person-outline'} label={t('profile')} /> }} />
    </Tabs>
  );
}

const s = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: '#f0ede8',
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
    backgroundColor: 'rgba(201,169,110,0.12)',
  },
  label: {
    fontSize: 11,
    color: '#aaa',
    fontWeight: '500',
    textAlign: 'center',
  },
  labelActive: {
    color: COLORS.gold,
    fontWeight: '600',
  },
});
