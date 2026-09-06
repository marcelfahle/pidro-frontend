import { useGameStore } from '@pidro/shared';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeServerState, makeViewModel } from '../../playground/mockGame';
import { GameTable } from './GameTable';

const hand = [
  { rank: 14, suit: 'spades' as const },
  { rank: 10, suit: 'hearts' as const },
];

function renderTable() {
  const onPlayCard = vi.fn();
  const viewModel = makeViewModel({ phase: 'playing', currentTurn: 'south' });
  // Simulate the stale view model that originally leaked spectator identity.
  const stalePlayer = viewModel.players.find((player) => player.absolutePosition === 'south');
  if (stalePlayer) stalePlayer.username = 'Stale Seat';
  useGameStore.setState({
    role: 'spectator',
    serverState: makeServerState({
      phase: 'playing',
      current_player: 'south',
      players: {
        north: { card_count: 2 },
        east: { card_count: 2 },
        south: { hand },
        west: { card_count: 2 },
      },
    }),
    legalActions: [{ type: 'play_card', card: hand[0] }],
  });

  render(
    <GameTable
      viewModel={viewModel}
      onPlayCard={onPlayCard}
      onBid={vi.fn()}
      onPass={vi.fn()}
      onDeclareTrump={vi.fn()}
      onSelectHand={vi.fn()}
      onLeave={vi.fn()}
    />,
  );
  return { onPlayCard };
}

afterEach(() => act(() => useGameStore.getState().reset()));

describe('GameTable spectator role', () => {
  it('ignores stale isYou data and hides private cards and legal play actions', async () => {
    const { onPlayCard } = renderTable();

    expect(screen.getByText('Watching')).toBeInTheDocument();
    expect(screen.queryByText('You')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('A of spades')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Play A of spades' })).not.toBeInTheDocument();
    expect(screen.getAllByLabelText('Face-down card').length).toBeGreaterThanOrEqual(hand.length);

    await userEvent.click(screen.getByRole('button', { name: 'Game menu' }));
    expect(screen.getByRole('button', { name: 'Back to lobby' })).toBeInTheDocument();
    expect(onPlayCard).not.toHaveBeenCalled();
  });

  it('reveals the hand and legal action after the authoritative role transitions to player', () => {
    renderTable();

    act(() => useGameStore.setState({ role: 'player' }));

    expect(screen.queryByText('Watching')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play A of spades' })).toBeInTheDocument();
    expect(screen.getByLabelText('10 of hearts')).toBeInTheDocument();
  });
});
