import type { Position, ReadinessSnapshot } from '../types/lobby';

export interface RematchVote {
  /** Humans at the table; bots always agree and are not counted. */
  needed: number;
  /** Humans who have asked for another game. */
  agreed: number;
  youAgreed: boolean;
}

/**
 * After game over the server clears readiness, and the readiness snapshot of a
 * finished room is the rematch vote. Returns null while there is no vote to
 * show: no snapshot yet, or the room is not finished.
 */
export function rematchVote(
  readiness: ReadinessSnapshot | null | undefined,
  you: Position | null | undefined
): RematchVote | null {
  if (!readiness || readiness.status !== 'finished') return null;

  const humans = (Object.keys(readiness.seats) as Position[]).filter(
    (position) => readiness.seats[position]?.occupant_type === 'human'
  );
  const ready = new Set(readiness.ready_players);

  return {
    needed: humans.length,
    agreed: humans.filter((position) => ready.has(position)).length,
    youAgreed: you != null && ready.has(you),
  };
}
