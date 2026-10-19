import type { Room } from '@/types/lobby';
import { t, type Invite } from '@pidro/shared';
import { formatManualInviteCode } from './manualCode';

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

export function assignedRoomPlayerIds(room: Room): string[] {
  return [
    ...Object.values(room.positions ?? {}).flatMap((id) => (id ? [id] : [])),
    ...(room.seats ?? []).flatMap((seat) => (seat.held_for ? [seat.held_for.user_id] : [])),
  ];
}
