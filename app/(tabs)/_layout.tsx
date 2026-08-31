import { Tabs } from 'expo-router';
import { useTranslation } from '../../src/lib/i18n';
import { TabBar } from '../../src/components/TabBar';

/**
 * The bar itself lives in `src/components/TabBar.tsx`, which owns its own
 * layout, depth and animation. This file is only the route table now: each
 * screen contributes a title, and the bar reads titles and route names to
 * decide what to draw.
 *
 * There is deliberately no tab-to-tab `animation`.
 *
 * Bottom tabs offer none / fade / shift, and both moving options drive the
 * screen's OPACITY from a shared progress value — `shift` interpolates
 * [-1, 0, 1] to [0, 1, 0], so a screen is fully visible only while progress
 * sits at exactly 0. Interrupt a transition, or land a re-render mid-flight,
 * and progress never settles: the screen stays at opacity 0 and the tab shows
 * blank until the next switch nudges it back. That is the blank/visible/blank
 * flicker `shift` caused here.
 *
 * A tab change is instant now. If tab motion is wanted later it needs a pager
 * that moves the screens themselves rather than fading them.
 */
export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: t('churches') }} />
      <Tabs.Screen name="events" options={{ title: t('events') }} />
      <Tabs.Screen name="community" options={{ title: t('community') }} />
      <Tabs.Screen name="profile" options={{ title: t('profile') }} />
    </Tabs>
  );
}
