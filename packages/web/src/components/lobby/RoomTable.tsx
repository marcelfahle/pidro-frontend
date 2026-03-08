import type { Room } from '@pidro/shared';
import { RoomRow } from './RoomRow';

interface RoomTableProps {
  rooms: Room[];
  onAction: (code: string) => void;
  actionLabel?: string;
  actionLoadingCode: string | null;
  actionError: { code: string; message: string } | null;
  loading?: boolean;
}

function SkeletonRow() {
  return (
    <div className="animate-pulse rounded-[20px] border border-cyan-300/15 bg-cyan-950/30 p-4">
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-cyan-200/10" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-36 rounded bg-cyan-200/10" />
          <div className="h-4 w-48 rounded bg-cyan-200/8" />
        </div>
        <div className="h-9 w-16 rounded-lg bg-cyan-200/10" />
      </div>
    </div>
  );
}

export function RoomTable({
  rooms,
  onAction,
  actionLabel,
  actionLoadingCode,
  actionError,
  loading = false,
}: RoomTableProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="flex min-h-[120px] items-center justify-center rounded-[20px] border border-dashed border-cyan-300/25 bg-cyan-950/20 p-8 text-center">
        <p className="text-base font-black uppercase tracking-[0.12em] text-cyan-50/80">
          No games available. Create one!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rooms.map((room, index) => (
        <RoomRow
          key={room.code}
          room={room}
          onAction={onAction}
          actionLabel={actionLabel}
          isLoading={actionLoadingCode === room.code}
          error={actionError?.code === room.code ? actionError.message : null}
          rowNumber={index + 1}
        />
      ))}
    </div>
  );
}
