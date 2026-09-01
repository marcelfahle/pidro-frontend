import { describe, expect, it } from 'bun:test';
import { buildTableModel } from '../../src/game/canvas/tableModel.ts';

const player = (absolutePosition, relativePosition) => ({
  absolutePosition,
  relativePosition,
  playerId: `player-${absolutePosition}`,
  username: absolutePosition,
  isYou: relativePosition === 'south',
  isTeammate: relativePosition === 'north',
  isOpponent: relativePosition === 'east' || relativePosition === 'west',
  isConnected: true,
  isCurrentTurn: false,
  seatStatus: 'normal',
});

const rotatedPlayers = [
  player('north', 'east'),
  player('east', 'south'),
  player('south', 'west'),
  player('west', 'north'),
];

const dealerSelectionCuts = {
  north: { suit: 'clubs', rank: 9 },
  east: { suit: 'spades', rank: 14 },
  south: { suit: 'hearts', rank: 5 },
  west: { suit: 'diamonds', rank: 7 },
};

const build = (overrides = {}) =>
  buildTableModel({
    phase: 'dealer_selection',
    trumpSuit: null,
    players: rotatedPlayers,
    yourHand: null,
    yourCardCount: null,
    dealerSelectionCuts,
    currentTrick: null,
    tricks: null,
    legalActions: [],
    currentTurnRelative: null,
    canPlay: false,
    getCardCountForPlayer: () => null,
    ...overrides,
  });

describe('dealer selection table model', () => {
  it('maps absolute server seats to viewer-relative cut cards', () => {
    const model = build();

    expect(model.dealerCuts.east).toMatchObject({
      key: 'dealer-cut-east-clubs_9',
      card: dealerSelectionCuts.north,
    });
    expect(model.dealerCuts.south).toMatchObject({
      key: 'dealer-cut-south-spades_14',
      card: dealerSelectionCuts.east,
    });
    expect(model.dealerCuts.west).toMatchObject({
      key: 'dealer-cut-west-hearts_5',
      card: dealerSelectionCuts.south,
    });
    expect(model.dealerCuts.north).toMatchObject({
      key: 'dealer-cut-north-diamonds_7',
      card: dealerSelectionCuts.west,
    });
  });

  it('hides dealer cuts outside the dealer-selection phase', () => {
    expect(build({ phase: 'bidding' }).dealerCuts).toEqual({});
  });

  it('ignores cuts that do not map to a visible player', () => {
    const model = build({ players: rotatedPlayers.slice(0, 3) });

    expect(model.dealerCuts.north).toBeUndefined();
    expect(Object.keys(model.dealerCuts)).toHaveLength(3);
  });
});
