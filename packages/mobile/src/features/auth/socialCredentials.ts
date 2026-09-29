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

function isAppleCancellation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ERR_REQUEST_CANCELED'
  );
}

/** Pure outcome mapping; the native SDK calls live in socialProviders.ts. */
export async function requestSocialCredential(
  provider: AuthProvider,
  resolvedDependencies: SocialCredentialDependencies
): Promise<SocialCredentialResult> {
  if (provider === 'apple' && resolvedDependencies.platform !== 'ios') {
    return { status: 'failure', provider, message: 'Apple sign-in is unavailable on this device.' };
  }

  try {
    if (provider === 'apple') {
      const token = await resolvedDependencies.appleSignIn();
      if (!token) {
        return { status: 'failure', provider, message: 'Apple sign-in did not return a token.' };
      }
      return { status: 'success', provider, token };
    }

    const result = await resolvedDependencies.facebookSignIn();
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
