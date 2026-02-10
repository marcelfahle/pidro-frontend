import type { GameViewModel } from '@pidro/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TrumpSelector } from './TrumpSelector';

// Mock shared package exports used by TrumpSelector
vi.mock('@pidro/shared', () => ({
  SUIT_COLORS_RAW: {
    hearts: '#e11d48',
    diamonds: '#d97706',
    clubs: '#1e293b',
    spades: '#0f172a',
  },
  SUIT_SYMBOLS: {
    hearts: '\u2665',
    diamonds: '\u2666',
    clubs: '\u2663',
    spades: '\u2660',
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
] as GameViewModel['players'];

function makeViewModel(overrides: Partial<GameViewModel> = {}): GameViewModel {
  return {
    roomCode: 'ABC',
    phase: 'declaring_trump',
    trumpSuit: null,
    dealerAbsolute: 'north',
    dealerRelative: 'north',
    currentTurnAbsolute: 'south',
    currentTurnRelative: 'south',
    players: basePlayers,
    ...overrides,
  };
}

describe('TrumpSelector', () => {
  it('shows 4 suit buttons when it is your turn', () => {
    render(
      <TrumpSelector
        viewModel={makeViewModel()}
        legalActions={[
          { type: 'declare_trump', suit: 'hearts' },
          { type: 'declare_trump', suit: 'diamonds' },
          { type: 'declare_trump', suit: 'clubs' },
          { type: 'declare_trump', suit: 'spades' },
        ]}
        onDeclareTrump={vi.fn()}
      />,
    );

    expect(screen.getByText('Choose Trump Suit')).toBeTruthy();
    expect(screen.getByText('Hearts')).toBeTruthy();
    expect(screen.getByText('Diamonds')).toBeTruthy();
    expect(screen.getByText('Clubs')).toBeTruthy();
    expect(screen.getByText('Spades')).toBeTruthy();
  });

  it('calls onDeclareTrump with selected suit', async () => {
    const onDeclareTrump = vi.fn();

    render(
      <TrumpSelector
        viewModel={makeViewModel()}
        legalActions={[{ type: 'declare_trump', suit: 'spades' }]}
        onDeclareTrump={onDeclareTrump}
      />,
    );

    await userEvent.click(screen.getByText('Spades'));
    expect(onDeclareTrump).toHaveBeenCalledWith('spades');
  });

  it('shows waiting message when it is not your turn', () => {
    const vm = makeViewModel({
      currentTurnAbsolute: 'east',
      players: basePlayers.map((p) => ({
        ...p,
        isCurrentTurn: p.absolutePosition === 'east',
      })) as GameViewModel['players'],
    });

    render(<TrumpSelector viewModel={vm} legalActions={[]} onDeclareTrump={vi.fn()} />);

    expect(screen.getByText('Waiting for Bob to declare trump...')).toBeTruthy();
  });
});
