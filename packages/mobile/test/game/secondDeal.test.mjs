import { describe, expect, it } from 'bun:test';
import { makePlan } from '../../src/game/canvas/secondDealPlan.ts';

const seat = (kept, drawn, cardCount) => ({ secondDeal: { kept, drawn }, cardCount });
const card = (rank, suit) => ({ key: `${suit}_${rank}`, textureKey: `${suit}_${rank}` });

describe('the second deal, played out card by card', () => {
  // West deals. Nora (north) kept 1, Eli (east) 3, you 2; West kept 4 and picks from the pack.
  const held = [
    card(14, 'spades'),
    card(11, 'spades'),
    card(13, 'hearts'),
    card(8, 'diamonds'),
    card(4, 'clubs'),
    card(12, 'hearts'),
    card(7, 'clubs'),
    card(3, 'diamonds'),
    card(9, 'hearts'),
  ];
  const yourHand = [
    card(14, 'spades'),
    card(11, 'spades'),
    card(10, 'spades'),
    card(6, 'hearts'),
    card(12, 'clubs'),
    card(7, 'diamonds'),
  ];
  const model = {
    phase: 'second_deal',
    dealerRelative: 'west',
    yourHand,
    seats: {
      north: seat(1, 5, 6),
      east: seat(3, 3, 6),
      south: seat(2, 4, 6),
      west: seat(4, null, 8),
    },
  };

  it('throws everyone down to their trumps, deals each seat its cards, and gives the dealer the rest', () => {
    const plan = makePlan(model, held);
    const first = plan.frames[0];
    const last = plan.frames.at(-1);
    expect(first.hand).toEqual({ north: 9, east: 9, south: 9, west: 9 });
    expect(last.thrown).toEqual({ north: 8, east: 6, south: 7, west: 5 });
    expect(last.hand).toEqual({ north: 6, east: 6, south: 6, west: 8 });
    expect(last.drawn).toEqual({ north: 5, east: 3, south: 4 });
    expect(last.pack).toBe(0);
    expect(plan.yourThrown).toHaveLength(7);
    expect(plan.yourDrawn.map((c) => c.key)).toEqual([
      'spades_10',
      'hearts_6',
      'clubs_12',
      'diamonds_7',
    ]);
  });

  it('throws in one swoop, then gives each seat its packet, from the dealer’s left', () => {
    const plan = makePlan(model, held);
    const beats = plan.frames.map((frame) => ({ hand: frame.hand, pack: frame.pack }));
    // Nine each, everyone thrown down to trumps, the pack out, then each packet.
    expect(beats.map((beat) => beat.hand.north)).toEqual([9, 1, 1, 6, 6, 6, 6]);
    expect(beats.map((beat) => beat.hand.east)).toEqual([9, 3, 3, 3, 6, 6, 6]);
    expect(beats.map((beat) => beat.hand.west)).toEqual([9, 4, 4, 4, 4, 4, 8]);
    expect(beats.map((beat) => beat.pack)).toEqual([0, 0, 16, 11, 8, 4, 0]);
  });

  it('plays nothing out without every opponent’s counts', () => {
    expect(
      makePlan({ ...model, seats: { ...model.seats, east: { secondDeal: null } } }, held)
    ).toBeNull();
  });
});

describe('the second deal when you deal', () => {
  const held = [
    card(14, 'spades'),
    card(11, 'spades'),
    card(13, 'hearts'),
    card(8, 'diamonds'),
    card(4, 'clubs'),
    card(12, 'hearts'),
    card(7, 'clubs'),
    card(3, 'diamonds'),
    card(9, 'hearts'),
  ];
  // Your pick: your two trumps and the six the others left in the pack.
  const pool = [
    card(14, 'spades'),
    card(11, 'spades'),
    card(10, 'spades'),
    card(5, 'spades'),
    card(2, 'spades'),
    card(6, 'hearts'),
    card(12, 'clubs'),
    card(7, 'diamonds'),
  ];
  const model = {
    phase: 'playing',
    dealerRelative: 'south',
    yourHand: pool,
    seats: {
      north: seat(1, 5, 6),
      east: seat(3, 3, 6),
      west: seat(4, 2, 6),
      south: seat(2, null, 6),
    },
  };

  it('throws your non-trumps, deals the others, then the rest of the pack lands in your hand', () => {
    const plan = makePlan(model, held);
    const last = plan.frames.at(-1);
    expect(plan.yourThrown).toHaveLength(7);
    expect(plan.yourDrawn).toEqual([]);
    expect(last.thrown.south).toBe(7);
    expect(last.hand.south).toBe(8);
    expect(last.drawn).toEqual({ west: 2, north: 5, east: 3 });
    expect(last.pack).toBe(0);
  });
});
