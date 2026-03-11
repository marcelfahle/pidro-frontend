import type { GameViewModel, ServerGameState } from '@pidro/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BiddingPanel } from './BiddingPanel';

// Mock @pidro/shared - mapAbsoluteToRelative returns the position as-is for tests
vi.mock('@pidro/shared', () => ({
  mapAbsoluteToRelative: (pos: string) => pos,
}));

const basePlayers = [
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
    phase: 'bidding',
    viewerPositionAbsolute: 'south',
    trumpSuit: null,
    dealerAbsolute: 'north',
    dealerRelative: 'north',
    currentTurnAbsolute: 'south',
    currentTurnRelative: 'south',
    players: basePlayers,
    ...overrides,
  };
}

function makeServerState(overrides: Partial<ServerGameState> = {}): ServerGameState {
  return {
    phase: 'bidding',
    current_player: 'south',
    players: { north: {}, east: {}, south: {}, west: {} },
    current_bid: 0,
    bid_winner: null,
    ...overrides,
  };
}

describe('BiddingPanel', () => {
  it('shows bid buttons and pass when it is your turn', () => {
    const onBid = vi.fn();
    const onPass = vi.fn();

    render(
      <BiddingPanel
        viewModel={makeViewModel()}
        serverState={makeServerState()}
        legalActions={[
          { type: 'bid', amount: 6 },
          { type: 'bid', amount: 7 },
          { type: 'bid', amount: 8 },
          { type: 'pass' },
        ]}
        onBid={onBid}
        onPass={onPass}
      />,
    );

    // Should show "Your turn to bid"
    expect(screen.getByText('Your turn to bid')).toBeTruthy();

    // Should show bid buttons for legal amounts
    expect(screen.getByRole('button', { name: '6' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '7' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '8' })).toBeTruthy();

    // Should show pass button
    expect(screen.getByRole('button', { name: 'Pass' })).toBeTruthy();
  });

  it('calls onBid with correct amount when bid button is clicked', async () => {
    const onBid = vi.fn();
    const onPass = vi.fn();

    render(
      <BiddingPanel
        viewModel={makeViewModel()}
        serverState={makeServerState()}
        legalActions={[{ type: 'bid', amount: 7 }, { type: 'pass' }]}
        onBid={onBid}
        onPass={onPass}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: '7' }));
    expect(onBid).toHaveBeenCalledWith(7);
  });

  it('calls onPass when pass button is clicked', async () => {
    const onBid = vi.fn();
    const onPass = vi.fn();

    render(
      <BiddingPanel
        viewModel={makeViewModel()}
        serverState={makeServerState()}
        legalActions={[{ type: 'bid', amount: 6 }, { type: 'pass' }]}
        onBid={onBid}
        onPass={onPass}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Pass' }));
    expect(onPass).toHaveBeenCalled();
  });

  it('shows waiting message when it is not your turn', () => {
    // Current turn is east (Bob), not south (you)
    const vm = makeViewModel({
      currentTurnAbsolute: 'east',
      players: basePlayers.map((p) => ({
        ...p,
        isCurrentTurn: p.absolutePosition === 'east',
      })) as GameViewModel['players'],
    });

    render(
      <BiddingPanel
        viewModel={vm}
        serverState={makeServerState({ current_player: 'east' })}
        legalActions={[]}
        onBid={vi.fn()}
        onPass={vi.fn()}
      />,
    );

    expect(screen.getByText('Waiting for Bob to bid...')).toBeTruthy();
  });

  it('shows current bid and bidder name when bids exist', () => {
    render(
      <BiddingPanel
        viewModel={makeViewModel()}
        serverState={makeServerState({
          current_bid: 8,
          bid_winner: 'east',
          bids: { east: 8, north: 'pass' } as ServerGameState['bids'],
        })}
        legalActions={[{ type: 'bid', amount: 9 }, { type: 'pass' }]}
        onBid={vi.fn()}
        onPass={vi.fn()}
      />,
    );

    // Current bid amount
    expect(screen.getByText('8')).toBeTruthy();
    // Bidder name
    expect(screen.getByText('Bob')).toBeTruthy();
    // Bid history
    expect(screen.getByText(/Alice: Pass/)).toBeTruthy();
  });
});
