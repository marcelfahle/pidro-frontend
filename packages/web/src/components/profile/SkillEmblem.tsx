import { useId } from 'react';
import { type SkillTier, skillMaterial } from './ranking';

/**
 * SkillEmblem — the single metallic emblem that SWAPS per skill tier.
 *
 * Skill has NO number (that's dedication's job): the material + shape do the
 * talking. The chosen shape for Pidro is the **coin**. Ported from the Pidro
 * Design System (`pidro-ds/skill-emblem.jsx`) into inline SVG.
 */

type EmblemShape = 'coin' | 'shield' | 'gem' | 'rosette';
type EmblemMotif = 'spade' | 'star' | 'heart' | 'diamond' | 'club';

const MOTIF_GLYPH: Record<EmblemMotif, string> = {
  spade: '♠',
  star: '★',
  heart: '♥',
  diamond: '♦',
  club: '♣',
};

interface SkillEmblemProps {
  tier?: SkillTier;
  shape?: EmblemShape;
  size?: number;
  motif?: EmblemMotif;
  className?: string;
  style?: React.CSSProperties;
}

export function SkillEmblem({
  tier = 'gold',
  shape = 'coin',
  size = 64,
  motif = 'spade',
  className,
  style,
}: SkillEmblemProps) {
  const m = skillMaterial(tier);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glyph = MOTIF_GLYPH[motif] ?? '♠';
  const calib = m.calibrating;
  const S = size;
  const c = S / 2;
  const stroke = calib ? { strokeDasharray: `${S * 0.06} ${S * 0.05}` } : {};
  const glowFilter = calib
    ? 'none'
    : `drop-shadow(0 2px 5px rgba(0,0,0,.45)) drop-shadow(0 0 ${S * 0.12}px ${m.glow})`;

  const motifText = (cx: number, cy: number, fs: number, text: string) => (
    <text
      x={cx}
      y={cy}
      fill={m.ink}
      fontSize={fs}
      textAnchor="middle"
      dominantBaseline="central"
      style={{
        fontFamily: 'Georgia, serif',
        fontWeight: 700,
        filter: 'drop-shadow(0 1px 0 rgba(255,255,255,.25))',
      }}
    >
      {text}
    </text>
  );

  let body: React.ReactNode = null;

  if (shape === 'coin') {
    const r = S * 0.46;
    body = (
      <g>
        <circle
          cx={c}
          cy={c}
          r={r}
          fill={`url(#${uid}face)`}
          stroke={`url(#${uid}rim)`}
          strokeWidth={S * 0.05}
          {...stroke}
        />
        <circle
          cx={c}
          cy={c}
          r={r * 0.78}
          fill="none"
          stroke={m.rim}
          strokeOpacity={calib ? 0.4 : 0.55}
          strokeWidth={S * 0.018}
        />
        {calib ? motifText(c, c, S * 0.4, '?') : motifText(c, c, S * 0.42, glyph)}
        {!calib && (
          <path
            d={`M ${c - r * 0.82},${c - r * 0.2} A ${r * 0.85} ${r * 0.85} 0 0 1 ${c + r * 0.82},${c - r * 0.2} L ${c + r * 0.55},${c - r * 0.55} A ${r * 0.5} ${r * 0.5} 0 0 0 ${c - r * 0.55},${c - r * 0.55} Z`}
            fill={`url(#${uid}gloss)`}
          />
        )}
      </g>
    );
  } else if (shape === 'shield') {
    const w = S * 0.84;
    const h = S * 0.92;
    const x0 = c - w / 2;
    const x1 = c + w / 2;
    const y0 = S * 0.06;
    const path = `M ${x0},${y0} L ${x1},${y0} L ${x1},${y0 + h * 0.5}
                  Q ${x1},${y0 + h * 0.82} ${c},${y0 + h}
                  Q ${x0},${y0 + h * 0.82} ${x0},${y0 + h * 0.5} Z`;
    body = (
      <g>
        <path
          d={path}
          fill={`url(#${uid}face)`}
          stroke={`url(#${uid}rim)`}
          strokeWidth={S * 0.055}
          strokeLinejoin="round"
          {...stroke}
        />
        {calib
          ? motifText(c, y0 + h * 0.5, S * 0.36, '?')
          : motifText(c, y0 + h * 0.5, S * 0.4, glyph)}
      </g>
    );
  } else {
    // gem / rosette fall back to coin geometry for now (coin is the chosen shape)
    const r = S * 0.46;
    body = (
      <g>
        <circle
          cx={c}
          cy={c}
          r={r}
          fill={`url(#${uid}face)`}
          stroke={`url(#${uid}rim)`}
          strokeWidth={S * 0.05}
          {...stroke}
        />
        {calib ? motifText(c, c, S * 0.4, '?') : motifText(c, c, S * 0.42, glyph)}
      </g>
    );
  }

  return (
    <svg
      width={S}
      height={S}
      viewBox={`0 0 ${S} ${S}`}
      className={
        [calib ? 'pidro-calibrate-pulse' : '', className ?? ''].filter(Boolean).join(' ') ||
        undefined
      }
      style={{ display: 'block', overflow: 'visible', filter: glowFilter, ...style }}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`${uid}face`} cx="38%" cy="30%" r="85%">
          <stop offset="0%" stopColor={m.hi} />
          <stop offset="52%" stopColor={m.mid} />
          <stop offset="100%" stopColor={m.lo} />
        </radialGradient>
        <linearGradient id={`${uid}rim`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={m.rim} />
          <stop offset="50%" stopColor={m.mid} />
          <stop offset="100%" stopColor={m.lo} />
        </linearGradient>
        <linearGradient id={`${uid}gloss`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0.10" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {body}
    </svg>
  );
}
