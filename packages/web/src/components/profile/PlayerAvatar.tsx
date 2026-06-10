import { Bot } from 'lucide-react';
import type { CSSProperties } from 'react';
import { SKILL_MATERIALS, type SkillTier } from './ranking';

/**
 * PlayerAvatar — the canonical round player avatar (DS `PidroAvatar`).
 *
 * One component, every state the game needs:
 *   content    — initials / photo / bot mark / empty seat (dashed +)
 *   presence   — online · away · offline corner dot
 *   state      — active (their turn: cyan pulse ring) · dimmed (passed/DC)
 *   premium    — gold rim + soft gold glow
 *
 * Progression (opt-in, composes with the above):
 *   progress   — 0–1 dedication ring around the face (gap at the bottom)
 *   level      — gold chip notched bottom-center; prestige adds ★ pips
 *   tier       — fuses skill INTO the level chip: the chip is rendered in
 *                that tier's metal. Number = level, metal = skill.
 *
 * Canon (design chats, final): the dedication ring and the presence dot
 * never share one avatar — "online + rank" together = level chip + dot,
 * no ring. Callers pick the right combination per surface.
 */

export type PlayerAvatarState = 'normal' | 'active' | 'dimmed';
export type Presence = 'online' | 'away' | 'offline';

interface PlayerAvatarProps {
  /** Initials/letter shown when there's no photo. */
  initial?: string;
  /** Full name — used for the deterministic cool-tone gradient. */
  name?: string;
  src?: string;
  size?: number;
  isBot?: boolean;
  isVacant?: boolean;
  state?: PlayerAvatarState;
  /** Presence dot: 'online' | 'away' | 'offline' | boolean (legacy) | undefined = none. */
  online?: boolean | Presence;
  premium?: boolean;
  /** Dedication ring fill, 0–1. Renders the halo ring when set. */
  progress?: number;
  /** Veteran level — gold chip notched at the avatar's bottom edge. */
  level?: number;
  prestige?: number;
  /** Skill tier — renders the level chip in the tier's metal. */
  tier?: SkillTier;
  className?: string;
}

/** Deterministic cool-tone gradient (teal→blue, never warm) per the DS. */
function avatarTone(name: string): { bg: string; ink: string } {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const hue = 190 + (h % 48);
  return {
    bg: `linear-gradient(150deg, hsl(${hue} 44% 37%) 0%, hsl(${hue + 10} 50% 21%) 100%)`,
    ink: `hsl(${hue} 55% 88%)`,
  };
}

const PRESENCE_COLORS: Record<Presence, string> = {
  online: '#4AE06A',
  away: '#FFD426',
  offline: '#7C8A99',
};

/** Level chip — number is dedication; the metal (when tier given) is skill. */
function LevelChip({
  level,
  prestige = 0,
  dim,
  tier,
}: {
  level: number;
  prestige?: number;
  dim: number;
  tier?: SkillTier;
}) {
  const mat = tier ? SKILL_MATERIALS[tier] : null;
  const fs = Math.max(10, dim * 0.22);
  const lift = Math.max(1, Math.round(dim * 0.013));
  const bg = mat
    ? `linear-gradient(180deg, ${mat.hi} 0%, ${mat.mid} 52%, ${mat.lo} 100%)`
    : 'linear-gradient(180deg, #8A6030 0%, #5A3515 50%, #321A08 100%)';
  const glow = mat?.glow ? `, 0 0 ${dim * 0.14}px ${mat.glow}` : '';

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: fs * 0.3,
        padding: `${Math.max(1, dim * 0.02)}px ${dim * 0.12}px`,
        background: bg,
        border: `2px solid ${mat ? mat.rim : 'var(--pidro-gold-dark)'}`,
        borderRadius: 999,
        boxShadow: `0 2px 5px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.28)${glow}`,
        fontFamily: 'var(--pidro-font-display)',
        lineHeight: 1.1,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          fontWeight: 700,
          fontSize: fs,
          color: mat ? mat.ink : 'var(--pidro-gold)',
          transform: `translateY(-${lift}px)`,
          textShadow: mat ? 'none' : '0 1px 2px rgba(0,0,0,.6)',
        }}
      >
        {level}
      </span>
      {prestige > 0 && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1,
            fontSize: fs * 0.62,
            transform: `translateY(-${lift}px)`,
            fontWeight: 800,
            color: mat ? mat.ink : 'var(--pidro-gold-light)',
            fontFamily: 'var(--pidro-font-body)',
          }}
        >
          ★{prestige}
        </span>
      )}
    </div>
  );
}

export function PlayerAvatar({
  initial = '?',
  name,
  src,
  size = 44,
  isBot = false,
  isVacant = false,
  state = 'normal',
  online,
  premium = false,
  progress,
  level,
  prestige = 0,
  tier,
  className = '',
}: PlayerAvatarProps) {
  const isActive = state === 'active';
  const isDimmed = state === 'dimmed';
  const tone = avatarTone(name || initial);
  const presence: Presence | null =
    online === true ? 'online' : online === false ? 'offline' : (online ?? null);

  const borderW = Math.max(2, Math.round(size * 0.04));
  let boxShadow = 'inset 0 2px 6px rgba(0,0,0,0.45)';
  if (premium) boxShadow = `0 0 ${size * 0.18}px rgba(255,212,38,0.45)`;
  if (isActive)
    boxShadow = `0 0 0 ${Math.max(2, size * 0.035)}px var(--pidro-cyan), 0 0 ${size * 0.2}px rgba(0,207,255,0.45)`;

  const face = (
    <div
      className={isActive ? 'animate-active-turn' : ''}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        flexShrink: 0,
        color: tone.ink,
        fontFamily: 'var(--pidro-font-display)',
        fontWeight: 700,
        fontSize: size * 0.36,
        letterSpacing: '0.01em',
        background: isVacant ? 'rgba(8,28,52,0.55)' : src ? '#0d2845' : tone.bg,
        border: isVacant
          ? `2px dashed rgba(0,207,255,0.5)`
          : `${borderW}px solid ${premium ? 'var(--pidro-gold)' : 'rgba(0,200,255,0.4)'}`,
        boxShadow: isVacant ? 'none' : boxShadow,
        filter: isDimmed ? 'saturate(0.25) brightness(0.7)' : 'none',
        opacity: isDimmed ? 0.6 : 1,
        transition:
          'box-shadow var(--pidro-duration) var(--pidro-ease), filter var(--pidro-duration) var(--pidro-ease)',
      }}
    >
      {isVacant ? (
        <svg
          width={size * 0.42}
          height={size * 0.42}
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(0,207,255,0.7)"
          strokeWidth={2.4}
          strokeLinecap="round"
          aria-hidden="true"
        >
          <line x1={12} y1={5} x2={12} y2={19} />
          <line x1={5} y1={12} x2={19} y2={12} />
        </svg>
      ) : isBot ? (
        <Bot
          style={{ width: size * 0.5, height: size * 0.5, color: 'rgba(210,232,248,0.85)' }}
          strokeWidth={2.2}
        />
      ) : src ? (
        <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        initial.toUpperCase()
      )}
    </div>
  );

  const dot =
    presence && !isVacant ? (
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: size * 0.02,
          bottom: size * 0.02,
          width: Math.max(8, size * 0.26),
          height: Math.max(8, size * 0.26),
          borderRadius: '50%',
          background: PRESENCE_COLORS[presence],
          border: `${Math.max(2, size * 0.035)}px solid #0a2138`,
          boxShadow: presence === 'online' ? '0 0 6px rgba(74,224,106,0.6)' : 'none',
        }}
      />
    ) : null;

  const faceWrap = (
    <div style={{ position: 'relative', width: size, height: size, display: 'inline-flex' }}>
      {face}
      {dot}
    </div>
  );

  const chip =
    level != null ? <LevelChip level={level} prestige={prestige} dim={size} tier={tier} /> : null;
  const haloMode = progress != null;

  /* ── plain layout (no ring) ── */
  if (!haloMode) {
    return (
      <div
        className={className}
        style={{
          position: 'relative',
          display: 'inline-flex',
          flexShrink: 0,
          verticalAlign: 'middle',
        }}
      >
        {faceWrap}
        {chip && (
          <div
            style={{
              position: 'absolute',
              bottom: -size * 0.14,
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            {chip}
          </div>
        )}
      </div>
    );
  }

  /* ── halo layout (dedication progress ring, gap at the bottom) ── */
  const ringW = Math.max(4, size * 0.06);
  const pad = ringW + size * 0.06;
  const box = size + pad * 2;
  const cc = box / 2;
  const rr = (box - ringW) / 2 - 1;
  const circ = 2 * Math.PI * rr;
  const gapFrac = 0.26;
  const trackDash = circ * (1 - gapFrac);
  const prog = Math.max(0, Math.min(1, progress));
  const startRot = 90 + gapFrac * 180;

  const wrapStyle: CSSProperties = {
    position: 'relative',
    display: 'inline-flex',
    flexShrink: 0,
    verticalAlign: 'middle',
    width: box,
    height: box,
  };

  return (
    <div className={className} style={wrapStyle}>
      <svg
        width={box}
        height={box}
        viewBox={`0 0 ${box} ${box}`}
        style={{
          position: 'absolute',
          inset: 0,
          transform: `rotate(${startRot}deg)`,
          overflow: 'visible',
        }}
        aria-hidden="true"
      >
        <circle
          cx={cc}
          cy={cc}
          r={rr}
          fill="none"
          stroke="rgba(0,0,0,0.42)"
          strokeWidth={ringW}
          strokeDasharray={`${trackDash} ${circ}`}
          strokeLinecap="round"
        />
        <circle
          cx={cc}
          cy={cc}
          r={rr}
          fill="none"
          stroke="var(--pidro-cyan)"
          strokeWidth={ringW}
          strokeDasharray={`${trackDash * prog} ${circ}`}
          strokeLinecap="round"
          style={{
            filter: 'drop-shadow(0 0 2px rgba(0,207,255,0.4))',
            transition: 'stroke-dasharray 600ms var(--pidro-ease)',
          }}
        />
      </svg>
      <div style={{ position: 'absolute', top: pad, left: pad }}>{faceWrap}</div>
      {chip && (
        <div
          style={{
            position: 'absolute',
            bottom: -size * 0.02,
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          {chip}
        </div>
      )}
    </div>
  );
}
