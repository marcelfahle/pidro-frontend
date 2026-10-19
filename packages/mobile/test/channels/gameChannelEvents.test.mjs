import { describe, expect, it } from 'bun:test';
import { createCoalescedCallback, waitingRoomEvent } from '../../src/channels/gameRoomEvents.ts';

describe('waiting-room channel events', () => {
  it('maps authoritative invalidation events and local kick separately', () => {
    expect(
      waitingRoomEvent('invite_redeemed', { username: 'mfios1', display_name: 'iOS 1' })
    ).toEqual({
      kind: 'refresh',
      joiningName: 'mfios1',
    });
    expect(waitingRoomEvent('invite_redeemed', { display_name: 'iOS 1' })).toEqual({
      kind: 'refresh',
    });
    for (const event of ['player_kicked', 'seat_moved', 'owner_changed']) {
      expect(waitingRoomEvent(event, {})).toEqual({ kind: 'refresh' });
    }
    expect(waitingRoomEvent('kicked', { reason: 'kicked' })).toEqual({ kind: 'kicked' });
    expect(waitingRoomEvent('game_state', {})).toBeNull();
  });

  it('maps a declined seat for the host, whichever the reason, and drops a broken one', () => {
    const user = { user_id: 'maija', display_name: 'Maija', avatar_url: null };
    const declined = { kind: 'declined', position: 'south', user };
    for (const reason of ['not_now', 'sat_elsewhere'])
      expect(
        waitingRoomEvent('seat_invitation_declined', { position: 'south', user, reason })
      ).toEqual(declined);
    expect(
      waitingRoomEvent('seat_invitation_declined', {
        position: 'south',
        user: { ...user, rank: 'gold' },
        reason: 'not_now',
        seen_at: '2026-10-19T12:00:00Z',
      })
    ).toEqual(declined);
    expect(
      waitingRoomEvent('seat_invitation_declined', {
        position: 'south',
        user: { user_id: 'maija', display_name: 'Maija' },
      })
    ).toEqual(declined);
    for (const payload of [
      null,
      'south',
      { user, reason: 'not_now' },
      { position: 'partner', user },
      { position: 'south', reason: 'not_now' },
      { position: 'south', user: { user_id: 'maija' } },
    ])
      expect(waitingRoomEvent('seat_invitation_declined', payload)).toBeNull();
    expect(waitingRoomEvent('invite_redeemed', null)).toEqual({ kind: 'refresh' });
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
      (id) => cancelled.push(id)
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
