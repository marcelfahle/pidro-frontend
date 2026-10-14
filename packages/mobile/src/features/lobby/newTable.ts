import { clampRoomName } from '@pidro/shared';
import type { CreateRoomRequest } from '@/types/lobby';

/** The three seats a host fills on New table: left opponent, partner, right opponent. */
export type SeatKey = 'seat_2' | 'seat_3' | 'seat_4';

/**
 * Who sits in a seat. The server knows open and bot seats; an invite seat is
 * an open seat the host means to share a link for once the table is open.
 */
export type SeatChoice = 'open' | 'ai' | 'invite';

export function defaultTableName(playerName?: string | null): string {
  return clampRoomName(`${playerName || 'Player'}'s table`);
}

export function newTableRequest(
  name: string,
  playerName: string | null | undefined,
  seats: Record<SeatKey, SeatChoice>
): { request: CreateRoomRequest; invite: boolean } {
  const serverSeat = (choice: SeatChoice) => (choice === 'ai' ? 'ai' : 'open');
  return {
    request: {
      name: clampRoomName(name.trim()) || defaultTableName(playerName),
      seats: {
        seat_2: serverSeat(seats.seat_2),
        seat_3: serverSeat(seats.seat_3),
        seat_4: serverSeat(seats.seat_4),
      },
    },
    invite: Object.values(seats).includes('invite'),
  };
}
