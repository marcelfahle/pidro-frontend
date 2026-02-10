import type { Card as CardType, Suit } from '@pidro/shared';
import { getRankLabel, SUIT_COLORS_RAW, SUIT_SYMBOLS } from '@pidro/shared';

type CardSize = 'sm' | 'md' | 'lg';

interface CardProps {
  card?: CardType;
  faceDown?: boolean;
  size?: CardSize;
  playable?: boolean;
  selected?: boolean;
  isTrump?: boolean;
  pointValue?: number;
  onClick?: () => void;
  className?: string;
}

interface SizeStyles {
  wrapper: string;
  rank: string;
  suitLarge: string;
  suitSmall: string;
  point: string;
}

const SIZE_CLASSES: Record<CardSize, SizeStyles> = {
  sm: {
    wrapper: 'w-8 h-12',
    rank: 'text-[9px]',
    suitLarge: 'text-sm',
    suitSmall: 'text-[8px]',
    point: 'text-[7px] w-3 h-3',
  },
  md: {
    wrapper: 'w-12 h-16',
    rank: 'text-xs',
    suitLarge: 'text-lg',
    suitSmall: 'text-[9px]',
    point: 'text-[8px] w-3.5 h-3.5',
  },
  lg: {
    wrapper: 'w-16 h-24',
    rank: 'text-sm',
    suitLarge: 'text-2xl',
    suitSmall: 'text-xs',
    point: 'text-[9px] w-4 h-4',
  },
};

/** Point values for Pidro scoring cards. Rank 5 (pidro) = 5 pts, Ace = 1, etc. */
export function getPidroPoints(rank: number, suit: Suit, trumpSuit?: Suit | null): number | null {
  if (!trumpSuit) return null;
  const isTrump = suit === trumpSuit;
  const isOffFive = rank === 5 && !isTrump && isSameColor(suit, trumpSuit);

  if (!isTrump && !isOffFive) return null;

  if (rank === 5) return 5; // Pidro (and off-five)
  if (rank === 1 || rank === 14) return 1; // Ace (high)
  if (rank === 2) return 1; // Two (low)
  if (rank === 11) return 1; // Jack
  if (rank === 10) return 10; // Ten (game)
  return null;
}

function isSameColor(a: Suit, b: Suit): boolean {
  const red: Suit[] = ['hearts', 'diamonds'];
  return (red.includes(a) && red.includes(b)) || (!red.includes(a) && !red.includes(b));
}

function CardFace({
  label,
  suitSymbol,
  color,
  styles,
  pointValue,
}: {
  label: string;
  suitSymbol: string;
  color: string;
  styles: SizeStyles;
  pointValue?: number;
}) {
  return (
    <>
      {/* Top-left rank + suit */}
      <div
        className="absolute left-0.5 top-0.5 flex flex-col items-center leading-none"
        style={{ color }}
      >
        <span className={`${styles.rank} font-bold`}>{label}</span>
        <span className={styles.suitSmall}>{suitSymbol}</span>
      </div>

      {/* Center suit symbol */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ color }}>
        <span className={styles.suitLarge}>{suitSymbol}</span>
      </div>

      {/* Bottom-right rank + suit (rotated) */}
      <div
        className="absolute bottom-0.5 right-0.5 flex rotate-180 flex-col items-center leading-none"
        style={{ color }}
      >
        <span className={`${styles.rank} font-bold`}>{label}</span>
        <span className={styles.suitSmall}>{suitSymbol}</span>
      </div>

      {/* Point badge */}
      {pointValue != null && pointValue > 0 && (
        <div
          className={`absolute -right-1 -top-1 flex items-center justify-center rounded-full bg-yellow-400 font-bold text-yellow-900 ${styles.point}`}
        >
          {pointValue}
        </div>
      )}
    </>
  );
}

export function Card({
  card,
  faceDown = false,
  size = 'md',
  playable = false,
  selected = false,
  isTrump = false,
  pointValue,
  onClick,
  className = '',
}: CardProps) {
  const sizeStyles = SIZE_CLASSES[size];

  if (faceDown || !card) {
    return (
      <div
        className={`${sizeStyles.wrapper} relative shrink-0 rounded-md bg-blue-900 shadow-md ${className}`}
        title="Face-down card"
      >
        <div className="absolute inset-1 rounded-sm border border-blue-700 bg-blue-800" />
      </div>
    );
  }

  const suitSymbol = SUIT_SYMBOLS[card.suit];
  const color = SUIT_COLORS_RAW[card.suit];
  const label = getRankLabel(card.rank);

  const ringClass = selected ? 'ring-2 ring-blue-400' : isTrump ? 'ring-1 ring-yellow-400' : '';
  const hoverClass =
    playable && !selected
      ? 'cursor-pointer hover:-translate-y-1 hover:ring-2 hover:ring-blue-300 hover:shadow-lg'
      : '';
  const liftClass = selected ? '-translate-y-1' : '';

  const baseClass = `${sizeStyles.wrapper} relative shrink-0 rounded-md bg-white shadow-md transition-all duration-150 select-none ${ringClass} ${hoverClass} ${liftClass} ${className}`;

  if (playable) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${baseClass} border-0 p-0`}
        aria-label={`Play ${label} of ${card.suit}`}
      >
        <CardFace
          label={label}
          suitSymbol={suitSymbol}
          color={color}
          styles={sizeStyles}
          pointValue={pointValue}
        />
      </button>
    );
  }

  return (
    <div className={baseClass} title={`${label} of ${card.suit}`}>
      <CardFace
        label={label}
        suitSymbol={suitSymbol}
        color={color}
        styles={sizeStyles}
        pointValue={pointValue}
      />
    </div>
  );
}
