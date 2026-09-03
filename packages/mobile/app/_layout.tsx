import '../global.css';

import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initRealtime } from '../src/bootstrap/realtime';
import { initSentry } from '../src/bootstrap/sentry';

initSentry();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Nunito: require('../assets/fonts/Nunito-VariableFont_wght.ttf'),
  });
  const reduceMotion = useReducedMotion();
  const menuAnimation = reduceMotion ? 'none' : 'slide_from_right';

  useEffect(() => {
    initRealtime();
  }, []);

  if (fontError) throw fontError;
  if (!fontsLoaded) return null;

  return (
    // Explicit provider: expo-router 56 no longer guarantees one, and every
    // table surface positions itself off useSafeAreaInsets().
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none', // Instant transitions for game feel
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="join/[code]" />
        <Stack.Screen name="home" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen
          name="lobby"
          options={{ animation: menuAnimation, gestureEnabled: !reduceMotion }}
        />
        <Stack.Screen
          name="profile"
          options={{ animation: menuAnimation, gestureEnabled: !reduceMotion }}
        />
        <Stack.Screen
          name="settings"
          options={{ animation: menuAnimation, gestureEnabled: !reduceMotion }}
        />
        <Stack.Screen
          name="help"
          options={{ animation: menuAnimation, gestureEnabled: !reduceMotion }}
        />
        <Stack.Screen
          name="game"
          options={{
            animation: 'none',
            gestureEnabled: false,
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
