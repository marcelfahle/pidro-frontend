import type { CSSProperties } from 'react';
import {
  fmtXP,
  playstyleLabel,
  type SkillTier,
  skillMaterial,
  veteranTitle,
} from '../profile/ranking';
import { SkillEmblem } from '../profile/SkillEmblem';

/**
 * Pidro Design System — profile blocks. Faithful TSX ports of the Claude-design
 * profile parts: VeteranBar (dedication), SkillBlock (competence), StatGrid,
 * AggressionMeter (playstyle), and the achievement list rows (mastery).
 */

/** Veteran / dedication — caption + title + XP bar. The level number is hero. */
export function VeteranBar({
  level = 1,
  into,
  span,
  prestige = 0,
  width = '100%',
}: {
  level?: number;
  into: number;
  span: number;
  prestige?: number;
  width?: number | string;
}) {
  const t = veteranTitle(level);
  const maxed = !span;
  const pct = span ? Math.max(0.02, Math.min(1, into / span)) : 1;
  return (
    <div style={{ width }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--pidro-text-muted)',
          }}
        >
          Experience
        </span>
        <span style={{ fontSize: 12, color: 'var(--pidro-text-muted)', marginLeft: 'auto' }}>
          {maxed ? 'Max level' : `${fmtXP(into)} / ${fmtXP(span)} XP`}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 58 }}
        >
          <span
            style={{
              fontFamily: 'var(--pidro-font-display)',
              fontSize: 40,
              lineHeight: 0.9,
              color: 'var(--pidro-gold)',
              textShadow: '0 2px 4px rgba(0,0,0,.6)',
            }}
          >
            {level}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.12em',
              color: 'var(--pidro-text-muted)',
              textTransform: 'uppercase',
            }}
          >
            Level
          </span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontFamily: 'var(--pidro-font-display)', fontSize: 22, color: '#fff' }}>
              {t.full}
            </span>
            {prestige > 0 && (
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--pidro-gold-light)' }}>
                ★{prestige}
              </span>
            )}
          </div>
          <div
            style={{
              height: 12,
              borderRadius: 12,
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.07)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${pct * 100}%`,
                height: '100%',
                borderRadius: 12,
                background: 'linear-gradient(90deg, #2E86C1, #00CFFF)',
                boxShadow: '0 0 8px rgba(0,207,255,0.5)',
                transition: 'width 600ms ease',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Skill / competence — a single emblem + band name. No bar, no number. */
export function SkillBlock({
  tier = 'gold',
  size = 92,
  ratedGames,
}: {
  tier?: SkillTier;
  size?: number;
  ratedGames?: number;
}) {
  const m = skillMaterial(tier);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <SkillEmblem tier={tier} shape="coin" size={size} motif="spade" />
      <div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--pidro-text-muted)',
            marginBottom: 4,
          }}
        >
          Skill
        </div>
        <div
          style={{
            fontFamily: 'var(--pidro-font-display)',
            fontSize: 26,
            color: m.calibrating ? 'var(--pidro-text-secondary)' : '#fff',
            textShadow: '0 1px 3px rgba(0,0,0,.5)',
          }}
        >
          {m.name}
        </div>
        <div
          style={{
            fontSize: 13,
            color: m.calibrating ? 'var(--pidro-cyan)' : 'var(--pidro-text-muted)',
            marginTop: 2,
          }}
        >
          {m.calibrating
            ? `Being placed · ${ratedGames || 0} of 10 rated games`
            : 'Standing, not a journey'}
        </div>
      </div>
    </div>
  );
}

export function StatGrid({
  stats,
  cols = 2,
}: {
  stats: { label: string; value: string | number; accent?: string }[];
  cols?: number;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 10 }}>
      {stats.map((s) => (
        <div
          key={s.label}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            padding: '12px 14px',
            background: 'rgba(8,28,52,0.55)',
            border: '1px solid rgba(0,200,255,0.18)',
            borderRadius: 10,
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: 'var(--pidro-text-muted)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {s.label}
          </span>
          <span
            style={{
              fontFamily: 'var(--pidro-font-display)',
              fontSize: 24,
              color: s.accent || '#fff',
            }}
          >
            {s.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Playstyle — needle from Careful → Aggressive + avg winning bid. */
export function AggressionMeter({
  value = null,
  avgBid = null,
  width = 360,
  style,
}: {
  value?: number | null;
  avgBid?: number | null;
  width?: number | string;
  style?: CSSProperties;
}) {
  const empty = value == null;
  const v = empty ? 0.5 : Math.max(0, Math.min(1, value));
  const label = playstyleLabel(value);
  const trackH = 14;

  return (
    <div style={{ width, ...style }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 14,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--pidro-font-body)',
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--pidro-text-muted)',
          }}
        >
          Playstyle
        </span>
        <span
          style={{
            fontFamily: 'var(--pidro-font-display)',
            fontSize: 20,
            color: empty ? 'var(--pidro-text-muted)' : '#fff',
            textShadow: '0 1px 3px rgba(0,0,0,.5)',
          }}
        >
          {label}
        </span>
      </div>
      <div style={{ position: 'relative', height: trackH, marginBottom: 8 }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: trackH,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.08)',
            background: empty
              ? 'rgba(255,255,255,0.06)'
              : 'linear-gradient(90deg, #2E86C1 0%, #4AA3C7 30%, #C9A227 62%, #E0772E 100%)',
            opacity: empty ? 0.5 : 1,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: -3,
            bottom: -3,
            width: 2,
            background: 'rgba(255,255,255,0.25)',
            transform: 'translateX(-50%)',
          }}
        />
        {!empty && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: `${v * 100}%`,
              transform: 'translate(-50%,-50%)',
              width: trackH + 8,
              height: trackH + 8,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 38% 30%, #ffffff, #DCEAF2 40%, #9FC0D0 100%)',
              border: '2px solid #fff',
              boxShadow: '0 2px 6px rgba(0,0,0,0.5), 0 0 8px rgba(255,255,255,0.4)',
            }}
          />
        )}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: 'var(--pidro-font-body)',
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--pidro-text-secondary)',
        }}
      >
        <span style={{ color: !empty && v < 0.38 ? 'var(--pidro-cyan)' : undefined }}>Careful</span>
        <span style={{ color: !empty && v >= 0.38 && v <= 0.62 ? '#fff' : undefined }}>
          Balanced
        </span>
        <span style={{ color: !empty && v > 0.62 ? 'var(--pidro-gold)' : undefined }}>
          Aggressive
        </span>
      </div>
      <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 13, color: 'var(--pidro-text-muted)' }}>Avg. winning bid</span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'baseline',
            gap: 4,
            padding: '3px 12px',
            borderRadius: 999,
            background: empty ? 'rgba(255,255,255,0.05)' : 'rgba(0,207,255,0.12)',
            border: `1.5px solid ${empty ? 'rgba(255,255,255,0.12)' : 'rgba(0,207,255,0.45)'}`,
            fontFamily: 'var(--pidro-font-display)',
            fontSize: 18,
            color: empty ? 'var(--pidro-text-muted)' : 'var(--pidro-text-cyan)',
          }}
        >
          {empty ? '—' : avgBid}
        </span>
      </div>
      {empty && (
        <div
          style={{
            marginTop: 10,
            fontSize: 12,
            color: 'var(--pidro-text-muted)',
            fontStyle: 'italic',
          }}
        >
          Not enough bids yet — play a few hands to reveal your style.
        </div>
      )}
    </div>
  );
}

export type AchievementState = 'earned' | 'locked' | 'soon';
export interface AchievementItem {
  name: string;
  desc: string;
  state: AchievementState;
  on?: string;
  progress?: string;
}

export function MasteryMedal({ state, size = 46 }: { state: AchievementState; size?: number }) {
  const earned = state === 'earned';
  const soon = state === 'soon';
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: earned
          ? 'radial-gradient(circle at 38% 30%, #FFEFB0, #F1C232 52%, #A87908)'
          : 'rgba(8,28,52,0.7)',
        border: soon
          ? '2px dashed rgba(0,200,255,0.45)'
          : `2px solid ${earned ? '#FFF6D0' : 'rgba(0,200,255,0.22)'}`,
        boxShadow: earned
          ? '0 2px 8px rgba(0,0,0,0.4), 0 0 12px rgba(255,212,38,0.45)'
          : 'inset 0 2px 6px rgba(0,0,0,0.45)',
        color: earned ? '#5A3F00' : soon ? 'var(--pidro-cyan-dim)' : 'rgba(120,170,210,0.45)',
        fontFamily: 'var(--pidro-font-display)',
        fontSize: size * 0.42,
      }}
    >
      {earned ? '★' : soon ? '' : '★'}
      {earned && (
        <div
          style={{
            position: 'absolute',
            inset: size * 0.13,
            borderRadius: '50%',
            border: '1.5px solid rgba(90,63,0,0.35)',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
}

export function AchievementListRow({ a }: { a: AchievementItem }) {
  const earned = a.state === 'earned';
  const soon = a.state === 'soon';
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '14px 18px',
        background: earned ? 'rgba(20,60,105,0.5)' : 'rgba(12,40,75,0.4)',
        border: `1.5px solid ${earned ? 'rgba(0,200,255,0.3)' : 'rgba(0,200,255,0.14)'}`,
        borderRadius: 'var(--pidro-radius-md)',
        opacity: a.state === 'locked' ? 0.72 : 1,
      }}
    >
      <MasteryMedal state={a.state} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontFamily: 'var(--pidro-font-display)',
              fontSize: 20,
              color: earned ? '#fff' : 'var(--pidro-text-secondary)',
            }}
          >
            {a.name}
          </span>
          {soon && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: '0.1em',
                padding: '2px 8px',
                borderRadius: 999,
                textTransform: 'uppercase',
                color: 'var(--pidro-cyan-dim)',
                border: '1px solid rgba(0,200,255,0.3)',
              }}
            >
              Coming soon
            </span>
          )}
        </div>
        <div style={{ fontSize: 13.5, color: 'var(--pidro-text-cyan)', marginTop: 2 }}>
          {a.desc}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 70 }}>
        {earned && (
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--pidro-gold)',
            }}
          >
            Earned
          </div>
        )}
        {earned && a.on && (
          <div style={{ fontSize: 11, color: 'var(--pidro-text-muted)' }}>{a.on}</div>
        )}
        {!earned && a.progress && (
          <div
            style={{
              fontFamily: 'var(--pidro-font-display)',
              fontSize: 16,
              color: 'var(--pidro-text-secondary)',
            }}
          >
            {a.progress}
          </div>
        )}
      </div>
    </div>
  );
}
