import { describe, expect, it } from 'bun:test';
import { POSITION_TO_INDEX, setLocale } from '@pidro/shared';
import {
  answerEntry,
  deleteDigit,
  emptyEntry,
  enterDigit,
  passwordAnswer,
  passwordSeatWords,
  passwordWaitLine,
} from '../../src/features/lobby/passwordSeat';
import { tableRow } from '../../src/features/lobby/tableRow';

const type = (entry, digits) => [...digits].reduce(enterDigit, entry);

describe('typing the password', () => {
  it('fills the boxes in order and sends on the fourth digit', () => {
    expect(type(emptyEntry, '482')).toEqual({ digits: '482', status: 'typing' });
    expect(type(emptyEntry, '4821')).toEqual({ digits: '4821', status: 'sending' });
  });

  it('takes nothing while the password is out or the server says wait', () => {
    const sending = type(emptyEntry, '4821');
    expect(enterDigit(sending, '5')).toBe(sending);
    expect(deleteDigit(sending)).toBe(sending);
    const wait = answerEntry('wait');
    expect(type(wait, '12')).toBe(wait);
    expect(deleteDigit(wait)).toBe(wait);
  });

  it('only takes digits', () => {
    expect(type(emptyEntry, '4a 8')).toEqual({ digits: '48', status: 'typing' });
  });

  it('backspace removes the last digit and stops at empty', () => {
    expect(deleteDigit(type(emptyEntry, '482'))).toEqual({ digits: '48', status: 'typing' });
    expect(deleteDigit(emptyEntry)).toEqual(emptyEntry);
  });

  it('a wrong password clears the boxes and keeps the line until the next digit', () => {
    const wrong = answerEntry('wrong');
    expect(wrong).toEqual({ digits: '', status: 'wrong' });
    expect(deleteDigit(wrong)).toEqual(wrong);
    expect(enterDigit(wrong, '7')).toEqual({ digits: '7', status: 'typing' });
  });
});

describe('reading the server', () => {
  const refused = (status, code, headers = {}) => ({
    response: { status, headers, data: { errors: [{ code }] } },
  });

  it('a refused password is wrong', () => {
    expect(passwordAnswer(refused(403, 'SEAT_REQUIRES_PASSWORD'))).toBe('wrong');
  });

  it('too many tries waits for retry-after, or a minute without it', () => {
    expect(passwordAnswer(refused(429, 'RATE_LIMITED', { 'retry-after': '42' }))).toEqual({
      wait: 42,
    });
    expect(passwordAnswer(refused(429, 'RATE_LIMITED'))).toEqual({ wait: 60 });
    expect(passwordAnswer(refused(429, 'RATE_LIMITED', { 'retry-after': 'soon' }))).toEqual({
      wait: 60,
    });
  });

  it('says a minute only when the wait is one, and the real minutes past it', () => {
    expect(passwordWaitLine(60)).toBe('Try again in a minute.');
    expect(passwordWaitLine(61)).toBe('Try again in 2 minutes.');
    expect(passwordWaitLine(540)).toBe('Try again in 9 minutes.');
    try {
      setLocale('sv');
      expect(passwordWaitLine(540)).toBe('Försök igen om 9 minuter.');
    } finally {
      setLocale('en');
    }
  });

  it('reads the structured lowercase codes too', () => {
    const structured = (status, error_code) => ({ response: { status, data: { error_code } } });
    expect(passwordAnswer(structured(403, 'seat_requires_password'))).toBe('wrong');
    expect(passwordAnswer(structured(429, 'rate_limited'))).toEqual({ wait: 60 });
  });

  it('leaves every other refusal to Tables', () => {
    expect(passwordAnswer(refused(409, 'SEAT_TAKEN'))).toBeUndefined();
    expect(passwordAnswer(refused(404, 'ROOM_NOT_FOUND'))).toBeUndefined();
    expect(
      passwordAnswer({
        response: { status: 403, data: { error: 'SEAT_REQUIRES_GAMES', min_games: 100 } },
      })
    ).toBeUndefined();
    expect(passwordAnswer(new Error('Network Error'))).toBeUndefined();
  });
});

describe('the seat on the panel', () => {
  const seat = (position, name) => ({
    position,
    seat_index: POSITION_TO_INDEX[position],
    status: name ? 'occupied' : 'free',
    player: name ? { id: `id-${position}`, username: name } : null,
    ...(name ? {} : { password: true }),
  });
  const room = (host) => ({
    code: 'LOCK',
    host_id: `id-${host}`,
    status: 'waiting',
    config: { rule_set: 'louisiana' },
    seats: [seat('north', 'Hanna'), seat('south', null), seat('east', 'Bertil'), seat('west', null)],
  });

  it('names the host and the seat as partner or opponent from where the host sits', () => {
    expect(passwordSeatWords(room('east'), 'west')).toEqual({
      host: 'Bertil',
      table: 'Bertil’s table',
      seat: 'Louisiana · Bertil’s partner',
    });
    expect(passwordSeatWords(room('east'), 'south').seat).toBe('Louisiana · Bertil’s opponent');
    expect(passwordSeatWords(room('north'), 'south').seat).toBe('Louisiana · Hanna’s partner');
  });

  it('speaks Swedish', () => {
    try {
      setLocale('sv');
      expect(passwordSeatWords(room('east'), 'south')).toEqual({
        host: 'Bertil',
        table: 'Bertils bord',
        seat: 'Louisiana · Bertils motståndare',
      });
    } finally {
      setLocale('en');
    }
  });

  it('Tables marks only an open seat with a password, and it stays joinable', () => {
    const seats = tableRow(room('east'), 'open_tables').seats;
    expect(seats.map((entry) => [entry.position, entry.password, entry.canJoin])).toEqual([
      ['east', false, false],
      ['west', true, true],
      ['north', false, false],
      ['south', true, true],
    ]);
    const playing = { ...room('east'), status: 'playing' };
    expect(tableRow(playing, 'substitute_needed').seats.some((entry) => entry.password)).toBe(
      false
    );
  });
});
