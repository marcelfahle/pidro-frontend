/**
 * Cross-platform Skia card textures. Native loads the bundled require() modules
 * (same art as src/utils/cardImages.ts); web loads the public/cards mirror because
 * Metro-web require() doesn't resolve to a URL for Skia. All 52 faces + back +
 * 4 suit glyphs are preloaded; a missing texture renders as a fallback frame.
 */
import { Platform } from 'react-native';
import { useImage, type SkImage } from '@shopify/react-native-skia';
import { getCardImage } from '@/utils/cardImages';
import type { Card, Suit } from '@/types/game';

export type CardKey = `${Suit}_${number}`;
export const cardKey = (c: Card): CardKey => `${c.suit}_${c.rank}` as CardKey;

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

// Fixed order → stable hook call order for the useImage loop below.
const ALL_CARDS: Card[] = SUITS.flatMap((suit) => RANKS.map((rank) => ({ suit, rank })));

type ImgSource = string | number;

function faceSource(card: Card): ImgSource {
  return Platform.OS === 'web'
    ? `/cards/${card.suit}_${card.rank}.png`
    : (getCardImage(card) as number);
}

const BACK_SOURCE: ImgSource =
  Platform.OS === 'web'
    ? '/cards/cardback.png'
    : (require('~/assets/images/cardback.png') as number);

// Suit value (plural) → glyph file (singular).
const SUIT_FILE: Record<Suit, string> = {
  hearts: 'heart',
  diamonds: 'diamond',
  clubs: 'club',
  spades: 'spade',
};
const SUIT_NATIVE: Record<Suit, number> = {
  hearts: require('~/assets/images/heart.png'),
  diamonds: require('~/assets/images/diamond.png'),
  clubs: require('~/assets/images/club.png'),
  spades: require('~/assets/images/spade.png'),
};
function suitSource(suit: Suit): ImgSource {
  return Platform.OS === 'web' ? `/cards/${SUIT_FILE[suit]}.png` : SUIT_NATIVE[suit];
}

export type CardTextures = {
  get: (key: CardKey) => SkImage | null;
  back: SkImage | null;
  suit: (suit: Suit) => SkImage | null;
  ready: boolean;
};

export function useCardTextures(): CardTextures {
  /* eslint-disable react-hooks/rules-of-hooks -- fixed-length arrays → stable hook order */
  const faces = ALL_CARDS.map((c) => useImage(faceSource(c) as Parameters<typeof useImage>[0]));
  const suits = SUITS.map((s) => useImage(suitSource(s) as Parameters<typeof useImage>[0]));
  /* eslint-enable react-hooks/rules-of-hooks */
  const back = useImage(BACK_SOURCE as Parameters<typeof useImage>[0]);

  const faceMap = new Map<CardKey, SkImage | null>();
  ALL_CARDS.forEach((c, i) => faceMap.set(cardKey(c), faces[i] ?? null));
  const suitMap = new Map<Suit, SkImage | null>();
  SUITS.forEach((s, i) => suitMap.set(s, suits[i] ?? null));

  return {
    get: (k) => faceMap.get(k) ?? null,
    back,
    suit: (s) => suitMap.get(s) ?? null,
    ready: back != null && faces.every((f) => f != null),
  };
}
