import type { Card, Suit } from '../types/game';

export const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

export const SUIT_COLORS_RAW: Record<Suit, string> = {
  hearts: '#e11d48',
  diamonds: '#e11d48',
  clubs: '#1e293b',
  spades: '#1e293b',
};

export const SUIT_BADGE_COLORS: Record<Suit, string> = {
  hearts: '#fff1f2',
  diamonds: '#fff1f2',
  clubs: '#f1f5f9',
  spades: '#f1f5f9',
};

export function getRankLabel(rank: number) {
  if (rank === 1 || rank === 14) return 'A';
  if (rank === 11) return 'J';
  if (rank === 12) return 'Q';
  if (rank === 13) return 'K';
  return `${rank}`;
}

export function formatSuitLabel(suit: Suit) {
  return suit.charAt(0).toUpperCase() + suit.slice(1);
}

const SUIT_ORDER: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];

export function sortCards(cards: Card[], trumpSuit: Suit | null | undefined): Card[] {
  return [...cards].sort((a, b) => {
    const aIsTrump = trumpSuit && a.suit === trumpSuit;
    const bIsTrump = trumpSuit && b.suit === trumpSuit;
    if (aIsTrump && !bIsTrump) return -1;
    if (!aIsTrump && bIsTrump) return 1;

    const aSuitIndex = SUIT_ORDER.indexOf(a.suit);
    const bSuitIndex = SUIT_ORDER.indexOf(b.suit);
    if (aSuitIndex !== bSuitIndex) return aSuitIndex - bSuitIndex;

    return b.rank - a.rank;
  });
}
