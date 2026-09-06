import { lifecycleFromReply } from '@pidro/shared';
import { useEffect, useRef } from 'react';
import { Channel, Presence } from 'phoenix';
import type { ReadinessSnapshot } from '@pidro/shared';
import {
  describeGameAction,
  extractGameState,
  normalizeTurnTimer,
  shouldAutoSelectDealer,
  type SeatLifecycleSnapshot,
} from '@pidro/shared';
import { batchedUpdates as unstable_batchedUpdates } from '@/utils/batchedUpdates';
import { phoenixSocket } from '../socket';
import { initRealtime } from '@/bootstrap/realtime';
import { useGameStore } from '@/stores/game';
import type { LegalAction, ServerGameState } from '@/types/game';
import type { Position } from '@/types/lobby';
import { waitingRoomEvent, type WaitingRoomEvent } from '../gameRoomEvents';

let globalGameChannel: Channel | null = null;
let notifySeatEvent: ((event: SeatEvent) => void) | undefined;
let gameRefCount = 0;
let currentTopic: string | null = null;

interface UseGameChannelOptions {
  roomCode: string;
  enabled?: boolean;
  onSeatEvent?: (event: SeatEvent) => void;
  onProgressionSummary?: (summary: ProgressionSummary) => void;
  onWaitingRoomEvent?: (event: WaitingRoomEvent) => void;
}

export interface SeatEvent {
  message: string;
  variant: 'warning' | 'success' | 'error';
}

export interface ProgressionSummary {
  rated: boolean;
  xp_earned: number;
  veteran_xp: number;
  veteran_level_before: number;
  veteran_level: number;
  leveled_up: boolean;
  veteran_title_before: string;
  veteran_title: string;
  title_changed: boolean;
  veteran_progress: { into: number; span: number; max: boolean };
  achievements_unlocked: { key: string; name: string; tier: number }[];
  rating: {
    tier_before: string;
    tier_after: string;
    provisional_before: boolean;
    provisional_after: boolean;
    direction: 'up' | 'down' | 'none';
  } | null;
}

function seatDisplayName(position: Position | null, fallback?: string | null): string {
  if (fallback) return fallback;
  if (!position) return 'A player';
  return useGameStore.getState().playerMeta[position].username ?? 'A player';
}

function applyLifecycle(
  snapshot: SeatLifecycleSnapshot,
  notify: boolean,
  onSeatEvent?: (event: SeatEvent) => void
) {
  const before = useGameStore.getState().lifecycle;
  useGameStore.getState().applySeatLifecycle(snapshot);
  if (!notify || useGameStore.getState().lifecycle !== snapshot) return;

  for (const position of ['north', 'east', 'south', 'west'] as Position[]) {
    const previous = before?.seats[position];
    const next = snapshot.seats[position];
    if (!previous || (previous.status === next.status && previous.player_id === next.player_id))
      continue;
    const wasBot = previous.status === 'bot_substitute' || previous.status === 'permanent_bot';
    const isBot = next.status === 'bot_substitute' || next.status === 'permanent_bot';
    const name = isBot
      ? (next.decision?.player_name ?? previous.username ?? 'A player')
      : (next.username ?? 'A player');
    if (isBot && !wasBot && previous.status !== 'vacant') {
      onSeatEvent?.({
        message: `${name} (${position}) disconnected. Bot is filling in.`,
        variant: 'warning',
      });
    } else if (next.status === 'normal') {
      const action = previous.player_id === next.player_id ? 'is back!' : 'joined the table.';
      onSeatEvent?.({ message: `${name} (${position}) ${action}`, variant: 'success' });
    }
  }
}

function parseProgressionSummary(payload: unknown): ProgressionSummary | null {
  if (!payload || typeof payload !== 'object') return null;
  const data = payload as Record<string, unknown>;
  if (typeof data.veteran_level !== 'number' || typeof data.xp_earned !== 'number') return null;
  return data as unknown as ProgressionSummary;
}

export const useGameChannel = ({
  roomCode,
  enabled = true,
  onSeatEvent,
  onProgressionSummary,
  onWaitingRoomEvent,
}: UseGameChannelOptions) => {
  const setServerState = useGameStore((s) => s.setServerState);
  const setLegalActions = useGameStore((s) => s.setLegalActions);
  const setTurnTimer = useGameStore((s) => s.setTurnTimer);
  const clearTurnTimer = useGameStore((s) => s.clearTurnTimer);
  const setYouPosition = useGameStore((s) => s.setYouPosition);
  const youPosition = useGameStore((s) => s.youPositionAbs);
  const setRole = useGameStore((s) => s.setRole);
  const updateCurrentTurn = useGameStore((s) => s.updateCurrentTurn);
  const setPlayerConnected = useGameStore((s) => s.setPlayerConnected);
  const setSeatStatus = useGameStore((s) => s.setSeatStatus);
  const setReadiness = useGameStore((s) => s.setReadiness);
  const setChannelStatus = useGameStore((s) => s.setChannelStatus);
  const setError = useGameStore((s) => s.setError);

  const onSeatEventRef = useRef(onSeatEvent);
  const onProgressionSummaryRef = useRef(onProgressionSummary);
  const onWaitingRoomEventRef = useRef(onWaitingRoomEvent);
  const youPositionRef = useRef(youPosition);

  useEffect(() => {
    onSeatEventRef.current = onSeatEvent;
    onProgressionSummaryRef.current = onProgressionSummary;
    onWaitingRoomEventRef.current = onWaitingRoomEvent;
    youPositionRef.current = youPosition;
  }, [onProgressionSummary, onSeatEvent, onWaitingRoomEvent, youPosition]);

  useEffect(() => {
    initRealtime();

    // Don't connect if not enabled (e.g., game not started yet)
    if (!enabled || !roomCode) {
      return;
    }

    gameRefCount++;

    const topic = `game:${roomCode}`;
    let disposed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (globalGameChannel && currentTopic && currentTopic !== topic) {
        globalGameChannel.leave();
        globalGameChannel = null;
      }

      if (globalGameChannel) return;

      const channel = phoenixSocket.channel(topic);
      currentTopic = topic;
      let presences: Record<string, unknown> = {};
      let dealerSelectionRequestKey: string | null = null;
      const isCurrentChannel = () => !disposed && globalGameChannel === channel;
      const onCurrent = <Payload>(event: string, handler: (payload: Payload) => void) =>
        channel.on(event, (payload) => {
          if (isCurrentChannel()) handler(payload as Payload);
        });

      const maybeAutoSelectDealer = (
        gameState: ServerGameState,
        legalActions: LegalAction[],
        position: Position | null
      ) => {
        if (useGameStore.getState().role !== 'player') return;
        if (!shouldAutoSelectDealer(gameState, legalActions, position)) return;

        const handNumber =
          typeof gameState.hand_number === 'number' ? gameState.hand_number : 'initial';
        const key = `${roomCode}:${handNumber}`;
        if (dealerSelectionRequestKey === key) return;

        dealerSelectionRequestKey = key;
        channel.push('select_dealer', {});
      };

      channel
        .join()
        .receive('ok', (resp: unknown) => {
          if (disposed || globalGameChannel !== channel) return;
          const response = resp as Record<string, unknown> | undefined;

          // Batch all state updates to avoid navigation context issues
          unstable_batchedUpdates(() => {
            setChannelStatus(true, Boolean(response?.reconnected));
            setError(null);

            const role = response?.role as 'player' | 'spectator' | undefined;
            setRole(role ?? null);
            youPositionRef.current = null;
            const lifecycle = lifecycleFromReply(response);
            if (lifecycle) applyLifecycle(lifecycle, false);

            const position = response?.position as Position | undefined;
            if (role === 'player' && position) {
              youPositionRef.current = position;
              setYouPosition(position);
            }

            if (response?.readiness) setReadiness(response.readiness as ReadinessSnapshot);

            const gameState = extractGameState(response);
            if (gameState) {
              setServerState(gameState);
            }

            const legalActions = (response?.legal_actions as LegalAction[] | undefined) ?? [];
            setLegalActions(legalActions);
            setTurnTimer(normalizeTurnTimer(response?.turn_timer));

            if (gameState) {
              maybeAutoSelectDealer(gameState, legalActions, position ?? youPositionRef.current);
            }
          });
        })
        .receive('error', (resp) => {
          if (disposed || globalGameChannel !== channel) return;
          console.error('[GameChannel] Unable to join', topic, resp);
          // Phoenix marks the channel errored and schedules its own bounded
          // rejoin. Keep this channel alive so a transient rejection recovers.
          setChannelStatus(false, true);
          clearTurnTimer();
          const reason =
            (resp as { reason?: string } | undefined)?.reason || 'Unable to join game room.';
          setError(reason);
        });

      onCurrent('game_state', (payload: unknown) => {
        if (disposed || globalGameChannel !== channel) return;
        const data = payload as Record<string, unknown> | undefined;
        const gameState = extractGameState(data);
        if (gameState) {
          const legalActions = (data?.legal_actions as LegalAction[] | undefined) ?? [];
          unstable_batchedUpdates(() => {
            setServerState(gameState);
            setLegalActions(legalActions);
            maybeAutoSelectDealer(gameState, legalActions, youPositionRef.current);
          });
        } else {
          console.warn('[GameChannel] Invalid game_state payload', payload);
        }
      });

      onCurrent('seat_lifecycle', (payload: unknown) => {
        const snapshot = lifecycleFromReply(payload);
        if (snapshot) applyLifecycle(snapshot, true, onSeatEventRef.current);
      });

      onCurrent('game_over', (payload: unknown) => {
        if (disposed || globalGameChannel !== channel) return;
        const data = payload as Record<string, unknown> | undefined;
        const winner =
          data?.winner === 'north_south' || data?.winner === 'east_west' ? data.winner : null;
        const scores = data?.scores as ServerGameState['scores'] | undefined;
        const currentState = useGameStore.getState().serverState;
        if (!currentState) return;

        setServerState({
          ...currentState,
          phase: 'game_over',
          winner,
          ...(scores ? { scores } : {}),
        });
      });

      onCurrent('turn_timer_started', (payload: unknown) => {
        setTurnTimer(normalizeTurnTimer(payload));
      });

      onCurrent('turn_timer_cancelled', (payload: unknown) => {
        const data = payload as { timer_id?: number } | undefined;
        clearTurnTimer(data?.timer_id ?? null);
      });

      onCurrent('turn_auto_played', (payload: unknown) => {
        const data = payload as Record<string, unknown> | undefined;
        const scope = data?.scope;
        const position = (data?.position as Position | null | undefined) ?? null;
        const action = data?.action as Record<string, unknown> | undefined;

        if (scope === 'room') {
          onSeatEventRef.current?.({
            message: `Dealer selection timed out. The server ${describeGameAction(action)}.`,
            variant: 'warning',
          });
          return;
        }

        if (position && position === youPositionRef.current) {
          onSeatEventRef.current?.({
            message: `Time expired. The server ${describeGameAction(action)} for you.`,
            variant: 'warning',
          });
        }
      });

      onCurrent('force_disconnect', () => {
        clearTurnTimer();
        setRole(null);
        setChannelStatus(false, false);
        setError(
          'Disconnected for inactivity after repeated turn timeouts. Retry to rejoin when ready.'
        );
      });

      onCurrent('turn_changed', (payload: unknown) => {
        const data = payload as Record<string, unknown> | undefined;
        const pos: Position | null =
          (data?.position as Position) ||
          (data?.current_player as Position) ||
          (data?.current_turn as Position) ||
          null;
        updateCurrentTurn(pos);
      });

      onCurrent('presence_state', (state: object) => {
        if (useGameStore.getState().lifecycle) return;
        presences = Presence.syncState(presences, state);
        const entries = Presence.list(presences, (id, { metas }) => ({
          id,
          position: (metas[0] as Record<string, unknown> | undefined)?.position as Position | null,
        }));
        entries.forEach(({ id, position }) => setPlayerConnected(id, position, true));
      });

      onCurrent('presence_diff', (diff: { joins: object; leaves: object }) => {
        if (useGameStore.getState().lifecycle) return;
        presences = Presence.syncDiff(presences, diff);

        const diffTyped = diff as {
          leaves?: Record<string, { metas?: Record<string, unknown>[] }>;
          joins?: Record<string, { metas?: Record<string, unknown>[] }>;
        };
        Object.entries(diffTyped.leaves || {}).forEach(([playerId, value]) => {
          const meta = value?.metas?.[0];
          const position = (meta?.position as Position) || null;
          setPlayerConnected(playerId, position, false);
        });
        Object.entries(diffTyped.joins || {}).forEach(([playerId, value]) => {
          const meta = value?.metas?.[0];
          const position = (meta?.position as Position) || null;
          setPlayerConnected(playerId, position, true);
        });
      });

      onCurrent('player_disconnected', (payload: unknown) => {
        if (useGameStore.getState().lifecycle) return;
        const data = payload as Record<string, unknown> | undefined;
        const playerId = (data?.user_id as string) || null;
        const position = (data?.position as Position) || null;
        setPlayerConnected(playerId, position, false);
      });

      onCurrent('player_reconnected', (payload: unknown) => {
        if (useGameStore.getState().lifecycle) return;
        const data = payload as Record<string, unknown> | undefined;
        const playerId = (data?.user_id as string) || null;
        const position = (data?.position as Position) || null;
        if (position) {
          setSeatStatus(position, 'normal');
        }
        setPlayerConnected(playerId, position, true);
      });

      onCurrent('readiness_updated', setReadiness);

      onCurrent('player_reconnecting', (payload: unknown) => {
        if (useGameStore.getState().lifecycle) return;
        const data = payload as Record<string, unknown> | undefined;
        const position = (data?.position as Position) || null;
        if (position) {
          setPlayerConnected(null, position, false);
          setSeatStatus(position, 'reconnecting');
        }
      });

      onCurrent('bot_substitute_active', (payload: unknown) => {
        if (useGameStore.getState().lifecycle) return;
        const data = payload as Record<string, unknown> | undefined;
        const position = (data?.position as Position) || null;
        const username = (data?.username as string) || (data?.player_name as string) || null;
        if (position) {
          setSeatStatus(position, 'bot_substitute', username);
          setPlayerConnected(null, position, true);
          onSeatEventRef.current?.({
            message: `${seatDisplayName(position, username)} disconnected. Bot is filling in.`,
            variant: 'warning',
          });
        }
      });

      onCurrent('player_reclaimed_seat', (payload: unknown) => {
        if (useGameStore.getState().lifecycle) return;
        const data = payload as Record<string, unknown> | undefined;
        const position = (data?.position as Position) || null;
        const username = (data?.username as string) || (data?.player_name as string) || null;
        if (position) {
          setSeatStatus(position, 'normal', username);
          setPlayerConnected(null, position, true);
          onSeatEventRef.current?.({
            message: `${seatDisplayName(position, username)} is back!`,
            variant: 'success',
          });
        }
      });

      onCurrent('seat_permanently_botted', (payload: unknown) => {
        if (useGameStore.getState().lifecycle) return;
        const data = payload as Record<string, unknown> | undefined;
        const position = (data?.position as Position) || null;
        if (position) {
          setSeatStatus(position, 'permanent_bot');
          setPlayerConnected(null, position, true);
        }
      });

      onCurrent('substitute_available', (payload: unknown) => {
        if (useGameStore.getState().lifecycle) return;
        const data = payload as Record<string, unknown> | undefined;
        const position = (data?.position as Position) || null;
        if (position) {
          setSeatStatus(position, 'vacant');
          setPlayerConnected(null, position, false);
        }
      });

      onCurrent('substitute_seat_closed', (payload: unknown) => {
        if (useGameStore.getState().lifecycle) return;
        const data = payload as Record<string, unknown> | undefined;
        const position = (data?.position as Position) || null;
        if (position) {
          setSeatStatus(position, 'permanent_bot');
          setPlayerConnected(null, position, true);
        }
      });

      onCurrent('substitute_joined', (payload: unknown) => {
        if (useGameStore.getState().lifecycle) return;
        const data = payload as Record<string, unknown> | undefined;
        const position = (data?.position as Position) || null;
        const username = (data?.username as string) || (data?.player_name as string) || null;
        if (position) {
          setSeatStatus(position, 'normal', username ?? null);
          setPlayerConnected(null, position, true);
          onSeatEventRef.current?.({
            message: `${username ?? 'A new player'} joined as substitute`,
            variant: 'success',
          });
        }
      });

      for (const event of [
        'invite_redeemed',
        'player_kicked',
        'seat_moved',
        'owner_changed',
        'kicked',
      ]) {
        onCurrent(event, (payload: Record<string, unknown>) => {
          const mapped = waitingRoomEvent(event, payload);
          if (mapped) onWaitingRoomEventRef.current?.(mapped);
        });
      }

      onCurrent('progression_summary', (payload: unknown) => {
        const summary = parseProgressionSummary(payload);
        if (summary) onProgressionSummaryRef.current?.(summary);
      });

      channel.onError((reason) => {
        if (disposed || globalGameChannel !== channel) return;
        console.warn('[GameChannel] Error', reason);
        setChannelStatus(false, true);
      });

      channel.onClose(() => {
        const wasActive = globalGameChannel === channel;
        if (disposed || !wasActive) return;
        globalGameChannel = null;
        currentTopic = null;
        setChannelStatus(false, false);
        // Keep the last confirmed read-only role visible while reconnecting.
        setRole(useGameStore.getState().role === 'spectator' ? 'spectator' : null);
        // An unexpected close (socket drop, server restart) leaves no channel
        // behind and nothing re-runs the effect — reconnect ourselves while a
        // screen still needs this topic. Intentional leave() sets refCount 0.
        if (gameRefCount > 0) {
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            if (!disposed && gameRefCount > 0 && !globalGameChannel) {
              connect();
            }
          }, 1200);
        }
      });

      globalGameChannel = channel;
      notifySeatEvent = (event) => onSeatEventRef.current?.(event);
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      gameRefCount--;
      if (gameRefCount === 0 && globalGameChannel) {
        globalGameChannel.leave();
        globalGameChannel = null;
        notifySeatEvent = undefined;
        currentTopic = null;
      }
    };
  }, [
    roomCode,
    enabled,
    setServerState,
    setLegalActions,
    setTurnTimer,
    clearTurnTimer,
    setYouPosition,
    setRole,
    updateCurrentTurn,
    setPlayerConnected,
    setSeatStatus,
    setReadiness,
    setChannelStatus,
    setError,
  ]);
};

export function pushGameAction(event: string, payload: object) {
  const channel = globalGameChannel;
  if (!channel || channel.state !== 'joined') {
    console.warn('[GameChannel] Cannot push, no active channel');
    return Promise.reject(new Error('No active game channel'));
  }
  if (event !== 'get_seat_lifecycle' && useGameStore.getState().role !== 'player') {
    return Promise.reject(new Error('Watching is read-only'));
  }

  return new Promise<void>((resolve, reject) => {
    channel
      .push(event, payload)
      .receive('ok', (response: { readiness?: ReadinessSnapshot }) => {
        const snapshot = lifecycleFromReply(response);
        if (snapshot && globalGameChannel === channel)
          applyLifecycle(snapshot, true, notifySeatEvent);
        if (globalGameChannel === channel && response?.readiness)
          useGameStore.getState().setReadiness(response.readiness);
        resolve();
      })
      .receive('error', (error: { readiness?: ReadinessSnapshot }) => {
        const snapshot = lifecycleFromReply(error);
        if (snapshot && globalGameChannel === channel)
          applyLifecycle(snapshot, true, notifySeatEvent);
        if (globalGameChannel === channel && error?.readiness)
          useGameStore.getState().setReadiness(error.readiness);
        reject(error);
      })
      .receive('timeout', () => reject(new Error('Request timed out')));
  });
}

export function refreshSeatLifecycle(): Promise<void> {
  return pushGameAction('get_seat_lifecycle', {});
}
