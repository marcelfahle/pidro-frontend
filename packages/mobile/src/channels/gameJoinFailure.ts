export type TerminalGameJoinFailure =
  'seat_unavailable' | 'room_unavailable' | 'access_unavailable';

export function terminalGameJoinFailure(reason: string | null): TerminalGameJoinFailure | null {
  const normalized = reason?.trim().toLowerCase();
  if (!normalized) return null;

  if (
    normalized.includes('seat permanently filled') ||
    normalized.includes('reconnection grace period expired')
  ) {
    return 'seat_unavailable';
  }
  if (normalized.includes('room not found')) return 'room_unavailable';
  if (normalized.includes('not authorized')) return 'access_unavailable';
  return null;
}
