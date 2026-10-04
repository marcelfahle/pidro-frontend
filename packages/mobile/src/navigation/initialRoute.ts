import type { AuthStatus, DeclaredAgeBand, PendingInvite, User } from '@pidro/shared';

export function canAccessProtectedRoutes(authHydrated: boolean, authStatus: AuthStatus): boolean {
  return authHydrated && authStatus === 'authenticated';
}

export function authenticatedDestination(pendingInvite: PendingInvite | null): string {
  if (!pendingInvite) return '/home';
  const source = pendingInvite.source ? `?source=${pendingInvite.source}` : '';
  return `/join/${pendingInvite.code}${source}`;
}

export function needsAgeGate(ageBand: DeclaredAgeBand | null, user: User | null): boolean {
  if (!ageBand || ageBand === 'under_13') return true;
  return user != null && (user.age_band == null || user.age_band === 'unknown');
}

export function entryDestination(
  authStatus: AuthStatus,
  pendingInvite: PendingInvite | null,
  ageBand: DeclaredAgeBand | null,
  user: User | null
): string {
  if (needsAgeGate(ageBand, user)) return '/age';
  if (pendingInvite && authStatus === 'authenticated') {
    return authenticatedDestination(pendingInvite);
  }
  return authStatus === 'authenticated' ? '/home' : '/welcome';
}

export function initialRoute(
  authHydrated: boolean,
  inviteHydrated: boolean,
  ageGateHydrated: boolean,
  authStatus: AuthStatus,
  pendingInvite: PendingInvite | null,
  ageBand: DeclaredAgeBand | null,
  user: User | null
): string | null {
  if (!authHydrated || !inviteHydrated || !ageGateHydrated) return null;
  return entryDestination(authStatus, pendingInvite, ageBand, user);
}
