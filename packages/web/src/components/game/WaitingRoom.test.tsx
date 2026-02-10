import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WaitingRoom } from './WaitingRoom';

function makePlayerMeta(overrides: Record<string, unknown> = {}) {
  const empty = {
    playerId: null,
    username: null,
    isYou: false,
    isTeammate: false,
    isOpponent: false,
    isConnected: false,
  };
  return {
    north: { position: 'north', ...empty, ...overrides },
    east: { position: 'east', ...empty },
    south: { position: 'south', ...empty },
    west: { position: 'west', ...empty },
  } as never;
}

describe('WaitingRoom', () => {
  it('shows room code and waiting status', () => {
    render(<WaitingRoom roomCode="ABC123" playerMeta={makePlayerMeta()} onLeave={vi.fn()} />);

    expect(screen.getByText('ABC123')).toBeTruthy();
    expect(screen.getByText('Room Code')).toBeTruthy();
    expect(screen.getByText('Waiting for players... (0/4)')).toBeTruthy();
  });

  it('shows player name and You badge for occupied seats', () => {
    const meta = {
      north: {
        position: 'north',
        playerId: 'p1',
        username: 'Alice',
        isYou: true,
        isTeammate: false,
        isOpponent: false,
        isConnected: true,
      },
      east: {
        position: 'east',
        playerId: null,
        username: null,
        isYou: false,
        isTeammate: false,
        isOpponent: false,
        isConnected: false,
      },
      south: {
        position: 'south',
        playerId: null,
        username: null,
        isYou: false,
        isTeammate: false,
        isOpponent: false,
        isConnected: false,
      },
      west: {
        position: 'west',
        playerId: null,
        username: null,
        isYou: false,
        isTeammate: false,
        isOpponent: false,
        isConnected: false,
      },
    } as never;

    render(<WaitingRoom roomCode="XYZ" playerMeta={meta} onLeave={vi.fn()} />);

    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('You')).toBeTruthy();
    expect(screen.getByText('Waiting for players... (1/4)')).toBeTruthy();
  });

  it('shows DC badge and dims disconnected players', () => {
    const meta = {
      north: {
        position: 'north',
        playerId: 'p1',
        username: 'Alice',
        isYou: false,
        isTeammate: false,
        isOpponent: false,
        isConnected: false, // Disconnected!
      },
      east: {
        position: 'east',
        playerId: null,
        username: null,
        isYou: false,
        isTeammate: false,
        isOpponent: false,
        isConnected: false,
      },
      south: {
        position: 'south',
        playerId: null,
        username: null,
        isYou: false,
        isTeammate: false,
        isOpponent: false,
        isConnected: false,
      },
      west: {
        position: 'west',
        playerId: null,
        username: null,
        isYou: false,
        isTeammate: false,
        isOpponent: false,
        isConnected: false,
      },
    } as never;

    render(<WaitingRoom roomCode="XYZ" playerMeta={meta} onLeave={vi.fn()} />);

    // Disconnected player should show DC badge
    expect(screen.getByText('DC')).toBeTruthy();
    // Seat slot should be dimmed (opacity-50 class)
    expect(screen.getByText('Alice').closest('[class*="opacity-50"]')).toBeTruthy();
  });

  it('calls onLeave when Leave Room button is clicked', async () => {
    const onLeave = vi.fn();
    render(<WaitingRoom roomCode="ABC" playerMeta={makePlayerMeta()} onLeave={onLeave} />);

    await userEvent.click(screen.getByRole('button', { name: 'Leave Room' }));
    expect(onLeave).toHaveBeenCalled();
  });

  it('shows Game starting message when all 4 seats are filled', () => {
    const filledMeta = {
      north: {
        position: 'north',
        playerId: 'p1',
        username: 'Alice',
        isYou: true,
        isTeammate: false,
        isOpponent: false,
        isConnected: true,
      },
      east: {
        position: 'east',
        playerId: 'p2',
        username: 'Bob',
        isYou: false,
        isTeammate: true,
        isOpponent: false,
        isConnected: true,
      },
      south: {
        position: 'south',
        playerId: 'p3',
        username: 'Carol',
        isYou: false,
        isTeammate: false,
        isOpponent: true,
        isConnected: true,
      },
      west: {
        position: 'west',
        playerId: 'p4',
        username: 'Dave',
        isYou: false,
        isTeammate: false,
        isOpponent: true,
        isConnected: true,
      },
    } as never;

    render(<WaitingRoom roomCode="XYZ" playerMeta={filledMeta} onLeave={vi.fn()} />);

    expect(screen.getByText('Game starting...')).toBeTruthy();
  });
});
