import type { PlayerMeta, Position } from '@pidro/shared';
import { Badge } from '../ui/Badge';
import { Spinner } from '../ui/Spinner';

interface WaitingRoomProps {
  roomCode: string;
  playerMeta: Record<Position, PlayerMeta>;
  onLeave: () => void;
}

const SEAT_POSITIONS: { position: Position; label: string; gridArea: string }[] = [
  { position: 'north', label: 'North', gridArea: 'north' },
  { position: 'west', label: 'West', gridArea: 'west' },
  { position: 'east', label: 'East', gridArea: 'east' },
  { position: 'south', label: 'South', gridArea: 'south' },
];

function SeatSlot({ meta, label }: { meta: PlayerMeta; label: string }) {
  const occupied = meta.playerId !== null;
  const disconnected = occupied && !meta.isConnected;

  return (
    <div
      className={`flex flex-col items-center gap-2 rounded-xl px-6 py-4 ${
        occupied
          ? 'border border-emerald-500/40 bg-emerald-700/30'
          : 'border border-dashed border-emerald-500/30 bg-emerald-900/20'
      } ${disconnected ? 'opacity-50' : ''}`}
    >
      {/* Avatar placeholder */}
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-full ${
          occupied ? 'bg-emerald-600' : 'bg-emerald-800/60'
        }`}
      >
        <span className="text-lg text-white">
          {occupied ? (meta.username?.[0]?.toUpperCase() ?? '?') : '?'}
        </span>
      </div>

      {/* Name */}
      <span className={`text-sm font-medium ${occupied ? 'text-white' : 'text-emerald-500/60'}`}>
        {occupied ? meta.username : 'Waiting...'}
      </span>

      {/* Position label */}
      <span className="text-xs text-emerald-400/50">{label}</span>

      {/* Badges */}
      <div className="flex gap-1">
        {meta.isYou && <Badge variant="blue">You</Badge>}
        {meta.isTeammate && <Badge variant="green">Ally</Badge>}
        {disconnected && <Badge variant="red">DC</Badge>}
      </div>
    </div>
  );
}

export function WaitingRoom({ roomCode, playerMeta, onLeave }: WaitingRoomProps) {
  const filledCount = Object.values(playerMeta).filter((m) => m.playerId !== null).length;
  const isFull = filledCount >= 4;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 p-8">
      {/* Room code */}
      <div className="text-center">
        <p className="text-sm text-emerald-400">Room Code</p>
        <p className="text-3xl font-bold tracking-wider text-white">{roomCode}</p>
      </div>

      {/* Seats in cross layout */}
      <div
        className="grid gap-4"
        style={{
          gridTemplateAreas: `
            ".     north ."
            "west  .     east"
            ".     south ."
          `,
          gridTemplateColumns: '1fr 1fr 1fr',
          gridTemplateRows: 'auto auto auto',
        }}
      >
        {SEAT_POSITIONS.map(({ position, label, gridArea }) => (
          <div key={position} style={{ gridArea }} className="flex justify-center">
            <SeatSlot meta={playerMeta[position]} label={label} />
          </div>
        ))}
      </div>

      {/* Status */}
      <div className="flex items-center gap-2">
        {isFull ? (
          <>
            <Spinner size="sm" />
            <span className="text-emerald-300">Game starting...</span>
          </>
        ) : (
          <>
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-emerald-400">Waiting for players... ({filledCount}/4)</span>
          </>
        )}
      </div>

      {/* Leave button */}
      <button
        type="button"
        onClick={onLeave}
        className="rounded-md bg-emerald-700/50 px-4 py-2 text-sm text-emerald-200 transition-colors hover:bg-emerald-700"
      >
        Leave Room
      </button>
    </div>
  );
}
