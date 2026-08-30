import { Tabs } from 'expo-router';
import { useTranslation } from '../../src/lib/i18n';
import { TabBar } from '../../src/components/TabBar';

/**
 * The bar itself lives in `src/components/TabBar.tsx`, which owns its own
 * layout, depth and animation. This file is only the route table now: each
 * screen contributes a title, and the bar reads titles and route names to
 * decide what to draw.
 *
 * Tab-to-tab motion is `shift` — bottom tabs offer none / fade / shift, and
 * shift is the only one that moves: the outgoing screen slides out and the
 * incoming one slides in from the opposite side, direction taken from the
 * order below. Churches → Events travels left, and back travels right.
 */
export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, animation: 'shift' }}
    >
      <Tabs.Screen name="index" options={{ title: t('churches') }} />
      <Tabs.Screen name="events" options={{ title: t('events') }} />
      <Tabs.Screen name="community" options={{ title: t('community') }} />
      <Tabs.Screen name="profile" options={{ title: t('profile') }} />
    </Tabs>
  );
}
