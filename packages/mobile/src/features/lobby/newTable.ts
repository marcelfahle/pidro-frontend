import type { RuleSet } from '@pidro/shared';
import type { CreateRoomRequest } from '@/types/lobby';

/** The three seats a host fills on New table: left opponent, partner, right opponent. */
export type SeatKey = 'seat_2' | 'seat_3' | 'seat_4';

/**
 * Who sits in a seat. The server knows open and bot seats; an invite seat is
 * an open seat the host means to share a link for once the table is open.
 */
export type SeatChoice = 'open' | 'ai' | 'invite';

export type SeatRequirement = 0 | 100 | 1000;
export type TableDraft = {
  seats: Record<SeatKey, SeatChoice>;
  /** Games played an open seat asks for; 0 or missing means anyone may sit. */
  requirements: Partial<Record<SeatKey, SeatRequirement>>;
};

export const defaultSeats: Record<SeatKey, SeatChoice> = {
  seat_3: 'open',
  seat_2: 'open',
  seat_4: 'ai',
};

/** One tap commits the seat. Leaving Open drops that seat's requirement. */
export function chooseSeat(draft: TableDraft, seat: SeatKey, choice: SeatChoice): TableDraft {
  return {
    seats: { ...draft.seats, [seat]: choice },
    requirements: choice === 'open' ? draft.requirements : { ...draft.requirements, [seat]: 0 },
  };
}

/** Only an open seat can ask for games played. */
export function chooseRequirement(
  draft: TableDraft,
  seat: SeatKey,
  games: SeatRequirement
): TableDraft {
  if (draft.seats[seat] !== 'open') return draft;
  return { ...draft, requirements: { ...draft.requirements, [seat]: games } };
}

export function tableFooter(seats: Record<SeatKey, SeatChoice>): string {
  const open = Object.values(seats).filter((seat) => seat === 'open').length;
  return open === 0
    ? 'The game starts when your friends sit down.'
    : open === 1
      ? 'One open seat is listed for everyone.'
      : `${open} open seats are listed for everyone.`;
}

export function newTableRequest(
  ruleSet: RuleSet,
  seats: Record<SeatKey, SeatChoice>,
  requirements: TableDraft['requirements'] = {}
): { request: CreateRoomRequest; invite: boolean } {
  const serverSeat = (key: SeatKey) => {
    const choice = seats[key];
    const min_games = requirements[key] ?? 0;
    return choice === 'ai'
      ? 'ai'
      : choice === 'open' && min_games > 0
        ? { type: 'open' as const, min_games }
        : 'open';
  };
  return {
    request: {
      rule_set: ruleSet,
      seats: {
        seat_2: serverSeat('seat_2'),
        seat_3: serverSeat('seat_3'),
        seat_4: serverSeat('seat_4'),
      },
    },
    invite: Object.values(seats).includes('invite'),
  };
}
