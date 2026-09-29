import type { ClassicFound } from '@/api/auth';
import type { SocialSignInOutcome } from '@/hooks/useAuth';

interface SocialSignInHandlers {
  onSignedIn: () => void;
  onClassicFound: (claim: ClassicFound) => void;
  onUnknownIdentity: () => void;
}

export function handleSocialSignInOutcome(
  outcome: SocialSignInOutcome,
  handlers: SocialSignInHandlers
): void {
  if (outcome.status === 'signed_in') {
    handlers.onSignedIn();
  } else if (outcome.status === 'classic_found') {
    handlers.onClassicFound(outcome.claim);
  } else if (outcome.status === 'unknown_identity') {
    handlers.onUnknownIdentity();
  }
}
