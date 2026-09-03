export type WaitingRoomEvent = { kind: 'refresh'; joiningName?: string } | { kind: 'kicked' };

export function waitingRoomEvent(
  event: string,
  payload: Record<string, unknown>
): WaitingRoomEvent | null {
  if (event === 'kicked') return { kind: 'kicked' };
  if (event === 'invite_redeemed') {
    const joiningName =
      typeof payload.display_name === 'string' && payload.display_name.trim()
        ? payload.display_name
        : undefined;
    return { kind: 'refresh', ...(joiningName ? { joiningName } : {}) };
  }
  if (event === 'player_kicked' || event === 'seat_moved' || event === 'owner_changed') {
    return { kind: 'refresh' };
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
