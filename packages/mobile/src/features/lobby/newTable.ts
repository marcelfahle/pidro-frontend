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
  requirements: Partial<Record<SeatKey, SeatRequirement>>;
  asking: SeatKey | null;
};

export const defaultSeats: Record<SeatKey, SeatChoice> = {
  seat_3: 'open',
  seat_2: 'open',
  seat_4: 'ai',
};

export function chooseSeat(
  draft: TableDraft,
  seat: SeatKey,
  choice: SeatChoice | SeatRequirement
): TableDraft {
  if (choice === 'open') return { ...draft, asking: seat };
  return {
    seats: { ...draft.seats, [seat]: typeof choice === 'number' ? 'open' : choice },
    requirements: { ...draft.requirements, [seat]: typeof choice === 'number' ? choice : 0 },
    asking: null,
  };
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
  seats: Record<SeatKey, SeatChoice>
): { request: CreateRoomRequest; invite: boolean } {
  const serverSeat = (choice: SeatChoice) => (choice === 'ai' ? 'ai' : 'open');
  return {
    request: {
      rule_set: ruleSet,
      seats: {
        seat_2: serverSeat(seats.seat_2),
        seat_3: serverSeat(seats.seat_3),
        seat_4: serverSeat(seats.seat_4),
      },
    },
    invite: Object.values(seats).includes('invite'),
  };
}
