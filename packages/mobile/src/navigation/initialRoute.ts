import type { AuthStatus, PendingInvite } from '@pidro/shared';

export function canAccessProtectedRoutes(authHydrated: boolean, authStatus: AuthStatus): boolean {
  return authHydrated && authStatus === 'authenticated';
}

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
  return canAccessProtectedRoutes(authHydrated, authStatus) ? '/home' : '/(auth)/login';
}
