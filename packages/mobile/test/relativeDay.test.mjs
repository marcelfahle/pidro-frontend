import { afterEach, expect, test } from 'bun:test';
import { setLocale } from '@pidro/shared';
import { relativeDay } from '../src/features/relativeDay.ts';

afterEach(() => setLocale('en'));

// Local times, so the calendar day is the player's whatever zone the test runs in.
const now = new Date(2026, 9, 19, 9, 30);
const at = (month, day, hour = 12, year = 2026) => new Date(year, month, day, hour);

test('one wording for when something happened, counted in calendar days', () => {
  expect(relativeDay(at(9, 19, 0), now)).toBe('today');
  expect(relativeDay(at(9, 20), now)).toBe('today');
  // Late last night is yesterday, though it is fewer than 24 hours ago.
  expect(relativeDay(at(9, 18, 23), now)).toBe('yesterday');
  expect(relativeDay(at(9, 17, 1), now)).toBe('2 days ago');
  expect(relativeDay(at(9, 13), now)).toBe('6 days ago');
  expect(relativeDay(at(9, 12), now)).toBe('last week');
  expect(relativeDay(at(9, 6), now)).toBe('last week');
  expect(relativeDay(at(9, 5), now)).toBe('in October');
  expect(relativeDay(at(8, 2), now)).toBe('in September');
  expect(relativeDay(at(10, 2, 12, 2025), now)).toBe('in November');
  expect(relativeDay(at(9, 2, 12, 2025), now)).toBe('in October 2025');
  expect(relativeDay(at(8, 30).toISOString(), now)).toBe('in September');
  expect(relativeDay('not a date', now)).toBeNull();
});

test('the same words in Swedish', () => {
  setLocale('sv');
  expect(relativeDay(at(9, 19), now)).toBe('idag');
  expect(relativeDay(at(9, 18), now)).toBe('igår');
  expect(relativeDay(at(9, 16), now)).toBe('för 3 dagar sedan');
  expect(relativeDay(at(9, 10), now)).toBe('förra veckan');
  expect(relativeDay(at(8, 2), now)).toBe('i september');
});
