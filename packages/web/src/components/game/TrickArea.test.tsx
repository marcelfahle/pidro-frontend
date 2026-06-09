import type { GameViewModel, ServerGameState } from '@pidro/shared';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TrickArea } from './TrickArea';

// Mock shared package exports used by TrickArea and Card
vi.mock('@pidro/shared', () => ({
  mapAbsoluteToRelative: (abs: string, you: string) => {
    // Simplified mapping when you='south': south->south, north->north, etc.
    if (you === 'south') return abs;
    return abs;
  },
  SUIT_SYMBOLS: {
    hearts: '\u2665',
    diamonds: '\u2666',
    clubs: '\u2663',
    spades: '\u2660',
  },
  SUIT_COLORS_RAW: {
    hearts: '#e11d48',
    diamonds: '#d97706',
    clubs: '#1e293b',
    spades: '#0f172a',
  },
  getRankLabel: (rank: number) => {
    if (rank === 1 || rank === 14) return 'A';
    if (rank === 11) return 'J';
    if (rank === 12) return 'Q';
    if (rank === 13) return 'K';
    return `${rank}`;
  },
}));

const basePlayers = [
  {
    absolutePosition: 'south',
    relativePosition: 'south',
    playerId: 'p3',
    username: 'Me',
    isYou: true,
    isTeammate: false,
    isOpponent: false,
    isConnected: true,
    isCurrentTurn: true,
  },
  {
    absolutePosition: 'north',
    relativePosition: 'north',
    playerId: 'p1',
    username: 'Alice',
    isYou: false,
    isTeammate: true,
    isOpponent: false,
    isConnected: true,
    isCurrentTurn: false,
  },
  {
    absolutePosition: 'east',
    relativePosition: 'east',
    playerId: 'p2',
    username: 'Bob',
    isYou: false,
    isTeammate: false,
    isOpponent: true,
    isConnected: true,
    isCurrentTurn: false,
  },
  {
    absolutePosition: 'west',
    relativePosition: 'west',
    playerId: 'p4',
    username: 'Carol',
    isYou: false,
    isTeammate: false,
    isOpponent: true,
    isConnected: true,
    isCurrentTurn: false,
  },
] as GameViewModel['players'];

function makeViewModel(overrides: Partial<GameViewModel> = {}): GameViewModel {
  return {
    roomCode: 'ABC',
    phase: 'playing',
    viewerPositionAbsolute: 'south',
    trumpSuit: 'hearts',
    dealerAbsolute: 'north',
    dealerRelative: 'north',
    currentTurnAbsolute: 'south',
    currentTurnRelative: 'south',
    players: basePlayers,
    ...overrides,
  };
}

const emptyPlayers: ServerGameState['players'] = {
  north: {},
  east: {},
  south: {},
  west: {},
};

describe('TrickArea', () => {
  it('shows the trump suit indicator and no cards on an empty board', () => {
    render(
      <TrickArea
        viewModel={makeViewModel()}
        serverState={{
          phase: 'playing',
          current_player: 'south',
          players: emptyPlayers,
          current_trick: [],
          tricks: [],
        }}
      />,
    );

    // Center trump indicator renders the suit symbol (cards draw suits as SVG).
    expect(screen.getByText('♥')).toBeTruthy();
    // No played cards yet.
    expect(screen.queryByText('10')).toBeNull();
  });

  it('shows played cards from the current trick', () => {
    render(
      <TrickArea
        viewModel={makeViewModel()}
        serverState={{
          phase: 'playing',
          current_player: 'south',
          players: emptyPlayers,
          current_trick: [
            { player: 'east', card: { rank: 10, suit: 'hearts' } },
            { player: 'south', card: { rank: 5, suit: 'hearts' } },
          ],
          tricks: [],
        }}
      />,
    );

    expect(screen.getByText('10')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
  });

  it('shows cards accumulated from completed tricks', () => {
    render(
      <TrickArea
        viewModel={makeViewModel()}
        serverState={{
          phase: 'playing',
          current_player: 'south',
          players: emptyPlayers,
          current_trick: [],
          tricks: [
            {
              cards: [
                { player: 'north', card: { rank: 5, suit: 'hearts' } },
                { player: 'east', card: { rank: 3, suit: 'hearts' } },
                { player: 'south', card: { rank: 7, suit: 'hearts' } },
                { player: 'west', card: { rank: 2, suit: 'hearts' } },
              ],
              winner: 'south',
            },
          ],
        }}
      />,
    );

    expect(screen.getByText('7')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('renders the optimistic card in the south stack', () => {
    render(
      <TrickArea
        viewModel={makeViewModel()}
        serverState={{
          phase: 'playing',
          current_player: 'south',
          players: emptyPlayers,
          current_trick: [],
          tricks: [],
        }}
        optimisticCard={{ rank: 9, suit: 'spades' }}
      />,
    );

    expect(screen.getByText('9')).toBeTruthy();
  });
});
