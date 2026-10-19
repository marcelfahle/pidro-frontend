import { expect, test } from 'bun:test';
import {
  clampRoomName,
  limitRoomNameInput,
  normalizeRoom,
  ROOM_NAME_MAX_LENGTH,
} from '../src/utils/rooms';

const positions = ['north', 'east', 'south', 'west'] as const;

test('both seat transports preserve requirements, the password lock, departure name and game progress', () => {
  const game = { hand: 4, scores: { north_south: 34, east_west: 21 } };
  const held_for = { user_id: 'nora', display_name: 'Nora', avatar_url: null };
  for (const seats of [
    { north: { min_games: 1000, password: true, vacated_by: 'Jussi', held_for }, south: {} },
    [
      { position: 'north', min_games: 1000, password: true, vacated_by: 'Jussi', held_for },
      { position: 'south' },
    ],
  ]) {
    const room = normalizeRoom({ code: 'GAME', seats, game });
    expect(room.seats?.[0].min_games).toBe(1000);
    expect(room.seats?.[0].vacated_by).toBe('Jussi');
    expect(room.seats?.[0].held_for).toEqual(held_for);
    expect(room.seats?.[1].min_games).toBe(0);
    expect(room.seats?.map((seat) => seat.password)).toEqual([true, false]);
    expect(room.game).toEqual(game);
    expect(normalizeRoom(room)).toEqual(room);
    expect(normalizeRoom({ code: 'WAIT', seats })).not.toHaveProperty('game');
  }
});

test('a REST-shaped room takes its name from the config', () => {
  const room = normalizeRoom({
    code: 'E4W2',
    id: 'room-1',
    config: { name: 'Friday night', bot_difficulty: 'basic', solo: false },
    seats: Object.fromEntries(
      positions.map((position) => [position, { user_id: null }]),
    ),
  });
  expect(room.name).toBe('Friday night');
});

test('a lobby-shaped room takes its name from the config', () => {
  const room = normalizeRoom({
    code: 'E4W2',
    config: { name: 'Friday night', bot_difficulty: 'smart', solo: false },
    seats: positions.map((position) => ({ position, player: null })),
  });
  expect(room.name).toBe('Friday night');
});

test('a room with a null config name falls back to the room code', () => {
  const room = normalizeRoom({
    code: 'E4W2',
    config: { name: null, bot_difficulty: 'basic', solo: true },
  });
  expect(room.name).toBe('E4W2');
});

test('the config stays on the normalized room', () => {
  const config = { name: 'Friday night', bot_difficulty: 'smart', solo: false };
  const room = normalizeRoom({ code: 'E4W2', config });
  expect(room.config).toEqual({ ...config, rule_set: 'finnish' });
  expect(room.config?.bot_difficulty).toBe('smart');
});

test('a generated name is cut to the server limit without splitting an emoji', () => {
  expect(clampRoomName("testuser's game")).toBe("testuser's game");
  expect(clampRoomName(`${'u'.repeat(70)}'s solo table`)).toBe('u'.repeat(60));
  const clamped = clampRoomName(`${'u'.repeat(59)}🦊's table`);
  expect(clamped).toBe(`${'u'.repeat(59)}🦊`);
  expect(Array.from(clamped).length).toBe(ROOM_NAME_MAX_LENGTH);
});

test('a room name is counted by code point, so 60 emoji fit', () => {
  const sixty = '😀'.repeat(60);
  expect(clampRoomName(sixty)).toBe(sixty);
  expect(clampRoomName('😀'.repeat(61))).toBe(sixty);
  expect(limitRoomNameInput(sixty)).toBe(sixty);
  expect(limitRoomNameInput('😀'.repeat(61))).toBe(sixty);
});

test('the input limiter keeps the space typed between two words', () => {
  expect(limitRoomNameInput('Friday ')).toBe('Friday ');
  const padded = `${'u'.repeat(59)}  more`;
  expect(limitRoomNameInput(padded)).toBe(`${'u'.repeat(59)} `);
  expect(clampRoomName(padded)).toBe('u'.repeat(59));
});

test('a lobby room from a backend that predates the config keeps its name', () => {
  const room = normalizeRoom({
    code: 'E4W2',
    metadata: { name: 'Friday night' },
    seats: positions.map((position) => ({ position, player: null })),
  });
  expect(room.name).toBe('Friday night');
});

test('a config name wins over a differing top-level name', () => {
  const room = normalizeRoom({
    code: 'E4W2',
    name: 'E4W2',
    config: { name: 'Friday night', bot_difficulty: 'basic', solo: false },
  });
  expect(room.name).toBe('Friday night');
  expect(normalizeRoom(room).name).toBe('Friday night');
});

test('a top-level name still counts when the config has none', () => {
  const room = normalizeRoom({
    code: 'E4W2',
    name: 'Friday night',
    config: { name: null, bot_difficulty: 'basic', solo: false },
  });
  expect(room.name).toBe('Friday night');
});

test('a config name wins over a leftover metadata name', () => {
  const room = normalizeRoom({
    code: 'E4W2',
    config: { name: 'Friday night', bot_difficulty: 'basic', solo: false },
    metadata: { name: 'Old name' },
  });
  expect(room.name).toBe('Friday night');
});
