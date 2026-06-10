import { GlassCard } from '../ds';
import { PlayerAvatar } from '../profile/PlayerAvatar';
import { type SkillTier, veteranTitle } from '../profile/ranking';

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
  /** When present, the avatar wears the level chip (tier metal = skill). */
  profile?: MiniProfile;
  className?: string;
}

/**
 * Home-screen identity chip. Canon combination for "online + rank":
 * level chip (in the skill tier's metal) + presence dot — no dedication
 * ring here; the full halo lives on the profile screen.
 */
export function PlayerMiniCard({
  username,
  subtitle = 'Signed In',
  profile,
  className = '',
}: PlayerMiniCardProps) {
  const displayName = username?.trim() || 'Player';
  const initial = displayName[0]?.toUpperCase() ?? 'P';

  const caption = profile ? `${profile.title ?? veteranTitle(profile.level).short}` : subtitle;

  return (
    <GlassCard
      style={{
        padding: '10px 14px',
        borderRadius: 'var(--pidro-radius-md)',
        maxWidth: 280,
      }}
    >
      <div className={`flex items-center gap-3 ${profile ? 'pb-1.5' : ''} ${className}`}>
        <PlayerAvatar
          initial={initial}
          name={displayName}
          size={46}
          online="online"
          level={profile?.level}
          prestige={profile?.prestige}
          tier={profile?.tier}
        />
        <div className="min-w-0">
          <div className="truncate font-[family-name:var(--pidro-font-display)] text-[15px] text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
            {displayName}
          </div>
          <div className="mt-0.5 truncate text-[10px] font-black uppercase tracking-[0.16em] text-cyan-50/62">
            {caption}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
