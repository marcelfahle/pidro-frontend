import { GlassCard } from '../ds';
import { PlayerAvatar } from '../profile/PlayerAvatar';
import { type SkillTier, veteranTitle } from '../profile/ranking';
import { Badge } from './Badge';

/** Ranking summary used for the caption (subset of the profile screen). */
export interface MiniProfile {
  level: number;
  /** Veteran progress toward the next level, 0–1. */
  progress: number;
  tier: SkillTier;
  prestige: number;
  title?: string;
}

interface PlayerMiniCardProps {
  username: string | null | undefined;
  subtitle?: string;
  /** When present, the caption shows "Lvl N · Title" instead of the subtitle. */
  profile?: MiniProfile;
  className?: string;
}

export function PlayerMiniCard({
  username,
  subtitle = 'Signed In',
  profile,
  className = '',
}: PlayerMiniCardProps) {
  const displayName = username?.trim() || 'Player';
  const initial = displayName[0]?.toUpperCase() ?? 'P';

  const caption = profile
    ? `Lvl ${profile.level} · ${profile.title ?? veteranTitle(profile.level).short}`
    : subtitle;

  return (
    <GlassCard
      style={{
        padding: '8px 12px',
        borderRadius: 'var(--pidro-radius-md)',
        maxWidth: 260,
      }}
    >
      <div className={`flex items-center gap-3 max-md:gap-2 ${className}`}>
        <PlayerAvatar initial={initial} size={44} online />
        <div className="min-w-0">
          <div className="truncate text-sm font-black text-white max-md:text-[13px]">
            {displayName}
          </div>
          <div className="mt-1 flex items-center gap-2 max-md:mt-0.5">
            <span className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-cyan-50/62">
              {caption}
            </span>
            <Badge variant="blue" className="max-md:hidden">
              Online
            </Badge>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
