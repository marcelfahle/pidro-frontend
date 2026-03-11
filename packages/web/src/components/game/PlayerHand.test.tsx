import type { Card as CardType, LegalAction } from '@pidro/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PlayerHand } from './PlayerHand';

// Mock @pidro/shared — provide display helpers used by Card.tsx (imported transitively)
vi.mock('@pidro/shared', () => ({
  getRankLabel: (rank: number) => {
    const labels: Record<number, string> = {
      1: 'A',
      2: '2',
      5: '5',
      10: '10',
      11: 'J',
      14: 'A',
    };
    return labels[rank] ?? String(rank);
  },
  SUIT_SYMBOLS: {
    hearts: '\u2665',
    diamonds: '\u2666',
    clubs: '\u2663',
    spades: '\u2660',
  },
  SUIT_COLORS_RAW: {
    hearts: '#ef4444',
    diamonds: '#f59e0b',
    clubs: '#1e293b',
    spades: '#0f172a',
  },
}));

const testCards: CardType[] = [
  { rank: 14, suit: 'spades' },
  { rank: 10, suit: 'spades' },
  { rank: 5, suit: 'hearts' },
];

describe('PlayerHand', () => {
  it('shows username and You badge for the current player', () => {
    render(
      <PlayerHand
        position="south"
        cards={testCards}
        cardCount={3}
        username="Alice"
        isYou
        isDealer={false}
        isCurrentTurn={false}
        isConnected
        legalActions={[]}
        trumpSuit={null}
      />,
    );

    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0);
  });

  it('shows dealer badge when player is dealer', () => {
    render(
      <PlayerHand
        position="north"
        cards={null}
        cardCount={6}
        username="Bob"
        isYou={false}
        isDealer
        isCurrentTurn={false}
        isConnected
        legalActions={[]}
        trumpSuit={null}
      />,
    );

    expect(screen.getByText('D')).toBeTruthy();
  });

  it('shows DC badge and dims when player is disconnected', () => {
    const { container } = render(
      <PlayerHand
        position="east"
        cards={null}
        cardCount={4}
        username="Carol"
        isYou={false}
        isDealer={false}
        isCurrentTurn={false}
        isConnected={false}
        legalActions={[]}
        trumpSuit={null}
      />,
    );

    expect(screen.getByText('DC')).toBeTruthy();
    // Outer container has opacity-50 when disconnected
    const outerDiv = container.firstElementChild;
    expect(outerDiv?.className).toContain('opacity-50');
  });

  it('renders face-down cards for opponents', () => {
    render(
      <PlayerHand
        position="north"
        cards={null}
        cardCount={5}
        username="Opponent"
        isYou={false}
        isDealer={false}
        isCurrentTurn={false}
        isConnected
        legalActions={[]}
        trumpSuit={null}
      />,
    );

    // Should render 5 face-down cards
    const faceDownCards = screen.getAllByTitle('Face-down card');
    expect(faceDownCards).toHaveLength(5);
  });

  it('renders face-up cards for the current player', () => {
    render(
      <PlayerHand
        position="south"
        cards={testCards}
        cardCount={3}
        username="Me"
        isYou
        isDealer={false}
        isCurrentTurn={false}
        isConnected
        legalActions={[]}
        trumpSuit={null}
      />,
    );

    // Should render face-up cards (by title "Rank of suit")
    expect(screen.getByTitle('A of spades')).toBeTruthy();
    expect(screen.getByTitle('10 of spades')).toBeTruthy();
    expect(screen.getByTitle('5 of hearts')).toBeTruthy();
  });

  it('marks playable cards as buttons and non-playable as divs', () => {
    const legalActions: LegalAction[] = [
      { type: 'play_card', card: { rank: 14, suit: 'spades' } },
      { type: 'play_card', card: { rank: 10, suit: 'spades' } },
    ];

    render(
      <PlayerHand
        position="south"
        cards={testCards}
        cardCount={3}
        username="Me"
        isYou
        isDealer={false}
        isCurrentTurn
        isConnected
        legalActions={legalActions}
        trumpSuit={null}
        onPlayCard={vi.fn()}
      />,
    );

    // Ace and Ten of spades should be playable buttons
    expect(screen.getByRole('button', { name: 'Play A of spades' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Play 10 of spades' })).toBeTruthy();

    // 5 of hearts is not in legal actions — should not be a button
    expect(screen.queryByRole('button', { name: /5 of hearts/ })).toBeNull();
  });

  it('calls onPlayCard when a playable card is clicked', async () => {
    const onPlayCard = vi.fn();
    const legalActions: LegalAction[] = [{ type: 'play_card', card: { rank: 14, suit: 'spades' } }];

    render(
      <PlayerHand
        position="south"
        cards={testCards}
        cardCount={3}
        username="Me"
        isYou
        isDealer={false}
        isCurrentTurn
        isConnected
        legalActions={legalActions}
        trumpSuit={null}
        onPlayCard={onPlayCard}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Play A of spades' }));
    expect(onPlayCard).toHaveBeenCalledWith({ rank: 14, suit: 'spades' });
  });

  it('shows "No cards" when count is 0', () => {
    render(
      <PlayerHand
        position="south"
        cards={[]}
        cardCount={0}
        username="Me"
        isYou
        isDealer={false}
        isCurrentTurn={false}
        isConnected
        legalActions={[]}
        trumpSuit={null}
      />,
    );

    expect(screen.getByText('No cards')).toBeTruthy();
  });

  it('shows a waiting placeholder for vacant substitute seats', () => {
    render(
      <PlayerHand
        position="east"
        cards={null}
        cardCount={0}
        username={null}
        isYou={false}
        isDealer={false}
        isCurrentTurn={false}
        isConnected={false}
        seatStatus="vacant"
        legalActions={[]}
        trumpSuit={null}
      />,
    );

    expect(screen.getAllByText('Waiting for player...').length).toBeGreaterThan(0);
  });

  it('shows turn indicator when it is the player turn', () => {
    const { container } = render(
      <PlayerHand
        position="south"
        cards={testCards}
        cardCount={3}
        username="Me"
        isYou
        isDealer={false}
        isCurrentTurn
        isConnected
        legalActions={[]}
        trumpSuit={null}
      />,
    );

    // Turn indicator is a pulsing yellow dot with animate-pulse class
    const pulsingDot = container.querySelector('.animate-pulse');
    expect(pulsingDot).toBeTruthy();
  });
});
