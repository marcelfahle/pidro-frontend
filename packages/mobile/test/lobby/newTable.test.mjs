import { describe, expect, it } from 'bun:test';
import {
  chooseSeat,
  defaultSeats,
  newTableRequest,
  tableFooter,
} from '../../src/features/lobby/newTable';

const draft = () => ({ seats: { ...defaultSeats }, requirements: {}, asking: null });

describe('new table request', () => {
  it('defaults to two public seats and a bot, without sending a name', () => {
    expect(newTableRequest('finnish', defaultSeats)).toEqual({
      request: { rule_set: 'finnish', seats: { seat_2: 'open', seat_3: 'open', seat_4: 'ai' } },
      invite: false,
    });
  });

  it('preserves the rules and maps Friend to open, with an invite after creation', () => {
    expect(
      newTableRequest('louisiana', { seat_2: 'ai', seat_3: 'invite', seat_4: 'open' })
    ).toEqual({
      request: { rule_set: 'louisiana', seats: { seat_2: 'ai', seat_3: 'open', seat_4: 'open' } },
      invite: true,
    });
  });

  it('keeps game requirements local rather than adding them to the request', () => {
    const next = chooseSeat(draft(), 'seat_3', 1000);
    expect(next.requirements.seat_3).toBe(1000);
    expect(newTableRequest('finnish', next.seats)).toEqual(
      newTableRequest('finnish', defaultSeats)
    );
  });
});

describe('seat draft', () => {
  it('Open flips only the chosen row to requirements without committing a seat change', () => {
    const before = draft();
    expect(chooseSeat(before, 'seat_4', 'open')).toEqual({ ...before, asking: 'seat_4' });
    expect(before).toEqual(draft());
  });

  for (const games of [0, 100, 1000]) {
    it(`commits ${games} games as an open seat and closes the inline question`, () => {
      const before = chooseSeat(draft(), 'seat_4', 'open');
      expect(chooseSeat(before, 'seat_4', games)).toEqual({
        seats: { ...defaultSeats, seat_4: 'open' },
        requirements: { seat_4: games },
        asking: null,
      });
      expect(before.seats.seat_4).toBe('ai');
    });
  }

  for (const choice of ['ai', 'invite']) {
    it(`${choice} selects directly and clears only that seat's requirement`, () => {
      const before = { ...draft(), requirements: { seat_3: 1000, seat_2: 100 }, asking: 'seat_2' };
      expect(chooseSeat(before, 'seat_3', choice)).toEqual({
        seats: { ...defaultSeats, seat_3: choice },
        requirements: { seat_3: 0, seat_2: 100 },
        asking: null,
      });
      expect(before.requirements.seat_3).toBe(1000);
    });
  }
});

describe('table footer', () => {
  it('counts only public open seats, with singular and plural grammar', () => {
    expect(tableFooter(defaultSeats)).toBe('2 open seats are listed for everyone.');
    expect(tableFooter({ seat_2: 'open', seat_3: 'invite', seat_4: 'ai' })).toBe(
      'One open seat is listed for everyone.'
    );
    expect(tableFooter({ seat_2: 'open', seat_3: 'open', seat_4: 'open' })).toBe(
      '3 open seats are listed for everyone.'
    );
    expect(tableFooter({ seat_2: 'invite', seat_3: 'invite', seat_4: 'ai' })).toBe(
      'The game starts when your friends sit down.'
    );
  });
});
