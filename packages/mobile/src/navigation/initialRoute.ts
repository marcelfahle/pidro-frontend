import type { AuthStatus, PendingInvite } from '@pidro/shared';

export function canAccessProtectedRoutes(authHydrated: boolean, authStatus: AuthStatus): boolean {
  return authHydrated && authStatus === 'authenticated';
}

export function authenticatedDestination(pendingInvite: PendingInvite | null): string {
  if (!pendingInvite) return '/home';
  const source = pendingInvite.source ? `?source=${pendingInvite.source}` : '';
  return `/join/${pendingInvite.code}${source}`;
}

export function initialRoute(
  authHydrated: boolean,
  inviteHydrated: boolean,
  authStatus: AuthStatus,
  pendingInvite: PendingInvite | null
): string | null {
  if (!authHydrated || !inviteHydrated) return null;
  if (pendingInvite) return authenticatedDestination(pendingInvite);
  return canAccessProtectedRoutes(authHydrated, authStatus) ? '/home' : '/welcome';
}
