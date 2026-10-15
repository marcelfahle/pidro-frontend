import { describe, expect, it } from 'bun:test';
import { POSITION_TO_INDEX, setLocale } from '@pidro/shared';
import { tableRow, filterPlayers, lobbyCounts } from '../../src/features/lobby/tableRow';

const positions = ['north', 'south', 'east', 'west'];
const player = (position, name, extra = {}) => ({
  position,
  seat_index: POSITION_TO_INDEX[position],
  status: 'occupied',
  player: { id: `id-${position}`, username: name, ...extra },
});
const room = (extra = {}) => ({
  code: 'CODE',
  name: 'Hidden table name',
  host_id: 'id-north',
  status: 'waiting',
  seats: [player('north', 'Claas'), player('east', 'Robot', { is_bot: true })],
  ...extra,
});

it('switches row copy and requirements live while preserving names and join authority', () => {
  const input = room({
    seats: [player('north', 'Open'), { position: 'south', status: 'free', min_games: 1000 }],
    available_positions: ['south'],
    game: { hand: 4, scores: { north_south: -5, east_west: 21 } },
  });
  try {
    setLocale('sv');
    const row = tableRow(input, 'open_tables', 40);
    expect(row.seats[0].name).toBe('Open');
    expect(row.seats[1]).toMatchObject({
      name: 'Ledig',
      position: 'south',
      canJoin: true,
      requirementReason: 'Det krävs 1 000 spelade spel, du har 40',
    });
    expect(row.status).toBe('1 ledig plats');
    expect(tableRow(input, 'spectatable').status).toBe('Giv 4 · −5 mot 21');
    expect(tableRow(input, 'my_rejoinable').button).toBe('Återvänd');
    expect(filterPlayers([input], 'Open')).toEqual([input]);
    setLocale('en');
    expect(tableRow(input, 'open_tables', 40).status).toBe('1 seat open');
    expect(tableRow(input, 'spectatable').status).toBe('Hand 4 · -5 to 21');
  } finally {
    setLocale('en');
  }
});

describe('lobby table rows', () => {
  it('uses current hand and north-south score first, with fallbacks for older payloads', () => {
    const game = { hand: 4, scores: { north_south: -5, east_west: 21 } };
    const seats = [{ position: 'south', status: 'free', player: null, vacated_by: 'Jussi' }];
    expect(tableRow(room({ game }), 'spectatable').status).toBe('Hand 4 · -5 to 21');
    expect(tableRow(room(), 'spectatable').status).toBe('Playing');
    expect(tableRow(room({ game, seats }), 'substitute_needed').status).toBe(
      'Jussi left in hand 4'
    );
    expect(tableRow(room({ seats }), 'substitute_needed').status).toBe('Needs a substitute');
    expect(tableRow(room({ game }), 'substitute_needed').status).toBe('Needs a substitute');
  });

  it('explains a requirement only below the bar, never guessing an unknown count', () => {
    const seats = [
      { position: 'south', status: 'free', player: null, min_games: 100 },
      { ...player('north', 'Claas'), min_games: 1000 },
      { ...player('east', 'Bot', { is_bot: true }), min_games: 1000 },
    ];
    for (const [count, reason] of [
      [40, '100 games played needed, you have 40'],
      [100, undefined],
      [101, undefined],
      [undefined, undefined],
    ]) {
      const result = tableRow(room({ seats }), 'open_tables', count);
      expect(result.seats[1].requirementReason).toBe(reason);
      expect(result.seats[1].minGames).toBe(100);
      expect(result.seats[0].minGames).toBe(0);
      expect(result.seats[2].minGames).toBe(0);
    }
    for (const category of ['my_rejoinable', 'substitute_needed', 'spectatable'])
      expect(
        tableRow(room({ seats, status: 'playing' }), category, 0).seats[1].requirementReason
      ).toBeUndefined();
    expect(tableRow(room(), 'open_tables', 0).seats[1].requirementReason).toBeUndefined();
  });

  for (const host of positions) {
    it(`keeps opposing pairs intact with the ${host} host pair first`, () => {
      const result = tableRow(
        room({
          host_id: `id-${host}`,
          seats: positions.map((position) => player(position, position)),
        }),
        'open_tables'
      );
      expect(result.seats.map((seat) => seat.position)).toEqual(
        ['east', 'west'].includes(host) ? ['east', 'west', 'north', 'south'] : positions
      );
      expect(result.seats.map((seat) => seat.name)).toEqual(
        result.seats.map((seat) => seat.position)
      );
    });
  }

  it('presents human, bot and free seats without making the bot joinable', () => {
    const result = tableRow(
      room({
        seats: [
          player('north', 'guest_7KQ4M2XB', {
            display_name: 'Claas',
            avatar_url: 'https://example.com/avatar',
          }),
          player('east', 'Robot', { is_bot: true }),
        ],
      }),
      'open_tables'
    );
    expect(result.seats.map((seat) => [seat.position, seat.kind, seat.name, seat.canJoin])).toEqual(
      [
        ['north', 'player', 'Claas', false],
        ['south', 'open', 'Open', true],
        ['east', 'bot', 'Bot', false],
        ['west', 'open', 'Open', true],
      ]
    );
    expect(result.seats[0].id).toBe('id-north');
    expect(result.seats[0].avatarUrl).toBe('https://example.com/avatar');
    expect(result.status).toBe('2 seats open');
    expect(result.button).toBeNull();
  });

  it('uses server availability and lock authority, including explicit no availability', () => {
    const restricted = room({ available_positions: ['north', 'west'] });
    expect(
      tableRow(restricted, 'open_tables')
        .seats.filter((seat) => seat.canJoin)
        .map((seat) => seat.position)
    ).toEqual(['west']);
    expect(tableRow(restricted, 'open_tables').status).toBe('1 seat open');
    for (const extra of [{ available_positions: [] }, { locked: true }]) {
      const result = tableRow(room(extra), 'open_tables');
      expect(result.seats.some((seat) => seat.canJoin)).toBe(false);
      expect(result.status).toBe('0 seats open');
    }
  });

  it('supports indexed seats and position-only occupants without exposing them as free', () => {
    const result = tableRow(
      room({
        seats: [{ seat_index: POSITION_TO_INDEX.west, player_id: 'bot_1', status: 'occupied' }],
        positions: { north: 'human' },
      }),
      'open_tables'
    );
    expect(result.seats.find((seat) => seat.position === 'west').kind).toBe('bot');
    expect(result.seats.find((seat) => seat.position === 'north').canJoin).toBe(false);
  });

  it('keeps north/south first when the server has no host', () => {
    const result = tableRow(
      room({ host_id: null, positions: { east: null, west: null } }),
      'open_tables'
    );
    expect(result.seats.map((seat) => seat.position)).toEqual(positions);
  });

  for (const [category, status, button, vacantKind, joinable] of [
    ['my_rejoinable', 'Your seat is waiting', 'Rejoin', 'open', false],
    ['substitute_needed', 'Needs a substitute', null, 'sub', true],
    ['spectatable', 'Playing', 'Watch', 'open', false],
  ]) {
    it(`presents ${category} status and actions`, () => {
      const result = tableRow(room(), category);
      expect(result.status).toBe(status);
      expect(result.button).toBe(button);
      expect(result.seats[1].kind).toBe(vacantKind);
      expect(result.seats[1].name).toBe(vacantKind === 'sub' ? 'Sit in' : 'Open');
      expect(result.seats[1].canJoin).toBe(joinable);
    });
  }
});

describe('player filtering and lobby counts', () => {
  it('matches public human names, ignoring case/whitespace, not table names, codes or bots', () => {
    const rooms = [room(), room({ code: 'OTHER', seats: [player('west', 'Pekka')] })];
    expect(filterPlayers(rooms, '  cLaA  ')).toEqual([rooms[0]]);
    expect(filterPlayers(rooms, 'PEKKA')).toEqual([rooms[1]]);
    expect(filterPlayers(rooms, '  ')).toEqual(rooms);
    for (const query of ['CODE', 'Hidden table name', 'Robot', 'Bot', 'Open', 'missing'])
      expect(filterPlayers(rooms, query)).toEqual([]);
    expect(
      filterPlayers(
        [room({ seats: [player('north', 'guest_7KQ4M2XB', { display_name: 'Public Name' })] })],
        'public'
      )
    ).toHaveLength(1);
  });

  it('deduplicates tables across categories and counts only tables with joinable seats', () => {
    const open = room();
    const locked = room({ code: 'LOCKED', locked: true });
    const full = room({
      code: 'FULL',
      seats: positions.map((position) => player(position, position)),
    });
    const lobby = {
      my_rejoinable: [full],
      open_tables: [open, locked],
      substitute_needed: [open],
      spectatable: [full],
    };
    expect(lobbyCounts(lobby)).toBe('3 tables · 1 with open seats');
    expect(
      lobbyCounts({
        my_rejoinable: [],
        open_tables: [open],
        substitute_needed: [],
        spectatable: [],
      })
    ).toBe('1 table · 1 with open seats');
    expect(
      lobbyCounts({ my_rejoinable: [], open_tables: [], substitute_needed: [], spectatable: [] })
    ).toBe('0 tables · 0 with open seats');
  });
});
