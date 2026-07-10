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
  seats: Record<RelativePosition, Seat>;
  hand: { cx: number; cy: number; maxWidth: number };
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const CARD_RATIO = 110 / 78; // from the legacy card art (spike)

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

  // Trick zone sits above center in portrait (room for the hand), near-center in landscape.
  const trickCy = portrait ? height * 0.43 : height * 0.49;
  const trickR = clamp(shortest * (portrait ? 0.19 : 0.18), 82, 190);

  // Landscape is short — lift the hand higher so the full card clears the bottom.
  const handY = height - insets.bottom - bottomReserve - cardH * (portrait ? 0.72 : 0.72);
  const northY = insets.top + topReserve + cardH * (portrait ? 0.48 : 0.22) + 10;

  const seats: Record<RelativePosition, Seat> = {
    south: { x: cx, y: handY, rot: 0, hand: { x: cx, y: handY } },
    north: { x: cx, y: northY, rot: Math.PI, hand: { x: cx, y: northY } },
    east: {
      x: width - insets.right + cardW * 0.04,
      y: cy,
      rot: -Math.PI / 2,
      hand: { x: width - insets.right + cardW * 0.04, y: cy },
    },
    west: {
      x: insets.left - cardW * 0.04,
      y: cy,
      rot: Math.PI / 2,
      hand: { x: insets.left - cardW * 0.04, y: cy },
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
    seats,
    hand: { cx, cy: handY, maxWidth: width - insets.left - insets.right - 32 },
  };
}
