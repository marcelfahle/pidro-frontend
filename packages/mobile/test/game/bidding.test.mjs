import { describe, expect, it } from 'bun:test';
import { bidSeatLine } from '../../src/features/game/bidding.ts';

const line = (overrides) =>
  bidSeatLine({ bid: undefined, holdsHigh: false, onTurn: false, hand: 4, ...overrides });

describe('a seat while the hand is bid', () => {
  it('keeps its bid, and says when it holds the high bid', () => {
    expect(line({ bid: 7 })).toEqual({ text: 'Bid 7', short: 'Bid 7', pulse: '4:7' });
    expect(line({ bid: 9, holdsHigh: true })).toEqual({
      text: 'Bid 9 · high',
      short: 'High 9',
      tone: 'high',
      pulse: '4:9',
    });
    expect(line({ bid: 'pass' })).toEqual({
      text: 'Passed',
      short: 'Passed',
      tone: 'quiet',
      pulse: '4:pass',
    });
  });

  it('pulses for the bid, not for being outbid', () => {
    expect(line({ bid: 9, holdsHigh: true }).pulse).toBe(line({ bid: 9 }).pulse);
    expect(line({ bid: 9 }).pulse).not.toBe(line({ bid: 9, hand: 5 }).pulse);
  });

  it('says who is bidding, and nothing for a seat still waiting', () => {
    expect(line({ onTurn: true })).toEqual({ text: 'Bidding…', short: 'Bidding…', tone: 'now' });
    expect(line({})).toBeNull();
  });
});
