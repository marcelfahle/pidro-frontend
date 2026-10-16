import { describe, expect, it } from 'bun:test';
import { setLocale } from '@pidro/shared';
import {
  assignedFriendIds,
  chooseFriend,
  chooseRequirement,
  chooseSeat,
  defaultSeats,
  findFriends,
  newTableRequest,
  tableFooter,
} from '../../src/features/lobby/newTable';

it('retranslates full footer sentences without changing the creation request or rules', () => {
  const seats = { seat_3: 'open', seat_2: 'open', seat_4: 'ai' };
  const before = newTableRequest('louisiana', seats);
  try {
    setLocale('sv');
    expect(tableFooter(seats)).toBe('2 lediga platser visas för alla.');
    expect(tableFooter({ ...seats, seat_2: 'invite' })).toBe('En ledig plats visas för alla.');
    expect(tableFooter({ ...seats, seat_2: 'invite', seat_3: 'invite' })).toBe(
      'Spelet börjar när dina vänner sätter sig.'
    );
    expect(newTableRequest('louisiana', seats)).toEqual(before);
    setLocale('en');
    expect(tableFooter(seats)).toBe('2 open seats are listed for everyone.');
  } finally {
    setLocale('en');
  }
});

const draft = () => ({ seats: { ...defaultSeats }, requirements: {} });

describe('new table request', () => {
  it('defaults to two public seats and a bot, without sending a name', () => {
    expect(newTableRequest('finnish', defaultSeats)).toEqual({
      request: { rule_set: 'finnish', seats: { seat_2: 'open', seat_3: 'open', seat_4: 'ai' } },
      invite: [],
    });
  });

  it('shares a link for the selected position after creation', () => {
    expect(
      newTableRequest('louisiana', { seat_2: 'ai', seat_3: 'invite', seat_4: 'open' })
    ).toEqual({
      request: { rule_set: 'louisiana', seats: { seat_2: 'ai', seat_3: 'open', seat_4: 'open' } },
      invite: ['south'],
    });
    expect(
      newTableRequest('finnish', { seat_2: 'invite', seat_3: 'ai', seat_4: 'invite' }).invite
    ).toEqual(['east', 'west']);
  });

  it('sends requirements only for open seats, preserving Anyone as the old string', () => {
    expect(
      newTableRequest(
        'finnish',
        { seat_2: 'open', seat_3: 'open', seat_4: 'open' },
        { seat_2: 100, seat_3: 1000, seat_4: 0 }
      ).request.seats
    ).toEqual({
      seat_2: { type: 'open', min_games: 100 },
      seat_3: { type: 'open', min_games: 1000 },
      seat_4: 'open',
    });
    expect(
      newTableRequest(
        'louisiana',
        { seat_2: 'ai', seat_3: 'invite', seat_4: 'open' },
        { seat_2: 100, seat_3: 1000 }
      ).request.seats
    ).toEqual({
      seat_2: 'ai',
      seat_3: 'open',
      seat_4: 'open',
    });
  });
});

describe('seat draft', () => {
  it('holds picked friends only at creation and drops a hold when its seat changes', () => {
    const nora = { user_id: 'nora', display_name: 'Nora', avatar_url: null, presence: 'offline' };
    const kalle = { ...nora, user_id: 'kalle', display_name: 'Kalle', presence: 'online' };
    const before = draft();
    const selected = chooseFriend(chooseFriend(before, 'seat_2', nora), 'seat_3', kalle);
    expect(before).toEqual(draft());
    expect(assignedFriendIds(selected, 'seat_3')).toEqual(['nora']);
    expect(assignedFriendIds(selected, 'seat_2')).toEqual(['kalle']);
    expect(assignedFriendIds(chooseSeat(selected, 'seat_2', 'open'), 'seat_3')).toEqual([]);
    expect(
      newTableRequest('louisiana', selected.seats, selected.requirements, selected.invited)
    ).toEqual({
      request: {
        rule_set: 'louisiana',
        seats: {
          seat_2: { type: 'held', user_id: 'nora' },
          seat_3: { type: 'held', user_id: 'kalle' },
          seat_4: 'ai',
        },
      },
      invite: [],
    });
    const changed = chooseSeat(selected, 'seat_2', 'open');
    expect(
      newTableRequest('finnish', changed.seats, changed.requirements, changed.invited).request.seats
    ).toEqual({ seat_2: 'open', seat_3: { type: 'held', user_id: 'kalle' }, seat_4: 'ai' });
    const link = chooseSeat(selected, 'seat_3', 'invite');
    expect(newTableRequest('finnish', link.seats, link.requirements, link.invited).invite).toEqual([
      'south',
    ]);
  });

  it('filters the supplied friends without changing their server order or presence', () => {
    const friends = [
      { user_id: '1', display_name: 'Nora', presence: 'at_table' },
      { user_id: '2', display_name: 'Kalle', presence: 'online' },
      { user_id: '3', display_name: 'ＮＯＲＭＡ', presence: 'offline' },
    ];
    expect(findFriends(friends, ' nor ')).toEqual([friends[0], friends[2]]);
    expect(findFriends(friends, '')).toEqual(friends);
    expect(findFriends(friends, 'z')).toEqual([]);
  });

  it('Open commits at once: one tap changes the seat, nothing waits on a second tap', () => {
    const before = draft();
    expect(chooseSeat(before, 'seat_4', 'open')).toEqual({
      seats: { ...defaultSeats, seat_4: 'open' },
      requirements: {},
    });
    expect(before).toEqual(draft());
  });

  for (const games of [0, 100, 1000]) {
    it(`sets ${games} games on an open seat without touching the others`, () => {
      const before = { ...draft(), requirements: { seat_2: 1000 } };
      expect(chooseRequirement(before, 'seat_3', games)).toEqual({
        seats: { ...defaultSeats },
        requirements: { seat_2: 1000, seat_3: games },
      });
      expect(before.requirements.seat_3).toBeUndefined();
    });
  }

  it('ignores a requirement for a seat that is not open', () => {
    const before = draft();
    expect(chooseRequirement(before, 'seat_4', 100)).toBe(before);
  });

  for (const choice of ['ai', 'invite']) {
    it(`${choice} selects directly and clears only that seat's requirement`, () => {
      const before = { ...draft(), requirements: { seat_3: 1000, seat_2: 100 } };
      expect(chooseSeat(before, 'seat_3', choice)).toEqual({
        seats: { ...defaultSeats, seat_3: choice },
        requirements: { seat_3: 0, seat_2: 100 },
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
