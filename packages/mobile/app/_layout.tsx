import '../global.css';

import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initRealtime } from '../src/bootstrap/realtime';

export default function RootLayout() {
  console.log('[RootLayout] RENDER');
  const [fontsLoaded, fontError] = useFonts({
    Nunito: require('../assets/fonts/Nunito-VariableFont_wght.ttf'),
  });

  useEffect(() => {
    console.log('[RootLayout] MOUNT');
    initRealtime();
    return () => {
      console.log('[RootLayout] UNMOUNT');
    };
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
        <Stack.Screen name="home" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="lobby" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="help" />
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
