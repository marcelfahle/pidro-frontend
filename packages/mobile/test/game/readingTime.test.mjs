import { describe, expect, it } from 'bun:test';
import { readingTimeMs } from '../../src/features/game/readingTime';

describe('table message reading time', () => {
  it('gives every message a moment to be noticed', () => {
    expect(readingTimeMs('')).toBe(1500);
  });

  it('grows with every character a reader has to get through', () => {
    expect(readingTimeMs('Nora is back.')).toBe(1500 + 13 * 60);
    expect(readingTimeMs('Your cards and the rest of the deck. Keeping the best six.')).toBe(
      1500 + 58 * 60
    );
  });

  it('counts a suit symbol as one character and ignores padding', () => {
    expect(readingTimeMs('  Trump ♥ ')).toBe(readingTimeMs('Trump H'));
  });
});
