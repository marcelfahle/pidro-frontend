/**
 * Whose Pidro it was (PID-230): a trick holding a five is worth cheering only
 * when it is ours. The server says who took it; this only reads it from the
 * viewer's seat.
 */
import type { Position } from '@/types/lobby';

/** A trick worth this much holds a five: the big moment. */
export const PIDRO_POINTS = 5;

/** A spectator has no side: neither happy nor sad. */
export type PidroSide = 'ours' | 'theirs' | 'neutral';

const northSouth = (position: Position) => position === 'north' || position === 'south';

/**
 * Ours when the winner sits on the viewer's team (the viewer or their partner),
 * theirs otherwise. `column` is the score plaque's column it lands in: for a
 * spectator, N/S on the left and E/W on the right.
 */
export function whosePidro(
  winner: Position,
  viewer: Position | null
): { side: PidroSide; column: 'us' | 'them' } {
  if (!viewer) return { side: 'neutral', column: northSouth(winner) ? 'us' : 'them' };
  return northSouth(winner) === northSouth(viewer)
    ? { side: 'ours', column: 'us' }
    : { side: 'theirs', column: 'them' };
}
