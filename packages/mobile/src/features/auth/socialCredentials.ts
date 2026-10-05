import type { AuthProvider, FacebookCredential } from '@/api/auth';

export type SocialCredentialResult =
  | { status: 'success'; provider: 'apple'; token: string }
  | { status: 'success'; provider: 'facebook'; credential: FacebookCredential }
  | { status: 'cancelled'; provider: AuthProvider }
  | { status: 'failure'; provider: AuthProvider; message: string };

export interface FacebookNativeModules {
  FBAccessToken?: unknown;
  FBAuthenticationToken?: unknown;
  FBLoginManager?: unknown;
}

interface FacebookLoginResult {
  isCancelled: boolean;
}

export interface FacebookSignInDependencies {
  platform: string;
  createNonce: () => string;
  logInWithPermissions: (
    permissions: string[],
    tracking: 'enabled' | 'limited',
    nonce?: string
  ) => Promise<FacebookLoginResult>;
  getAccessToken: () => Promise<string | null>;
  getAuthenticationToken: () => Promise<string | null>;
}

export function facebookNativeModulesLoaded(
  platform: string,
  modules: FacebookNativeModules
): boolean {
  return Boolean(
    modules.FBLoginManager &&
    (platform === 'ios' ? modules.FBAuthenticationToken : modules.FBAccessToken)
  );
}

export async function requestFacebookCredential(
  dependencies: FacebookSignInDependencies
): Promise<{ cancelled: boolean; credential: FacebookCredential | null }> {
  if (dependencies.platform === 'ios') {
    const nonce = dependencies.createNonce();
    const result = await dependencies.logInWithPermissions(
      ['public_profile', 'email'],
      'limited',
      nonce
    );
    if (result.isCancelled) return { cancelled: true, credential: null };

    const token = await dependencies.getAuthenticationToken();
    return {
      cancelled: false,
      credential: token ? { type: 'authentication_token', token, nonce } : null,
    };
  }

  const result = await dependencies.logInWithPermissions(['public_profile', 'email'], 'enabled');
  if (result.isCancelled) return { cancelled: true, credential: null };

  const token = await dependencies.getAccessToken();
  return {
    cancelled: false,
    credential: token ? { type: 'access_token', token } : null,
  };
}

export interface SocialCredentialDependencies {
  platform: string;
  appleSignIn: () => Promise<string | null>;
  facebookSignIn: () => Promise<{ cancelled: boolean; credential: FacebookCredential | null }>;
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
    if (!result.credential) {
      return {
        status: 'failure',
        provider,
        message: 'Facebook sign-in did not return a usable token.',
      };
    }
    return { status: 'success', provider, credential: result.credential };
  } catch (error) {
    if (provider === 'apple' && isAppleCancellation(error)) {
      return { status: 'cancelled', provider };
    }
    if (
      provider === 'facebook' &&
      error instanceof Error &&
      error.message === 'Facebook sign-in is unavailable in this build.'
    ) {
      return { status: 'failure', provider, message: error.message };
    }
    return {
      status: 'failure',
      provider,
      message: `Could not sign in with ${provider}. Try again.`,
    };
  }
}
