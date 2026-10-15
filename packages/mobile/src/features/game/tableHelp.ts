/**
 * Beginner aids at the table (PID-220), opt-in because pros count in their
 * heads. The server decides who took what; these only add up and word it.
 */
import type { Position } from '@/types/lobby';
import type { ServerPlayerView, TeamKey } from '@/types/game';
import type { TablePace } from '@pidro/shared';

/** Slow keeps what the table shows for a moment on screen twice as long. */
export function paced(ms: number, pace: TablePace): number {
  return pace === 'slow' ? ms * 2 : ms;
}

const teamOf = (position: string): TeamKey =>
  position === 'north' || position === 'south' ? 'north_south' : 'east_west';

type RawTrick = {
  winner?: string;
  points?: number;
  two_of_trump?: { position?: string; points?: number } | null;
};

/**
 * What the bidder's side has taken so far this hand: the points of the tricks
 * it won, plus the 2 of trump wherever its side played it. Not the live
 * `hand_points`, which credits the 2 to the trick's winner until the hand is
 * scored.
 */
export function bidTaken(tricks: unknown, bidder: Position): number {
  if (!Array.isArray(tricks)) return 0;
  const side = teamOf(bidder);
  let taken = 0;
  for (const trick of tricks as (RawTrick | null)[]) {
    if (!trick) continue;
    if (trick.winner && teamOf(trick.winner) === side && typeof trick.points === 'number') {
      taken += trick.points;
    }
    const two = trick.two_of_trump;
    if (two?.position && teamOf(two.position) === side && typeof two.points === 'number') {
      taken += two.points;
    }
  }
  return taken;
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
