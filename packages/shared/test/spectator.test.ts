import { afterEach, expect, test } from 'bun:test';
import { useGameStore } from '../src/stores/game';
import type { SeatLifecycleSnapshot, ServerGameState } from '../src/types/game';
import type { ReadinessSnapshot, Room } from '../src/types/lobby';

const room: Room = {
  code: 'WATCH',
  status: 'playing',
  positions: { north: 'viewer', east: null, south: null, west: null },
};
const state: ServerGameState = {
  phase: 'playing',
  current_player: 'south',
  players: {
    north: { hand: [{ rank: 14, suit: 'spades' }] },
    east: {},
    south: {},
    west: {},
  },
};
afterEach(() => useGameStore.getState().reset());

test('spectator authority survives stale roster, readiness, position and private state writes', () => {
  const store = useGameStore.getState();
  store.initFromRoom({ room, youPlayerId: 'viewer' });
  store.setRole('player');
  store.setYouPosition('north');
  store.setServerState(state);
  store.setRole('spectator');
  const lifecycle: SeatLifecycleSnapshot = {
    room_code: room.code,
    room_id: 'room',
    revision: 1,
    owner_id: null,
    room_status: 'playing',
    seats: Object.fromEntries(
      Object.entries(room.positions!).map(([position, player_id]) => [
        position,
        {
          status: player_id ? 'normal' : 'vacant',
          player_id,
          username: player_id,
          decision: null,
        },
      ]),
    ) as SeatLifecycleSnapshot['seats'],
  };
  store.initFromRoom({ room, youPlayerId: 'viewer' });
  store.applySeatLifecycle(lifecycle);
  store.setReadiness({
    room_id: 'room',
    status: 'waiting',
    ready_epoch: 1,
    snapshot_revision: 1,
    positions: room.positions!,
    ready_players: [],
    seats: Object.fromEntries(
      Object.entries(room.positions!).map(([position, user_id]) => [
        position,
        {
          user_id,
          occupant_type: user_id ? 'human' : 'empty',
          status: 'connected',
        },
      ]),
    ) as ReadinessSnapshot['seats'],
  });
  store.setYouPosition('south');
  store.setServerState(state);
  store.setLegalActions([{ type: 'play_card', card: { rank: 14, suit: 'spades' } }]);
  expect(useGameStore.getState().youPositionAbs).toBeNull();
  expect(
    Object.values(useGameStore.getState().playerMeta).some(
      (p) => p.isYou || p.isTeammate || p.isOpponent,
    ),
  ).toBe(false);
  expect(useGameStore.getState().serverState?.players.north.hand).toBe(1);
  expect(useGameStore.getState().legalActions).toEqual([]);
  // A real role acknowledgement restores authority even at the same lifecycle revision.
  store.setRole('player');
  store.applySeatLifecycle(lifecycle);
  store.setYouPosition('east');
  expect(useGameStore.getState().playerMeta.east.isYou).toBe(true);
});

test('a new room invalidates the old role and private cache', () => {
  const store = useGameStore.getState();
  store.setRole('player');
  store.setServerState(state);
  store.initFromRoom({ room, youPlayerId: 'viewer' });
  expect(useGameStore.getState().role).toBeNull();
  expect(useGameStore.getState().serverState).toBeNull();
  expect(useGameStore.getState().youPositionAbs).toBeNull();
});
