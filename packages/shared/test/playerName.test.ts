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
    username: 'Player',
    display_name: 'Anna',
  });
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
