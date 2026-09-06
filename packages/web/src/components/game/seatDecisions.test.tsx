import { type SeatLifecycleSnapshot, useGameStore, useSeatDecisions } from '@pidro/shared';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function snapshot(revision = 1): SeatLifecycleSnapshot {
  return {
    room_id: 'instance-1',
    room_code: 'TEST',
    revision,
    owner_id: 'you',
    room_status: 'playing',
    seats: {
      north: {
        status: 'permanent_bot',
        player_id: null,
        username: 'Bot',
        decision: { id: 'n1', player_name: 'Nora' },
      },
      east: {
        status: 'permanent_bot',
        player_id: null,
        username: 'Bot',
        decision: { id: 'e1', player_name: 'Eli' },
      },
      south: { status: 'normal', player_id: 'you', username: 'You', decision: null },
      west: {
        status: 'permanent_bot',
        player_id: null,
        username: 'Bot',
        decision: { id: 'w1', player_name: 'Wynn' },
      },
    },
  };
}

beforeEach(() => {
  useGameStore.getState().reset();
  useGameStore.setState({
    roomCode: 'TEST',
    youPlayerId: 'you',
    youPositionAbs: 'south',
    role: 'player',
    isChannelJoined: true,
  });
  useGameStore.getState().applySeatLifecycle(snapshot());
});
afterEach(cleanup);

describe('authoritative lifecycle and owner decisions', () => {
  it('hydrates each lifecycle state without prior events and ignores stale snapshots and lobby updates', () => {
    const value = snapshot(2);
    value.seats.north = {
      status: 'reconnecting',
      username: 'Nora',
      player_id: 'n',
      decision: null,
    };
    value.seats.east = {
      status: 'bot_substitute',
      username: 'Eli',
      player_id: 'e',
      decision: null,
    };
    value.seats.west = { status: 'vacant', username: null, player_id: null, decision: null };
    useGameStore.getState().applySeatLifecycle(value);
    useGameStore.getState().applySeatLifecycle(snapshot(1));
    useGameStore
      .getState()
      .initFromRoom({ room: { code: 'TEST', status: 'playing' }, youPlayerId: 'you' });
    useGameStore.getState().setSeatStatus('east', 'normal', 'Wrong');
    expect(useGameStore.getState().playerMeta.east).toMatchObject({
      username: 'Eli',
      playerId: 'e',
      seatStatus: 'bot_substitute',
    });
    expect(useGameStore.getState().playerMeta.north.seatStatus).toBe('reconnecting');
    expect(useGameStore.getState().playerMeta.west.seatStatus).toBe('vacant');
    expect(useGameStore.getState().lifecycle).toBe(value);
  });

  it('queues three departures and never reopens a dismissed generation on replay/rejoin', () => {
    const { result } = renderHook(() => useSeatDecisions(vi.fn(), vi.fn()));
    expect(result.current.pendingCount).toBe(3);
    expect(result.current.decision?.playerName).toBe('Nora');
    act(() => result.current.keepBot());
    act(() => {
      useGameStore.getState().setChannelStatus(false);
      useGameStore.getState().applySeatLifecycle(snapshot(2));
      useGameStore.getState().setChannelStatus(true);
    });
    expect(result.current.pendingCount).toBe(2);
    expect(result.current.decision?.position).toBe('east');
    const next = snapshot(3);
    next.seats.north.decision = { id: 'n2', player_name: 'New Nora' };
    act(() => useGameStore.getState().applySeatLifecycle(next));
    expect(result.current.pendingCount).toBe(3);
    expect(result.current.decision?.position).toBe('east'); // does not replace an unresolved prompt
  });

  it('invalidates decisions on ownership, reclaim, substitute join, room exit and own turn', () => {
    const { result } = renderHook(() => useSeatDecisions(vi.fn(), vi.fn()));
    act(() => useGameStore.getState().applySeatLifecycle({ ...snapshot(2), owner_id: 'other' }));
    expect(result.current.decision).toBeNull();
    act(() => useGameStore.getState().applySeatLifecycle(snapshot(3)));
    expect(result.current.pendingCount).toBe(3);
    const next = snapshot(4);
    next.seats.north = { status: 'normal', player_id: 'n2', username: 'New human', decision: null };
    act(() => useGameStore.getState().applySeatLifecycle(next));
    expect(result.current.pendingCount).toBe(2);
    act(() =>
      useGameStore.getState().setServerState({ phase: 'playing', current_player: 'south' }),
    );
    expect(result.current.decision).toBeNull();
    act(() => useGameStore.getState().updateCurrentTurn('north'));
    expect(result.current.decision?.position).toBe('east');
    act(() => useGameStore.getState().reset());
    expect(result.current.decision).toBeNull();
  });

  it('opens only the displayed generation, coalesces clicks, and keeps failures retryable inline', async () => {
    let reject!: (error: unknown) => void;
    const push = vi.fn(
      () =>
        new Promise<void>((_resolve, fail) => {
          reject = fail;
        }),
    );
    const refresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useSeatDecisions(push, refresh));
    let opening!: Promise<void>;
    act(() => {
      opening = result.current.openSeat();
      result.current.openSeat();
    });
    expect(push).toHaveBeenCalledExactlyOnceWith('open_seat', {
      position: 'north',
      decision_id: 'n1',
    });
    expect(result.current.busy).toBe(true);
    await act(async () => {
      reject({ reason: 'Try again' });
      await opening;
    });
    expect(result.current.error).toBe('Try again');
    expect(result.current.busy).toBe(false);
    expect(result.current.decision?.position).toBe('north');
    expect(refresh).toHaveBeenCalledOnce();
    push.mockResolvedValueOnce(undefined);
    await act(() => result.current.openSeat());
    expect(result.current.decision?.position).toBe('east');
  });

  it('a late action completion cannot dismiss a new generation in that seat', async () => {
    let resolve!: () => void;
    const push = vi.fn(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    );
    const { result } = renderHook(() =>
      useSeatDecisions(push, vi.fn().mockResolvedValue(undefined)),
    );
    let opening!: Promise<void>;
    act(() => {
      opening = result.current.openSeat();
    });
    const next = snapshot(2);
    next.seats.north.decision = { id: 'n2', player_name: 'New player' };
    act(() => useGameStore.getState().applySeatLifecycle(next));
    await act(async () => {
      resolve();
      await opening;
    });
    expect(result.current.decision?.id).toBe('n2');
    expect(result.current.pendingCount).toBe(3);
  });
});
