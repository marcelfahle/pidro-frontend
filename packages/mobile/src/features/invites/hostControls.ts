import type { Player, Position, Room } from '@/types/lobby';
import { publicPlayerName } from '@pidro/shared';

const POSITIONS: Position[] = ['north', 'east', 'south', 'west'];

export function canManageRoom(
  room: Room,
  userId: string | null | undefined,
  role: 'player' | 'spectator' | null
): boolean {
  return (
    role === 'player' &&
    !!userId &&
    room.host_id === userId &&
    (room.status === 'waiting' || room.status === 'ready')
  );
}

export function seatDisplayName(player: Player | null | undefined): string {
  return publicPlayerName(player?.username, '');
}

export function availableMoveTargets(room: Room, current: Position): Position[] {
  return POSITIONS.filter((position) => position !== current && !room.positions?.[position]);
}
