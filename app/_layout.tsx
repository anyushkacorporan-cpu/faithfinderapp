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
import { useSettings } from '../src/lib/settingsStore';
import { installFontScaling } from '../src/lib/fontScale';

SplashScreen.preventAutoHideAsync();
installFontScaling();

function ThemedStatusBar() {
  const c = useThemeColors();
  return <StatusBar style={c.isDark ? 'light' : 'dark'} />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ DMSans_400Regular, DMSans_600SemiBold, DMSans_700Bold, PlayfairDisplay_700Bold, PlayfairDisplay_400Regular_Italic, PlayfairDisplay_400Regular });
  // Re-render the tree when Appearance settings change (e.g. Text Size) so the
  // font-scaling patch re-applies with the new factor.
  const settings = useSettings();
  useEffect(() => { if (fontsLoaded) SplashScreen.hideAsync(); }, [fontsLoaded]);
  if (!fontsLoaded) return null;
  return (
    <ToastProvider>
    <ConfirmProvider>
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY} merchantIdentifier={STRIPE_MERCHANT_ID}>
      <ThemedStatusBar />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="signup-personal" />
        <Stack.Screen name="signup-church" />
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
        <Stack.Screen name="terms" />
        <Stack.Screen name="privacy" />
        <Stack.Screen name="settings-notifications" />
        <Stack.Screen name="settings-location" />
        <Stack.Screen name="settings-privacy" />
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
