import type { SeatStatus } from '@pidro/shared';
import { Badge } from '../ui/Badge';

interface GamePlayerCardProps {
  displayName: string;
  roleLabel: string;
  statusText: string;
  initial: string;
  isYou: boolean;
  isDealer: boolean;
  isCurrentTurn: boolean;
  isConnected: boolean;
  seatStatus?: SeatStatus;
  compact?: boolean;
  className?: string;
}

export function GamePlayerCard({
  displayName,
  roleLabel,
  statusText,
  initial,
  isYou,
  isDealer,
  isCurrentTurn,
  isConnected,
  seatStatus = 'normal',
  compact = false,
  className = '',
}: GamePlayerCardProps) {
  const isBot = seatStatus === 'bot_substitute' || seatStatus === 'permanent_bot';
  const isReconnecting = seatStatus === 'reconnecting';
  const isVacant = seatStatus === 'vacant';
  const dimmed = !isVacant && (!isConnected || isReconnecting);

  const avatarContent = isBot ? '🤖' : initial;
  const resolvedName = isVacant ? 'Waiting' : isBot ? 'Bot' : displayName;

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 ${dimmed ? 'opacity-50' : ''} ${className}`}
      >
        {isVacant ? (
          <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-amber-300/45 bg-amber-400/10 text-[11px] font-black text-amber-100">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-300/80" />
          </div>
        ) : (
          <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-cyan-300/40 bg-[#1a5a80] text-[11px] font-black text-white">
            {avatarContent}
            {isCurrentTurn && (
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-pulse rounded-full bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.7)]" />
            )}
          </div>
        )}
        <span className="max-w-[64px] truncate text-xs font-bold leading-tight text-cyan-50/80">
          {resolvedName}
        </span>
      </div>
    );
  }

  const seatCardClass = [
    'pidro-seat-card',
    isCurrentTurn ? 'pidro-seat-card--active' : '',
    isCurrentTurn && isYou ? 'pidro-seat-card--your-turn' : '',
    statusText === 'Ready' ? 'pidro-seat-card--ready' : '',
    dimmed ? 'opacity-60' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const seatSubtext =
    seatStatus === 'vacant'
      ? 'Waiting for player...'
      : seatStatus === 'bot_substitute'
        ? `Bot · ${displayName} can rejoin`
        : seatStatus === 'permanent_bot'
          ? 'Bot'
          : null;

  return (
    <div className={seatCardClass}>
      {isVacant ? (
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-amber-300/45 bg-amber-400/10 max-lg:h-10 max-lg:w-10 max-md:h-9 max-md:w-9">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-200/85" />
        </div>
      ) : (
        <div className="pidro-avatar h-12 w-12 max-lg:h-10 max-lg:w-10 max-md:h-9 max-md:w-9">
          <span>{avatarContent}</span>
        </div>
      )}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-black text-white max-md:text-[13px]">
            {resolvedName}
          </span>
          {isYou && <Badge variant="blue">You</Badge>}
          {isDealer && <Badge variant="yellow">D</Badge>}
          {isBot && <Badge variant="amber">Bot</Badge>}
          {isCurrentTurn && (
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-yellow-400" />
          )}
          {isReconnecting && (
            <span className="inline-block h-2 w-2 animate-spin rounded-full border border-amber-400 border-t-transparent" />
          )}
          {!isConnected && !isReconnecting && !isBot && !isVacant && (
            <Badge variant="red">DC</Badge>
          )}
        </div>
        <div className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-50/60 max-lg:hidden">
          {roleLabel}
        </div>
        {seatSubtext ? (
          <div className="mt-1 text-[10px] font-black uppercase tracking-[0.08em] text-amber-400/80 max-md:mt-0.5">
            {seatSubtext}
          </div>
        ) : (
          <div
            className={`mt-1 text-xs font-black uppercase tracking-[0.08em] max-md:mt-0.5 max-md:text-[10px] ${isCurrentTurn ? 'text-cyan-50' : 'text-cyan-100/80'}`}
          >
            {isVacant ? 'Waiting for player...' : isReconnecting ? 'Reconnecting...' : statusText}
          </div>
        )}
      </div>
    </div>
  );
}
