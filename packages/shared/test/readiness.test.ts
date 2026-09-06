import { beforeEach, describe, expect, test } from 'bun:test';
import { roomWithReadiness, useGameStore } from '../src/stores/game';
import type { Position, ReadinessSnapshot, Room } from '../src/types/lobby';

const positions: Position[] = ['north', 'east', 'south', 'west'];
const room: Room = {
  code: 'TEST',
  id: 'room-1',
  status: 'waiting',
  positions: { north: 'a', east: 'b', south: 'c', west: 'd' },
};
function snapshot(revision: number, ready: Position[] = []): ReadinessSnapshot {
  return {
    room_id: 'room-1',
    ready_epoch: 4,
    snapshot_revision: revision,
    status: 'waiting',
    positions: room.positions!,
    ready_players: ready,
    seats: Object.fromEntries(
      positions.map((pos) => [
        pos,
        {
          occupant_type: 'human',
          status: 'connected',
          user_id: room.positions![pos],
        },
      ]),
    ) as ReadinessSnapshot['seats'],
  };
}

beforeEach(() => {
  useGameStore.getState().reset();
  useGameStore.getState().initFromRoom({ room, youPlayerId: 'a' });
});

describe('authoritative readiness snapshots', () => {
  test('in-game hydration does not overwrite seat lifecycle metadata', () => {
    useGameStore.getState().setSeatStatus('east', 'permanent_bot', 'Substitute');
    useGameStore.getState().setReadiness({ ...snapshot(10), status: 'playing' });
    expect(useGameStore.getState().playerMeta.east.seatStatus).toBe('permanent_bot');
    expect(useGameStore.getState().playerMeta.east.username).toBe('Substitute');
  });

  test('hydrates confirmations and ignores older/equal snapshots, even within one epoch', () => {
    const store = useGameStore.getState();
    store.setReadiness(snapshot(6, ['east', 'north']));
    store.setReadiness(snapshot(5, ['east']));
    store.setReadiness(snapshot(6, []));
    expect(useGameStore.getState().readyPlayers).toEqual(['east', 'north']);
  });

  test('a reset replaces rather than appends readiness and stale HTTP cannot restore the roster', () => {
    const store = useGameStore.getState();
    store.setReadiness(snapshot(6, ['north', 'east']));
    const reset = snapshot(7);
    reset.ready_epoch = 7;
    reset.positions = { ...reset.positions, east: 'replacement' };
    reset.seats.east.user_id = 'replacement';
    store.setReadiness(reset);
    store.initFromRoom({ room, youPlayerId: 'a' });
    expect(useGameStore.getState().readyPlayers).toEqual([]);
    expect(useGameStore.getState().playerMeta.east.playerId).toBe('replacement');
    expect(roomWithReadiness(room, reset).seats?.[1].player?.id).toBe('replacement');
  });

  test('disconnect/reconnect hydration stays pending until the server confirms', () => {
    const disconnected = snapshot(8);
    disconnected.seats.north.status = 'reconnecting';
    useGameStore.getState().setReadiness(disconnected);
    expect(useGameStore.getState().playerMeta.north.isConnected).toBe(false);
    useGameStore.getState().setReadiness(snapshot(9));
    expect(useGameStore.getState().playerMeta.north.isConnected).toBe(true);
    expect(useGameStore.getState().readyPlayers).toEqual([]);
  });

  test('removed viewers lose their position; bot readiness comes only from the server', () => {
    const next = snapshot(8, ['east']);
    next.positions = { ...next.positions, north: null };
    next.seats.east.occupant_type = 'bot';
    useGameStore.getState().setReadiness(next);
    useGameStore.getState().initFromRoom({ room, youPlayerId: 'a' });
    expect(useGameStore.getState().youPositionAbs).toBeNull();
    expect(useGameStore.getState().readyPlayers).toEqual(['east']);
  });
});
