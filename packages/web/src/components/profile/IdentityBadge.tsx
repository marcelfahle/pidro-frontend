import { type SkillTier, veteranTitle } from './ranking';
import { SkillEmblem } from './SkillEmblem';

/**
 * IdentityBadge (Halo) — the compact avatar shown at tables / HUD / rows /
 * the home menu. The chosen fusion of dedication + skill onto one avatar:
 *
 *   dedication → a progress RING orbiting the avatar + the level NUMBER chip
 *                notched at the bottom (dedication always carries the number)
 *   skill      → a metallic coin emblem pinned to the avatar's upper-right
 *                (skill never carries a number — the material does the talking)
 *
 * Ported from the Pidro Design System (`pidro-ds/identity-badge.jsx`).
 */

function deriveInitials(name: string | undefined): string {
  return (name || '?')
    .split(/\s|(?=[A-Z0-9])/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function AvatarInner({ src, dim, name }: { src?: string; dim: number; name?: string }) {
  return (
    <div
      style={{
        width: dim,
        height: dim,
        borderRadius: '50%',
        background: src
          ? '#0d2845'
          : 'linear-gradient(150deg, #2A6088 0%, #123356 55%, #0A2138 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'rgba(255,255,255,0.85)',
        fontFamily: 'var(--pidro-font-display)',
        fontSize: dim * 0.34,
        letterSpacing: '0.02em',
        overflow: 'hidden',
        flexShrink: 0,
        boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.5)',
      }}
    >
      {src ? (
        <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        deriveInitials(name)
      )}
    </div>
  );
}

/** The level number chip — HERO of the dedication axis. */
function LevelChip({
  level,
  prestige,
  fs,
  pad,
}: {
  level: number;
  prestige: number;
  fs: number;
  pad: number;
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: fs * 0.28,
        padding: `${pad * 0.5}px ${pad}px`,
        background: 'linear-gradient(180deg, #8A6030 0%, #5A3515 45%, #321A08 100%)',
        border: '2px solid var(--pidro-gold-dark)',
        borderRadius: 999,
        boxShadow: '0 2px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.18)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--pidro-font-display)',
          fontWeight: 700,
          fontSize: fs,
          lineHeight: 1,
          color: 'var(--pidro-gold)',
          textShadow: '0 1px 2px rgba(0,0,0,.6)',
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
            fontWeight: 800,
            color: 'var(--pidro-gold-light)',
            fontFamily: 'var(--pidro-font-body)',
          }}
        >
          ★{prestige}
        </span>
      )}
    </div>
  );
}

export interface IdentityBadgeProps {
  name?: string;
  level?: number;
  /** Veteran progress toward the next level, 0–1. */
  progress?: number;
  tier?: SkillTier;
  prestige?: number;
  size?: number;
  src?: string;
  /** Render the name + "Lvl N · Title" caption below the badge. */
  withTitle?: boolean;
  compact?: boolean;
  className?: string;
}

export function IdentityBadge({
  name,
  level = 1,
  progress = 0,
  tier = 'gold',
  prestige = 0,
  size = 96,
  src,
  withTitle = false,
  compact = false,
  className,
}: IdentityBadgeProps) {
  const ringW = Math.max(5, size * 0.06);
  const pad = ringW + size * 0.06;
  const box = size + pad * 2;
  const c = box / 2;
  const r = (box - ringW) / 2 - 1;
  const circ = 2 * Math.PI * r;
  const gap = 0.26; // fraction of circle left open at the bottom for the chip
  const dash = circ * (1 - gap);
  const startRot = 90 + gap * 180; // rotate so the gap sits at bottom-center
  const emblem = size * 0.42;

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: size * 0.06,
      }}
    >
      <div style={{ position: 'relative', width: box, height: box }}>
        {/* dedication ring */}
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
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke="rgba(0,0,0,0.45)"
            strokeWidth={ringW}
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
          />
          <circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke="var(--pidro-cyan)"
            strokeWidth={ringW}
            strokeDasharray={`${dash * progress} ${circ}`}
            strokeLinecap="round"
            style={{
              filter: 'drop-shadow(0 0 2px rgba(0,207,255,0.3))',
              transition: 'stroke-dasharray 600ms ease',
            }}
          />
        </svg>

        {/* avatar */}
        <div style={{ position: 'absolute', top: pad, left: pad }}>
          <AvatarInner src={src} dim={size} name={name} />
        </div>

        {/* skill emblem pinned inboard on the avatar's upper-right */}
        <div style={{ position: 'absolute', top: emblem * 0.02, right: emblem * 0.14 }}>
          <SkillEmblem tier={tier} shape="coin" size={emblem} motif="spade" />
        </div>

        {/* level chip notched at the bottom-center over the ring gap */}
        <div
          style={{
            position: 'absolute',
            bottom: -size * 0.04,
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          <LevelChip level={level} prestige={prestige} fs={size * 0.22} pad={size * 0.1} />
        </div>
      </div>

      {withTitle && !compact && (
        <div style={{ textAlign: 'center', marginTop: size * 0.04 }}>
          <div
            style={{
              fontFamily: 'var(--pidro-font-display)',
              fontSize: size * 0.16,
              color: '#fff',
            }}
          >
            {name}
          </div>
          <div style={{ fontSize: size * 0.12, color: 'var(--pidro-text-secondary)' }}>
            {`Lvl ${level} · ${veteranTitle(level).short}`}
          </div>
        </div>
      )}
    </div>
  );
}
