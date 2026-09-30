import type { ClassicFound, AuthProvider } from '@/api/auth';
import type { ClassicVerification } from '@/api/classic';

interface PendingClassicClaim {
  method: AuthProvider;
  verification: ClassicVerification;
}

let pendingClaim: PendingClassicClaim | null = null;

/** Keeps the short-lived ticket out of navigation URLs while the claim screen opens. */
export function handleClassicFound(claim: ClassicFound, method: AuthProvider): void {
  pendingClaim = {
    method,
    verification: {
      ticket: claim.ticket,
      expires_at: claim.expires_at,
      classic: {
        name: claim.classic.name,
        games_played: claim.classic.games_played,
        level: claim.classic.level,
        member_since: claim.classic.member_since,
        // Older provider responses omitted this field. Requiring a new public
        // name is the safe fallback until the server explicitly allows it.
        name_allowed: claim.classic.name_allowed === true,
      },
    },
  };
}

export function takePendingClassicClaim(): PendingClassicClaim | null {
  const claim = pendingClaim;
  pendingClaim = null;
  return claim;
}
