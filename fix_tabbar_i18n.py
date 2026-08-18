path = '/Users/AnyushkaAriesCorporan/Desktop/FaithFinderApp/app/(tabs)/_layout.tsx'
with open(path, encoding='utf-8') as f:
    content = f.read()

old1 = "import { COLORS } from '../../src/lib/constants';"
new1 = "import { COLORS } from '../../src/lib/constants';\nimport { useTranslation } from '../../src/lib/i18n';"
c1 = content.count(old1)
print('import occurrences:', c1)
if c1 == 1:
    content = content.replace(old1, new1)

old2 = """export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: s.tabBar, tabBarShowLabel: false }}>
      <Tabs.Screen name="index" options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} name={focused ? 'home' : 'home-outline'} label="Churches" /> }} />
      <Tabs.Screen name="events" options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} name={focused ? 'calendar' : 'calendar-outline'} label="Events" /> }} />
      <Tabs.Screen name="community" options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} name={focused ? 'people' : 'people-outline'} label="Community" /> }} />
      <Tabs.Screen name="profile" options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} name={focused ? 'person' : 'person-outline'} label="Profile" /> }} />
    </Tabs>
  );
}"""
new2 = """export default function TabLayout() {
  const { t } = useTranslation();
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: s.tabBar, tabBarShowLabel: false }}>
      <Tabs.Screen name="index" options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} name={focused ? 'home' : 'home-outline'} label={t('churches')} /> }} />
      <Tabs.Screen name="events" options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} name={focused ? 'calendar' : 'calendar-outline'} label={t('events')} /> }} />
      <Tabs.Screen name="community" options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} name={focused ? 'people' : 'people-outline'} label={t('community')} /> }} />
      <Tabs.Screen name="profile" options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} name={focused ? 'person' : 'person-outline'} label={t('profile')} /> }} />
    </Tabs>
  );
}"""
c2 = content.count(old2)
print('TabLayout occurrences:', c2)
if c2 == 1:
    content = content.replace(old2, new2)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
