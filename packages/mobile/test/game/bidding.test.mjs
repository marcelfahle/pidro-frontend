import { afterEach, describe, expect, it } from 'bun:test';
import { setLocale } from '@pidro/shared';
import { bidSeatLine } from '../../src/features/game/bidding.ts';

const line = (overrides) =>
  bidSeatLine({ bid: undefined, holdsHigh: false, onTurn: false, hand: 4, ...overrides });

afterEach(() => setLocale('en'));

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

  it('translates current bids without changing the bid event or high-bid tone', () => {
    for (const locale of ['en', 'sv', 'en']) {
      setLocale(locale);
      expect(line({ bid: 9, holdsHigh: true })).toEqual({
        text: locale === 'sv' ? 'Bud 9 · högst' : 'Bid 9 · high',
        short: locale === 'sv' ? 'Högst 9' : 'High 9',
        tone: 'high',
        pulse: '4:9',
      });
      expect(line({ bid: 7 }).text).toBe(locale === 'sv' ? 'Bud 7' : 'Bid 7');
      expect(line({ bid: 'pass' }).text).toBe(locale === 'sv' ? 'Passat' : 'Passed');
      expect(line({ onTurn: true }).text).toBe(locale === 'sv' ? 'Bjuder…' : 'Bidding…');
    }
  });

  it('says who is bidding, and nothing for a seat still waiting', () => {
    expect(line({ onTurn: true })).toEqual({ text: 'Bidding…', short: 'Bidding…', tone: 'now' });
    expect(line({})).toBeNull();
  });
});
