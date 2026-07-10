/**
 * Pure adapter: controller state → canvas render model (plan §5.2).
 * Deterministic for a given snapshot — no side effects, never throws on
 * malformed state (renders empty slots instead). Seat ownership comes from the
 * view model's relativePosition; canvas code never computes it.
 */
import { useMemo } from 'react';
import type {
  Card,
  GamePhase,
  LegalAction,
  RelativePlayerView,
  RelativePosition,
  Suit,
} from '@/types/game';
import type { Position } from '@/types/lobby';
import type { GameTableController } from '@/game/useGameTableController';
import { cardKey, type CardKey } from './cardTextures';

export type TableCard = {
  key: string;
  textureKey: CardKey;
  card: Card;
  isTrump: boolean;
  isLegalPlay: boolean;
  isCurrentTrick: boolean;
};
export type TableSeat = {
  absolutePosition: Position;
  relativePosition: RelativePosition;
  username: string | null;
  isYou: boolean;
  isTeammate: boolean;
  isOpponent: boolean;
  isConnected: boolean;
  isCurrentTurn: boolean;
  cardCount: number | null;
  lastPlayedCard: TableCard | null;
};
export type TableModel = {
  phase: GamePhase;
  trumpSuit: Suit | null;
  seats: Record<RelativePosition, TableSeat | null>;
  yourHand: TableCard[];
  yourCardCount: number | null;
  currentTrick: Partial<Record<RelativePosition, TableCard>>;
  playedCards: Partial<Record<RelativePosition, TableCard[]>>;
  currentTurnRelative: RelativePosition | null;
  legalPlayKeys: Set<CardKey>;
  canPlay: boolean;
};

const SUIT_ORDER: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
const REL: RelativePosition[] = ['north', 'east', 'south', 'west'];

// Same ordering as PlayerHand.sortCards: trump first, then suit order, rank desc.
function sortHand(cards: Card[], trump: Suit | null): Card[] {
  return [...cards].sort((a, b) => {
    const aT = trump && a.suit === trump;
    const bT = trump && b.suit === trump;
    if (aT && !bT) return -1;
    if (!aT && bT) return 1;
    const ai = SUIT_ORDER.indexOf(a.suit);
    const bi = SUIT_ORDER.indexOf(b.suit);
    if (ai !== bi) return ai - bi;
    return b.rank - a.rank;
  });
}

export type TableModelInput = {
  phase: GamePhase;
  trumpSuit: Suit | null;
  players: RelativePlayerView[];
  yourHand: Card[] | null;
  yourCardCount: number | null;
  currentTrick: unknown;
  tricks: unknown;
  legalActions: LegalAction[];
  currentTurnRelative: RelativePosition | null;
  canPlay: boolean;
  getCardCountForPlayer: (absPosition: Position | null) => number | null;
};

type RawPlay = { player?: Position; position?: Position; card?: Card };

function normalizePlays(trick: unknown): RawPlay[] {
  const plays = Array.isArray(trick)
    ? trick
    : trick && typeof trick === 'object' && 'plays' in trick
      ? (trick as { plays: unknown }).plays
      : trick && typeof trick === 'object' && 'cards' in trick
        ? (trick as { cards: unknown }).cards
        : null;
  return Array.isArray(plays) ? (plays as RawPlay[]) : [];
}

function normalizeCompletedTricks(tricks: unknown): RawPlay[][] {
  if (!Array.isArray(tricks)) return [];
  return tricks.map(normalizePlays).filter((plays) => plays.length > 0);
}

export function buildTableModel(input: TableModelInput): TableModel {
  const { trumpSuit } = input;

  const legalPlayKeys = new Set<CardKey>();
  for (const a of input.legalActions) {
    if (a.type === 'play_card' && a.card) legalPlayKeys.add(cardKey(a.card));
  }

  const toCard = (c: Card, key: string = cardKey(c), isCurrentTrick = false): TableCard => {
    const textureKey = cardKey(c);
    return {
      key,
      textureKey,
      card: c,
      isTrump: !!trumpSuit && c.suit === trumpSuit,
      isLegalPlay: legalPlayKeys.has(textureKey),
      isCurrentTrick,
    };
  };

  const yourHand = (input.yourHand ? sortHand(input.yourHand, trumpSuit) : []).map((card) =>
    toCard(card)
  );

  const absToRel = new Map<Position, RelativePosition>();
  for (const p of input.players) absToRel.set(p.absolutePosition, p.relativePosition);

  const playedCards: Partial<Record<RelativePosition, TableCard[]>> = {};
  const pushPlayedCard = (rel: RelativePosition, tableCard: TableCard) => {
    playedCards[rel] = [...(playedCards[rel] ?? []), tableCard];
  };

  const currentTrick: Partial<Record<RelativePosition, TableCard>> = {};
  const completedTricks = normalizeCompletedTricks(input.tricks);
  completedTricks.forEach((plays, trickIndex) => {
    plays.forEach((play, playIndex) => {
      const abs = (play.player ?? play.position) as Position | undefined;
      if (!abs || !play.card) return;
      const rel = absToRel.get(abs);
      if (!rel) return;
      const textureKey = cardKey(play.card);
      pushPlayedCard(
        rel,
        toCard(play.card, `trick-${trickIndex}-${playIndex}-${rel}-${textureKey}`)
      );
    });
  });

  const currentTrickIndex = completedTricks.length;
  for (const [playIndex, play] of normalizePlays(input.currentTrick).entries()) {
    const abs = (play.player ?? play.position) as Position | undefined;
    if (!abs || !play.card) continue;
    const rel = absToRel.get(abs);
    if (!rel) continue;
    const textureKey = cardKey(play.card);
    const tableCard = toCard(
      play.card,
      `trick-${currentTrickIndex}-${playIndex}-${rel}-${textureKey}`,
      true
    );
    currentTrick[rel] = tableCard;
    pushPlayedCard(rel, tableCard);
  }

  const seats = {} as Record<RelativePosition, TableSeat | null>;
  for (const rel of REL) {
    const p = input.players.find((pp) => pp.relativePosition === rel) ?? null;
    seats[rel] = p
      ? {
          absolutePosition: p.absolutePosition,
          relativePosition: rel,
          username: p.username,
          isYou: p.isYou,
          isTeammate: p.isTeammate,
          isOpponent: p.isOpponent,
          isConnected: p.isConnected,
          isCurrentTurn: p.isCurrentTurn,
          cardCount: input.getCardCountForPlayer(p.absolutePosition),
          lastPlayedCard: currentTrick[rel] ?? null,
        }
      : null;
  }

  return {
    phase: input.phase,
    trumpSuit,
    seats,
    yourHand,
    yourCardCount: input.yourCardCount,
    currentTrick,
    playedCards,
    currentTurnRelative: input.currentTurnRelative,
    legalPlayKeys,
    canPlay: input.canPlay,
  };
}

export function useTableModel(c: GameTableController): TableModel {
  return useMemo(
    () =>
      buildTableModel({
        phase: c.phase,
        trumpSuit: c.trumpSuit,
        players: c.players,
        yourHand: c.yourHand,
        yourCardCount: c.yourCardCount,
        currentTrick: c.currentTrick,
        tricks: c.completedTricks,
        legalActions: c.legalActions,
        currentTurnRelative: c.currentTurnRelative,
        canPlay: c.isPlayingTurn && !c.isPlayingCard,
        getCardCountForPlayer: c.getCardCountForPlayer,
      }),
    [
      c.phase,
      c.trumpSuit,
      c.players,
      c.yourHand,
      c.yourCardCount,
      c.currentTrick,
      c.completedTricks,
      c.legalActions,
      c.currentTurnRelative,
      c.isPlayingTurn,
      c.isPlayingCard,
      c.getCardCountForPlayer,
    ]
  );
}
