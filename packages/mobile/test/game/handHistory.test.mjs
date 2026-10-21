import { expect, test } from 'bun:test';
import { handHistoryRows } from '../../src/features/game/handHistory.ts';

const history = [
  {
    hand_number: 1,
    bidding_team: 'east_west',
    bidder: 'west',
    bid: 8,
    trump: 'clubs',
    made: true,
    captured: { north_south: 4, east_west: 10 },
    scores: { north_south: 4, east_west: 10 },
  },
  {
    hand_number: 2,
    bidding_team: 'north_south',
    bidder: 'north',
    bid: 9,
    made: false,
    captured: { north_south: 7, east_west: 7 },
    scores: { north_south: -5, east_west: 17 },
  },
];

test('a rejoined snapshot has every hand newest first, with server outcomes and totals', () => {
  const snapshot = JSON.parse(JSON.stringify({ hand_history: history }));
  expect(handHistoryRows(snapshot.hand_history, 'south')).toEqual([
    {
      number: 2,
      bidder: 'north',
      ours: true,
      bid: 9,
      trump: null,
      made: false,
      captured: [7, 7],
      totals: [-5, 17],
    },
    {
      number: 1,
      bidder: 'west',
      ours: false,
      bid: 8,
      trump: 'clubs',
      made: true,
      captured: [4, 10],
      totals: [4, 10],
    },
  ]);
  expect(handHistoryRows(snapshot.hand_history, 'east')[0]).toEqual({
    number: 2,
    bidder: 'north',
    ours: false,
    bid: 9,
    trump: null,
    made: false,
    captured: [7, 7],
    totals: [17, -5],
  });
  expect(handHistoryRows(history, null)).toEqual(handHistoryRows(history, 'north'));
  expect(snapshot.hand_history).toEqual(history);
  expect(handHistoryRows(undefined, 'south')).toEqual([]);
});

test('no eight-hand cap and repeated snapshots do not append duplicate hands', () => {
  const long = Array.from({ length: 12 }, (_, i) => ({ ...history[i % 2], hand_number: i + 1 }));
  const first = handHistoryRows(long, 'south');
  expect(first.map((row) => row.number)).toEqual([12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
  expect(handHistoryRows(long, 'south')).toEqual(first);
});
