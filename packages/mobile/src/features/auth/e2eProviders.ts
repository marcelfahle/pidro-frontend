import type { SocialCredentialResult, SocialProviderAvailability } from './socialCredentials';
import type { AuthProvider } from '@/api/auth';

/**
 * The account journeys (e2e/) run the web client with EXPO_PUBLIC_E2E=1, where
 * the native Apple and Facebook sheets do not exist. The suite hands each tap
 * its answer on globalThis.__pidroE2E: a token, a cancel or a failure. The flag
 * is inlined at build time, so a production bundle carries none of this.
 */
export function e2eSocialAvailability(): SocialProviderAvailability | null {
  if (process.env.EXPO_PUBLIC_E2E !== '1') return null;
  return { apple: true, facebook: true };
}

export async function e2eSocialCredential(
  provider: AuthProvider
): Promise<SocialCredentialResult | null> {
  if (process.env.EXPO_PUBLIC_E2E !== '1') return null;
  const answer = (globalThis as { __pidroE2E?: SocialCredentialResult }).__pidroE2E;
  return answer ?? { status: 'failure', provider, message: 'The journey gave no answer.' };
}
