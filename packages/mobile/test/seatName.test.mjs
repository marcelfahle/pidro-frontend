import { expect, test } from 'bun:test';
import { seatName } from '../src/features/seatName.ts';
import { tableRow } from '../src/features/lobby/tableRow.ts';

test('a bot goes by its persona, a substitute and a human by their own name', () => {
  // The persona's display name wins, even over a username the server keeps for itself.
  expect(
    seatName(
      { username: 'bot_7f3a', display_name: 'Antti', bot_persona: 'antti', is_bot: true },
      'Player'
    )
  ).toBe('Antti');
  // A persona without a usable name falls back to "Bot", not the internal username.
  expect(
    seatName({ username: 'bot_7f3a', display_name: ' ', bot_persona: 'antti' }, 'Player')
  ).toBe('Bot');
  // An older server sends no persona: the seat is just "Bot", never its internal name.
  expect(seatName({ username: 'Bot/User 7f3a2b', is_bot: true }, 'Player')).toBe('Bot');
  // A substitute bot plays for Ritva: no persona, so the seat keeps her name.
  expect(seatName({ username: 'Ritva', display_name: null, bot_persona: null }, 'Player')).toBe(
    'Ritva'
  );
  expect(seatName({ username: 'Claas', display_name: 'Claas S' }, 'Player')).toBe('Claas');
  expect(seatName(undefined, 'Player')).toBe('Player');

  const row = tableRow(
    {
      code: 'CREW',
      status: 'playing',
      seats: [
        { position: 'north', status: 'occupied', player: { id: 'h', username: 'Claas' } },
        {
          position: 'east',
          status: 'occupied',
          player: {
            id: 'bot_1',
            username: 'Jocke',
            display_name: 'Jocke',
            bot_persona: 'jocke',
            is_bot: true,
          },
        },
        {
          position: 'south',
          status: 'occupied',
          player: { id: 'bot_2', username: 'Bot/User 2', is_bot: true },
        },
      ],
    },
    'spectatable'
  );
  expect(row.seats.map(({ kind, name, persona }) => [kind, name, persona])).toEqual([
    ['player', 'Claas', null],
    ['bot', 'Bot', null],
    ['bot', 'Jocke', 'jocke'],
    ['open', 'Open', null],
  ]);
});
