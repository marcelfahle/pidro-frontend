import { describe, expect, it } from 'bun:test';
import { normalizeRoom, useGameStore } from '@pidro/shared';
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

describe('table seat identities', () => {
  it('shows four distinct names for the iPad arrangement after a shuffled REST room snapshot', () => {
    useGameStore.getState().reset();
    try {
      useGameStore.getState().initFromRoom({
        room: normalizeRoom({
          code: 'D9MK',
          status: 'playing',
          seats: {
            east: { user_id: 'android1', username: 'mfand1' },
            north: { user_id: 'ios1', username: 'mfios1' },
            south: { user_id: 'ios2', username: 'mfios2' },
            west: { user_id: 'web1', username: 'mfweb1' },
          },
        }),
        youPlayerId: 'ios2',
      });
      const { playerMeta } = useGameStore.getState();
      const players = Object.entries(playerMeta).map(([position, meta]) => ({
        ...player(position, position),
        ...meta,
      }));
      const model = build({ phase: 'bidding', players });
      expect(
        Object.fromEntries(Object.entries(model.seats).map(([pos, seat]) => [pos, seat.username]))
      ).toEqual({ north: 'mfios1', east: 'mfand1', south: 'mfios2', west: 'mfweb1' });
    } finally {
      useGameStore.getState().reset();
    }
  });
});
