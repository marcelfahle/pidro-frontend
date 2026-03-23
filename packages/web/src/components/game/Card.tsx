import type { Card as CardType, Suit } from "@pidro/shared";
import { getRankLabel, SUIT_COLORS_RAW } from "@pidro/shared";

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
  cornerSuit: number;
  mainSuit: number;
  cornerGap: string;
  point: string;
}

const SIZE_CLASSES: Record<CardSize, SizeStyles> = {
  sm: {
    wrapper: "h-[54px] w-[38px]",
    rank: "text-[13px]",
    cornerSuit: 10,
    mainSuit: 24,
    cornerGap: "-mt-[2px]",
    point: "text-[7px] w-3 h-3",
  },
  md: {
    wrapper: "h-[74px] w-[52px] max-sm:h-[68px] max-sm:w-[48px]",
    rank: "text-[17px]",
    cornerSuit: 13,
    mainSuit: 34,
    cornerGap: "-mt-[2px]",
    point: "text-[8px] h-4 w-4",
  },
  lg: {
    wrapper:
      "h-[104px] w-[72px] max-lg:h-[96px] max-lg:w-[66px] max-md:h-[92px] max-md:w-[62px] max-sm:h-[82px] max-sm:w-[56px]",
    rank: "text-[22px] max-lg:text-[20px] max-sm:text-[18px]",
    cornerSuit: 16,
    mainSuit: 46,
    cornerGap: "-mt-[2px]",
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

/* ── SVG suit paths ── */

const SUIT_SVG: Record<Suit, string> = {
  hearts:
    "m870.4 106.8c-149.2 0-270.4 121.2-270.4 270.4 0-149.6-121.2-270.4-270.4-270.4-149.6 0-270.8 121.2-270.8 270.4 0 378.4 428.4 497.2 540.8 715.2v0.80078s0-0.39844 0.39844-0.39844c0 0 0 0.39844 0.39844 0.39844v-0.80078c112.4-217.6 540.8-336.8 540.8-715.2 0-149.2-121.2-270.4-270.8-270.4z",
  diamonds:
    "m122.8 600s319.6-233.2 477.2-541.2c158 308 477.2 541.2 477.2 541.2s-319.2 233.2-477.2 541.2c-158-308-477.2-541.2-477.2-541.2z",
  clubs:
    "m870.4 504c-24 0-47.199 3.1992-69.199 8.8008 43.199-48 69.199-111.2 69.199-180.8 0-149.6-121.2-270.4-270.4-270.4-149.6 0-270.4 121.2-270.4 270.4 0 69.602 26.398 132.8 69.602 180.8-22.398-6-45.602-9.1992-69.602-9.1992-149.6 0-270.4 121.2-270.4 270.4 0 149.6 121.2 270.4 270.4 270.4 105.6 0 197.2-60.398 241.6-148.8l-63.203 242.8h184l-63.199-242.4c44.398 88.398 136 148.8 241.6 148.8 149.6 0 270.4-121.2 270.4-270.4 0.39844-149.6-120.8-270.4-270.4-270.4z",
  spades:
    "m1068.4 591.2c0.39844 0 0-0.39844-0.80078-0.80078-18-19.199-38.398-35.602-61.199-48.801-99.199-82.797-294.4-262.8-406.4-481.6-112 218.8-307.2 398.8-406.4 482-22.801 13.199-43.199 29.602-61.199 48.801-0.80078 0.39844-0.80078 0.80078-0.80078 0.80078h0.39844c-45.199 48.398-72.801 113.2-72.801 184.4 0 149.6 121.2 270.4 270.4 270.4 105.6 0 197.2-60.398 241.6-148.8l-63.199 242.4h184l-63.199-242.4c44.398 88.398 136 148.8 241.6 148.8 149.6 0 270.4-121.2 270.4-270.4 0.39844-71.605-27.199-136.4-72.402-184.8z",
};

function SuitIcon({ suit, size, color }: { suit: Suit; size: number; color: string }) {
  return (
    <svg
      viewBox="0 0 1200 1200"
      width={size}
      height={size}
      fill={color}
      style={{ display: "block" }}
    >
      <path d={SUIT_SVG[suit]} />
    </svg>
  );
}

function CardFace({
  label,
  suit,
  color,
  styles,
  pointValue,
}: {
  label: string;
  suit: Suit;
  color: string;
  styles: SizeStyles;
  pointValue?: number;
}) {
  return (
    <>
      {/* Top-left rank + suit */}
      <div
        className="absolute left-[4px] top-[3px] flex flex-col items-center leading-[1]"
        style={{ color }}
      >
        <span className={`${styles.rank} font-black`}>{label}</span>
        <div className={styles.cornerGap}>
          <SuitIcon suit={suit} size={styles.cornerSuit} color={color} />
        </div>
      </div>

      {/* Main suit — bottom-right */}
      <div className="absolute bottom-[6%] right-[8%]">
        <SuitIcon suit={suit} size={styles.mainSuit} color={color} />
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

  const color = SUIT_COLORS_RAW[card.suit];
  const label = getRankLabel(card.rank);

  const ringClass = selected ? "ring-2 ring-blue-400" : "";
  const hoverClass =
    playable && !selected
      ? "cursor-pointer hover:-translate-y-2 hover:ring-2 hover:ring-cyan-200 hover:shadow-[0_10px_20px_rgba(0,0,0,0.24)]"
      : "";
  const liftClass = selected ? "-translate-y-1" : "";

  const baseClass = `${sizeStyles.wrapper} pidro-card-face relative shrink-0 overflow-hidden rounded-[7px] border border-slate-300/60 bg-[linear-gradient(170deg,#ffffff_0%,#f5f5f4_100%)] transition-all duration-150 select-none ${ringClass} ${hoverClass} ${liftClass} ${className}`;

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
          suit={card.suit}
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
        suit={card.suit}
        color={color}
        styles={sizeStyles}
        pointValue={pointValue}
      />
    </div>
  );
}
