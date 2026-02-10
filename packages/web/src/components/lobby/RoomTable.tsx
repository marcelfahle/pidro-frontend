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
      <td className="py-3 pr-4 pl-4">
        <div className="h-4 w-28 rounded bg-gray-200" />
      </td>
      <td className="py-3 pr-4">
        <div className="h-5 w-16 rounded-full bg-gray-200" />
      </td>
      <td className="py-3 pr-4">
        <div className="h-4 w-8 rounded bg-gray-200" />
      </td>
      <td className="py-3 pr-4">
        <div className="h-4 w-6 rounded bg-gray-200" />
      </td>
      <td className="py-3 pr-4">
        <div className="h-7 w-14 rounded bg-gray-200" />
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
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="py-3 pr-4 pl-4 font-medium text-gray-600">Name</th>
              <th className="py-3 pr-4 font-medium text-gray-600">Status</th>
              <th className="py-3 pr-4 font-medium text-gray-600">Players</th>
              <th className="py-3 pr-4 font-medium text-gray-600">Open Seats</th>
              <th className="py-3 pr-4 font-medium text-gray-600" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
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
      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
        <p className="text-gray-500">No games available. Create one!</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-200 bg-gray-50">
          <tr>
            <th className="py-3 pr-4 pl-4 font-medium text-gray-600">Name</th>
            <th className="py-3 pr-4 font-medium text-gray-600">Status</th>
            <th className="py-3 pr-4 font-medium text-gray-600">Players</th>
            <th className="py-3 pr-4 font-medium text-gray-600">Open Seats</th>
            <th className="py-3 pr-4 font-medium text-gray-600" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {waitingRooms.map((room) => (
            <RoomRow
              key={room.code}
              room={room}
              onJoin={onJoin}
              joinLoading={joinLoading}
              joinError={joinError}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
