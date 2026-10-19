import { expect, test } from 'bun:test';
import { countBadgeText } from '../src/features/countBadge.ts';

test('a count badge hides at zero and stops growing at 99+', () => {
  expect(countBadgeText(0)).toBeNull();
  expect(countBadgeText(-3)).toBeNull();
  expect(countBadgeText(Number.NaN)).toBeNull();
  expect(countBadgeText(1)).toBe('1');
  expect(countBadgeText(99)).toBe('99');
  expect(countBadgeText(100)).toBe('99+');
  expect(countBadgeText(1234)).toBe('99+');
});
