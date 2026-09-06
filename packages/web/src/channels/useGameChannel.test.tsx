import { type SeatLifecycleSnapshot, useGameStore } from '@pidro/shared';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { refreshSeatLifecycle, useGameChannel } from './useGameChannel';

class MockPush {
  private callbacks = new Map<string, (payload: unknown) => void>();

  receive(status: string, callback: (payload: unknown) => void) {
    this.callbacks.set(status, callback);
    return this;
  }

  trigger(status: string, payload: unknown) {
    this.callbacks.get(status)?.(payload);
  }
}

class MockChannel {
  joinPush = new MockPush();
  eventHandlers = new Map<string, (payload: unknown) => void>();
  errorHandler: (() => void) | null = null;
  closeHandler: (() => void) | null = null;
  leave = vi.fn(() => {
    this.closeHandler?.();
  });
  push = vi.fn(() => new MockPush());

  join() {
    return this.joinPush;
  }

  on(event: string, callback: (payload: unknown) => void) {
    this.eventHandlers.set(event, callback);
  }

  onError(callback: () => void) {
    this.errorHandler = callback;
  }

  onClose(callback: () => void) {
    this.closeHandler = callback;
  }

  emit(event: string, payload: unknown) {
    this.eventHandlers.get(event)?.(payload);
  }
}

let currentChannel: MockChannel | null = null;
const mockChannelFactory = vi.fn((_topic?: string) => {
  currentChannel = new MockChannel();
  return currentChannel;
});

vi.mock('./socket', () => ({
  phoenixSocket: {
    channel: (topic: string) => mockChannelFactory(topic),
  },
}));

function gameState(phase: 'dealer_selection' | 'bidding' | 'playing' = 'bidding') {
  return {
    phase,
    current_player: 'south',
    players: {
      north: {},
      east: {},
      south: {},
      west: {},
    },
  };
}

function buildPlayerMeta() {
  return {
    north: {
      position: 'north' as const,
      playerId: 'north-id',
      username: 'North',
      isYou: false,
      isTeammate: false,
      isOpponent: true,
      isConnected: true,
      seatStatus: 'normal' as const,
    },
    east: {
      position: 'east' as const,
      playerId: 'east-id',
      username: 'Casey',
      isYou: false,
      isTeammate: false,
      isOpponent: true,
      isConnected: true,
      seatStatus: 'normal' as const,
    },
    south: {
      position: 'south' as const,
      playerId: 'south-id',
      username: 'You',
      isYou: true,
      isTeammate: false,
      isOpponent: false,
      isConnected: true,
      seatStatus: 'normal' as const,
    },
    west: {
      position: 'west' as const,
      playerId: 'west-id',
      username: 'West',
      isYou: false,
      isTeammate: true,
      isOpponent: false,
      isConnected: true,
      seatStatus: 'normal' as const,
    },
  };
}

beforeEach(() => {
  useGameStore.getState().reset();
  currentChannel = null;
  mockChannelFactory.mockClear();
});

afterEach(() => {
  cleanup();
});

describe('useGameChannel', () => {
  it('hydrates missed lifecycle state, deduplicates live takeover notices, and ignores legacy regression', async () => {
    useGameStore.setState({ roomCode: 'ABCD', youPlayerId: 'south-id' });
    const initial: SeatLifecycleSnapshot = {
      room_id: 'room1',
      room_code: 'ABCD',
      revision: 1,
      owner_id: 'south-id',
      room_status: 'playing',
      seats: {
        north: { status: 'reconnecting', player_id: 'north-id', username: 'Nora', decision: null },
        east: { status: 'normal', player_id: 'east-id', username: 'Eli', decision: null },
        south: { status: 'normal', player_id: 'south-id', username: 'You', decision: null },
        west: { status: 'vacant', player_id: null, username: null, decision: null },
      },
    };
    const onSeatEvent = vi.fn();
    const { unmount } = renderHook(() => useGameChannel({ roomCode: 'ABCD', onSeatEvent }));
    act(() =>
      currentChannel?.joinPush.trigger('ok', {
        seat_lifecycle: initial,
        position: 'south',
        role: 'player',
      }),
    );
    expect(useGameStore.getState().playerMeta.north.seatStatus).toBe('reconnecting');
    expect(useGameStore.getState().playerMeta.west.seatStatus).toBe('vacant');
    expect(onSeatEvent).not.toHaveBeenCalled();
    const takeover = structuredClone(initial);
    takeover.revision = 2;
    takeover.seats.north.status = 'bot_substitute';
    takeover.seats.east = {
      status: 'permanent_bot',
      player_id: null,
      username: 'Bot',
      decision: { id: 'e1', player_name: 'Eli' },
    };
    act(() => {
      currentChannel?.emit('seat_lifecycle', takeover);
      currentChannel?.emit('seat_lifecycle', structuredClone(takeover));
      currentChannel?.emit('seat_lifecycle', initial);
      currentChannel?.emit('player_reconnected', { position: 'east', user_id: 'east-id' });
      currentChannel?.emit('bot_substitute_active', { position: 'north' });
    });
    expect(onSeatEvent).toHaveBeenCalledTimes(2);
    expect(onSeatEvent.mock.calls[1][0].message).toContain('Eli (east)');
    expect(useGameStore.getState().playerMeta.east.seatStatus).toBe('permanent_bot');
    const reclaimed = structuredClone(takeover);
    reclaimed.revision = 3;
    reclaimed.seats.north.status = 'normal';
    act(() => currentChannel?.emit('seat_lifecycle', reclaimed));
    expect(onSeatEvent).toHaveBeenCalledTimes(3);
    expect(useGameStore.getState().playerMeta.north).toMatchObject({
      playerId: 'north-id',
      username: 'Nora',
      seatStatus: 'normal',
    });
    // An action reply can overtake the corresponding broadcast. It must not
    // swallow the notice, nor let the later duplicate produce a second one.
    const next = structuredClone(reclaimed);
    next.revision = 4;
    next.seats.north.status = 'bot_substitute';
    await act(async () => {
      const refresh = refreshSeatLifecycle();
      const replies = currentChannel?.push.mock.results ?? [];
      replies[replies.length - 1]?.value.trigger('ok', { seat_lifecycle: next });
      await refresh;
      currentChannel?.emit('seat_lifecycle', structuredClone(next));
    });
    expect(onSeatEvent).toHaveBeenCalledTimes(4);
    const oldChannel = currentChannel;
    unmount();
    act(() => oldChannel?.emit('seat_lifecycle', { ...initial, revision: 100 }));
    expect(useGameStore.getState().lifecycle?.revision).toBe(4);
  });

  it('hydrates the turn timer from the join payload', () => {
    const { unmount } = renderHook(() => useGameChannel({ roomCode: 'ABCD', enabled: true }));

    expect(mockChannelFactory).toHaveBeenCalledWith('game:ABCD');

    act(() => {
      currentChannel?.joinPush.trigger('ok', {
        role: 'player',
        position: 'south',
        state: gameState(),
        legal_actions: [],
        turn_timer: {
          timer_id: 10,
          scope: 'seat',
          position: 'south',
          phase: 'bidding',
          duration_ms: 30_000,
          transition_delay_ms: 1_500,
          remaining_ms: 18_250,
          server_time: '2026-03-11T12:34:56.789Z',
          event_seq: 42,
        },
      });
    });

    const state = useGameStore.getState();
    expect(state.youPositionAbs).toBe('south');
    expect(state.turnTimer).toMatchObject({
      timerId: 10,
      scope: 'seat',
      position: 'south',
      phase: 'bidding',
      durationMs: 30_000,
      transitionDelayMs: 1_500,
      remainingMs: 18_250,
      eventSeq: 42,
    });
    expect(mockChannelFactory).toHaveBeenCalledTimes(1);

    unmount();
  });

  it('records the authoritative game-over winner', () => {
    const { unmount } = renderHook(() => useGameChannel({ roomCode: 'ABCD', enabled: true }));

    act(() => {
      currentChannel?.joinPush.trigger('ok', {
        role: 'player',
        position: 'south',
        state: gameState('playing'),
        legal_actions: [],
        turn_timer: null,
      });
      currentChannel?.emit('game_over', {
        winner: 'east_west',
        scores: { north_south: 65, east_west: 62 },
      });
    });

    expect(useGameStore.getState().serverState).toMatchObject({
      phase: 'game_over',
      winner: 'east_west',
      scores: { north_south: 65, east_west: 62 },
    });

    unmount();
  });

  it('auto-triggers dealer selection from the north player', () => {
    const { unmount } = renderHook(() => useGameChannel({ roomCode: 'ABCD', enabled: true }));

    act(() => {
      currentChannel?.joinPush.trigger('ok', {
        role: 'player',
        position: 'north',
        state: {
          ...gameState('dealer_selection'),
          hand_number: 1,
          dealer_selection_cuts: null,
        },
        legal_actions: [{ type: 'select_dealer' }],
        turn_timer: null,
      });
    });

    expect(currentChannel?.push).toHaveBeenCalledWith('select_dealer', {});

    unmount();
  });

  it('updates and clears the timer from live timer events', () => {
    const { unmount } = renderHook(() => useGameChannel({ roomCode: 'ABCD', enabled: true }));

    act(() => {
      currentChannel?.joinPush.trigger('ok', {
        role: 'player',
        position: 'south',
        state: gameState(),
        legal_actions: [],
        turn_timer: null,
      });
    });

    act(() => {
      currentChannel?.emit('turn_timer_started', {
        timer_id: 11,
        scope: 'seat',
        position: 'south',
        phase: 'playing',
        duration_ms: 30_000,
        transition_delay_ms: 1_500,
        server_time: '2026-03-11T12:34:56.789Z',
        event_seq: 43,
      });
    });

    expect(useGameStore.getState().turnTimer).toMatchObject({
      timerId: 11,
      position: 'south',
      phase: 'playing',
      remainingMs: 31_500,
    });

    act(() => {
      currentChannel?.emit('turn_timer_cancelled', { timer_id: 11, reason: 'acted' });
    });

    expect(useGameStore.getState().turnTimer).toBeNull();

    unmount();
  });

  it('surfaces timeout auto-play for the current player and handles forced disconnects', () => {
    const onSeatEvent = vi.fn();
    const { unmount } = renderHook(() =>
      useGameChannel({
        roomCode: 'ABCD',
        enabled: true,
        onSeatEvent,
      }),
    );

    act(() => {
      currentChannel?.joinPush.trigger('ok', {
        role: 'player',
        position: 'south',
        state: gameState(),
        legal_actions: [],
        turn_timer: {
          timer_id: 12,
          scope: 'seat',
          position: 'south',
          phase: 'bidding',
          duration_ms: 30_000,
          transition_delay_ms: 0,
          remaining_ms: 12_000,
          server_time: '2026-03-11T12:34:56.789Z',
          event_seq: 44,
        },
      });
    });

    act(() => {
      currentChannel?.emit('turn_auto_played', {
        scope: 'seat',
        position: 'south',
        phase: 'bidding',
        action: { type: 'pass' },
        reason: 'timeout',
      });
    });

    expect(onSeatEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'warning',
        message: expect.stringContaining('server passed for you'),
      }),
    );

    act(() => {
      currentChannel?.emit('force_disconnect', { reason: 'timeout_threshold' });
    });

    const state = useGameStore.getState();
    expect(state.turnTimer).toBeNull();
    expect(state.isChannelJoined).toBe(false);
    expect(state.lastError).toContain('inactivity');

    unmount();
  });

  it('updates seat lifecycle states without noisy reconnect toasts', () => {
    useGameStore.setState({ playerMeta: buildPlayerMeta() });
    const onSeatEvent = vi.fn();

    const { unmount } = renderHook(() =>
      useGameChannel({
        roomCode: 'ABCD',
        enabled: true,
        onSeatEvent,
      }),
    );

    act(() => {
      currentChannel?.joinPush.trigger('ok', {
        role: 'player',
        position: 'south',
        state: gameState(),
        legal_actions: [],
        turn_timer: null,
      });
    });

    act(() => {
      currentChannel?.emit('player_reconnecting', { position: 'east' });
    });

    let state = useGameStore.getState();
    expect(state.playerMeta.east.seatStatus).toBe('reconnecting');
    expect(onSeatEvent).not.toHaveBeenCalled();

    act(() => {
      currentChannel?.emit('bot_substitute_active', { position: 'east' });
    });

    state = useGameStore.getState();
    expect(state.playerMeta.east.seatStatus).toBe('bot_substitute');
    expect(state.playerMeta.east.isConnected).toBe(true);
    expect(onSeatEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'warning',
        message: expect.stringContaining('disconnected. Bot is filling in.'),
      }),
    );

    act(() => {
      currentChannel?.emit('substitute_available', { position: 'east' });
    });

    state = useGameStore.getState();
    expect(state.playerMeta.east.seatStatus).toBe('vacant');
    expect(state.playerMeta.east.isConnected).toBe(false);

    act(() => {
      currentChannel?.emit('substitute_seat_closed', { position: 'east' });
    });

    state = useGameStore.getState();
    expect(state.playerMeta.east.seatStatus).toBe('permanent_bot');
    expect(state.playerMeta.east.isConnected).toBe(true);

    act(() => {
      currentChannel?.emit('player_reclaimed_seat', { position: 'east' });
    });

    expect(useGameStore.getState().playerMeta.east.seatStatus).toBe('normal');
    expect(onSeatEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'success',
        message: expect.stringContaining('is back!'),
      }),
    );

    unmount();
  });

  it('reuses a single channel subscription when multiple consumers mount the same room', () => {
    const first = renderHook(() => useGameChannel({ roomCode: 'ABCD', enabled: true }));
    const second = renderHook(() => useGameChannel({ roomCode: 'ABCD', enabled: true }));

    expect(mockChannelFactory).toHaveBeenCalledTimes(1);

    first.unmount();
    second.unmount();
  });
});
