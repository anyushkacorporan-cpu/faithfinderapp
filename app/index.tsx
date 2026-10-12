import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { COLORS } from '../src/lib/constants';
import { hydrated, hasSeenOnboarding } from '../src/lib/onboarding';

/**
 * Where the app opens.
 *
 * This was a one-line redirect to /login, which meant a stranger from the App
 * Store met a password box before being told what they had downloaded.
 *
 * It cannot answer immediately any more: whether the introduction has been seen
 * is stored on the device and read asynchronously, and guessing while that read
 * is in flight would show the introduction again to everyone on every launch.
 * So it holds on a blank screen of the right colour until the answer arrives —
 * a few milliseconds, indistinguishable from the splash it follows.
 */
export default function Index() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let live = true;
    void hydrated.then(() => { if (live) setReady(true); });
    return () => { live = false; };
  }, []);

  // Cream rather than white: the splash and the screens on either side of this
  // are cream, and a white flash between them reads as a stutter.
  if (!ready) return <View style={s.hold} />;

  return <Redirect href={hasSeenOnboarding() ? '/login' : '/onboarding'} />;
}

const s = StyleSheet.create({
  hold: { flex: 1, backgroundColor: COLORS.cream },
});
