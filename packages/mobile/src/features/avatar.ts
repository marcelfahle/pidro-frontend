/**
 * Which parts of a player avatar show at which size, and how big each one is.
 * The stops are the sizes drawn on the Avatars board; anything between two
 * stops is interpolated, anything above the largest grows in proportion. Below
 * a part's smallest stop the part is dropped: the ring never is.
 */
import { t, formatNumber } from '@pidro/shared';

type Stop = readonly number[];

const RING: Stop[] = [
  [24, 1.5],
  [36, 2],
  [44, 2.5],
  [56, 3],
  [64, 3.5],
  [104, 5],
  [150, 6],
];
// size, diameter, rim, right, top
const PIN: Stop[] = [
  [36, 15, 1.5, -4, -3],
  [56, 20, 1.5, -4, -3],
  [64, 24, 2, -5, -2],
  [104, 36, 2.5, -6, 0],
  [150, 48, 3, -8, 2],
];
// size, min width, height, font, horizontal padding, bottom
const LEVEL: Stop[] = [
  [44, 22, 16, 9, 4, -8],
  [56, 26, 18, 10, 5, -9],
  [64, 30, 20, 11, 6, -9],
  [104, 42, 24, 13, 8, -11],
  [150, 52, 28, 15, 10, -13],
];
// size, diameter, left, bottom
const DEALER: Stop[] = [
  [44, 19, -8, 0],
  [56, 22, -10, 0],
  [64, 26, -11, 1],
  [150, 36, -14, 6],
];
// size, gap between ring and arc, stroke
const TURN: Stop[] = [
  [36, 4, 2.5],
  [56, 6, 3.5],
  [150, 13, 4],
];

function at(stops: Stop[], size: number): number[] | null {
  if (size < stops[0][0]) return null;
  const last = stops[stops.length - 1];
  if (size >= last[0]) return last.slice(1).map((value) => (value * size) / last[0]);
  const upper = stops.findIndex((stop) => stop[0] > size);
  const [a, b] = [stops[upper - 1], stops[upper]];
  const t = (size - a[0]) / (b[0] - a[0]);
  return a.slice(1).map((value, index) => value + (b[index + 1] - value) * t);
}

const half = (value: number) => Math.round(value * 2) / 2;

export interface AvatarParts {
  ring: number;
  keyline: number;
  pin: { size: number; rim: number; glyph: number; right: number; top: number } | null;
  gem: number | null;
  level: {
    minWidth: number;
    height: number;
    fontSize: number;
    padding: number;
    bottom: number;
  } | null;
  dealer: { size: number; left: number; bottom: number } | null;
  turn: { radius: number; stroke: number } | null;
  /** Name and status type: phone sizes below 64, iPad sizes from 64 up (52 beside). */
  name: { fontSize: number; lineHeight: number };
  status: { fontSize: number; lineHeight: number };
}

/**
 * A label beside the avatar has the avatar's height to itself, so from 52 up
 * it takes the larger type: landscape phone seats read at arm's length.
 */
const BESIDE_LARGE_TYPE = 52;

export function avatarParts(size: number, { beside = false } = {}): AvatarParts {
  const [ring] = at(RING, size) ?? [RING[0][1]];
  const pin = at(PIN, size);
  const level = at(LEVEL, size);
  const dealer = at(DEALER, size);
  const turn = at(TURN, size);
  const large = size >= 64;
  const largeType = large || (beside && size >= BESIDE_LARGE_TYPE);

  return {
    ring: half(ring),
    keyline: size <= 36 ? 1 : 1.5,
    pin: pin && {
      size: Math.round(pin[0]),
      rim: half(pin[1]),
      glyph: Math.round(pin[0] * 0.46),
      right: Math.round(pin[2]),
      top: Math.round(pin[3]),
    },
    gem: size >= 36 ? Math.round(size * 0.21) : null,
    level: level && {
      minWidth: Math.round(level[0]),
      height: Math.round(level[1]),
      fontSize: Math.round(level[2]),
      padding: Math.round(level[3]),
      bottom: Math.round(level[4]),
    },
    dealer: dealer && {
      size: Math.round(dealer[0]),
      left: Math.round(dealer[1]),
      bottom: Math.round(dealer[2]),
    },
    turn: turn && { radius: half(size / 2 + turn[0]), stroke: half(turn[1]) },
    name: largeType ? { fontSize: 16, lineHeight: 20 } : { fontSize: 13, lineHeight: 16 },
    status: largeType ? { fontSize: 13, lineHeight: 17 } : { fontSize: 11, lineHeight: 14 },
  };
}

export type AvatarPin = 'classic' | 'founding_tester';
export type AvatarAway = 'reconnecting' | 'bot';
export type AvatarKind = 'player' | 'bot' | 'open';

/** One sentence a screen reader can say for a seat, in the order a player scans it. */
export function avatarLabel({
  name,
  status,
  level,
  pin,
  dealer,
  turn,
  away,
  kind = 'player',
}: {
  name?: string | null;
  status?: string | null;
  level?: number | null;
  pin?: AvatarPin | null;
  dealer?: boolean;
  turn?: { urgent?: boolean } | null;
  away?: AvatarAway | null;
  kind?: AvatarKind;
}): string {
  const who =
    name ||
    t(kind === 'open' ? 'social.avatar_open' : kind === 'bot' ? 'social.bot' : 'social.player');
  const awayText =
    away === 'reconnecting'
      ? t('social.avatar_reconnecting')
      : away === 'bot'
        ? t('social.avatar_bot')
        : null;
  const statusText = status?.trim() ? status.trim().replace(/^./, (c) => c.toLowerCase()) : null;
  return [
    who,
    dealer ? t('social.avatar_dealer') : null,
    level != null ? t('social.avatar_level', { number: formatNumber(level) }) : null,
    pin ? (pin === 'classic' ? 'Pidro Classic' : t('profile.founding_tester')) : null,
    turn ? t(turn.urgent ? 'social.avatar_urgent' : 'social.avatar_turn') : null,
    statusText ?? awayText,
  ]
    .filter(Boolean)
    .join(', ');
}
