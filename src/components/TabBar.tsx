import { useEffect, useRef } from 'react';
import {
  View, Text, Pressable, Animated, StyleSheet, Platform, useWindowDimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
/**
 * What this tab bar actually needs, rather than whose type it is.
 *
 * expo-router ships its own copy of the bottom-tabs types, and it is not
 * structurally identical to @react-navigation's — the two disagree on whether
 * a header tint is a string or a ColorValue, deep inside options nobody here
 * reads. Naming the four things this component uses decouples it from that
 * argument, and from the next version where the two drift again.
 */
type TabBarProps = {
  state: {
    index: number;
    routes: { key: string; name: string; params?: object }[];
  };
  descriptors: Record<string, { options: { title?: string } }>;
  navigation: {
    emit(event: { type: 'tabPress'; target: string; canPreventDefault: true }): { defaultPrevented: boolean };
    navigate(name: string, params?: object): void;
  };
  insets: { bottom: number };
};
import { useThemeColors, ThemeColors } from '../lib/theme';
import { TAB_BAR_HEIGHT, tabBarBottom } from '../lib/tabBar';

/**
 * The floating navigation capsule.
 *
 * This replaces React Navigation's own tab bar rather than styling it. The
 * default bar lays each item out for us, which is fine until the selected tab
 * needs a card of its own behind it and a spring on tap — neither is reachable
 * through `tabBarStyle`. Owning the whole bar also means the four slots are
 * `flex: 1` siblings, so even spacing is structural rather than something to
 * tune with padding.
 *
 * DEPTH, AND WHY IT IS BUILT TWICE
 *
 * Light and dark do not share a depth model, because the same trick does not
 * work in both. On a pale background a shadow reads as height: the capsule and
 * the selected pill each cast one. On a near-black background a black shadow is
 * invisible, so depth comes from light instead — a hairline rim along the top
 * edge, the way a raised surface catches light from above, and a selected pill
 * that is *lighter* than the bar rather than darker. Inverting the light-mode
 * palette would have produced a dark pill on a dark bar, which disappears.
 *
 * GLASS
 *
 * iOS gets a real blur behind a translucent tint, so the bar takes on the
 * colour of whatever scrolls under it. Android gets an opaque surface with
 * elevation: expo-blur's Android path is experimental, and a bar that stutters
 * while the feed scrolls is worse than one that is simply solid.
 */

const ICONS: Record<string, string> = {
  index: 'home',
  events: 'calendar',
  community: 'people',
  profile: 'person',
};

/** iOS renders the blur; elsewhere the tint carries the surface on its own. */
const GLASS = Platform.OS === 'ios';

export function TabBar({ state, descriptors, navigation, insets }: TabBarProps) {
  const c = useThemeColors();
  const s = makeStyles(c);
  const { width: screenWidth } = useWindowDimensions();

  // The capsule is inset from the screen edges, but the inset gives way on
  // narrow phones: 38 either side of a 320pt SE leaves each of four tabs 61pt,
  // which "Community" does not fit into. The cap keeps it from stretching into
  // a band on a tablet.
  const inset = screenWidth < 360 ? 16 : 38;
  const width = Math.min(screenWidth - inset * 2, 420);

  return (
    <View
      pointerEvents="box-none"
      style={[s.dock, { bottom: tabBarBottom(insets.bottom) }]}
    >
      {/* The shadow lives on its own view: the one below clips its children to
          the capsule's radius, and a view that clips cannot also cast. */}
      <View style={[s.shadow, { width }]}>
        <View style={s.clip}>
          {GLASS && (
            <BlurView
              intensity={c.isDark ? 40 : 28}
              tint={c.isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          )}
          <View style={[StyleSheet.absoluteFill, s.tint]} />
          <View style={s.rim} />
          <View style={s.row}>
            {state.routes.map((route, index) => {
              const { options } = descriptors[route.key];
              const focused = state.index === index;
              const label = options.title ?? route.name;

              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress', target: route.key, canPreventDefault: true,
                });
                if (focused || event.defaultPrevented) return;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                navigation.navigate(route.name, route.params);
              };

              return (
                <Tab
                  key={route.key}
                  label={label}
                  icon={ICONS[route.name] ?? 'ellipse'}
                  focused={focused}
                  onPress={onPress}
                  c={c}
                />
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

function Tab({ label, icon, focused, onPress, c }: {
  label: string; icon: string; focused: boolean; onPress: () => void; c: ThemeColors;
}) {
  const s = makeStyles(c);

  // Two animations, kept apart because they answer to different things: `sel`
  // follows which tab is selected, `press` follows the finger. Both are
  // transform/opacity only, so both run on the native driver and survive a
  // busy JS thread.
  const sel = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const press = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(sel, {
      toValue: focused ? 1 : 0,
      useNativeDriver: true,
      friction: 8,
      tension: 120,
    }).start();
  }, [focused, sel]);

  const pillScale = sel.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] });
  const lift = sel.interpolate({ inputRange: [0, 1], outputRange: [0, -1] });

  const ink = focused ? c.navOn : c.navOff;

  return (
    <Pressable
      style={s.tab}
      onPress={onPress}
      onPressIn={() => Animated.timing(press, {
        toValue: 0.9, duration: 90, useNativeDriver: true,
      }).start()}
      onPressOut={() => Animated.spring(press, {
        toValue: 1, useNativeDriver: true, friction: 4, tension: 180,
      }).start()}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
    >
      <Animated.View
        pointerEvents="none"
        style={[s.pill, { opacity: sel, transform: [{ scale: pillScale }] }]}
      />
      <Animated.View
        pointerEvents="none"
        style={{ alignItems: 'center', transform: [{ scale: press }, { translateY: lift }] }}
      >
        <Ionicons name={(focused ? icon : `${icon}-outline`) as any} size={20} color={ink} />
        <Text style={[s.label, { color: ink }, focused && s.labelOn]} numberOfLines={1}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  dock: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },

  shadow: {
    height: TAB_BAR_HEIGHT,
    borderRadius: TAB_BAR_HEIGHT / 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        // Dark mode leans on the rim highlight instead, so its shadow only has
        // to separate the bar from the content behind it, not describe height.
        shadowOpacity: c.isDark ? 0.5 : 0.16,
        shadowRadius: 24,
      },
      // Elevation needs something opaque to cast from, which is exactly what
      // the non-glass path gives it.
      android: { elevation: 14, backgroundColor: c.navSurfaceSolid },
      default: {},
    }),
  },
  clip: { flex: 1, borderRadius: TAB_BAR_HEIGHT / 2, overflow: 'hidden' },

  tint: { backgroundColor: GLASS ? c.navSurface : c.navSurfaceSolid },

  // A single hairline along the top edge. In dark mode it is the main depth
  // cue; in light mode it just keeps the capsule's edge from dissolving into a
  // white page.
  rim: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.navRim,
  },

  row: { flex: 1, flexDirection: 'row', alignItems: 'stretch', paddingHorizontal: 6 },

  // flex: 1 across four siblings is what makes the spacing even; the whole
  // 64pt height is tappable, so every target clears 44pt on any phone width.
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  pill: {
    position: 'absolute', top: 7, bottom: 7, left: 3, right: 3,
    borderRadius: 19,
    backgroundColor: c.navPill,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: c.isDark ? 0.4 : 0.22,
        shadowRadius: 7,
      },
      android: { elevation: 3 },
      default: {},
    }),
    borderWidth: c.isDark ? StyleSheet.hairlineWidth : 0,
    borderColor: c.navPillRim,
  },

  label: { fontSize: 10.5, fontWeight: '500', letterSpacing: 0.1, marginTop: 2 },
  labelOn: { fontWeight: '700' },
});
