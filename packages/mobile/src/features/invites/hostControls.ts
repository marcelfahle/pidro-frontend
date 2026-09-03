import type { Player, Position, Room } from '@/types/lobby';

const POSITIONS: Position[] = ['north', 'east', 'south', 'west'];

export function canManageRoom(room: Room, userId: string | null | undefined): boolean {
  return (
    !!userId && room.host_id === userId && (room.status === 'waiting' || room.status === 'ready')
  );
}

export function seatDisplayName(player: Player | null | undefined): string {
  return player?.display_name?.trim() || player?.username || '';
}

export function availableMoveTargets(room: Room, current: Position): Position[] {
  return POSITIONS.filter((position) => position !== current && !room.positions?.[position]);
}
