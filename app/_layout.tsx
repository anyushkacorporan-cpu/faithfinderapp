import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useFonts, DMSans_400Regular, DMSans_600SemiBold, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { PlayfairDisplay_700Bold, PlayfairDisplay_400Regular_Italic, PlayfairDisplay_400Regular } from '@expo-google-fonts/playfair-display';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { StripeProvider } from '@stripe/stripe-react-native';
import { STRIPE_PUBLISHABLE_KEY, STRIPE_MERCHANT_ID } from '../src/lib/stripeConfig';
import { ToastProvider } from '../src/components/Toast';
import { ConfirmProvider } from '../src/components/Confirm';
import { useThemeColors } from '../src/lib/theme';

SplashScreen.preventAutoHideAsync();

function ThemedStatusBar() {
  const c = useThemeColors();
  return <StatusBar style={c.isDark ? 'light' : 'dark'} />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ DMSans_400Regular, DMSans_600SemiBold, DMSans_700Bold, PlayfairDisplay_700Bold, PlayfairDisplay_400Regular_Italic, PlayfairDisplay_400Regular });
  useEffect(() => { if (fontsLoaded) SplashScreen.hideAsync(); }, [fontsLoaded]);
  if (!fontsLoaded) return null;
  return (
    <ToastProvider>
    <ConfirmProvider>
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY} merchantIdentifier={STRIPE_MERCHANT_ID}>
      <ThemedStatusBar />
      {/*
        Push screens in from the right and take them back out the same way.
        Without this the native stack falls back to each platform's default,
        which is a right-to-left push on iOS but a bottom fade on Android —
        so the same tap felt like two different gestures depending on the
        phone. Naming it pins both to one direction.
      */}
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="forgot" />
        <Stack.Screen name="church-setup" />
        <Stack.Screen name="claim-church" />
        <Stack.Screen name="register-church" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="create-event" />
        <Stack.Screen name="my-events" />
        <Stack.Screen name="earnings" />
        <Stack.Screen name="edit-church-profile" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="user-profile" />
        <Stack.Screen name="activity" />
        <Stack.Screen name="comments" />
        <Stack.Screen name="connections" />
        <Stack.Screen name="edit-event" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="terms" />
        <Stack.Screen name="privacy" />
        <Stack.Screen name="settings-notifications" />
        <Stack.Screen name="settings-location" />
        <Stack.Screen name="settings-privacy" />
        <Stack.Screen name="settings-blocked" />
        <Stack.Screen name="settings-appearance" />
        <Stack.Screen name="settings-help" />
        <Stack.Screen name="settings-about" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="church-detail" />
        <Stack.Screen name="event-detail" />
        <Stack.Screen name="event-checkout" />
        <Stack.Screen name="ticket-success" />
      </Stack>
    </StripeProvider>
    </ConfirmProvider>
    </ToastProvider>
  );
}
