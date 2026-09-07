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

function makeFilledMeta() {
  return {
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
        isConnected: false,
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

    expect(screen.getByText('DC')).toBeTruthy();
    expect(screen.getByText('Alice').closest('[class*="opacity-50"]')).toBeTruthy();
  });

  it('calls onLeave when Leave Room button is clicked', async () => {
    const onLeave = vi.fn();
    render(<WaitingRoom roomCode="ABC" playerMeta={makePlayerMeta()} onLeave={onLeave} />);

    await userEvent.click(screen.getByRole('button', { name: 'Leave Room' }));
    expect(onLeave).toHaveBeenCalled();
  });

  it('waits for confirmations when all 4 seats are filled', () => {
    render(<WaitingRoom roomCode="XYZ" playerMeta={makeFilledMeta()} onLeave={vi.fn()} />);

    expect(screen.getByText(/0\/4 ready/)).toBeTruthy();
    expect(screen.queryByText('Game starting...')).toBeNull();
  });

  it('shows Ready button when room is full and onReady is provided', () => {
    render(
      <WaitingRoom
        roomCode="XYZ"
        playerMeta={makeFilledMeta()}
        readyPlayers={[]}
        youPosition="north"
        onReady={vi.fn()}
        onLeave={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: "I'm ready" })).toBeTruthy();
  });

  it('calls onReady when Ready button is clicked', async () => {
    const onReady = vi.fn();
    render(
      <WaitingRoom
        roomCode="XYZ"
        playerMeta={makeFilledMeta()}
        readyPlayers={[]}
        youPosition="north"
        onReady={onReady}
        onLeave={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: "I'm ready" }));
    expect(onReady).toHaveBeenCalled();
  });

  it('disables Ready button when player is already ready', () => {
    render(
      <WaitingRoom
        roomCode="XYZ"
        playerMeta={makeFilledMeta()}
        readyPlayers={['north']}
        youPosition="north"
        onReady={vi.fn()}
        onLeave={vi.fn()}
      />,
    );

    const readyButton = screen.getByRole('button', { name: "You're ready" });
    expect(readyButton).toBeTruthy();
    expect((readyButton as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows Ready badge for other players who are ready', () => {
    render(
      <WaitingRoom
        roomCode="XYZ"
        playerMeta={makeFilledMeta()}
        readyPlayers={['east']}
        youPosition="north"
        onReady={vi.fn()}
        onLeave={vi.fn()}
      />,
    );

    const readyElements = screen.getAllByText('Ready');
    expect(readyElements.length).toBe(1);
    expect(screen.getAllByText('Pending')).toHaveLength(3);
  });

  it('does not show Ready button when room is not full', () => {
    render(
      <WaitingRoom
        roomCode="XYZ"
        playerMeta={makePlayerMeta({ playerId: 'p1', username: 'Alice', isYou: true })}
        readyPlayers={[]}
        youPosition="north"
        onReady={vi.fn()}
        onLeave={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: "I'm ready" })).toBeNull();
  });

  it('does not submit while channel hydration or reconnect is pending', async () => {
    const onReady = vi.fn();
    render(
      <WaitingRoom
        roomCode="XYZ"
        playerMeta={makeFilledMeta()}
        onReady={onReady}
        readyDisabled
        onLeave={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: "I'm ready" }));
    expect(onReady).not.toHaveBeenCalled();
  });

  it('uses spectator role over stale roster identity', () => {
    render(
      <WaitingRoom
        roomCode="XYZ"
        playerMeta={makePlayerMeta({ playerId: 'p1', username: 'Alice', isYou: true })}
        viewerRole="spectator"
        onReady={vi.fn()}
        onLeave={vi.fn()}
      />,
    );

    expect(screen.getByText('Watching')).toBeInTheDocument();
    expect(screen.queryByText('You')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: "I'm ready" })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to lobby' })).toBeInTheDocument();
  });
});
