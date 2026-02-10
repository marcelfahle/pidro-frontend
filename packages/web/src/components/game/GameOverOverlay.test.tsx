import type { GameViewModel, ServerGameState } from '@pidro/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GameOverOverlay } from './GameOverOverlay';

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
    isCurrentTurn: false,
  },
] as GameViewModel['players'];

function makeViewModel(overrides: Partial<GameViewModel> = {}): GameViewModel {
  return {
    roomCode: 'ABC',
    phase: 'game_over',
    trumpSuit: 'hearts',
    dealerAbsolute: 'north',
    dealerRelative: 'north',
    currentTurnAbsolute: null,
    currentTurnRelative: null,
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

function makeServerState(scores: { north_south: number; east_west: number }): ServerGameState {
  return {
    phase: 'game_over',
    current_player: null,
    players: emptyPlayers,
    scores,
  };
}

describe('GameOverOverlay', () => {
  it('shows winner announcement when North/South wins and you are on that team', () => {
    render(
      <GameOverOverlay
        viewModel={makeViewModel()}
        serverState={makeServerState({ north_south: 62, east_west: 38 })}
        onBackToLobby={vi.fn()}
        onPlayAgain={vi.fn()}
      />,
    );

    expect(screen.getByText('You win!')).toBeTruthy();
    expect(screen.getByText('North / South wins!')).toBeTruthy();
    expect(screen.getByText('62')).toBeTruthy();
    expect(screen.getByText('38')).toBeTruthy();
  });

  it('shows loss message when your team loses', () => {
    render(
      <GameOverOverlay
        viewModel={makeViewModel()}
        serverState={makeServerState({ north_south: 30, east_west: 62 })}
        onBackToLobby={vi.fn()}
        onPlayAgain={vi.fn()}
      />,
    );

    expect(screen.getByText('You lose')).toBeTruthy();
    expect(screen.getByText('East / West wins!')).toBeTruthy();
  });

  it('shows navigation buttons', () => {
    render(
      <GameOverOverlay
        viewModel={makeViewModel()}
        serverState={makeServerState({ north_south: 62, east_west: 38 })}
        onBackToLobby={vi.fn()}
        onPlayAgain={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Back to Lobby' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Play Again' })).toBeTruthy();
  });

  it('calls onBackToLobby when Back to Lobby is clicked', async () => {
    const onBackToLobby = vi.fn();

    render(
      <GameOverOverlay
        viewModel={makeViewModel()}
        serverState={makeServerState({ north_south: 62, east_west: 38 })}
        onBackToLobby={onBackToLobby}
        onPlayAgain={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Back to Lobby' }));
    expect(onBackToLobby).toHaveBeenCalled();
  });

  it('calls onPlayAgain when Play Again is clicked', async () => {
    const onPlayAgain = vi.fn();

    render(
      <GameOverOverlay
        viewModel={makeViewModel()}
        serverState={makeServerState({ north_south: 62, east_west: 38 })}
        onBackToLobby={vi.fn()}
        onPlayAgain={onPlayAgain}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Play Again' }));
    expect(onPlayAgain).toHaveBeenCalled();
  });
});
