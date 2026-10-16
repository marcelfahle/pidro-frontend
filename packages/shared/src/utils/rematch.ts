import type { Position, ReadinessSnapshot } from '../types/lobby';

export interface RematchSeat {
  position: Position;
  bot: boolean;
  /** Bots are always in. */
  agreed: boolean;
}

export interface RematchVote {
  /** Humans at the table; bots always agree and are not counted. */
  needed: number;
  /** Humans who have asked for another game. */
  agreed: number;
  youAgreed: boolean;
  /** Every occupied seat, north first, and whether it is in. */
  seats: RematchSeat[];
}

const POSITIONS: Position[] = ['north', 'east', 'south', 'west'];

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

  const ready = new Set(readiness.ready_players);
  const seats = POSITIONS.flatMap((position): RematchSeat[] => {
    const occupant = readiness.seats[position]?.occupant_type;
    if (occupant !== 'human' && occupant !== 'bot') return [];
    const bot = occupant === 'bot';
    return [{ position, bot, agreed: bot || ready.has(position) }];
  });
  const humans = seats.filter((seat) => !seat.bot);

  return {
    needed: humans.length,
    agreed: humans.filter((seat) => seat.agreed).length,
    youAgreed: you != null && ready.has(you),
    seats,
  };
}
