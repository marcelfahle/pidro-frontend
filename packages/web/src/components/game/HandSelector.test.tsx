import type { GameViewModel } from '@pidro/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { HandSelector } from './HandSelector';

// Mock shared package exports used by HandSelector and Card
vi.mock('@pidro/shared', () => ({
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

function makeViewModel(overrides: Partial<GameViewModel> = {}): GameViewModel {
  return {
    roomCode: 'ABC',
    phase: 'second_deal',
    viewerPositionAbsolute: 'south',
    trumpSuit: 'hearts',
    dealerAbsolute: 'south',
    dealerRelative: 'south',
    currentTurnAbsolute: 'south',
    currentTurnRelative: 'south',
    players: [
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
    ] as GameViewModel['players'],
    ...overrides,
  };
}

const testCards = [
  { rank: 14, suit: 'hearts' as const },
  { rank: 5, suit: 'hearts' as const },
  { rank: 10, suit: 'hearts' as const },
  { rank: 2, suit: 'hearts' as const },
  { rank: 11, suit: 'hearts' as const },
  { rank: 7, suit: 'hearts' as const },
  { rank: 3, suit: 'clubs' as const },
  { rank: 9, suit: 'diamonds' as const },
];

describe('HandSelector', () => {
  it('shows selection instruction and counter', () => {
    render(
      <HandSelector
        viewModel={makeViewModel()}
        cards={testCards}
        trumpSuit="hearts"
        onSelectHand={vi.fn()}
      />,
    );

    expect(screen.getByText('Select 6 cards to keep')).toBeTruthy();
    expect(screen.getByText('0/6 selected')).toBeTruthy();
  });

  it('renders all cards as clickable buttons', () => {
    render(
      <HandSelector
        viewModel={makeViewModel()}
        cards={testCards}
        trumpSuit="hearts"
        onSelectHand={vi.fn()}
      />,
    );

    // Each card should be a button (playable=true renders buttons)
    // 8 cards = 8 buttons + 1 confirm button = 9
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(9);
  });

  it('disables confirm button until 6 cards are selected', () => {
    render(
      <HandSelector
        viewModel={makeViewModel()}
        cards={testCards}
        trumpSuit="hearts"
        onSelectHand={vi.fn()}
      />,
    );

    const confirmButton = screen.getByRole('button', { name: 'Confirm Selection' });
    expect(confirmButton).toHaveProperty('disabled', true);
  });

  it('updates selection counter when cards are clicked', async () => {
    render(
      <HandSelector
        viewModel={makeViewModel()}
        cards={testCards}
        trumpSuit="hearts"
        onSelectHand={vi.fn()}
      />,
    );

    // Click the first card button (Ace of hearts)
    const cardButtons = screen
      .getAllByRole('button')
      .filter((b) => b.textContent !== 'Confirm Selection');
    await userEvent.click(cardButtons[0]);

    expect(screen.getByText('1/6 selected')).toBeTruthy();
  });

  it('calls onSelectHand with selected cards when confirm is clicked', async () => {
    const onSelectHand = vi.fn();

    render(
      <HandSelector
        viewModel={makeViewModel()}
        cards={testCards}
        trumpSuit="hearts"
        onSelectHand={onSelectHand}
      />,
    );

    // Select first 6 cards
    const cardButtons = screen
      .getAllByRole('button')
      .filter((b) => b.textContent !== 'Confirm Selection');
    for (let i = 0; i < 6; i++) {
      await userEvent.click(cardButtons[i]);
    }

    expect(screen.getByText('6/6 selected')).toBeTruthy();

    // Click confirm
    await userEvent.click(screen.getByRole('button', { name: 'Confirm Selection' }));
    expect(onSelectHand).toHaveBeenCalledWith(testCards.slice(0, 6));
  });

  it('shows waiting message when it is not your turn', () => {
    const vm = makeViewModel({
      currentTurnAbsolute: 'north',
      players: [
        {
          absolutePosition: 'south',
          relativePosition: 'south',
          playerId: 'p3',
          username: 'Me',
          isYou: true,
          isTeammate: false,
          isOpponent: false,
          isConnected: true,
          isCurrentTurn: false,
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
          isCurrentTurn: true,
        },
      ] as GameViewModel['players'],
    });

    render(
      <HandSelector viewModel={vm} cards={testCards} trumpSuit="hearts" onSelectHand={vi.fn()} />,
    );

    expect(screen.getByText('Waiting for Alice to select cards...')).toBeTruthy();
  });
});
