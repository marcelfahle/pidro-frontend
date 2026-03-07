import type { Room } from '@pidro/shared';
import { RoomRow } from './RoomRow';

interface RoomTableProps {
  rooms: Room[];
  onJoin: (code: string) => void;
  joinLoading: string | null;
  joinError: string | null;
  loading?: boolean;
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-3">
        <div className="h-4 w-28 rounded bg-cyan-200/15" />
      </td>
      <td className="px-4 py-3">
        <div className="h-5 w-16 rounded-full bg-cyan-200/15" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-8 rounded bg-cyan-200/15" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-6 rounded bg-cyan-200/15" />
      </td>
      <td className="px-4 py-3">
        <div className="h-7 w-14 rounded bg-cyan-200/15" />
      </td>
    </tr>
  );
}

export function RoomTable({
  rooms,
  onJoin,
  joinLoading,
  joinError,
  loading = false,
}: RoomTableProps) {
  // Only show waiting rooms, sorted newest first
  const waitingRooms = rooms
    .filter((r) => r.status === 'waiting')
    .sort((a, b) => {
      if (a.created_at && b.created_at) {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return 0;
    });

  // Show skeleton rows while lobby data is loading
  if (loading) {
    return (
      <div className="overflow-hidden rounded-lg border border-cyan-300/20">
        <table className="w-full">
          <tbody>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </tbody>
        </table>
      </div>
    );
  }

  if (waitingRooms.length === 0) {
    return (
      <div className="flex h-full min-h-[280px] items-center justify-center rounded-[20px] border border-dashed border-cyan-300/25 bg-cyan-950/20 p-8 text-center">
        <p className="text-base font-black uppercase tracking-[0.12em] text-cyan-50/80">
          No games available. Create one!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {waitingRooms.map((room, index) => (
        <RoomRow
          key={room.code}
          room={room}
          onJoin={onJoin}
          joinLoading={joinLoading}
          joinError={joinError}
          rowNumber={index + 1}
        />
      ))}
    </div>
  );
}
