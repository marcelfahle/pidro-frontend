import type { Player, Position, Room } from '@/types/lobby';
import { publicPlayerName, t, type Invite } from '@pidro/shared';
import { formatManualInviteCode } from './manualCode';

const POSITIONS: Position[] = ['north', 'east', 'south', 'west'];

/** Share in the sender's current language, never the server's English template. */
export function inviteShareMessage(invite: Pick<Invite, 'url' | 'code'>): string {
  return t('social.share', { url: invite.url, code: formatManualInviteCode(invite.code) });
}

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
  return publicPlayerName(player?.username, '', player?.display_name);
}

export function availableMoveTargets(room: Room, current: Position): Position[] {
  return POSITIONS.filter((position) => position !== current && !room.positions?.[position]);
}
