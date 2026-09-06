import type { Room } from '@pidro/shared';
import { Button } from '../ui/Button';

interface RoomRowProps {
  room: Room;
  onAction: (code: string) => void;
  actionLabel?: string;
  isLoading?: boolean;
  disabled?: boolean;
  error?: string | null;
}

export function RoomRow({
  room,
  onAction,
  actionLabel = 'Join',
  isLoading,
  disabled,
  error,
}: RoomRowProps) {
  const playerCount = room.player_count ?? room.players_count ?? 0;
  const max = room.max_players ?? 4;

  return (
    <div className="lobby-room p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1 basis-40">
          <p className="break-words text-base font-extrabold text-white">
            {room.name || room.code}
          </p>
          <p className="mt-1 text-sm text-white/75">
            Room {room.code} · {playerCount}/{max} players
          </p>
        </div>
        <Button
          className={`lobby-action ${actionLabel === 'Watch' ? 'lobby-action-secondary' : ''}`}
          size="sm"
          loading={isLoading}
          disabled={disabled}
          onClick={() => onAction(room.code)}
        >
          {actionLabel}
        </Button>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-200">
          {error}
        </p>
      )}
    </div>
  );
}
