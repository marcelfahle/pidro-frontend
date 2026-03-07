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
  className = '',
}: GamePlayerCardProps) {
  const seatCardClass = [
    'pidro-seat-card',
    isCurrentTurn ? 'pidro-seat-card--active' : '',
    statusText === 'Ready' ? 'pidro-seat-card--ready' : '',
    !isConnected ? 'opacity-60' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={seatCardClass}>
      <div className="pidro-avatar h-12 w-12 max-md:h-9 max-md:w-9">
        <span>{initial}</span>
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-black text-white max-md:text-[13px]">
            {displayName}
          </span>
          {isYou && <Badge variant="blue">You</Badge>}
          {isDealer && <Badge variant="yellow">D</Badge>}
          {isCurrentTurn && (
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-yellow-400" />
          )}
          {!isConnected && <Badge variant="red">DC</Badge>}
        </div>
        <div className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-50/60 max-md:hidden">
          {roleLabel}
        </div>
        <div
          className={`mt-1 text-xs font-black uppercase tracking-[0.08em] max-md:mt-0.5 max-md:text-[10px] ${isCurrentTurn ? 'text-cyan-50' : 'text-cyan-100/80'}`}
        >
          {statusText}
        </div>
      </div>
    </div>
  );
}
