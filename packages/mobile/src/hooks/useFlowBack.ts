import { useCallback, useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth';

/** Back out of a flow screen, even when a deep link opened it with no history. */
export function useFlowBack() {
  const router = useRouter();
  const signedIn = useAuthStore((state) => state.user != null);
  return useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(signedIn ? '/home' : '/welcome');
  }, [router, signedIn]);
}

/**
 * Routes Android's hardware back through a screen's own steps. While
 * `enabled`, the press runs `onBack` instead of leaving the route.
 */
export function useHardwareBack(enabled: boolean, onBack: () => void) {
  useEffect(() => {
    // Only Android has the button; the web shim logs an error if asked.
    if (!enabled || Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => subscription.remove();
  }, [enabled, onBack]);
}
