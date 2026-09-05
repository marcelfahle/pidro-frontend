import {
  normalizeRoom,
  PhoenixSocket,
  type Position,
  type Room,
  useGameStore,
  useGameViewModel,
  useLobbyStore,
} from '@pidro/shared';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const emptyLobby = {
  my_rejoinable: [],
  open_tables: [],
  substitute_needed: [],
  spectatable: [],
};

beforeEach(() => {
  useGameStore.getState().reset();
  useLobbyStore.getState().reset();
});

afterEach(cleanup);

const positions: Position[] = ['north', 'east', 'south', 'west'];
const roomPlayers = {
  north: { user_id: 'ios1', username: 'mfios1' },
  east: { user_id: 'android1', username: 'mfand1' },
  south: { user_id: 'ios2', username: 'mfios2' },
  west: { user_id: 'web1', username: 'mfweb1' },
};
const expectedNames = ['mfios1', 'mfand1', 'mfios2', 'mfweb1'];

function permutations(values: Position[]): Position[][] {
  if (!values.length) return [[]];
  return values.flatMap((value) =>
    permutations(values.filter((other) => other !== value)).map((rest) => [value, ...rest]),
  );
}

function roomWithSeats(seats: unknown): Room {
  return normalizeRoom({ code: 'D9MK', status: 'playing', seats });
}

function seatAt(room: Room, position: Position) {
  const seat = room.seats?.find((candidate) => candidate.position === position);
  if (!seat) throw new Error(`Missing ${position} seat in test room`);
  return seat;
}

function initializeGame(room: Room, youPlayerId = 'ios2') {
  act(() => {
    useGameStore.getState().initFromRoom({ room, youPlayerId });
    useGameStore.getState().setServerState({ phase: 'bidding', players: {} });
  });
}

describe('shared store regressions', () => {
  it('keeps the JWT out of the WebSocket URL', () => {
    const socket = new PhoenixSocket().init({
      config: {
        baseURL: 'https://app.pidro.online',
        wsURL: 'wss://app.pidro.online/socket',
        timeout: 10_000,
      },
      getToken: () => 'secret.jwt.token',
    });

    expect(socket.endPointURL()).not.toContain('secret.jwt.token');
    expect(socket.endPointURL()).not.toContain('token=');
  });

  it('preserves flat-only rooms when a categorized room is upserted', () => {
    const flatRoom = { code: 'FLAT', status: 'waiting' as const };
    const categorizedRoom = { code: 'MINE', status: 'playing' as const };

    act(() => {
      useLobbyStore.getState().setLobby(emptyLobby);
      useLobbyStore.getState().addRoom(flatRoom);
      useLobbyStore.getState().upsertLobbyRoom(categorizedRoom, 'my_rejoinable');
    });

    expect(useLobbyStore.getState().rooms.map((room) => room.code)).toEqual(['MINE', 'FLAT']);
  });

  it('keeps live seat state when a sparse room refresh arrives', () => {
    act(() => {
      useGameStore.getState().initFromRoom({
        room: {
          code: 'ROOM',
          status: 'playing',
          positions: {
            north: 'me',
            east: 'east',
            south: 'south',
            west: 'west',
          },
        },
        youPlayerId: 'me',
      });
      useGameStore.getState().setSeatStatus('east', 'reconnecting', 'Casey');
      useGameStore.getState().initFromRoom({
        room: { code: 'ROOM', status: 'playing', seats: [] },
        youPlayerId: 'me',
      });
    });

    const state = useGameStore.getState();
    expect(state.youPositionAbs).toBe('north');
    expect(state.playerMeta.east).toMatchObject({
      playerId: 'east',
      username: 'Casey',
      seatStatus: 'reconnecting',
    });
  });

  it('renders a real username that matches a position name', () => {
    act(() => {
      useGameStore.getState().initFromRoom({
        room: {
          code: 'ROOM',
          status: 'playing',
          positions: { north: 'north-id', east: null, south: 'me', west: null },
          seats: [
            {
              seat_index: 0,
              position: 'north',
              status: 'occupied',
              player: { id: 'north-id', username: 'north' },
            },
          ],
        },
        youPlayerId: 'me',
      });
      useGameStore.getState().setServerState({
        phase: 'playing',
        current_player: 'south',
        players: { north: {}, east: {}, south: {}, west: {} },
      });
    });

    const { result } = renderHook(() => useGameViewModel());
    expect(
      result.current?.players.find((player) => player.absolutePosition === 'north')?.username,
    ).toBe('north');
  });

  it('normalizes every REST seat key order to the same identities as lobby seats', () => {
    const lobbyRoom = roomWithSeats(
      positions.map((position, seat_index) => ({
        position,
        seat_index,
        player: { id: roomPlayers[position].user_id, username: roomPlayers[position].username },
      })),
    );

    for (const order of permutations(positions)) {
      const restRoom = roomWithSeats(
        Object.fromEntries(order.map((pos) => [pos, roomPlayers[pos]])),
      );
      for (const pos of positions) {
        expect(seatAt(restRoom, pos)).toMatchObject(seatAt(lobbyRoom, pos));
      }
      initializeGame(restRoom);
      expect(positions.map((pos) => useGameStore.getState().playerMeta[pos].username)).toEqual(
        expectedNames,
      );
    }
  });

  it.each([
    ['north', ['mfios2', 'mfweb1', 'mfios1', 'mfand1']],
    ['east', ['mfweb1', 'mfios1', 'mfand1', 'mfios2']],
    ['south', ['mfios1', 'mfand1', 'mfios2', 'mfweb1']],
    ['west', ['mfand1', 'mfios2', 'mfweb1', 'mfios1']],
  ] as const)('keeps identities in the correct relative seats for the %s viewer', (viewer, names) => {
    const { result } = renderHook(() => useGameViewModel());
    for (const order of permutations(positions)) {
      const room = roomWithSeats(Object.fromEntries(order.map((pos) => [pos, roomPlayers[pos]])));
      initializeGame(room, roomPlayers[viewer].user_id);
      expect(
        positions.map(
          (pos) =>
            result.current?.players.find((player) => player.relativePosition === pos)?.username,
        ),
      ).toEqual(names);
      expect(result.current?.players.find((player) => player.isYou)?.relativePosition).toBe(
        'south',
      );
    }
  });

  it('prefers the matching player identity before another seat with a conflicting index or position', () => {
    const room = roomWithSeats(roomPlayers);
    const north = seatAt(room, 'north');
    const east = seatAt(room, 'east');
    initializeGame({ ...room, seats: [{ ...east, position: 'north', seat_index: 0 }, north] });

    expect(useGameStore.getState().playerMeta.north).toMatchObject({
      playerId: 'ios1',
      username: 'mfios1',
    });
  });

  it('does not borrow a name from a conflicting index when the matching seat is missing', () => {
    const room = roomWithSeats(roomPlayers);
    const east = seatAt(room, 'east');
    for (const position of ['east', undefined] as const) {
      initializeGame({ ...room, seats: [{ ...east, position, seat_index: 0 }] });
      expect(useGameStore.getState().playerMeta.north.username).toBeNull();
    }
  });

  it('uses a position match when IDs differ and an index only when identity and position are absent', () => {
    const room = roomWithSeats(roomPlayers);
    const north = seatAt(room, 'north');
    const east = seatAt(room, 'east');
    initializeGame({
      ...room,
      seats: [
        { ...east, seat_index: 0 },
        { ...north, player: { id: 'bot_north', username: 'Bot', is_bot: true } },
      ],
    });
    expect(useGameStore.getState().playerMeta.north.username).toBe('Bot');

    act(() => useGameStore.getState().reset());
    initializeGame({
      code: 'LEGACY',
      status: 'playing',
      seats: [{ ...north, position: undefined }],
    });
    expect(useGameStore.getState().playerMeta.north.username).toBe('mfios1');
  });

  it.each([
    'REST',
    'positions',
  ])('clears departed identities when a %s snapshot marks a seat vacant', (source) => {
    initializeGame(roomWithSeats(roomPlayers));
    act(() => useGameStore.getState().setSeatStatus('north', 'reconnecting'));

    const vacantRoom = roomWithSeats({ ...roomPlayers, north: null });
    initializeGame(source === 'REST' ? vacantRoom : { ...vacantRoom, seats: [] });

    expect(useGameStore.getState().playerMeta.north).toMatchObject({
      playerId: null,
      username: null,
      seatStatus: 'normal',
    });
    expect(
      positions.slice(1).map((pos) => useGameStore.getState().playerMeta[pos].username),
    ).toEqual(expectedNames.slice(1));
  });

  it('keeps other identities stable through departure, bot takeover, reclaim, and substitute snapshots', () => {
    const order: Position[] = ['east', 'north', 'south', 'west'];
    const occupants = [
      roomPlayers.north,
      { user_id: null, username: 'Bot', occupant_type: 'bot' },
      roomPlayers.north,
      { user_id: 'substitute', username: 'New player', substitute: true },
    ];
    for (const occupant of occupants) {
      const room = roomWithSeats(
        Object.fromEntries(
          order.map((pos) => [pos, pos === 'north' ? occupant : roomPlayers[pos]]),
        ),
      );
      initializeGame(room);
      expect(positions.map((pos) => useGameStore.getState().playerMeta[pos].username)).toEqual([
        occupant.username,
        ...expectedNames.slice(1),
      ]);
      expect(useGameStore.getState().playerMeta.north.playerId).toBe(
        occupant.user_id ?? 'bot_north',
      );
    }
  });
});
