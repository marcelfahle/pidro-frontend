import type { Room } from '@pidro/shared';
import { PlayerAvatar } from '../profile/PlayerAvatar';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface RoomRowProps {
  room: Room;
  onAction: (code: string) => void;
  actionLabel?: string;
  isLoading?: boolean;
  error?: string | null;
  rowNumber: number;
}

/** The table's four seats at a glance — filled circles overlap, open seats dashed. */
function SeatCluster({ room }: { room: Room }) {
  const seats = Array.from({ length: room.max_players ?? 4 }, (_, i) => {
    const seat = room.seats?.find((s) => s.seat_index === i) ?? room.seats?.[i];
    return seat?.player ?? null;
  });

  return (
    <div className="flex shrink-0 items-center pl-1">
      {seats.map((player, i) => (
        <div
          key={`${room.code}-seat-${i.toString()}`}
          style={{ marginLeft: i === 0 ? 0 : -10, zIndex: seats.length - i }}
        >
          <PlayerAvatar
            initial={player?.username?.[0]?.toUpperCase() ?? '?'}
            name={player?.username}
            size={30}
            isBot={player?.is_bot ?? false}
            isVacant={!player}
          />
        </div>
      ))}
    </div>
  );
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

export function RoomRow({ room, onAction, actionLabel = 'Join', isLoading, error }: RoomRowProps) {
  const playerCount = room.player_count ?? room.players_count ?? 0;
  const max = room.max_players ?? 4;

  return (
    <div className="rounded-[20px] border border-cyan-300/25 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,transparent_34%),rgba(3,47,82,0.72)] p-4 shadow-[0_12px_24px_rgba(0,0,0,0.18)]">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-base font-black text-white">
          {room.name || room.code}
        </span>
        {statusBadge(room.status)}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <SeatCluster room={room} />
          <div className="min-w-0 text-[11px] font-black uppercase leading-snug tracking-[0.1em]">
            <div className="text-cyan-50/75">
              {playerCount}/{max} players · {openSeats(room)} open
            </div>
            <div className="text-cyan-50/45">Room {room.code}</div>
          </div>
        </div>
        <Button size="sm" loading={isLoading} onClick={() => onAction(room.code)}>
          {actionLabel}
        </Button>
      </div>

      {error && (
        <p className="mt-2 text-xs font-black uppercase tracking-[0.08em] text-red-200">{error}</p>
      )}
    </div>
  );
}
