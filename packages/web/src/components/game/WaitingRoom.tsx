import type { PlayerMeta, Position } from '@pidro/shared';
import { PlayerAvatar } from '../profile/PlayerAvatar';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';

interface WaitingRoomProps {
  roomCode: string;
  playerMeta: Record<Position, PlayerMeta>;
  readyPlayers?: Position[];
  youPosition?: Position | null;
  onReady?: () => void;
  onLeave: () => void;
}

const SEAT_POSITIONS: { position: Position; label: string; className: string }[] = [
  {
    position: 'north',
    label: 'North',
    className:
      'left-1/2 top-[16%] w-[46%] -translate-x-1/2 max-md:top-[21%] max-md:w-[62%] short:top-[6%]',
  },
  {
    position: 'west',
    label: 'West',
    className:
      'left-[3%] top-1/2 w-[19%] -translate-y-1/2 max-md:left-[2%] max-md:top-[40%] max-md:w-[36%]',
  },
  {
    position: 'east',
    label: 'East',
    className:
      'right-[3%] top-1/2 w-[19%] -translate-y-1/2 max-md:right-[2%] max-md:top-[40%] max-md:w-[36%]',
  },
  {
    position: 'south',
    label: 'South',
    className:
      'bottom-[8%] left-1/2 w-[60%] -translate-x-1/2 max-md:bottom-[10%] max-md:w-[78%] short:bottom-[5%] short:w-[44%]',
  },
];

function SeatSlot({ meta, label, isReady }: { meta: PlayerMeta; label: string; isReady: boolean }) {
  const occupied = meta.playerId !== null;
  const disconnected = occupied && !meta.isConnected;
  const cardClasses = [
    'pidro-seat-card',
    isReady ? 'pidro-seat-card--ready' : '',
    meta.isYou ? 'pidro-seat-card--active' : '',
    disconnected ? 'opacity-50' : '',
    'w-full',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cardClasses}>
      <PlayerAvatar
        initial={meta.username?.[0]?.toUpperCase() ?? '?'}
        name={meta.username ?? undefined}
        size={44}
        isVacant={!occupied}
        isBot={meta.seatStatus === 'bot_substitute' || meta.seatStatus === 'permanent_bot'}
        online={occupied ? (meta.isConnected ? 'online' : 'offline') : undefined}
      />
      <div className="min-w-0">
        <div className="truncate text-sm font-black text-white">
          {occupied ? meta.username : 'Waiting...'}
        </div>
        <div className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-50/60">
          {label}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {meta.isYou && <Badge variant="blue">You</Badge>}
          {meta.isTeammate && <Badge variant="green">Ally</Badge>}
          {isReady && !meta.isYou && <Badge variant="yellow">Ready</Badge>}
          {disconnected && <Badge variant="red">DC</Badge>}
        </div>
      </div>
    </div>
  );
}

export function WaitingRoom({
  roomCode,
  playerMeta,
  readyPlayers = [],
  youPosition,
  onReady,
  onLeave,
}: WaitingRoomProps) {
  const filledCount = Object.values(playerMeta).filter((m) => m.playerId !== null).length;
  const isFull = filledCount >= 4;
  const isYouReady = youPosition ? readyPlayers.includes(youPosition) : false;

  return (
    <div className="flex h-full w-full items-center justify-center px-2 pb-3 pt-1">
      <div className="relative aspect-[4/3] w-full max-w-[1120px] max-h-[calc(100dvh-2rem)] max-md:aspect-[10/16]">
        <div className="absolute left-1/2 top-[6%] z-20 -translate-x-1/2 text-center max-md:top-[2%] short:left-[2%] short:top-[2%] short:translate-x-0 short:text-left">
          <div className="pidro-panel rounded-[18px] px-6 py-3 short:rounded-lg short:px-3 short:py-1.5">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-50/70 short:text-[9px] short:tracking-[0.2em]">
              Room Code
            </p>
            <p className="mt-1 text-4xl font-black tracking-[0.28em] text-white short:mt-0 short:text-xl short:tracking-[0.18em]">
              {roomCode}
            </p>
          </div>
        </div>

        {SEAT_POSITIONS.map(({ position, label, className }) => (
          <div key={position} className={`absolute z-10 ${className}`}>
            <SeatSlot
              meta={playerMeta[position]}
              label={label}
              isReady={readyPlayers.includes(position)}
            />
          </div>
        ))}

        <div className="absolute inset-x-[16%] top-[39%] z-20 flex flex-col items-center gap-4 text-center max-md:inset-x-[8%] max-md:top-[49%] short:top-[42%] short:gap-2">
          {isFull ? (
            <>
              <div className="text-base font-black uppercase tracking-[0.16em] text-cyan-50/80">
                Tap to start the game
              </div>
              {onReady && (
                <Button type="button" onClick={onReady} disabled={isYouReady} size="lg">
                  {isYouReady ? 'Ready!' : 'Ready'}
                </Button>
              )}
              <div className="flex items-center gap-2 rounded-full border border-cyan-300/20 bg-black/15 px-4 py-2 text-sm font-black text-cyan-50/75">
                <Spinner size="sm" />
                <span>Game starting...</span>
              </div>
            </>
          ) : (
            <div className="pidro-panel px-6 py-4">
              <div className="text-sm font-black uppercase tracking-[0.18em] text-cyan-50/80">
                Waiting for players... ({filledCount}/4)
              </div>
            </div>
          )}
        </div>

        <div className="absolute bottom-[3%] right-[3%] z-20 max-md:left-1/2 max-md:right-auto max-md:-translate-x-1/2">
          <Button type="button" variant="secondary" size="sm" onClick={onLeave}>
            Leave Room
          </Button>
        </div>
      </div>
    </div>
  );
}
