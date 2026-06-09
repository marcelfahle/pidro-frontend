import type { CSSProperties } from 'react';

/**
 * Pidro Design System — game elements. Faithful TSX ports of the Claude-design
 * components: ScoreBanner (wooden score pill), BetLabel, TrumpIndicator, and
 * the legacy-faced PlayingCard / CardBack.
 */

type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
const SUIT_SYMBOLS: Record<Suit, string> = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
const SUIT_COLORS: Record<Suit, string> = {
  hearts: '#E53935',
  diamonds: '#E53935',
  clubs: '#1A1A1A',
  spades: '#1A1A1A',
};

export function ScoreBanner({
  scoreA = 0,
  scoreB = 0,
  style,
}: {
  scoreA?: number;
  scoreB?: number;
  style?: CSSProperties;
}) {
  const cell: CSSProperties = {
    padding: '8px 20px',
    fontFamily: 'var(--pidro-font-display)',
    fontSize: 'var(--pidro-text-2xl)',
    fontWeight: 900,
    textShadow: '0 2px 4px rgba(0,0,0,0.5)',
    minWidth: 40,
    textAlign: 'center',
  };
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: 'linear-gradient(180deg, #8B5E2A 0%, #5C3510 40%, #3A1E08 100%)',
        border: '3px solid var(--pidro-gold-dark)',
        borderRadius: 'var(--pidro-radius-xl)',
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0,0,0,0.45)',
        ...style,
      }}
    >
      <span style={{ ...cell, color: '#fff' }}>{scoreA}</span>
      <div style={{ width: 2, height: 36, background: 'rgba(255,255,255,0.15)' }} />
      <span style={{ ...cell, color: 'var(--pidro-gold)' }}>{scoreB}</span>
    </div>
  );
}

export function TrumpIndicator({
  suit = 'hearts',
  size = 64,
  style,
}: {
  suit?: Suit;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      aria-hidden="true"
      style={{
        fontSize: size,
        lineHeight: 1,
        color: SUIT_COLORS[suit],
        filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.4))',
        textAlign: 'center',
        ...style,
      }}
    >
      {SUIT_SYMBOLS[suit]}
    </div>
  );
}

type CardSize = 'sm' | 'md' | 'lg';
const cardSizes: Record<CardSize, { w: number; h: number }> = {
  sm: { w: 56, h: 80 },
  md: { w: 72, h: 100 },
  lg: { w: 90, h: 126 },
};

/**
 * Static playing-card specimen for the design system. The interactive,
 * keyboard-accessible in-game card lives in `components/game/Card.tsx`; this
 * is a display-only face for the DS showcase.
 */
export function PlayingCard({
  rank = 'A',
  suit = 'hearts',
  size = 'md',
  selected,
  style,
}: {
  rank?: string;
  suit?: Suit;
  size?: CardSize;
  selected?: boolean;
  style?: CSSProperties;
}) {
  const s = cardSizes[size];
  const color = suit === 'hearts' || suit === 'diamonds' ? '#CC0000' : '#1A1A1A';
  const sym = SUIT_SYMBOLS[suit];

  return (
    <div
      style={{
        width: s.w,
        height: s.h,
        borderRadius: 8,
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.15)',
        boxShadow: selected
          ? '0 0 0 3px var(--pidro-cyan), 0 4px 12px rgba(0,0,0,0.3)'
          : '0 2px 8px rgba(0,0,0,0.25)',
        transition: 'all 120ms ease',
        transform: selected ? 'translateY(-8px)' : 'none',
        userSelect: 'none',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: s.h * 0.05,
          left: s.w * 0.08,
          color,
          fontWeight: 900,
          lineHeight: 0.88,
          fontFamily: 'var(--pidro-font-body)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: s.h * 0.26 }}>{rank}</span>
        <span style={{ fontSize: s.h * 0.205, marginTop: s.h * 0.01 }}>{sym}</span>
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: s.h * 0.06,
          right: s.w * 0.08,
          fontSize: s.h * 0.38,
          color,
          lineHeight: 1,
        }}
      >
        {sym}
      </div>
    </div>
  );
}

export function CardBack({
  size = 'md',
  orientation = 'vertical',
  style,
}: {
  size?: CardSize;
  orientation?: 'vertical' | 'horizontal';
  style?: CSSProperties;
}) {
  const s = cardSizes[size];
  const w = orientation === 'horizontal' ? s.h : s.w;
  const h = orientation === 'horizontal' ? s.w : s.h;
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: 8,
        background: 'linear-gradient(135deg, #1E6AA8 0%, #145080 40%, #0D3860 100%)',
        border: '2px solid rgba(0,200,255,0.3)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3), inset 0 0 20px rgba(0,0,0,0.15)',
        overflow: 'hidden',
        position: 'relative',
        flexShrink: 0,
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -10,
          right: -10,
          width: '60%',
          height: '70%',
          background: 'radial-gradient(ellipse, rgba(255,255,255,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 6,
          borderRadius: 4,
          border: '1.5px solid rgba(0,200,255,0.15)',
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(0,150,220,0.08) 4px, rgba(0,150,220,0.08) 8px)',
        }}
      />
    </div>
  );
}
