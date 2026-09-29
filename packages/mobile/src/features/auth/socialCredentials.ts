import { Platform } from 'react-native';
import type { AuthProvider } from '@/api/auth';

export type SocialCredentialResult =
  | { status: 'success'; provider: AuthProvider; token: string }
  | { status: 'cancelled'; provider: AuthProvider }
  | { status: 'failure'; provider: AuthProvider; message: string };

export interface SocialCredentialDependencies {
  platform: string;
  appleSignIn: () => Promise<string | null>;
  facebookSignIn: () => Promise<{ cancelled: boolean; accessToken: string | null }>;
}

export interface SocialProviderAvailability {
  apple: boolean;
  facebook: boolean;
}

export const facebookConfigured = Boolean(process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN);

function isAppleCancellation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ERR_REQUEST_CANCELED'
  );
}

async function appleSignIn(): Promise<string | null> {
  const AppleAuthentication = await import('expo-apple-authentication');
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
  });
  return credential.identityToken;
}

async function facebookSignIn(): Promise<{ cancelled: boolean; accessToken: string | null }> {
  const { AccessToken, LoginManager, Settings } = await import('react-native-fbsdk-next');
  Settings.initializeSDK();
  const result = await LoginManager.logInWithPermissions(['public_profile', 'email'], 'enabled');
  if (result.isCancelled) return { cancelled: true, accessToken: null };

  const current = await AccessToken.getCurrentAccessToken();
  return { cancelled: false, accessToken: current?.accessToken ?? null };
}

const defaultDependencies: SocialCredentialDependencies = {
  platform: Platform.OS,
  appleSignIn,
  facebookSignIn,
};

export async function getSocialProviderAvailability(): Promise<SocialProviderAvailability> {
  let apple = false;
  if (Platform.OS === 'ios') {
    const AppleAuthentication = await import('expo-apple-authentication');
    apple = await AppleAuthentication.isAvailableAsync().catch(() => false);
  }

  let facebook = false;
  if ((Platform.OS === 'ios' || Platform.OS === 'android') && facebookConfigured) {
    facebook = await import('react-native-fbsdk-next')
      .then(({ Settings }) => {
        Settings.initializeSDK();
        return true;
      })
      .catch(() => false);
  }

  return { apple, facebook };
}

export async function requestSocialCredential(
  provider: AuthProvider,
  dependencies: SocialCredentialDependencies = defaultDependencies
): Promise<SocialCredentialResult> {
  if (provider === 'apple' && dependencies.platform !== 'ios') {
    return { status: 'failure', provider, message: 'Apple sign-in is unavailable on this device.' };
  }

  try {
    if (provider === 'apple') {
      const token = await dependencies.appleSignIn();
      if (!token) {
        return { status: 'failure', provider, message: 'Apple sign-in did not return a token.' };
      }
      return { status: 'success', provider, token };
    }

    const result = await dependencies.facebookSignIn();
    if (result.cancelled) return { status: 'cancelled', provider };
    if (!result.accessToken) {
      return {
        status: 'failure',
        provider,
        message: 'Facebook sign-in did not return a usable access token.',
      };
    }
    return { status: 'success', provider, token: result.accessToken };
  } catch (error) {
    if (provider === 'apple' && isAppleCancellation(error)) {
      return { status: 'cancelled', provider };
    }
    return {
      status: 'failure',
      provider,
      message: `Could not sign in with ${provider}. Try again.`,
    };
  }
}
