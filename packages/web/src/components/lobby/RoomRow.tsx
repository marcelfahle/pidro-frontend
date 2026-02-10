import type { Room } from '@pidro/shared';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface RoomRowProps {
  room: Room;
  onJoin: (code: string) => void;
  joinLoading: string | null;
  joinError: string | null;
}

function statusBadge(status: Room['status']) {
  switch (status) {
    case 'waiting':
      return <Badge variant="green">Waiting</Badge>;
    case 'playing':
      return <Badge variant="blue">Playing</Badge>;
    case 'ready':
      return <Badge variant="yellow">Ready</Badge>;
    case 'finished':
      return <Badge variant="gray">Finished</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

function openSeats(room: Room): number {
  if (room.available_positions) return room.available_positions.length;
  const playerCount = room.player_count ?? room.players_count ?? 0;
  const max = room.max_players ?? 4;
  return max - playerCount;
}

export function RoomRow({ room, onJoin, joinLoading, joinError }: RoomRowProps) {
  const playerCount = room.player_count ?? room.players_count ?? 0;
  const max = room.max_players ?? 4;
  const canJoin = room.status === 'waiting' && openSeats(room) > 0;
  const isJoining = joinLoading === room.code;

  return (
    <tr className="border-b border-gray-100 last:border-b-0">
      <td className="py-3 pr-4">
        <span className="font-medium text-gray-900">{room.name || room.code}</span>
        {joinError && isJoining && <p className="mt-1 text-xs text-red-600">{joinError}</p>}
      </td>
      <td className="py-3 pr-4">{statusBadge(room.status)}</td>
      <td className="py-3 pr-4 text-gray-600">
        {playerCount}/{max}
      </td>
      <td className="py-3 pr-4 text-gray-600">{openSeats(room)}</td>
      <td className="py-3">
        {canJoin && (
          <Button size="sm" loading={isJoining} onClick={() => onJoin(room.code)}>
            Join
          </Button>
        )}
      </td>
    </tr>
  );
}
