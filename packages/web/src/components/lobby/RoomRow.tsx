import type { Room } from '@pidro/shared';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface RoomRowProps {
  room: Room;
  onJoin: (code: string) => void;
  joinLoading: string | null;
  joinError: string | null;
  rowNumber: number;
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

export function RoomRow({ room, onJoin, joinLoading, joinError, rowNumber }: RoomRowProps) {
  const playerCount = room.player_count ?? room.players_count ?? 0;
  const max = room.max_players ?? 4;
  const canJoin = room.status === 'waiting' && openSeats(room) > 0;
  const isJoining = joinLoading === room.code;

  return (
    <div className="rounded-[20px] border border-cyan-300/25 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,transparent_34%),rgba(3,47,82,0.72)] p-4 shadow-[0_12px_24px_rgba(0,0,0,0.18)]">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-200/35 bg-cyan-400/10 text-2xl font-black text-cyan-50">
          #{rowNumber}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className="truncate text-lg font-black text-white">{room.name || room.code}</span>
            {statusBadge(room.status)}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-black uppercase tracking-[0.1em] text-cyan-50/72">
            <span>{playerCount}/{max}</span>
            <span>players</span>
            <span>{openSeats(room)} open seats</span>
            <span>Room {room.code}</span>
          </div>
          {joinError && isJoining && (
            <p className="mt-2 text-xs font-black uppercase tracking-[0.08em] text-red-200">
              {joinError}
            </p>
          )}
        </div>
        {canJoin && (
          <Button size="sm" loading={isJoining} onClick={() => onJoin(room.code)}>
            Join
          </Button>
        )}
      </div>
    </div>
  );
}
