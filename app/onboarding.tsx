import { useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  useWindowDimensions, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Logo from '../src/components/Logo';
import { COLORS } from '../src/lib/constants';
import { useTranslation } from '../src/lib/i18n';
import { markOnboardingSeen } from '../src/lib/onboarding';

/**
 * What someone sees before they are asked for an email address.
 *
 * The app opened straight onto the sign-in form. Somebody arriving from the App
 * Store met a password box, a Bible verse and no answer to "what is this" —
 * which is a lot to ask of a stranger before they have been told what they are
 * joining. These four cards are that answer, and they are shown once.
 *
 * Deliberately not skippable-by-default: Skip is there, in the corner, for
 * people who already know. But the default path reads all four, because the
 * last one is the only place a pastor is ever told the app is for them too.
 */

type Slide = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
};

export default function Onboarding() {
  const { tx } = useTranslation();
  const { width } = useWindowDimensions();
  const scroller = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);

  const slides: Slide[] = [
    {
      icon: 'location-outline',
      title: tx('Find a church near you'),
      body: tx('More than 235,000 churches across all fifty states. Search by city, by denomination, or simply by what is closest to where you are standing.'),
    },
    {
      icon: 'calendar-outline',
      title: tx('Know what is happening'),
      body: tx('Services, bible studies, concerts, youth nights. See what is on near you and register in a couple of taps.'),
    },
    {
      icon: 'people-outline',
      title: tx('Stay connected'),
      body: tx('Share what is on your heart, connect with people from your church, and keep up with your community between Sundays.'),
    },
    {
      icon: 'home-outline',
      title: tx('Are you a church?'),
      body: tx('Claim your listing to add photos, keep your details right, post events and sell tickets. Ticket money goes straight to your own account.'),
    },
  ];

  const last = page === slides.length - 1;

  // Rounded, not floored: a swipe that settles a pixel short of the boundary is
  // still that page, and flooring leaves the dots a step behind the card.
  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  }

  function next() {
    if (last) { void done('/signup'); return; }
    scroller.current?.scrollTo({ x: (page + 1) * width, animated: true });
  }

  /**
   * Remembered before leaving, so this never appears twice.
   *
   * Not awaited: the write is to the device and a slow one must not hold up
   * the tap. If it fails, the worst outcome is seeing this again, which is a
   * far smaller wrong than a button that does nothing.
   */
  function done(to: '/signup' | '/login') {
    void markOnboardingSeen();
    router.replace(to);
  }

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <View style={s.topBar}>
        <Logo size="small" tint={COLORS.navy} />
        <TouchableOpacity onPress={() => done('/login')} hitSlop={10}>
          <Text style={s.skip}>{tx('Skip')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={s.pager}
      >
        {slides.map(slide => (
          <View key={slide.title} style={[s.slide, { width }]}>
            <View style={s.iconWrap}>
              <Ionicons name={slide.icon} size={40} color={COLORS.gold} />
            </View>
            <Text style={s.title}>{slide.title}</Text>
            <Text style={s.body}>{slide.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={s.dots}>
        {slides.map((slide, i) => (
          <View key={slide.title} style={[s.dot, i === page && s.dotOn]} />
        ))}
      </View>

      <View style={s.actions}>
        <TouchableOpacity style={s.primaryBtn} onPress={next}>
          <Text style={s.primaryTxt}>{last ? tx('Create an account') : tx('Next')}</Text>
        </TouchableOpacity>

        {/* Only on the last card. Offering "I already have an account" on card
            one invites people to leave before being told anything, which is
            the situation this screen exists to fix. */}
        {last && (
          <TouchableOpacity onPress={() => done('/login')} hitSlop={8}>
            <Text style={s.secondaryTxt}>{tx('I already have an account')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

// Fixed light colours, matching login and signup: the auth screens stay cream
// and navy whatever theme is saved, so this cannot be the one that flips.
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.cream },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4,
  },
  skip: { fontSize: 15, color: COLORS.textSecondary, fontWeight: '600' },
  pager: { flex: 1 },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
  iconWrap: {
    width: 92, height: 92, borderRadius: 46, backgroundColor: COLORS.white,
    alignItems: 'center', justifyContent: 'center', marginBottom: 32,
    borderWidth: 1, borderColor: COLORS.border,
  },
  title: {
    fontFamily: 'PlayfairDisplay_700Bold', fontSize: 28, color: COLORS.navy,
    textAlign: 'center', marginBottom: 14, lineHeight: 36,
  },
  body: {
    fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 25,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingBottom: 28 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.border },
  dotOn: { backgroundColor: COLORS.gold, width: 22 },
  actions: { paddingHorizontal: 24, paddingBottom: 12, gap: 16, alignItems: 'center' },
  primaryBtn: {
    backgroundColor: COLORS.navy, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', alignSelf: 'stretch',
  },
  primaryTxt: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  secondaryTxt: { fontSize: 15, color: COLORS.textSecondary, fontWeight: '600' },
});
