import { beforeEach, describe, expect, it, spyOn } from 'bun:test';
import { useGameStore } from '../src/stores/game';

const snapshot = (revision = 1, instance = 'a', phase = 'dealer_selection') => ({
  game_instance_id: instance,
  state_revision: revision,
  server_time_ms: 10000,
  presentation: {
    dealer_selection: { started_at_ms: 10000, ends_at_ms: 13000 },
  },
  legal_actions: [{ type: 'pass' }],
  state: {
    phase,
    current_dealer: 'east',
    players: {},
    scores: { north_south: 0, east_west: 0 },
  },
});
beforeEach(() => {
  useGameStore.getState().reset();
  useGameStore.getState().setRole('player');
});

describe('game snapshot authority', () => {
  it('applies state, actions, revision and server presentation together', () => {
    const updates: unknown[] = [];
    const unsub = useGameStore.subscribe((state) => updates.push(state));
    expect(useGameStore.getState().applyGameSnapshot(snapshot())).toBe(true);
    unsub();
    expect(updates).toHaveLength(1);
    expect(useGameStore.getState().serverState?.dealer).toBe('east');
    expect(useGameStore.getState().dealerPresentation).toMatchObject({
      serverTimeMs: 10000,
      endsAtMs: 13000,
    });
  });
  it('rejects duplicate and out-of-order snapshots, including actions and timing', () => {
    const store = useGameStore.getState();
    store.applyGameSnapshot(snapshot(2, 'a', 'bidding'));
    const before = useGameStore.getState();
    expect(store.applyGameSnapshot(snapshot(1))).toBe(false);
    expect(store.applyGameSnapshot(snapshot(2))).toBe(false);
    expect(useGameStore.getState()).toBe(before);
    expect(before.dealerPresentation).toBeNull();
  });
  it('does not rewind presentation when a newer revision spent longer in transit', () => {
    const clock = spyOn(Date, 'now').mockReturnValue(1000);
    try {
      const store = useGameStore.getState();
      store.applyGameSnapshot(snapshot());
      clock.mockReturnValue(2500);
      store.applyGameSnapshot({ ...snapshot(2), server_time_ms: 10200 });
      expect(useGameStore.getState().dealerPresentation).toMatchObject({
        serverTimeMs: 11500,
        receivedAtMs: 2500,
        endsAtMs: 13000,
      });
    } finally {
      clock.mockRestore();
    }
  });
  it('rehydrates only an authorized equal-revision player join without replaying presentation', () => {
    const store = useGameStore.getState();
    const payload = snapshot(4);
    const hand = [{ rank: 14, suit: 'spades' }];
    const privateSnapshot = {
      ...payload,
      state: { ...payload.state, players: { south: { hand } } },
    };
    store.setYouPosition('south');
    store.applyGameSnapshot(privateSnapshot);
    const { snapshotCursor, dealerPresentation } = useGameStore.getState();
    store.setRole(null);
    expect(useGameStore.getState().serverState?.players.south.hand).toBe(1);
    expect(useGameStore.getState().legalActions).toEqual([]);
    expect(store.applyGameSnapshot(privateSnapshot, { rehydratePlayer: true })).toBe(false);
    store.setRole('player');
    store.setYouPosition('south');
    expect(store.applyGameSnapshot(privateSnapshot)).toBe(false);
    expect(
      store.applyGameSnapshot(
        { ...privateSnapshot, server_time_ms: 12000 },
        { rehydratePlayer: true },
      ),
    ).toBe(true);
    expect(useGameStore.getState().serverState?.players.south.hand).toEqual(hand);
    expect(useGameStore.getState().legalActions).toEqual(payload.legal_actions);
    expect(useGameStore.getState().snapshotCursor).toBe(snapshotCursor);
    expect(useGameStore.getState().dealerPresentation).toBe(dealerPresentation);
    const hydrated = useGameStore.getState();
    expect(store.applyGameSnapshot(privateSnapshot)).toBe(false);
    expect(
      store.applyGameSnapshot({ ...privateSnapshot, state_revision: 3 }, { rehydratePlayer: true }),
    ).toBe(false);
    expect(
      store.applyGameSnapshot(
        { ...privateSnapshot, state: { ...privateSnapshot.state, phase: 'bidding' } },
        { rehydratePlayer: true },
      ),
    ).toBe(false);
    expect(
      store.applyGameSnapshot({ state: privateSnapshot.state }, { rehydratePlayer: true }),
    ).toBe(false);
    expect(useGameStore.getState()).toBe(hydrated);
    store.applyGameSnapshot({ ...privateSnapshot, game_instance_id: 'b', state_revision: 0 });
    expect(store.applyGameSnapshot(privateSnapshot, { rehydratePlayer: true })).toBe(false);
  });
  it('resets revisions for a new instance but rejects a retired instance', () => {
    const store = useGameStore.getState();
    store.applyGameSnapshot(snapshot(30));
    expect(store.applyGameSnapshot(snapshot(0, 'b'))).toBe(true);
    expect(store.applyGameSnapshot(snapshot(31, 'a'))).toBe(false);
    expect(useGameStore.getState().snapshotCursor).toEqual({
      instanceId: 'b',
      revision: 0,
    });
    store.reset();
    expect(store.applyGameSnapshot(snapshot())).toBe(true);
  });
  it('reconnects into bidding without presentation, even if stale timing is attached', () => {
    useGameStore.getState().applyGameSnapshot(snapshot(12, 'a', 'bidding'));
    expect(useGameStore.getState().serverState?.phase).toBe('bidding');
    expect(useGameStore.getState().dealerPresentation).toBeNull();
  });
  it('supports legacy payloads only before a versioned snapshot', () => {
    const store = useGameStore.getState();
    expect(store.applyGameSnapshot({ game_state: snapshot().state })).toBe(true);
    store.applyGameSnapshot(snapshot());
    expect(store.applyGameSnapshot({ state: snapshot().state })).toBe(false);
    expect(store.applyGameSnapshot({ ...snapshot(), state_revision: NaN })).toBe(false);
  });
  it('does not give spectators private cards or legal actions', () => {
    const store = useGameStore.getState();
    store.setRole('spectator');
    const payload = snapshot();
    store.applyGameSnapshot({
      ...payload,
      state: {
        ...payload.state,
        players: { south: { hand: [{ rank: 14, suit: 'spades' }] } },
      },
    });
    expect(useGameStore.getState().legalActions).toEqual([]);
    expect(useGameStore.getState().serverState?.players.south?.hand).toBe(1);
  });
});
