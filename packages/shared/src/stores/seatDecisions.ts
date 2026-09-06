import { useRef, useState } from 'react';
import { useGameStore } from './game';
import type { Position } from '../types/lobby';

export function pendingSeatDecisions(state: ReturnType<typeof useGameStore.getState>) {
  const snapshot = state.lifecycle;
  if (
    !snapshot ||
    snapshot.owner_id !== state.youPlayerId ||
    state.role !== 'player' ||
    snapshot.room_status !== 'playing' ||
    !state.isChannelJoined ||
    state.serverState?.phase === 'complete' ||
    state.serverState?.phase === 'game_over'
  )
    return [];
  return (Object.keys(snapshot.seats) as Position[]).flatMap((position) => {
    const seat = snapshot.seats[position];
    if (!seat.decision || seat.status !== 'permanent_bot') return [];
    const key = `${snapshot.room_id}:${state.youPlayerId}:${position}:${seat.decision.id}`;
    return state.dismissedDecisions.includes(key)
      ? []
      : [
          {
            key,
            position,
            id: seat.decision.id,
            playerName: seat.decision.player_name || 'A player',
          },
        ];
  });
}

/** UI-only dismissal/request state. Eligibility and timing policy remain server-owned. */
export function useSeatDecisions(
  push: (event: string, payload: object) => Promise<void>,
  refresh: () => Promise<void>,
) {
  const state = useGameStore();
  const queue = pendingSeatDecisions(state);
  const activeKey = useRef<string | null>(null);
  const candidate =
    queue.find((decision) => decision.key === activeKey.current) ?? queue[0] ?? null;
  activeKey.current = candidate?.key ?? null;
  const isYourTurn =
    state.youPositionAbs != null && state.serverState?.current_player === state.youPositionAbs;
  const visible = isYourTurn ? null : candidate;
  const [request, setRequest] = useState<{
    key: string;
    busy: boolean;
    error: string | null;
  } | null>(null);
  const inFlight = useRef<string | null>(null);

  const keepBot = () => {
    if (visible && inFlight.current !== visible.key) state.dismissDecision(visible.key);
  };
  const openSeat = async () => {
    if (!visible || inFlight.current === visible.key) return;
    const decision = visible;
    // Recheck eligibility at the click, not just at the previous render.
    if (!pendingSeatDecisions(useGameStore.getState()).some((d) => d.key === decision.key)) return;
    inFlight.current = decision.key;
    setRequest({ key: decision.key, busy: true, error: null });
    try {
      await push('open_seat', {
        position: decision.position,
        decision_id: decision.id,
      });
      useGameStore.getState().dismissDecision(decision.key);
      setRequest((current) => (current?.key === decision.key ? null : current));
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'reason' in error
          ? String(error.reason)
          : 'Could not open the seat. Please try again.';
      setRequest((current) =>
        current?.key === decision.key ? { key: decision.key, busy: true, error: message } : current,
      );
    } finally {
      // A timeout has an unknown outcome; reconcile before another attempt.
      await refresh().catch(() => {});
      if (inFlight.current === decision.key) inFlight.current = null;
      setRequest((current) =>
        current?.key === decision.key ? { ...current, busy: false } : current,
      );
    }
  };
  return {
    decision: visible,
    pendingCount: queue.length,
    busy: !!visible && request?.key === visible.key && request.busy,
    error: visible && request?.key === visible.key ? request.error : null,
    keepBot,
    openSeat,
  };
}
