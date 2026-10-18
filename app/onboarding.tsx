import { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ImageBackground,
  useWindowDimensions, NativeSyntheticEvent, NativeScrollEvent, StatusBar,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../src/lib/constants';
import { useTranslation } from '../src/lib/i18n';
import { SLIDES, Slide } from '../src/lib/onboardingSlides';
import { getUser } from '../src/lib/userStore';
import { markOnboardingSeen, hasSeenOnboarding, hydrated } from '../src/lib/onboarding';

/**
 * What someone sees once their account exists, before the app itself.
 *
 * Full-bleed, dark, serif: the look the design asked for. A photograph behind
 * each card where one has been supplied, and a gradient in the same key where
 * one has not — so a missing image reads as a choice rather than as a gap, and
 * the photographs do not have to arrive together.
 *
 * Every route in is an end-of-signup route, and the flag is set on the way out,
 * so a claim or a registration months later passes straight through. Settings →
 * How Four Circle works replays it with ?replay=1.
 *
 * The words live in src/lib/onboardingSlides.ts, away from the markup, because
 * they are the part most likely to change and nobody should have to read a
 * component to change them.
 */

export default function Onboarding() {
  const { tx } = useTranslation();
  const { replay } = useLocalSearchParams<{ replay?: string }>();
  const isReplay = replay === '1';
  const { width } = useWindowDimensions();
  const scroller = useRef<ScrollView>(null);

  // A church account is addressed by the church's name, a personal one by a
  // first name. "Friend" only if the account somehow has neither, which is
  // better than greeting somebody by an empty space.
  const u = getUser();
  const name = (u.accountType === 'church' ? u.churchName : u.firstName)?.trim() || tx('Friend');
  const [page, setPage] = useState(0);

  const [checked, setChecked] = useState(false);
  useEffect(() => {
    if (isReplay) { setChecked(true); return; }
    let live = true;
    void hydrated.then(() => {
      if (!live) return;
      if (hasSeenOnboarding()) router.replace('/(tabs)');
      else setChecked(true);
    });
    return () => { live = false; };
  }, [isReplay]);

  const last = page === SLIDES.length - 1;

  // Rounded, not floored: a swipe settling a pixel short of the boundary is
  // still that page, and flooring leaves the progress bar a step behind.
  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  }

  function next() {
    if (last) { leave(); return; }
    scroller.current?.scrollTo({ x: (page + 1) * width, animated: true });
  }

  /**
   * Out, and remembered so this never appears twice.
   *
   * The write is not awaited: it is to the device, and a slow one must not hold
   * up the tap. If it fails the worst outcome is seeing this again, which is a
   * smaller wrong than a button that does nothing.
   */
  function leave() {
    if (isReplay) { router.back(); return; }
    void markOnboardingSeen();
    router.replace('/(tabs)');
  }

  if (!checked) return <View style={s.hold} />;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {SLIDES.map(slide => (
          <SlideView key={slide.title || 'welcome'} slide={slide} width={width} tx={tx} name={name} />
        ))}
      </ScrollView>

      {/* Over the cards rather than beside them, so each photograph runs to
          every edge of the screen. */}
      <SafeAreaView style={s.topBar} edges={['top']} pointerEvents="box-none">
        <View style={s.topRow}>
          <View style={s.brand}>
            {/* Drawn, not typed. A cross typed as a character is a glyph the
                font decides how to render, and on some devices it arrives
                looking like an emoji. Two gold bars are the same mark the
                app's own Logo draws, at the same proportions, and they look
                the same on every phone. */}
            <View style={s.cross}>
              <View style={s.crossV} />
              <View style={s.crossH} />
            </View>
            <Text style={s.brandTxt}>Four Circle</Text>
          </View>

          <View style={s.progress}>
            {SLIDES.map((slide, i) => (
              <View key={slide.title || 'welcome'} style={[s.seg, i === page && s.segOn]} />
            ))}
          </View>

          <TouchableOpacity style={s.skip} onPress={leave} hitSlop={8}>
            <Text style={s.skipTxt}>{tx(isReplay ? 'Done' : 'Skip')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <SafeAreaView style={s.bottomBar} edges={['bottom']} pointerEvents="box-none">
        <TouchableOpacity style={s.cta} onPress={next} activeOpacity={0.85}>
          <Text style={s.ctaTxt}>
            {last ? tx(isReplay ? 'Done' : 'Get started') : tx('Continue')}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

function SlideView({ slide, width, tx, name }: {
  slide: Slide; width: number; tx: (s: string) => string; name: string;
}) {
  // Dark at both ends and lighter through the middle: the top has to carry the
  // wordmark and the bottom a button, while the photograph stays visible where
  // nothing sits on it.
  const scrim = ['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.8)'] as const;

  // Translate first, then drop the name in: the placeholder travels through
  // the Spanish as well, and Spanish puts it at the end rather than after
  // the greeting.
  const heading = tx(slide.title).replace('{name}', name);
  const headingHasName = slide.title.includes('{name}');

  const content = (
    <LinearGradient colors={scrim} locations={[0, 0.35, 1]} style={{ width, flex: 1 }}>
      {/* Each card scrolls on its own. "Why we built this" is long, and on a
          small phone it would otherwise be cut off at whatever line the screen
          ends on, with nothing to say so. Vertical inside horizontal is fine:
          the gestures do not fight. */}
      <ScrollView
        contentContainerStyle={s.slide}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
      <View style={s.card}>
        {/* Only the greeting carries a name, and a long one would otherwise
            wrap to four lines of 38pt serif, so that line alone steps down a
            size at a time. The written titles are set to fit as they are. */}
        <Text style={[s.title, headingHasName && nameSize(heading)]}>
          {heading}
        </Text>

        <View style={s.rule} />

        {!!slide.lead && <Text style={s.lead}>{tx(slide.lead)}</Text>}

        {/* A blank line in the copy is a paragraph break, not a line break. */}
        {!!slide.body && tx(slide.body).split('\n\n').map((para, i) => (
          <Text key={i} style={[s.body, i > 0 && s.bodyNext]}>{para}</Text>
        ))}

        {!!slide.verse && (
          <View style={s.verseWrap}>
            <Text style={s.verse}>“{tx(slide.verse.text)}”</Text>
            <Text style={s.verseRef}>{tx(slide.verse.ref)}</Text>
          </View>
        )}
      </View>
      </ScrollView>
    </LinearGradient>
  );

  if (!slide.image) {
    return (
      <LinearGradient colors={slide.gradient} style={{ width }}>
        {content}
      </LinearGradient>
    );
  }
  return (
    <ImageBackground source={slide.image} style={{ width }} resizeMode="cover">
      {content}
    </ImageBackground>
  );
}

const GOLD = COLORS.gold;

/**
 * Smaller type for a longer name.
 *
 * "Maria" and "First United Methodist Church of Glen Cove" go in the same
 * slot. At one size the second wraps to four lines and swamps the card, so it
 * steps down instead. Three steps is enough: past that it is not the type size
 * that is wrong, it is the length, and shrinking further only makes it
 * unreadable as well as long.
 */
function nameSize(name: string) {
  if (name.length > 34) return { fontSize: 24, lineHeight: 32 };
  if (name.length > 20) return { fontSize: 30, lineHeight: 38 };
  return null;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b0908' },
  hold: { flex: 1, backgroundColor: '#0b0908' },

  slide: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 30, paddingTop: 108, paddingBottom: 140 },
  card: { alignItems: 'center' },

  title: {
    fontFamily: 'PlayfairDisplay_700Bold', fontSize: 38, lineHeight: 46,
    color: '#fff', textAlign: 'center',
  },
  // The short gold rule under every title, which is what makes the seven read
  // as one set rather than seven screens.
  rule: { width: 64, height: 2, backgroundColor: GOLD, marginTop: 16, marginBottom: 20 },
  body: {
    fontSize: 17, lineHeight: 28, color: 'rgba(255,255,255,0.88)', textAlign: 'center',
  },
  bodyNext: { marginTop: 14 },
  // Bold, white, clearly under the title rather than competing with it.
  lead: {
    fontSize: 19, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 14,
  },

  verseWrap: { marginTop: 28, alignItems: 'center' },
  verse: {
    fontFamily: 'PlayfairDisplay_400Regular_Italic', fontSize: 15, lineHeight: 24,
    color: 'rgba(255,255,255,0.9)', textAlign: 'center',
  },
  verseRef: { fontSize: 14, color: GOLD, fontWeight: '700', marginTop: 6 },

  topBar: { position: 'absolute', top: 0, left: 0, right: 0 },
  topRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 18, paddingTop: 6,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cross: { width: 12, height: 18, alignItems: 'center', justifyContent: 'center' },
  crossV: { position: 'absolute', width: 2, height: 18, backgroundColor: GOLD },
  crossH: { position: 'absolute', top: 5, width: 12, height: 2, backgroundColor: GOLD },
  brandTxt: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 17, color: '#fff' },

  progress: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5 },
  // The current step is a bar and the rest are dots, which says where you are
  // and how far is left in one glance.
  seg: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  segOn: { width: 26, backgroundColor: GOLD },

  skip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  skipTxt: { color: '#fff', fontSize: 14, fontWeight: '600' },

  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  cta: {
    marginHorizontal: 24, marginBottom: 14, borderRadius: 14, paddingVertical: 17,
    backgroundColor: GOLD, alignItems: 'center',
  },
  ctaTxt: { color: '#1a1a2e', fontSize: 16, fontWeight: '700' },
});
