import { useCallback, useState } from 'react';
import { useRouter, type Href } from 'expo-router';
import type { AuthProvider } from '@/api/auth';
import { handleClassicFound } from '@/features/auth/classicFound';
import { handleSocialSignInOutcome } from '@/features/auth/loginSocial';
import type { SocialSignInOutcome } from '@/hooks/useAuth';
import { authenticatedEntryDestination } from '@/navigation/initialRoute';
import { useAgeGateStore } from '@/stores/ageGate';
import { usePendingInviteStore } from '@/stores/pendingInvite';

/**
 * Apple or Facebook, from any screen that offers them. The same three
 * answers everywhere: signed in, a Classic account to confirm, or an identity
 * we could not use.
 */
export function useProviderSignIn(
  signInWithProvider: (provider: AuthProvider) => Promise<SocialSignInOutcome>
) {
  const router = useRouter();
  const pendingInvite = usePendingInviteStore((state) => state.pendingInvite);
  const [notice, setNotice] = useState<string | null>(null);

  const start = useCallback(
    async (provider: AuthProvider) => {
      setNotice(null);
      const outcome = await signInWithProvider(provider);
      handleSocialSignInOutcome(outcome, {
        onSignedIn: () => {
          if (outcome.status !== 'signed_in') return;
          router.replace(
            authenticatedEntryDestination(
              pendingInvite,
              useAgeGateStore.getState().ageBand,
              outcome.session.user
            ) as Href
          );
        },
        onClassicFound: (claim) => {
          handleClassicFound(claim, provider);
          router.replace('/(auth)/claim-classic');
        },
        onUnknownIdentity: () =>
          setNotice(
            `We couldn’t sign in with that ${provider === 'apple' ? 'Apple' : 'Facebook'} account.`
          ),
      });
    },
    [pendingInvite, router, signInWithProvider]
  );

  return { start, notice };
}
