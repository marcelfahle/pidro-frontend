import type { SocialCredentialResult, SocialProviderAvailability } from './socialCredentials';
import type { AuthProvider } from '@/api/auth';

/**
 * The account journeys (e2e/) run the web client with EXPO_PUBLIC_E2E=1, where
 * the native Apple and Facebook sheets do not exist. The suite hands each tap
 * its answer on globalThis.__pidroE2E: a token, a cancel or a failure. Only a
 * development bundle can carry it: Metro inlines __DEV__ as false in a release
 * export, while a flag left in its transform cache by an earlier export can
 * still be inlined as '1'.
 */
export function e2eSocialAvailability(): SocialProviderAvailability | null {
  if (!__DEV__ || process.env.EXPO_PUBLIC_E2E !== '1') return null;
  return { apple: true, facebook: true };
}

export async function e2eSocialCredential(
  provider: AuthProvider
): Promise<SocialCredentialResult | null> {
  if (!__DEV__ || process.env.EXPO_PUBLIC_E2E !== '1') return null;
  const answer = (globalThis as { __pidroE2E?: SocialCredentialResult }).__pidroE2E;
  return answer ?? { status: 'failure', provider, message: 'The journey gave no answer.' };
}
