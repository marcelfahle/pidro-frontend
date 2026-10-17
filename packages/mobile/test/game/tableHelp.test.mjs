import { describe, expect, it } from 'bun:test';
import { loneTrumpHolder, paced } from '../../src/features/game/tableHelp.ts';

describe('out of trumps', () => {
  const cold = (eliminated) => ({ hand: 0, eliminated });

  it('names the one player left holding trumps', () => {
    expect(
      loneTrumpHolder({ north: cold(true), east: cold(false), south: cold(true), west: cold(true) })
    ).toBe('east');
  });

  it('is nobody while two still hold trumps, or before the server says', () => {
    expect(
      loneTrumpHolder({ north: cold(true), east: cold(false), south: cold(false), west: cold(true) })
    ).toBeNull();
    expect(loneTrumpHolder({ north: {}, east: {}, south: {}, west: {} })).toBeNull();
    expect(loneTrumpHolder(null)).toBeNull();
  });
});

describe('table pace', () => {
  it('keeps things on screen twice as long when slow', () => {
    expect(paced(1500, 'normal')).toBe(1500);
    expect(paced(1500, 'slow')).toBe(3000);
  });
});
