import { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ImageBackground,
  useWindowDimensions, NativeSyntheticEvent, NativeScrollEvent, StatusBar,
  Animated, AccessibilityInfo,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../src/lib/constants';
import { useTranslation, Lang } from '../src/lib/i18n';
import { updateAppearancePrefs } from '../src/lib/settingsStore';
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
 * How FourCircle works replays it with ?replay=1.
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

  // The language question comes before the cards. Somebody replaying this
  // from settings has already answered it, in settings, so they skip straight
  // to the slides.
  const [asked, setAsked] = useState(isReplay);

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
    if (last) return;
    scroller.current?.scrollTo({ x: (page + 1) * width, animated: true });
  }

  function back() {
    if (page === 0) return;
    scroller.current?.scrollTo({ x: (page - 1) * width, animated: true });
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

  if (!asked) {
    return (
      <LanguageGate
        onPick={lang => { updateAppearancePrefs({ language: lang }); setAsked(true); }}
      />
    );
  }

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
        {SLIDES.map((slide, i) => (
          <SlideView
            key={slide.title}
            slide={slide}
            width={width}
            tx={tx}
            name={name}
            active={i === page}
          />
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
            <Text style={s.brandTxt}>FourCircle</Text>
          </View>

          {/* Skip is the only one that leaves the screen, so it sits up
              here on its own, away from the two that only move between
              cards. On the last card there is nothing left to skip. */}
          {!last && (
            <TouchableOpacity onPress={leave} hitSlop={12}>
              <Text style={s.skipTxt}>{tx(isReplay ? 'Done' : 'Skip')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      <SafeAreaView style={s.bottomBar} edges={['bottom']} pointerEvents="box-none">
        <View style={s.bottomRow}>
          {/* Both ends are the same fixed width, so the dots stay centred on
              the screen instead of sliding when a word comes or goes. */}
          <View style={s.end}>
            {page > 0 && (
              <TouchableOpacity onPress={back} hitSlop={12}>
                <Text style={s.navTxt}>{tx('Back')}</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={s.progress}>
            {SLIDES.map((slide, i) => (
              <View key={slide.title} style={[s.seg, i === page && s.segOn]} />
            ))}
          </View>

          <View style={[s.end, s.endRight]}>
            {!last && (
              <TouchableOpacity onPress={next} hitSlop={12}>
                <Text style={s.navTxt}>{tx('Next')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* The one button in the whole flow, on the one card where there is
            something to do other than read on. */}
        {last && (
          <TouchableOpacity style={s.cta} onPress={leave} activeOpacity={0.85}>
            <Text style={s.ctaTxt}>{tx(isReplay ? 'Done' : 'Get started')}</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    </View>
  );
}

/**
 * What language do you speak, asked before anything is said in either.
 *
 * The seven cards are the first paragraphs of the app, and they are written
 * rather than translated. Getting the language wrong means somebody reads all
 * seven in a language they do not speak and never finds out the app had their
 * own. The device's own setting is a decent guess, and a guess is exactly what
 * it is: a shared phone, a hand-me-down, a person who set the thing up in the
 * language of the shop.
 *
 * Both lines show at once and neither goes through the translation table.
 * There is no answer yet to ask the question in, so the question is asked in
 * both and the two answers are spelled the way each language spells itself.
 */
function LanguageGate({ onPick }: { onPick: (lang: Lang) => void }) {
  // Its own photograph rather than the first card's, and the question sits low
  // on it: the dove is white, in the middle of the frame, and white serif over
  // a white bird is the one place this type cannot be read. Low on the frame
  // it has the dark end of the scrim behind it and the dove has the light.
  const scrim = ['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.92)'] as const;

  const body = (
    <LinearGradient colors={scrim} locations={[0, 0.45, 1]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={s.topRow}>
          <View style={s.brand}>
            <View style={s.cross}>
              <View style={s.crossV} />
              <View style={s.crossH} />
            </View>
            <Text style={s.brandTxt}>FourCircle</Text>
          </View>
        </View>

        <View style={s.gate}>
          <Text style={s.gateTitle}>What language do you speak?</Text>
          <Text style={s.gateTitleAlt}>¿Qué idioma hablas?</Text>

          <View style={s.gateChoices}>
            {(['English', 'Español'] as const).map(lang => (
              <TouchableOpacity
                key={lang}
                style={s.gateBtn}
                onPress={() => onPick(lang)}
                activeOpacity={0.85}
              >
                <Text style={s.gateBtnTxt}>{lang}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />
      <ImageBackground
        source={require('../assets/images/onboarding/00-language.jpg')}
        style={{ flex: 1 }}
        resizeMode="cover"
      >
        {body}
      </ImageBackground>
    </View>
  );
}

function SlideView({ slide, width, tx, name, active }: {
  slide: Slide; width: number; tx: (s: string) => string; name: string; active: boolean;
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

  /**
   * The bullets arrive one at a time, once, when the card does.
   *
   * Every card is mounted at the start, all seven of them side by side in one
   * scroll view, so animating on mount would play this to nobody and leave it
   * finished by the time anybody swiped here. It waits for the card to be the
   * one on screen, and then never replays: a list that re-animates every time
   * you swipe back is a list you cannot re-read.
   *
   * Reduced motion gets the finished state immediately rather than a faster
   * version of the same thing. Somebody who asks for less movement is not
   * asking for quicker movement.
   */
  const bullets = slide.bullets ?? [];
  const stepsRef = useRef<Animated.Value[] | null>(null);
  if (!stepsRef.current) stepsRef.current = bullets.map(() => new Animated.Value(0));
  const steps = stepsRef.current;
  const played = useRef(false);

  useEffect(() => {
    if (!active || played.current || steps.length === 0) return;
    played.current = true;

    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (!live) return;
      if (reduced) { steps.forEach(v => v.setValue(1)); return; }
      Animated.stagger(
        260,
        steps.map(v => Animated.timing(v, {
          toValue: 1,
          duration: 520,
          useNativeDriver: true,
        })),
      ).start();
    });
    return () => { live = false; };
  }, [active, steps]);

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

        {bullets.length > 0 && (
          <View style={s.bullets}>
            {bullets.map((b, i) => (
              <Animated.View
                key={b}
                style={[s.bulletRow, {
                  opacity: steps[i],
                  transform: [{
                    translateY: steps[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: [10, 0],
                    }),
                  }],
                }]}
              >
                <View style={s.bulletDot} />
                <Text style={s.bulletTxt}>{tx(b)}</Text>
              </Animated.View>
            ))}
          </View>
        )}

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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: 10, paddingHorizontal: 18, paddingTop: 6,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cross: { width: 12, height: 18, alignItems: 'center', justifyContent: 'center' },
  crossV: { position: 'absolute', width: 2, height: 18, backgroundColor: GOLD },
  crossH: { position: 'absolute', top: 5, width: 12, height: 2, backgroundColor: GOLD },
  brandTxt: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 17, color: '#fff' },

  progress: {
    flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5,
  },
  // The current step is a bar and the rest are dots, which says where you are
  // and how far is left in one glance.
  seg: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  segOn: { width: 26, backgroundColor: GOLD },

  // Words, not buttons. Skip is the brighter because it is the one that
  // leaves the screen; Back and Next only move between cards.
  navTxt: { color: 'rgba(255,255,255,0.72)', fontSize: 14, fontWeight: '600' },
  skipTxt: { color: '#fff', fontSize: 14, fontWeight: '600' },

  // Centred as a block, left aligned inside it, so four lines of different
  // lengths read as a list rather than as four separate centred sentences.
  bullets: { alignSelf: 'center', marginBottom: 20 },
  bulletRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  bulletDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: GOLD, marginRight: 14 },
  bulletTxt: { fontSize: 17, lineHeight: 24, color: 'rgba(255,255,255,0.92)' },

  gate: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 30, paddingBottom: 54 },
  gateTitle: {
    fontFamily: 'PlayfairDisplay_700Bold', fontSize: 34, lineHeight: 42,
    color: '#fff', textAlign: 'center',
  },
  gateTitleAlt: {
    fontFamily: 'PlayfairDisplay_400Regular_Italic', fontSize: 20, lineHeight: 28,
    color: 'rgba(255,255,255,0.74)', textAlign: 'center', marginTop: 8,
  },
  gateChoices: { marginTop: 42, gap: 12 },
  gateBtn: {
    borderRadius: 14, paddingVertical: 17, alignItems: 'center',
    borderWidth: 1, borderColor: GOLD, backgroundColor: 'rgba(0,0,0,0.28)',
  },
  gateBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },

  bottomRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 24, paddingBottom: 16,
  },
  end: { width: 56 },
  endRight: { alignItems: 'flex-end' },

  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  cta: {
    marginHorizontal: 24, marginBottom: 14, borderRadius: 14, paddingVertical: 17,
    backgroundColor: GOLD, alignItems: 'center',
  },
  ctaTxt: { color: '#1a1a2e', fontSize: 16, fontWeight: '700' },
});
