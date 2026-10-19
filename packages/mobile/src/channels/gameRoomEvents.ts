import { publicPlayerName, type HeldPlayer, type Position } from '@pidro/shared';

export type WaitingRoomEvent =
  | { kind: 'refresh'; joiningName?: string }
  | { kind: 'kicked' }
  | { kind: 'declined'; position: Position; user: HeldPlayer };

const positions: unknown[] = ['north', 'east', 'south', 'west'];

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

/** Null for an event this screen does not handle, or one too broken to read. */
export function waitingRoomEvent(event: string, value: unknown): WaitingRoomEvent | null {
  const payload = record(value);
  if (event === 'kicked') return { kind: 'kicked' };
  if (event === 'invite_redeemed') {
    const joiningName = publicPlayerName(payload.username, '', payload.display_name);
    return { kind: 'refresh', ...(joiningName ? { joiningName } : {}) };
  }
  if (event === 'player_kicked' || event === 'seat_moved' || event === 'owner_changed') {
    return { kind: 'refresh' };
  }
  if (event === 'seat_invitation_declined') {
    // Not now and sitting down elsewhere read the same to the host.
    const user = record(payload.user);
    if (
      !positions.includes(payload.position) ||
      typeof user.user_id !== 'string' ||
      typeof user.display_name !== 'string'
    )
      return null;
    return {
      kind: 'declined',
      position: payload.position as Position,
      user: {
        user_id: user.user_id,
        display_name: user.display_name,
        avatar_url: typeof user.avatar_url === 'string' ? user.avatar_url : null,
      },
    };
  }
  return null;
}

export function createCoalescedCallback(
  callback: () => void,
  schedule: (run: () => void) => ReturnType<typeof setTimeout> = (run) => setTimeout(run, 100),
  cancel: (timer: ReturnType<typeof setTimeout>) => void = clearTimeout
) {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    trigger() {
      if (timer !== null) return;
      timer = schedule(() => {
        timer = null;
        callback();
      });
    },
    dispose() {
      if (timer === null) return;
      cancel(timer);
      timer = null;
    },
  };
}
