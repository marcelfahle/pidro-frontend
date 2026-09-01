import type { Card, Suit } from '@/types/game';

export type CardKey = `${Suit}_${number}`;

export const cardKey = (card: Card): CardKey => `${card.suit}_${card.rank}` as CardKey;
