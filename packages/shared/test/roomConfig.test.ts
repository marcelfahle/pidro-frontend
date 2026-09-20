import { expect, test } from 'bun:test';
import {
  clampRoomName,
  limitRoomNameInput,
  normalizeRoom,
  ROOM_NAME_MAX_LENGTH,
} from '../src/utils/rooms';

const positions = ['north', 'east', 'south', 'west'] as const;

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
  expect(room.config).toEqual(config);
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
