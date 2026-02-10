import type { Position } from './lobby';

export type GamePhase =
  | 'dealer_selection'
  | 'dealing'
  | 'bidding'
  | 'declaring'
  | 'declaring_trump'
  | 'trump_declaration'
  | 'discarding'
  | 'second_deal'
  | 'playing'
  | 'scoring'
  | 'hand_complete'
  | 'complete'
  | 'game_over';

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

export interface Card {
  rank: number;
  suit: Suit;
}

export interface ServerPlayerView {
  hand?: Card[] | number;
  card_count?: number;
  revealed_cards?: Card[];
}

export interface ServerTrickPlay {
  player: Position;
  card: Card;
}

export interface ServerTrick {
  cards: ServerTrickPlay[];
  winner: Position;
}

export interface ServerGameState {
  phase: GamePhase;
  current_player: Position | null;
  players: Record<Position, ServerPlayerView>;
  highest_bid?: { position: Position; amount: number | 'pass' };

  config?: {
    min_bid?: number;
    max_bid?: number;
    allow_negative_scores?: boolean;
    winning_score?: number;
    initial_deal_count?: number;
    final_hand_size?: number;
  };

  bids?: Record<Position, number | 'pass'>;
  current_bid?: number;
  bid_winner?: Position | null;
  bid_team?: 'north_south' | 'east_west' | null;

  trump?: Suit | null;

  current_trick?: ServerTrickPlay[];
  tricks?: ServerTrick[];

  scores?: {
    north_south: number;
    east_west: number;
  };

  dealer?: Position | null;
  round_number?: number;
}

export interface PlayerMeta {
  position: Position;
  playerId: string | null;
  username: string | null;
  isYou: boolean;
  isTeammate: boolean;
  isOpponent: boolean;
  isConnected: boolean;
}

export type RelativePosition = 'north' | 'east' | 'south' | 'west';

export interface RelativePlayerView {
  absolutePosition: Position;
  relativePosition: RelativePosition;
  playerId: string | null;
  username: string | null;
  isYou: boolean;
  isTeammate: boolean;
  isOpponent: boolean;
  isConnected: boolean;
  isCurrentTurn: boolean;
}

export interface GameViewModel {
  roomCode: string;
  phase: GamePhase;
  trumpSuit: Suit | null;
  dealerAbsolute: Position | null;
  dealerRelative: RelativePosition | null;
  currentTurnAbsolute: Position | null;
  currentTurnRelative: RelativePosition | null;
  players: RelativePlayerView[];
}

export interface PassAction {
  type: 'pass';
}

export interface BidAction {
  type: 'bid';
  amount: number;
}

export interface PlayCardAction {
  type: 'play_card';
  card: Card;
}

export interface DeclareTrumpAction {
  type: 'declare_trump';
  suit: Suit;
}

export interface SelectHandAction {
  type: 'select_hand';
  cards: Card[];
}

export type LegalAction =
  | PassAction
  | BidAction
  | PlayCardAction
  | DeclareTrumpAction
  | SelectHandAction;
