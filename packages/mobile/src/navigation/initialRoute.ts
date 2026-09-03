import type { AuthStatus, PendingInvite } from '@pidro/shared';

export function initialRoute(
  authHydrated: boolean,
  inviteHydrated: boolean,
  authStatus: AuthStatus,
  pendingInvite: PendingInvite | null
): string | null {
  if (!authHydrated || !inviteHydrated) return null;
  if (pendingInvite) {
    const source = pendingInvite.source ? `?source=${pendingInvite.source}` : '';
    return `/join/${pendingInvite.code}${source}`;
  }
  return authStatus === 'authenticated' ? '/home' : '/(auth)/login';
}
