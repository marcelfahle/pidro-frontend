/**
 * Table layout system. Two layers:
 *  1) pickProfile() — discrete archetype from orientation × device class (web = tablet).
 *  2) computeLayout() — fluid positions within a profile (anchored regions + clamped card size).
 * Pure functions of (width, height, insets); recompute on resize/rotate, tween to new slots.
 */
import type { RelativePosition } from '@/types/game';

export type { RelativePosition };

export type Profile = 'phone-portrait' | 'phone-landscape' | 'tablet-portrait' | 'tablet-landscape';
export type Insets = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

export type Seat = {
  x: number;
  y: number;
  rot: number;
  hand: { x: number; y: number };
};
export type TableLayout = {
  width: number;
  height: number;
  profile: Profile;
  cardW: number;
  cardH: number;
  felt: { cx: number; cy: number };
  trick: { cx: number; cy: number; r: number };
  /** Vertical center of the east and west card-back stacks. */
  sides: { cy: number };
  seats: Record<RelativePosition, Seat>;
  hand: { cx: number; cy: number; maxWidth: number };
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const CARD_RATIO = 110 / 78; // from the legacy card art (spike)
/**
 * Landscape lowers the side stacks below the trick's center line: the side
 * seats sit on top of them, under the header row, and need air between.
 */
const LANDSCAPE_SIDE_DROP = 16;

export function playedCardTarget(
  L: TableLayout,
  rel: RelativePosition,
  index: number,
  count: number
) {
  const portrait = L.profile.endsWith('portrait');
  const pileScale = portrait ? 0.82 : 0.8;
  const spacing = Math.min(L.cardW * 0.38, portrait ? 24 : 32);
  const off = index - (count - 1) / 2;
  // Side cards face their owner: the card's top edge points at the table
  // center (east top→left, west top→right), matching the seat rot below.
  const rot = rel === 'east' ? -Math.PI / 2 : rel === 'west' ? Math.PI / 2 : 0;

  // Each pile center lands on a cardinal point of the trick circle. Multiple
  // cards spread along the tangent so the ring remains the visual ruler.
  const x =
    rel === 'west'
      ? L.trick.cx - L.trick.r
      : rel === 'east'
        ? L.trick.cx + L.trick.r
        : L.trick.cx + off * spacing;
  // East's -90° rotation puts its rank edge at the bottom. Spread upward
  // so newer cards (drawn on top) leave that edge visible on older cards.
  const y =
    rel === 'north'
      ? L.trick.cy - L.trick.r
      : rel === 'south'
        ? L.trick.cy + L.trick.r
        : L.trick.cy + off * spacing * (rel === 'east' ? -1 : 1);
  return { x, y, rot, scale: pileScale };
}

/** Step between hand cards: a straight row, squeezed to fit the hand's width. */
export function handStep(L: TableLayout, n: number): number {
  return n > 1 ? Math.min(L.cardW * 0.72, (L.hand.maxWidth - L.cardW) / (n - 1)) : 0;
}

/** Landscape draws the hand a touch smaller; the south seat sits beside it. */
export function handScale(profile: Profile): number {
  return profile.endsWith('landscape') ? 0.9 : 1;
}

/** Left edge of an n-card hand, a lifted (playable) card included. */
export function handLeft(L: TableLayout, n: number): number {
  const half = (Math.max(1, n) - 1) / 2;
  return L.hand.cx - half * handStep(L, n) - (L.cardW * handScale(L.profile) * 1.03) / 2;
}

export function pickProfile(w: number, h: number): Profile {
  const tablet = Math.min(w, h) >= 600; // shortest-side breakpoint; browser window counts as tablet
  const landscape = w > h;
  return `${tablet ? 'tablet' : 'phone'}-${landscape ? 'landscape' : 'portrait'}` as Profile;
}

export function cardSize(shortest: number): number {
  return clamp(shortest * 0.13, 54, 104); // CSS clamp(), in JS
}

export function computeLayout(
  width: number,
  height: number,
  insets: Insets,
  topReserve = 0,
  bottomReserve = 0
): TableLayout {
  const profile = pickProfile(width, height);
  const portrait = profile.endsWith('portrait');
  const shortest = Math.min(width, height);
  const cardW = cardSize(shortest);
  const cardH = cardW * CARD_RATIO;

  const cx = width / 2;
  const cy = height / 2;
  const tableTop = insets.top + topReserve;
  const tableBottom = height - insets.bottom - bottomReserve;
  const tableHeight = Math.max(0, tableBottom - tableTop);

  // Portrait geometry belongs to the viewport between the two docks. Landscape
  // keeps the legacy full-felt composition with floating chrome.
  const trickCy = portrait ? tableTop + tableHeight * 0.43 : height * 0.49;
  const trickR = clamp(shortest * (portrait ? 0.19 : 0.18), 82, 190);

  // Portrait lifts the fan above the centered south seat: avatar, level chip,
  // name and status, which do not grow with the cards. Landscape keeps the
  // cards near the bottom edge because the south seat sits beside them.
  const southSeat = profile === 'tablet-portrait' ? 140 : 120;
  const handY = portrait ? tableBottom - southSeat - cardH * 0.5 : tableBottom - cardH * 0.56;
  const northY = tableTop + cardH * (portrait ? 0.48 : 0.22) + 10;
  const sideCy = portrait ? trickCy : trickCy + LANDSCAPE_SIDE_DROP;
  // Played cards leave from here; portrait keeps its historical screen-center origin.
  const sideY = portrait ? cy : sideCy;

  const seats: Record<RelativePosition, Seat> = {
    south: { x: cx, y: handY, rot: 0, hand: { x: cx, y: handY } },
    north: { x: cx, y: northY, rot: Math.PI, hand: { x: cx, y: northY } },
    east: {
      x: width - insets.right + cardW * 0.04,
      y: sideY,
      rot: -Math.PI / 2,
      hand: { x: width - insets.right + cardW * 0.04, y: sideY },
    },
    west: {
      x: insets.left - cardW * 0.04,
      y: sideY,
      rot: Math.PI / 2,
      hand: { x: insets.left - cardW * 0.04, y: sideY },
    },
  };

  return {
    width,
    height,
    profile,
    cardW,
    cardH,
    felt: { cx, cy: trickCy },
    trick: { cx, cy: trickCy, r: trickR },
    sides: { cy: sideCy },
    seats,
    hand: { cx, cy: handY, maxWidth: width - insets.left - insets.right - 32 },
  };
}
