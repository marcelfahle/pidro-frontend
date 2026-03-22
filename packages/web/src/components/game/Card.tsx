import type { Card as CardType, Suit } from "@pidro/shared";
import { getRankLabel, SUIT_COLORS_RAW, SUIT_SYMBOLS } from "@pidro/shared";

type CardSize = "sm" | "md" | "lg";

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
    wrapper: "h-[54px] w-[38px]",
    rank: "text-[12px]",
    suitLarge: "text-2xl",
    suitSmall: "text-[10px]",
    point: "text-[7px] w-3 h-3",
  },
  md: {
    wrapper: "h-[74px] w-[52px] max-sm:h-[68px] max-sm:w-[48px]",
    rank: "text-[15px]",
    suitLarge: "text-4xl",
    suitSmall: "text-[12px]",
    point: "text-[8px] h-4 w-4",
  },
  lg: {
    wrapper:
      "h-[104px] w-[72px] max-lg:h-[96px] max-lg:w-[66px] max-md:h-[92px] max-md:w-[62px] max-sm:h-[82px] max-sm:w-[56px]",
    rank: "text-[20px] max-lg:text-[18px]",
    suitLarge: "text-[3rem] max-lg:text-[2.6rem] max-sm:text-[2.3rem]",
    suitSmall: "text-[14px]",
    point: "text-[10px] h-5 w-5",
  },
};

/** Point values for Pidro scoring cards. Rank 5 (pidro) = 5 pts, Ace = 1, etc. */
export function getPidroPoints(
  rank: number,
  suit: Suit,
  trumpSuit?: Suit | null,
): number | null {
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
  const red: Suit[] = ["hearts", "diamonds"];
  return (
    (red.includes(a) && red.includes(b)) ||
    (!red.includes(a) && !red.includes(b))
  );
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
        className="absolute left-1 top-0.5 flex flex-col items-center leading-none"
        style={{ color }}
      >
        <span className={`${styles.rank} font-bold`}>{label}</span>
        <span className={styles.suitSmall}>{suitSymbol}</span>
      </div>

      {/* Main suit symbol — shifted toward bottom-right */}
      <div
        className="absolute inset-0 flex items-end justify-end pb-[12%] pr-[10%]"
        style={{ color }}
      >
        <span className={styles.suitLarge}>{suitSymbol}</span>
      </div>

      {/* Point badge */}
      {pointValue != null && pointValue > 0 && (
        <div
          className={`absolute -right-1 -top-1 flex items-center justify-center rounded-full border border-yellow-200 bg-yellow-400 font-black text-yellow-950 shadow-sm ${styles.point}`}
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
  size = "md",
  playable = false,
  selected = false,
  isTrump = false,
  pointValue,
  onClick,
  className = "",
}: CardProps) {
  const sizeStyles = SIZE_CLASSES[size];

  if (faceDown || !card) {
    return (
      <div
        className={`${sizeStyles.wrapper} pidro-card-back relative shrink-0 rounded-[7px] ${className}`}
        title="Face-down card"
      >
        <div className="absolute inset-[3px] rounded-[5px] border border-cyan-100/35 bg-transparent" />
      </div>
    );
  }

  const suitSymbol = SUIT_SYMBOLS[card.suit];
  const color = SUIT_COLORS_RAW[card.suit];
  const label = getRankLabel(card.rank);

  const ringClass = selected
    ? "ring-2 ring-blue-400"
    : isTrump
      ? "ring-1 ring-yellow-400"
      : "";
  const hoverClass =
    playable && !selected
      ? "cursor-pointer hover:-translate-y-2 hover:ring-2 hover:ring-cyan-200 hover:shadow-[0_10px_20px_rgba(0,0,0,0.24)]"
      : "";
  const liftClass = selected ? "-translate-y-1" : "";

  const baseClass = `${sizeStyles.wrapper} relative shrink-0 rounded-[7px] border border-slate-400/55 bg-[linear-gradient(180deg,#fafafa_0%,#f0f0f0_100%)] shadow-[0_8px_14px_rgba(0,0,0,0.18)] transition-all duration-150 select-none ${ringClass} ${hoverClass} ${liftClass} ${className}`;

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
