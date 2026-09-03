import { describe, expect, it } from 'bun:test';
import {
  createCoalescedCallback,
  waitingRoomEvent,
} from '../../src/channels/gameRoomEvents.ts';

describe('waiting-room channel events', () => {
  it('maps authoritative invalidation events and local kick separately', () => {
    expect(waitingRoomEvent('invite_redeemed', { display_name: 'Anna' })).toEqual({
      kind: 'refresh',
      joiningName: 'Anna',
    });
    for (const event of ['player_kicked', 'seat_moved', 'owner_changed']) {
      expect(waitingRoomEvent(event, {})).toEqual({ kind: 'refresh' });
    }
    expect(waitingRoomEvent('kicked', { reason: 'kicked' })).toEqual({ kind: 'kicked' });
    expect(waitingRoomEvent('game_state', {})).toBeNull();
  });

  it('coalesces a burst into one scheduled refresh and supports cleanup', () => {
    const scheduled = [];
    const cancelled = [];
    let calls = 0;
    const callback = createCoalescedCallback(
      () => {
        calls += 1;
      },
      (run) => {
        scheduled.push(run);
        return scheduled.length;
      },
      (id) => cancelled.push(id),
    );

    callback.trigger();
    callback.trigger();
    callback.trigger();
    expect(scheduled).toHaveLength(1);
    scheduled[0]();
    expect(calls).toBe(1);

    callback.trigger();
    callback.dispose();
    expect(cancelled).toEqual([2]);
  });
});
