/**
 * Beginner aids at the table (PID-220), opt-in because pros count in their
 * heads. The server decides who took what; these only add up and word it.
 */
import type { Position } from '@/types/lobby';
import type { ServerPlayerView } from '@/types/game';
import type { TablePace } from '@pidro/shared';

/** Slow keeps what the table shows for a moment on screen twice as long. */
export function paced(ms: number, pace: TablePace): number {
  return pace === 'slow' ? ms * 2 : ms;
}

/** The one player still holding trumps once the other three have gone cold. */
export function loneTrumpHolder(
  players: Partial<Record<Position, ServerPlayerView>> | null | undefined
): Position | null {
  const left = (['north', 'east', 'south', 'west'] as const).filter(
    (position) => players?.[position] && !players[position]?.eliminated
  );
  const out = (['north', 'east', 'south', 'west'] as const).filter(
    (position) => players?.[position]?.eliminated
  );
  return left.length === 1 && out.length === 3 ? left[0] : null;
}
