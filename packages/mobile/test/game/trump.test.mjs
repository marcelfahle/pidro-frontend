import { describe, expect, it } from 'bun:test';
import { strongestSuit, trumpsIn } from '../../src/features/game/trump.ts';

const card = (rank, suit) => ({ rank, suit });

describe('trump count', () => {
  // Every suit's five is in hand, so each count includes its off-five.
  const hand = [
    card(14, 'hearts'),
    card(5, 'hearts'),
    card(5, 'diamonds'),
    card(11, 'diamonds'),
    card(3, 'diamonds'),
    card(5, 'clubs'),
    card(5, 'spades'),
    card(2, 'spades'),
    card(9, 'clubs'),
  ];

  for (const [suit, count] of [
    ['hearts', 3], // A♥ 5♥ + 5♦
    ['diamonds', 4], // 5♦ J♦ 3♦ + 5♥
    ['clubs', 3], // 5♣ 9♣ + 5♠
    ['spades', 3], // 5♠ 2♠ + 5♣
  ]) {
    it(`counts ${suit} with the same-colour five`, () => {
      expect(trumpsIn(hand, suit)).toHaveLength(count);
    });
  }

  it('never counts a five of the other colour', () => {
    expect(trumpsIn([card(5, 'clubs'), card(5, 'spades')], 'hearts')).toEqual([]);
  });
});

describe('the preview', () => {
  const hand = [
    card(14, 'spades'),
    card(5, 'clubs'),
    card(10, 'clubs'),
    card(13, 'hearts'),
    card(5, 'diamonds'),
    card(2, 'spades'),
  ];

  it('lifts the suit and its off-five, nothing else', () => {
    expect(trumpsIn(hand, 'spades')).toEqual([
      card(14, 'spades'),
      card(5, 'clubs'),
      card(2, 'spades'),
    ]);
    expect(trumpsIn(hand, 'hearts')).toEqual([card(13, 'hearts'), card(5, 'diamonds')]);
  });

  it('starts on the suit with the most trumps, counting the off-five', () => {
    // Clubs and spades hold two cards each; the 5♣ makes spades three.
    expect(strongestSuit(hand)).toBe('spades');
    // Diamonds' 5♥ beats two clubs.
    expect(
      strongestSuit([card(5, 'hearts'), card(4, 'diamonds'), card(9, 'clubs'), card(8, 'clubs')])
    ).toBe('diamonds');
  });

  it('takes the first suit on a tie', () => {
    expect(strongestSuit([card(9, 'clubs'), card(9, 'hearts')])).toBe('hearts');
    expect(strongestSuit([])).toBe('hearts');
  });
});
