import { describe, expect, it } from 'bun:test';
import { seatLine } from '../../src/features/game/seatLine.ts';

const seat = (overrides) => ({
  seatStatus: 'bot_substitute',
  lastPlayedCard: null,
  out: false,
  ...overrides,
});
const kingOfHearts = { card: { rank: 13, suit: 'hearts' } };

describe('the line under a bot seat', () => {
  it('says what it played, like anyone', () => {
    expect(seatLine(seat({ lastPlayedCard: kingOfHearts }))).toEqual({ text: 'Plays K♥' });
    expect(seatLine(seat({ lastPlayedCard: kingOfHearts }))).toEqual(
      seatLine(seat({ seatStatus: 'normal', lastPlayedCard: kingOfHearts }))
    );
  });

  it('says what the table says it is doing, without a short form', () => {
    const choosing = { text: 'Choosing trump', tone: 'now' };
    expect(seatLine(seat(), choosing)).toBe(choosing);
    expect(seatLine(seat(), null)).toBeNull();
  });

  it('still says out, reconnecting, or nothing for an empty seat', () => {
    expect(seatLine(seat({ out: true }))?.text).toBe('Out');
    expect(seatLine(seat({ seatStatus: 'reconnecting' }), { text: 'Playing…' })?.text).toBe(
      'Reconnecting…'
    );
    expect(seatLine(seat({ seatStatus: 'vacant' }), { text: 'Playing…' })).toBeNull();
  });
});
