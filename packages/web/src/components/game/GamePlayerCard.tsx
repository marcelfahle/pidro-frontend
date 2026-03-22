import type { SeatStatus } from '@pidro/shared';

interface GamePlayerCardProps {
  displayName: string;
  roleLabel?: string;
  statusText: string;
  initial: string;
  isYou?: boolean;
  isDealer?: boolean;
  isCurrentTurn?: boolean;
  isConnected?: boolean;
  seatStatus?: SeatStatus;
  compact?: boolean;
  imagePosition?: 'left' | 'right';
  className?: string;
}

export function GamePlayerCard({
  displayName,
  statusText,
  initial,
  isCurrentTurn = false,
  isConnected = true,
  seatStatus = 'normal',
  compact = false,
  imagePosition = 'left',
  className = '',
}: GamePlayerCardProps) {
  const isBot = seatStatus === 'bot_substitute' || seatStatus === 'permanent_bot';
  const isReconnecting = seatStatus === 'reconnecting';
  const isVacant = seatStatus === 'vacant';
  const dimmed = !isVacant && (!isConnected || isReconnecting);

  const avatarContent = isBot ? '🤖' : initial;
  const resolvedName = isVacant ? 'Waiting...' : isBot ? 'Bot' : displayName;
  const resolvedStatus = isVacant
    ? 'Open seat'
    : isReconnecting
      ? 'Reconnecting...'
      : statusText;

  const avatar = (
    <div
      className={`flex shrink-0 items-center justify-center rounded text-xs font-black text-white ${
        compact ? 'h-6 w-6' : 'h-8 w-8'
      } ${isVacant ? 'border border-dashed border-amber-300/40 bg-amber-400/10' : 'bg-[#1a5a80]'}`}
    >
      {isVacant ? (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-300/80" />
      ) : (
        avatarContent
      )}
    </div>
  );

  const text = (
    <div className="min-w-0">
      <div className="flex items-center gap-1">
        <span
          className={`truncate font-bold text-white ${compact ? 'max-w-[64px] text-[10px]' : 'text-[11px]'}`}
        >
          {resolvedName}
        </span>
        {isCurrentTurn && (
          <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.6)]" />
        )}
      </div>
      <div
        className={`font-bold uppercase tracking-wide ${
          compact ? 'text-[8px]' : 'text-[9px]'
        } ${isCurrentTurn ? 'text-cyan-50/90' : 'text-cyan-50/55'}`}
      >
        {resolvedStatus}
      </div>
    </div>
  );

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-lg border border-cyan-300/20 bg-black/30 backdrop-blur-sm ${
        compact ? 'px-1.5 py-1' : 'px-2 py-1.5'
      } ${isCurrentTurn ? 'border-cyan-300/60 shadow-[0_0_12px_rgba(67,245,255,0.2)]' : ''} ${
        dimmed ? 'opacity-50' : ''
      } ${className}`}
    >
      {imagePosition === 'left' ? (
        <>
          {avatar}
          {text}
        </>
      ) : (
        <>
          {text}
          {avatar}
        </>
      )}
    </div>
  );
}
