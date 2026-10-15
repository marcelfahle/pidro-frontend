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
  /**
   * Short phones: smaller avatars without level chips, every name beside its
   * avatar, and your avatar at the left of your hand instead of under it.
   */
  tight: boolean;
  /** `pileScale`: how large played cards are drawn around the circle. */
  trick: { cx: number; cy: number; r: number; pileScale: number };
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
/**
 * Portrait North, top to bottom, as SeatLayer draws it: a gap, the fan of
 * backs, a gap, then the seat (avatar, level chip, name and status).
 */
const NORTH_SEAT_STACK = { phone: 98, tablet: 115 } as const;
/** One of North's card backs, as SeatLayer draws them. */
export const northBackWidth = (cardW: number) => clamp(cardW * 0.66, 31, 58);
/** North's fan of backs: each back after the first adds half a back, up to six. */
export const northFanWidth = (cardW: number, count: number) =>
  count > 0 ? northBackWidth(cardW) * (1 + (Math.min(6, count) - 1) * 0.52) : northBackWidth(cardW);
/**
 * Where North's backs start. Portrait hangs them under the header row;
 * landscape tucks them partly above the table, under the floating scores.
 */
export const northFanTop = (L: TableLayout, tableTop: number) =>
  L.profile.endsWith('portrait') ? tableTop + 8 : tableTop - L.cardH * 0.36;

/** Portrait seat clearance, including its level chip, name and status line. */
export const northSeatBottom = (L: TableLayout, tableTop: number) =>
  northFanTop(L, tableTop) +
  northBackWidth(L.cardW) * CARD_RATIO +
  12 +
  (L.tight ? TIGHT_AVATAR : NORTH_SEAT_STACK[L.profile.startsWith('tablet') ? 'tablet' : 'phone']);

const TICKER_LINE_MAX = 168;
const TICKER_LINE_MIN = 72;
/** The chevron and the gap before it. */
const TICKER_CHEVRON = 16;
/**
 * The plaque's ticker, kept off North's fan. Portrait lines may reach half a
 * back into it, over the first back's edge only; landscape lines sit beside
 * the plaque, dropped below the fan where it hangs into the header row.
 * Null where the table leaves the ticker out (`showsTicker`).
 */
export function tickerPlacement(
  L: TableLayout,
  { tableTop, plaqueLeft, plaqueTop }: { tableTop: number; plaqueLeft: number; plaqueTop: number }
): { lineMaxWidth: number; drop: number } | null {
  if (!showsTicker(L)) return null;
  const backW = northBackWidth(L.cardW);
  if (!L.profile.endsWith('portrait')) {
    const fanBottom = northFanTop(L, tableTop) + backW * CARD_RATIO;
    return { lineMaxWidth: TICKER_LINE_MAX, drop: Math.max(0, fanBottom + 4 - plaqueTop) };
  }
  const fanLeft = L.seats.north.x - northFanWidth(L.cardW, 6) / 2;
  const room = fanLeft + backW / 2 - plaqueLeft - TICKER_CHEVRON;
  return { lineMaxWidth: clamp(room, TICKER_LINE_MIN, TICKER_LINE_MAX), drop: 0 };
}
/**
 * Seat avatars, from the Table boards. Landscape phones draw them larger:
 * many players are older and read the table at arm's length (PID-217).
 */
export const AVATAR_SIZE: Record<Profile, number> = {
  'phone-portrait': 56,
  'phone-landscape': 52,
  'tablet-portrait': 64,
  'tablet-landscape': 64,
};
/** Between a landscape avatar and its name. */
export const seatNameGap = (profile: Profile) => (profile.startsWith('tablet') ? 14 : 10);
/** Landscape South's avatar shares the scoreboard divider's axis, ~70pt in. */
export const LANDSCAPE_SOUTH_LEFT = 70;
/** The least of South's name a landscape hand leaves room for. */
export const SOUTH_NAME_MIN = 56;
/** A full hand, as dealt. */
const FULL_HAND = 9;
/** A tight seat: the avatar alone, its name beside it, no level chip. */
export const TIGHT_AVATAR = 44;
/** Your tight seat sits left of the hand: the avatar and a gap. */
export const TIGHT_SOUTH_SLOT = TIGHT_AVATAR + 8;
/** Landscape phones shorter than this have no room for the ticker. */
const TICKER_MIN_LANDSCAPE_HEIGHT = 390;
/**
 * Small phones leave the ticker out: the seats' status lines say the same,
 * and the table needs the room (Marcel, 2026-10-15).
 */
export function showsTicker(L: TableLayout): boolean {
  if (L.tight) return false;
  return !(L.profile === 'phone-landscape' && L.height < TICKER_MIN_LANDSCAPE_HEIGHT);
}
/** Below this circle radius the trick reads as a heap: give it the seats' room. */
const MIN_COMFORT_R = 64;
const PILE_SCALE = 0.82;
/** Played cards shrink a little where the trick circle has to. */
const COMPACT_PILE_SCALE = 0.72;
const LANDSCAPE_PILE_SCALE = 0.8;

export function playedCardTarget(
  L: TableLayout,
  rel: RelativePosition,
  index: number,
  count: number
) {
  const portrait = L.profile.endsWith('portrait');
  const pileScale = L.trick.pileScale;
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

const HAND_STEP = 0.72;
/** Step between hand cards: a straight row, squeezed to fit the hand's width. */
export function handStep(L: TableLayout, n: number): number {
  const cardW = L.cardW * handScale(L.profile);
  return n > 1 ? Math.min(L.cardW * HAND_STEP, (L.hand.maxWidth - cardW) / (n - 1)) : 0;
}

/**
 * How large your hand is drawn. Landscape phones draw it larger, ranks
 * readable at arm's length (PID-217); landscape tablets a touch smaller.
 */
export function handScale(profile: Profile): number {
  return profile === 'phone-landscape' ? 1.2 : profile === 'tablet-landscape' ? 0.9 : 1;
}

/** Left edge of an n-card hand, a lifted (playable) card included. */
export function handLeft(L: TableLayout, n: number): number {
  const half = (Math.max(1, n) - 1) / 2;
  return L.hand.cx - half * handStep(L, n) - (L.cardW * handScale(L.profile) * 1.03) / 2;
}

/**
 * The portrait slot below the hand (chat, an adaptive ad or table details).
 * Short phones get a slimmer one, still room for a 50pt banner, so the trick
 * keeps clear of North and the hand.
 */
export const UTILITY_DOCK_RESERVE = 72;
const COMPACT_DOCK_RESERVE = 52;
const COMPACT_HEIGHT = 700;
export function utilityDockReserve(height: number): number {
  return height < COMPACT_HEIGHT ? COMPACT_DOCK_RESERVE : UTILITY_DOCK_RESERVE;
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

  // Portrait centers the trick in the band between North's seat and your
  // hand, so the played cards keep clear of both on every phone height. Where
  // the band is short (small phones) the circle and its cards shrink; where
  // it is not, the circle keeps its usual size. On the shortest phones even
  // that is not enough (`tight`): North's name moves beside a smaller avatar,
  // and yours moves to the left of your hand, which drops to the bottom edge.
  // Landscape keeps the legacy full-felt composition with floating chrome.
  const tabletPortrait = profile === 'tablet-portrait';
  const usualR = clamp(shortest * (portrait ? 0.19 : 0.18), 82, 190);
  const portraitBand = (tightSeats: boolean) => {
    // Your seat below the hand: avatar, level chip, name and status, or only
    // a gap above the dock when your avatar sits beside the hand.
    const southSeat = tightSeats ? 12 : tabletPortrait ? 140 : 120;
    const handY = tableBottom - southSeat - cardH * 0.5;
    const northBottom =
      tableTop +
      8 +
      clamp(cardW * 0.66, 31, 58) * CARD_RATIO +
      12 +
      (tightSeats ? TIGHT_AVATAR : NORTH_SEAT_STACK[tabletPortrait ? 'tablet' : 'phone']);
    return { handY, northBottom, band: Math.max(0, handY - cardH / 2 - northBottom) };
  };
  const fitR = (band: number, scale: number) => band / 2 - (cardH * scale) / 2 - 8;
  const roomy = portraitBand(false);
  const tight = portrait && !tabletPortrait && fitR(roomy.band, COMPACT_PILE_SCALE) < MIN_COMFORT_R;
  const { handY: portraitHandY, northBottom, band } = portraitBand(tight);
  const compact = portrait && fitR(band, PILE_SCALE) < usualR;
  const handH = cardH * handScale(profile);
  const handY = portrait ? portraitHandY : tableBottom - handH / 2 - cardH * 0.11;
  const trickCy = portrait ? northBottom + band / 2 : height * 0.49;
  // Landscape: your played card lands above the hand. Short phones shrink the
  // circle and its cards until it does.
  const landscapeR = (scale: number) => handY - handH / 2 - 8 - (cardH * scale) / 2 - trickCy;
  const shortLandscape = !portrait && landscapeR(LANDSCAPE_PILE_SCALE) < usualR;
  const pileScale = portrait
    ? compact
      ? COMPACT_PILE_SCALE
      : PILE_SCALE
    : shortLandscape
      ? COMPACT_PILE_SCALE
      : LANDSCAPE_PILE_SCALE;
  const trickR = compact
    ? Math.max(32, Math.min(usualR, fitR(band, pileScale)))
    : shortLandscape
      ? Math.max(32, Math.min(usualR, landscapeR(pileScale)))
      : usualR;

  const northY = tableTop + cardH * (portrait ? 0.48 : 0.22) + 10;
  const sideCy = portrait ? trickCy : trickCy + LANDSCAPE_SIDE_DROP;
  // Played cards leave from here; portrait keeps its historical screen-center origin.
  const sideY = portrait ? cy : sideCy;

  // Landscape: your seat sits left of your hand, its name running toward it.
  // The hand stays on the table's axis, or moves as little right of it as a
  // full hand needs to clear the seat; only past that does it squeeze.
  const handRoomLeft =
    insets.left +
    LANDSCAPE_SOUTH_LEFT +
    AVATAR_SIZE[profile] +
    seatNameGap(profile) +
    SOUTH_NAME_MIN +
    8;
  const handRoomRight = width - insets.right - 16;
  const fullHand = cardW * handScale(profile) + (FULL_HAND - 1) * cardW * HAND_STEP;
  const landscapeHandCx = Math.max(
    cx,
    handRoomLeft + Math.min(fullHand, handRoomRight - handRoomLeft) / 2
  );

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
    trick: { cx, cy: trickCy, r: trickR, pileScale },
    tight,
    sides: { cy: sideCy },
    seats,
    // A tight hand makes room on its left for your avatar.
    hand: portrait
      ? {
          cx: tight ? cx + TIGHT_SOUTH_SLOT / 2 : cx,
          cy: handY,
          maxWidth: width - insets.left - insets.right - 32 - (tight ? TIGHT_SOUTH_SLOT : 0),
        }
      : {
          cx: landscapeHandCx,
          cy: handY,
          maxWidth: 2 * Math.min(landscapeHandCx - handRoomLeft, handRoomRight - landscapeHandCx),
        },
  };
}
