import type {
  GamePhase,
  GameViewModel,
  Position,
  RelativePlayerView,
  ServerGameState,
  ServerPlayerView,
  Suit,
} from '@pidro/shared';
import { isTeammate, mapAbsoluteToRelative } from '@pidro/shared';

/**
 * Mock game-state factory for the playground. Produces the exact `GameViewModel`
 * / `ServerGameState` shapes the real components expect, so scenes can render
 * production components (BiddingPanel, TrickArea, …) without a server or the store.
 */

export const POSITIONS: Position[] = ['north', 'east', 'south', 'west'];
export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

const NAMES: Record<Position, string> = {
  north: 'Thor',
  east: 'Maja',
  south: 'Robin',
  west: 'Pete',
};

export function seatName(pos: Position, viewer: Position): string {
  return pos === viewer ? 'You' : NAMES[pos];
}

export function makePlayers(viewer: Position, currentTurn: Position | null): RelativePlayerView[] {
  return POSITIONS.map((abs) => {
    const teammate = isTeammate(viewer, abs);
    return {
      absolutePosition: abs,
      relativePosition: mapAbsoluteToRelative(abs, viewer),
      playerId: abs,
      username: seatName(abs, viewer),
      isYou: abs === viewer,
      isTeammate: teammate && abs !== viewer,
      isOpponent: !teammate && abs !== viewer,
      isConnected: true,
      isCurrentTurn: currentTurn === abs,
      seatStatus: 'normal',
    };
  });
}

export interface ViewModelOpts {
  viewer?: Position;
  phase: GamePhase;
  trump?: Suit | null;
  dealer?: Position | null;
  currentTurn?: Position | null;
}

export function makeViewModel(opts: ViewModelOpts): GameViewModel {
  const viewer = opts.viewer ?? 'south';
  const dealer = opts.dealer ?? null;
  const currentTurn = opts.currentTurn ?? null;
  return {
    roomCode: 'LAB',
    phase: opts.phase,
    viewerPositionAbsolute: viewer,
    trumpSuit: opts.trump ?? null,
    dealerAbsolute: dealer,
    dealerRelative: dealer ? mapAbsoluteToRelative(dealer, viewer) : null,
    currentTurnAbsolute: currentTurn,
    currentTurnRelative: currentTurn ? mapAbsoluteToRelative(currentTurn, viewer) : null,
    players: makePlayers(viewer, currentTurn),
  };
}

export function makeServerPlayers(cardCount: number): Record<Position, ServerPlayerView> {
  return {
    north: { card_count: cardCount },
    east: { card_count: cardCount },
    south: { card_count: cardCount },
    west: { card_count: cardCount },
  };
}

export function makeServerState(
  partial: Partial<ServerGameState> & { phase: GamePhase },
): ServerGameState {
  return {
    current_player: null,
    players: makeServerPlayers(6),
    ...partial,
  };
}
