import { describe, expect, it } from 'bun:test';
import { bidTaken, loneTrumpHolder, paced } from '../../src/features/game/tableHelp.ts';

describe('the bidders’ count', () => {
  // East bid. North took 1, East took 3 while West's 2 of trump fell in it,
  // and South took a trick where East played the 2.
  const tricks = [
    { winner: 'north', points: 1, two_of_trump: null },
    { winner: 'east', points: 3, two_of_trump: { position: 'west', points: 1 } },
    { winner: 'south', points: 2, two_of_trump: { position: 'east', points: 1 } },
  ];

  it('counts the bidding side’s tricks, and the 2 of trump with whoever played it', () => {
    // East/West: 3 from East's trick, West's 2 and East's 2 wherever they fell.
    expect(bidTaken(tricks, 'east')).toBe(5);
    expect(bidTaken(tricks, 'west')).toBe(5);
    // North/South: their two tricks, never the 2s their tricks swallowed.
    expect(bidTaken(tricks, 'south')).toBe(3);
  });

  it('starts at nothing and never throws on malformed tricks', () => {
    expect(bidTaken(null, 'north')).toBe(0);
    expect(bidTaken([null, {}, { winner: 'north' }], 'north')).toBe(0);
  });
});

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
