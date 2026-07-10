import type { Suit } from '@pidro/shared';

export {
  SUIT_SYMBOLS,
  SUIT_COLORS_RAW,
  SUIT_BADGE_COLORS,
  getRankLabel,
  formatSuitLabel,
} from '@pidro/shared';

export const SUIT_COLORS: Record<Suit, string> = {
  hearts: 'text-rose-600',
  diamonds: 'text-amber-600',
  clubs: 'text-slate-800',
  spades: 'text-slate-900',
};

export const SUIT_BADGES: Record<Suit, string> = {
  hearts: 'bg-rose-50',
  diamonds: 'bg-amber-50',
  clubs: 'bg-slate-100',
  spades: 'bg-slate-100',
};
