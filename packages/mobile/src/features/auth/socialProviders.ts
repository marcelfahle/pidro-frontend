import { NativeModules, Platform } from 'react-native';
import {
  requestSocialCredential,
  type SocialCredentialResult,
  type SocialProviderAvailability,
} from './socialCredentials';
import type { AuthProvider } from '@/api/auth';

export const facebookConfigured = Boolean(process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN);

/**
 * react-native-fbsdk-next builds a NativeEventEmitter from its native module
 * as soon as it is imported. On the New Architecture that module can be null,
 * and the import then throws outside any promise and kills the app. So never
 * import the package unless the module is there.
 *
 * React Native itself is imported statically on purpose: `await
 * import('react-native')` evaluates every export, including the deprecated
 * PushNotificationIOS, whose missing native module crashed the 3.2.0 Beta the
 * moment the sign-in screen opened.
 */
function facebookNativeModuleLoaded(): boolean {
  return Boolean(NativeModules.FBAccessToken && NativeModules.FBLoginManager);
}

async function appleSignIn(): Promise<string | null> {
  const AppleAuthentication = await import('expo-apple-authentication');
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
  });
  return credential.identityToken;
}

async function facebookSignIn(): Promise<{ cancelled: boolean; accessToken: string | null }> {
  if (!facebookNativeModuleLoaded()) {
    throw new Error('Facebook sign-in is unavailable in this build.');
  }
  const { AccessToken, LoginManager, Settings } = await import('react-native-fbsdk-next');
  Settings.initializeSDK();
  const result = await LoginManager.logInWithPermissions(['public_profile', 'email'], 'enabled');
  if (result.isCancelled) return { cancelled: true, accessToken: null };

  const current = await AccessToken.getCurrentAccessToken();
  return { cancelled: false, accessToken: current?.accessToken ?? null };
}

export async function getSocialProviderAvailability(): Promise<SocialProviderAvailability> {
  let apple = false;
  if (Platform.OS === 'ios') {
    const AppleAuthentication = await import('expo-apple-authentication');
    apple = await AppleAuthentication.isAvailableAsync().catch(() => false);
  }

  // The SDK itself starts only when the player taps Facebook.
  const facebook =
    (Platform.OS === 'ios' || Platform.OS === 'android') &&
    facebookConfigured &&
    facebookNativeModuleLoaded();

  return { apple, facebook };
}

/** Runs the native Apple or Facebook sign-in and maps its outcome. */
export function requestNativeSocialCredential(
  provider: AuthProvider
): Promise<SocialCredentialResult> {
  return requestSocialCredential(provider, {
    platform: Platform.OS,
    appleSignIn,
    facebookSignIn,
  });
}
