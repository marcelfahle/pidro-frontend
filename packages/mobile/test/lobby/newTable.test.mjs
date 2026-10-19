import { expect, it } from 'bun:test';
import { normalizeRoom, roomWithReadiness, setLocale } from '@pidro/shared';
import { assignedFriendIds, chooseFriend, chooseSeat, defaultSeats, isPractice, newTableRequest, pickerFriends, tableFooter, tableHeader } from '../../src/features/lobby/newTable';
import { seatRow } from '../../src/features/lobby/seatRow';

const maija = { user_id: 'maija', display_name: 'Maija', avatar_url: null, presence: 'online' };
const draft = () => ({ seats: { ...defaultSeats } });

it('opens a public Finnish table in one tap, with three open seats and no link positions', () => {
  expect(newTableRequest('finnish', draft())).toEqual({ rule_set: 'finnish', seats: { seat_2: 'open', seat_3: 'open', seat_4: 'open' } });
  expect(tableFooter(draft())).toBe('Open seats are listed in Tables.');
  expect(isPractice(draft())).toBe(false);
});

it('sends the partner hold, experience and password plan, never inventing a password', () => {
  const plan = chooseSeat(chooseSeat(chooseFriend(draft(), 'seat_3', maija), 'seat_2', { type: 'open', min_games: 100 }), 'seat_4', { type: 'open', min_games: 0, password: true });
  expect(newTableRequest('louisiana', plan)).toEqual({ rule_set: 'louisiana', seats: { seat_2: { type: 'open', min_games: 100 }, seat_3: { type: 'held', user_id: 'maija' }, seat_4: { type: 'open', min_games: 0, password: true } } });
  expect(tableFooter(plan)).toBe('Open seats are listed in Tables. Maija gets an invitation.');
  expect(seatRow({ team: 'opponent', opened: false, type: 'open', passwordRequired: true })).toMatchObject({ status: 'Password', token: { kind: 'open', locked: true, badge: null } });
});

it('changes one whole seat at a time, dropping the former hold or requirement', () => {
  const before = chooseFriend(chooseSeat(draft(), 'seat_2', { type: 'open', min_games: 1000 }), 'seat_3', maija);
  expect(assignedFriendIds(before, 'seat_4')).toEqual(['maija']);
  expect(assignedFriendIds(before, 'seat_3')).toEqual([]);
  const after = chooseSeat(chooseSeat(before, 'seat_3', 'ai'), 'seat_2', 'open');
  expect(newTableRequest('finnish', after).seats).toEqual({ seat_2: 'open', seat_3: 'ai', seat_4: 'open' });
  expect(newTableRequest('finnish', before).seats).toEqual({ seat_2: { type: 'open', min_games: 1000 }, seat_3: { type: 'held', user_id: 'maija' }, seat_4: 'open' });
});

it('distinguishes invite-only from practice and retranslates the footer and header', () => {
  const bots = { seats: { seat_2: 'ai', seat_3: 'ai', seat_4: 'ai' } };
  expect(isPractice(bots)).toBe(true);
  expect(tableFooter(bots)).toBe('A practice game with three bots.');
  expect(tableFooter(chooseFriend(bots, 'seat_3', maija))).toBe('Only the people you invite can join.');
  const room = normalizeRoom({ code: 'TEST', config: { rule_set: 'louisiana' }, seats: { north: { user_id: 'host', occupant_type: 'human' }, south: { occupant_type: 'vacant', password: true } } });
  expect(tableHeader(room)).toBe('Listed in Tables · Louisiana');
  expect(tableHeader({ ...room, seats: [{ status: 'free', player: null, held_for: maija }] })).toBe('Invite only · Louisiana');
  try {
    setLocale('sv');
    expect(tableFooter(chooseFriend(draft(), 'seat_3', maija))).toBe('Lediga platser visas i Bord. Maija får en inbjudan.');
    expect(tableHeader(room)).toBe('Visas i Bord · Louisiana');
    expect(tableFooter(bots)).toBe('Ett övningsspel med tre botar.');
  } finally { setLocale('en'); }
});

it('renders password and requirements from readiness, and readiness from the server for a non-host', () => {
  const snapshot = { room_id: 'room', status: 'waiting', positions: { north: 'host', east: 'you', south: null, west: null }, seats: { north: { occupant_type: 'human' }, east: { occupant_type: 'human' }, south: { occupant_type: 'vacant', min_games: 100, password: true }, west: { occupant_type: 'vacant', held_for: maija } } };
  const room = roomWithReadiness({ code: 'TEST', seat_password: '4821', seats: [] }, snapshot);
  expect(room.seat_password).toBe('4821');
  expect(room.seats.find((seat) => seat.position === 'south')).toMatchObject({ min_games: 100, password: true, player: null });
  expect(room.seats.find((seat) => seat.position === 'west').held_for).toEqual(maija);
  expect(seatRow({ team: 'you', host: false, opened: true, type: 'open', editable: false, ready: false })).toMatchObject({ name: 'You', status: 'Not ready', tappable: false });
  expect(seatRow({ team: 'opponent', opened: true, type: 'open', passwordRequired: true, editable: false })).toMatchObject({ status: 'Waiting…', tappable: false });
});

it('maps server friend presence and assignment to selectable rows', () => {
  const entries = [maija, { ...maija, user_id: 'bots', presence: 'at_table', table_company: 'bots' }, { ...maija, user_id: 'busy', presence: 'at_table', table_company: 'people' }, { ...maija, user_id: 'off', presence: 'offline' }];
  expect(pickerFriends(entries).map(({ section, availability }) => [section, availability])).toEqual([['online', 'online'], ['online', 'bots'], ['busy', 'others'], ['offline', 'offline']]);
  expect(pickerFriends(entries, 'maija', ['off']).map((friend) => friend.availability)).toEqual(['selected', 'bots', 'others', 'taken']);
});
