import { describe, expect, it } from 'bun:test';
import { getTableHapticEvents } from '../../src/game/hapticTransitions.ts';

const card = (key) => ({ key, textureKey: 'spades_14', card: { suit: 'spades', rank: 14 } });
const model = (overrides = {}) => ({
  phase: 'playing',
  trumpSuit: 'spades',
  dealerRelative: 'south',
  seats: {
    north: { cardCount: 6 },
    east: { cardCount: 6 },
    south: { cardCount: 6 },
    west: { cardCount: 6 },
  },
  yourHand: [],
  dealtHand: [],
  yourCardCount: 6,
  dealerCuts: {},
  currentTrick: {},
  playedCards: {},
  currentTurnRelative: 'south',
  legalPlayKeys: new Set(),
  canPlay: false,
  ...overrides,
});

describe('table haptic transitions', () => {
  it('stays silent on cold loads and bulk reconnect updates', () => {
    const reconnected = model({ playedCards: { east: [card('1'), card('2')] } });
    expect(getTableHapticEvents(null, reconnected)).toEqual([]);
    expect(getTableHapticEvents(model(), reconnected)).toEqual([]);
  });

  it('marks every visible deal packet and the final hand shuffle', () => {
    const before = model({ dealStage: 'dealing' });
    const packet = model({
      dealStage: 'dealing',
      seats: { ...before.seats, east: { cardCount: 9 } },
    });
    const sorting = model({ dealStage: 'sorting', seats: packet.seats });
    expect(getTableHapticEvents(before, packet)).toEqual(['deal_packet']);
    expect(getTableHapticEvents(packet, sorting)).toEqual(['hand_shuffle']);
  });

  it('marks opponent card landings and gives the fourth card one trick pulse', () => {
    const first = model({ playedCards: { west: [card('1')] } });
    const second = model({ playedCards: { west: [card('1')], north: [card('2')] } });
    const third = model({
      playedCards: { west: [card('1')], north: [card('2')], east: [card('3')] },
    });
    const fourth = model({
      playedCards: {
        west: [card('1')],
        north: [card('2')],
        east: [card('3')],
        south: [card('4')],
      },
    });
    expect(getTableHapticEvents(model(), first)).toEqual(['card_landed']);
    expect(getTableHapticEvents(first, second)).toEqual(['card_landed']);
    expect(getTableHapticEvents(third, fourth)).toEqual(['trick_complete']);
  });

  it('starts one sequence when dealer cut cards arrive', () => {
    const cuts = model({
      phase: 'dealer_selection',
      dealerCuts: { north: card('north'), east: card('east') },
    });
    expect(getTableHapticEvents(model({ phase: 'dealer_selection' }), cuts)).toEqual([
      'dealer_cut_sequence',
    ]);
    expect(getTableHapticEvents(cuts, cuts)).toEqual([]);
  });
});
