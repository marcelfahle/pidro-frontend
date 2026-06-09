import type { SeatStatus } from '@pidro/shared';
import { PlayerAvatar } from '../profile/PlayerAvatar';

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
  isDealer = false,
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

  const resolvedName = isVacant ? 'Waiting...' : isBot ? 'Bot' : displayName;
  const resolvedStatus = isVacant ? 'Open seat' : isReconnecting ? 'Reconnecting...' : statusText;

  const avatar = (
    <PlayerAvatar
      initial={initial}
      size={compact ? 30 : 38}
      isBot={isBot}
      isVacant={isVacant}
      state={isCurrentTurn ? 'active' : 'normal'}
    />
  );

  const text = (
    <div className="min-w-0 flex-1 text-center">
      <div className="flex items-center justify-center gap-1">
        <span
          className={`truncate font-bold text-white ${compact ? 'max-w-[64px] text-[10px]' : 'text-[11px]'}`}
        >
          {resolvedName}
        </span>
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
        compact ? 'w-[100px] px-1.5 py-1' : 'px-2 py-1.5'
      } ${isCurrentTurn ? 'border-cyan-300/70 animate-active-turn' : ''} ${
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
