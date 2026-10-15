import { afterEach, expect, test } from 'bun:test';
import { useGameStore } from '../src/stores/game';
import type { ServerGameState } from '../src/types/game';

const base = {
  phase: 'bidding',
  current_player: 'north',
  players: { north: {}, east: {}, south: {}, west: {} },
} as unknown as ServerGameState;

const orderedBids = [
  { position: 'east', amount: 6 },
  { position: 'south', amount: 'pass' },
  { position: 'west', amount: 7 },
];

afterEach(() => useGameStore.getState().reset());

test('keeps the bids in the order the server sent them', () => {
  const store = useGameStore.getState();
  store.setRole('player');
  store.setServerState({ ...base, bids: orderedBids } as unknown as ServerGameState);

  const state = useGameStore.getState().serverState;
  expect(state?.bid_order).toEqual(orderedBids);
  expect(state?.bids).toEqual({ east: 6, south: 'pass', west: 7 } as ServerGameState['bids']);
});

test('spectators keep the bid order too', () => {
  const store = useGameStore.getState();
  store.setRole('spectator');
  store.setServerState({ ...base, bids: orderedBids } as unknown as ServerGameState);

  expect(useGameStore.getState().serverState?.bid_order).toEqual(orderedBids);
});
