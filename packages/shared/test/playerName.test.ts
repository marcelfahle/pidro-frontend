import { afterEach, expect, test } from 'bun:test';
import { publicPlayerName } from '../src/utils/playerName';
import { normalizeRoom } from '../src/utils/rooms';
import { roomWithReadiness, useGameStore } from '../src/stores/game';
import type { ReadinessSnapshot } from '../src/types/lobby';
import type { SeatLifecycleSnapshot } from '../src/types/game';

afterEach(() => useGameStore.getState().reset());

const accounts = [
  { id: 'ios1', username: 'mfios1', display_name: 'iOS 1' },
  { id: 'android1', username: 'mfand1', display_name: 'Android 1' },
  { id: 'ios2', username: 'mfios2', display_name: 'iOS 2' },
  { id: 'web1', username: 'mfweb1', display_name: 'Web 1' },
];
const positions = ['north', 'east', 'south', 'west'] as const;

test('public fallback never exposes display names or account IDs', () => {
  for (const name of [undefined, null, '', '   ']) {
    expect(publicPlayerName(name)).toBe('Player');
    expect(publicPlayerName(name, '')).toBe('');
  }
  expect(publicPlayerName('kettu_🦊')).toBe('kettu_🦊');
  const room = normalizeRoom({
    seats: { north: { user_id: 'stable-id', display_name: 'Anna' } },
  });
  expect(room.seats?.[0].player).toMatchObject({
    id: 'stable-id',
    username: '',
    display_name: 'Anna',
  });
});

test('missing names stay absent through room, readiness and lifecycle hydration', () => {
  const room = normalizeRoom({
    code: 'NAMES',
    seats: {
      north: { user_id: 'human' },
      east: { user_id: 'named', username: 'Player' },
      south: { occupant_type: 'bot' },
      west: { user_id: 'bot_named', username: 'Bot' },
    },
  });
  expect(room.seats?.map((seat) => seat.player?.username)).toEqual(['', 'Player', '', 'Bot']);
  const flat = normalizeRoom({ seats: [{ player_id: 'human' }, { player_id: 'bot_x', player_is_bot: true }] });
  expect(flat.seats?.map((seat) => seat.player?.username)).toEqual(['', '']);
  const store = useGameStore.getState();
  store.initFromRoom({ room, youPlayerId: 'viewer' });
  store.refreshPlayerIdentities(room);
  const names = () => positions.map((pos) => useGameStore.getState().playerMeta[pos].username || null);
  expect(names()).toEqual([null, 'Player', null, 'Bot']);
  const readiness: ReadinessSnapshot = {
    room_id: 'names', ready_epoch: 1, snapshot_revision: 1, status: 'waiting',
    positions: room.positions!, ready_players: [],
    seats: Object.fromEntries(positions.map((pos, i) => [pos, {
      user_id: room.positions![pos], username: i === 1 ? 'Player' : i === 3 ? 'Bot' : null,
      occupant_type: i >= 2 ? 'bot' : 'human', status: 'connected',
    }])) as ReadinessSnapshot['seats'],
  };
  store.setReadiness(readiness);
  expect(names()).toEqual([null, 'Player', null, 'Bot']);
  expect(roomWithReadiness(room, readiness).seats?.map((seat) => seat.player?.username)).toEqual(['', 'Player', '', 'Bot']);
  store.applySeatLifecycle({
    room_id: 'names', room_code: 'NAMES', revision: 1, owner_id: null, room_status: 'playing',
    seats: Object.fromEntries(positions.map((pos, i) => [pos, {
      player_id: room.positions![pos], username: readiness.seats[pos].username,
      status: i >= 2 ? 'permanent_bot' : 'normal', decision: null,
    }])) as SeatLifecycleSnapshot['seats'],
  });
  expect(names()).toEqual([null, 'Player', null, 'Bot']);
  expect(useGameStore.getState().lifecycle?.revision).toBe(1);
});

test('generated guest handles use the chosen public name without changing regular usernames', () => {
  expect(publicPlayerName('guest_7KQ4M2XB', 'Player', 'Anna')).toBe('Anna');
  expect(publicPlayerName('guest_7KQ4M2XB', 'Player', '  Kettu 🦊  ')).toBe('Kettu 🦊');
  expect(publicPlayerName('guest_7KQ4M2XB', 'Player', '   ')).toBe('guest_7KQ4M2XB');
  expect(publicPlayerName('mfios1', 'Player', 'iOS 1')).toBe('mfios1');

  const room = normalizeRoom({
    code: 'GUEST',
    seats: [
      {
        position: 'north',
        player: {
          id: 'guest-id',
          username: 'guest_7KQ4M2XB',
          display_name: 'Anna',
        },
      },
    ],
  });
  expect(room.seats?.[0].player).toMatchObject({
    id: 'guest-id',
    username: 'guest_7KQ4M2XB',
    display_name: 'Anna',
  });

  const store = useGameStore.getState();
  store.initFromRoom({
    room: {
      ...room,
      positions: { north: 'guest-id', east: null, south: null, west: null },
    },
    youPlayerId: 'guest-id',
  });
  expect(useGameStore.getState().playerMeta.north.username).toBe('Anna');
  store.setReadiness({
    room_id: 'GUEST',
    ready_epoch: 1,
    snapshot_revision: 1,
    status: 'waiting',
    positions: { north: 'guest-id', east: null, south: null, west: null },
    ready_players: [],
    seats: {
      north: {
        user_id: 'guest-id',
        username: 'guest_7KQ4M2XB',
        occupant_type: 'human',
        status: 'connected',
      },
      east: { user_id: null, occupant_type: 'vacant', status: 'vacant' },
      south: { user_id: null, occupant_type: 'vacant', status: 'vacant' },
      west: { user_id: null, occupant_type: 'vacant', status: 'vacant' },
    },
  });
  expect(useGameStore.getState().playerMeta.north.username).toBe('Anna');
});

test('REST, lobby, readiness and lifecycle agree for the reported accounts, players and spectators', () => {
  for (const displayName of [
    undefined,
    null,
    '',
    '   ',
    'Edited name',
    'Kettu 🦊',
    'Same name',
  ]) {
    const players = accounts.map((account) => ({
      ...account,
      display_name:
        displayName === undefined ? account.display_name : displayName,
    }));
    const rest = normalizeRoom({
      code: 'E4W2',
      id: 'room-1',
      seats: Object.fromEntries(
        positions.map((position, i) => [
          position,
          { ...players[i], user_id: players[i].id },
        ]),
      ),
    });
    const lobby = normalizeRoom({
      code: 'E4W2',
      seats: positions.map((position, i) => ({ position, player: players[i] })),
    });
    expect(rest.seats?.map((seat) => seat.player)).toEqual(
      lobby.seats?.map((seat) => ({
        ...seat.player,
        is_bot: false,
        avatar_url: null,
      })),
    );
    const readiness: ReadinessSnapshot = {
      room_id: 'room-1',
      ready_epoch: 1,
      snapshot_revision: 1,
      status: 'waiting',
      positions: rest.positions!,
      ready_players: [],
      seats: Object.fromEntries(
        positions.map((position, i) => [
          position,
          {
            user_id: players[i].id,
            username: players[i].username,
            occupant_type: 'human',
            status: 'connected',
          },
        ]),
      ) as ReadinessSnapshot['seats'],
    };
    const lifecycle: SeatLifecycleSnapshot = {
      room_id: 'room-1',
      room_code: 'E4W2',
      revision: 1,
      owner_id: 'ios1',
      room_status: 'playing',
      seats: Object.fromEntries(
        positions.map((position, i) => [
          position,
          {
            player_id: players[i].id,
            username: players[i].username,
            display_name: players[i].display_name,
            status: 'normal',
            decision: null,
          },
        ]),
      ) as SeatLifecycleSnapshot['seats'],
    };
    for (const viewer of ['ios1', null]) {
      const store = useGameStore.getState();
      store.reset();
      store.initFromRoom({ room: rest, youPlayerId: viewer });
      store.setReadiness(readiness);
      expect(
        roomWithReadiness(lobby, readiness).seats?.map(
          (seat) => seat.player?.username,
        ),
      ).toEqual(accounts.map((p) => p.username));
      store.setReadiness({
        ...readiness,
        status: 'playing',
        snapshot_revision: 2,
      });
      store.applySeatLifecycle(lifecycle);
      for (const status of [
        'reconnecting',
        'bot_substitute',
        'normal',
        'permanent_bot',
        'normal',
      ] as const) {
        const replacement =
          status === 'normal' &&
          useGameStore.getState().playerMeta.north.seatStatus ===
            'permanent_bot';
        const playerId =
          status === 'permanent_bot' ? null : replacement ? 'new-user' : 'ios1';
        const username =
          status === 'permanent_bot'
            ? 'Bot'
            : replacement
              ? 'replacement_user'
              : 'mfios1';
        const next = {
          ...lifecycle,
          revision: useGameStore.getState().lifecycle!.revision + 1,
          seats: {
            ...lifecycle.seats,
            north: { status, player_id: playerId, username, decision: null },
          },
        };
        store.applySeatLifecycle(next);
        store.refreshPlayerIdentities(rest);
        store.initFromRoom({ room: rest, youPlayerId: viewer });
        store.setReadiness(readiness);
        store.setReadiness({
          ...readiness,
          status: 'playing',
          snapshot_revision: next.revision + 2,
        });
        expect(useGameStore.getState().playerMeta.north).toMatchObject({
          playerId,
          username,
          seatStatus: status,
        });
      }
    }
  }
});
