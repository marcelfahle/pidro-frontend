import { Badge } from './Badge';

interface PlayerMiniCardProps {
  username: string | null | undefined;
  subtitle?: string;
  className?: string;
}

export function PlayerMiniCard({
  username,
  subtitle = 'Signed In',
  className = '',
}: PlayerMiniCardProps) {
  const displayName = username?.trim() || 'Player';
  const initial = displayName[0]?.toUpperCase() ?? 'P';

  return (
    <div
      className={`pidro-panel pidro-panel--tight flex max-w-[220px] items-center gap-3 px-3 py-2 max-md:max-w-[160px] max-md:gap-2 max-md:px-2.5 ${className}`}
    >
      <div className="pidro-avatar h-10 w-10 text-sm max-md:h-9 max-md:w-9">{initial}</div>
      <div className="min-w-0">
        <div className="truncate text-sm font-black text-white max-md:text-[13px]">
          {displayName}
        </div>
        <div className="mt-1 flex items-center gap-2 max-md:mt-0.5">
          <span className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-cyan-50/62">
            {subtitle}
          </span>
          <Badge variant="blue" className="max-md:hidden">
            Online
          </Badge>
        </div>
      </div>
    </div>
  );
}
