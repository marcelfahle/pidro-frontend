import { useEffect, useRef } from 'react';
import { Channel, Presence } from 'phoenix';
import { batchedUpdates as unstable_batchedUpdates } from '@/utils/batchedUpdates';
import { phoenixSocket } from '../socket';
import { initRealtime } from '@/bootstrap/realtime';
import { useGameStore } from '@/stores/game';
import type {
  ActiveTurnTimer,
  GamePhase,
  LegalAction,
  ServerGameState,
  ServerTurnTimerPayload,
} from '@/types/game';
import type { Position } from '@/types/lobby';

let globalGameChannel: Channel | null = null;
let gameRefCount = 0;
let currentTopic: string | null = null;

interface UseGameChannelOptions {
  roomCode: string;
  enabled?: boolean;
  onSeatEvent?: (event: SeatEvent) => void;
  onOwnerDecision?: (event: OwnerDecisionEvent) => void;
  onProgressionSummary?: (summary: ProgressionSummary) => void;
}

export interface SeatEvent {
  message: string;
  variant: 'warning' | 'success' | 'error';
}

export interface OwnerDecisionEvent {
  position: Position;
  playerName: string;
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

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeTurnTimer(payload: unknown): ActiveTurnTimer | null {
  if (!payload || typeof payload !== 'object') return null;

  const data = payload as Partial<ServerTurnTimerPayload>;
  const timerId = asNumber(data.timer_id);
  const durationMs = asNumber(data.duration_ms);
  const transitionDelayMs = asNumber(data.transition_delay_ms);
  const eventSeq = asNumber(data.event_seq);

  if (
    timerId == null ||
    durationMs == null ||
    transitionDelayMs == null ||
    eventSeq == null ||
    (data.scope !== 'seat' && data.scope !== 'room') ||
    typeof data.phase !== 'string'
  ) {
    return null;
  }

  const remainingMs = asNumber(data.remaining_ms) ?? durationMs + transitionDelayMs;

  return {
    timerId,
    scope: data.scope,
    position: (data.position as Position | null | undefined) ?? null,
    phase: data.phase as GamePhase,
    durationMs,
    transitionDelayMs,
    serverTime: typeof data.server_time === 'string' ? data.server_time : new Date().toISOString(),
    remainingMs,
    receivedAtMs: Date.now(),
    eventSeq,
  };
}

function describeAction(action: Record<string, unknown> | undefined): string {
  switch (action?.type) {
    case 'pass':
      return 'passed';
    case 'bid':
      return `bid ${String(action.amount ?? '')}`.trim();
    case 'declare_trump':
      return `declared ${String(action.suit ?? 'trump')}`;
    case 'play_card':
      return 'played a card';
    case 'select_hand':
      return 'selected a hand';
    case 'select_dealer':
      return 'selected the dealer';
    default:
      return 'acted';
  }
}

function parseProgressionSummary(payload: unknown): ProgressionSummary | null {
  if (!payload || typeof payload !== 'object') return null;
  const data = payload as Record<string, unknown>;
  if (typeof data.veteran_level !== 'number' || typeof data.xp_earned !== 'number') return null;
  return data as unknown as ProgressionSummary;
}

function extractGameState(data: Record<string, unknown> | undefined): ServerGameState | null {
  if (!data) return null;

  const candidates = [
    data.state,
    data.game_state,
    (data.data as Record<string, unknown> | undefined)?.game_state,
    (data.data as Record<string, unknown> | undefined)?.state,
    data,
  ];

  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object' && 'phase' in candidate) {
      return candidate as ServerGameState;
    }
  }

  return null;
}

function shouldAutoSelectDealer(
  gameState: ServerGameState,
  legalActions: LegalAction[],
  position: Position | null
): boolean {
  return (
    position === 'north' &&
    gameState.phase === 'dealer_selection' &&
    !gameState.dealer_selection_cuts &&
    legalActions.some((action) => action.type === 'select_dealer')
  );
}

export const useGameChannel = ({
  roomCode,
  enabled = true,
  onSeatEvent,
  onOwnerDecision,
  onProgressionSummary,
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
  const addReadyPlayer = useGameStore((s) => s.addReadyPlayer);
  const setChannelStatus = useGameStore((s) => s.setChannelStatus);
  const setError = useGameStore((s) => s.setError);

  const onSeatEventRef = useRef(onSeatEvent);
  const onOwnerDecisionRef = useRef(onOwnerDecision);
  const onProgressionSummaryRef = useRef(onProgressionSummary);
  const youPositionRef = useRef(youPosition);

  useEffect(() => {
    onSeatEventRef.current = onSeatEvent;
    onOwnerDecisionRef.current = onOwnerDecision;
    onProgressionSummaryRef.current = onProgressionSummary;
    youPositionRef.current = youPosition;
  }, [onOwnerDecision, onProgressionSummary, onSeatEvent, youPosition]);

  useEffect(() => {
    initRealtime();

    // Don't connect if not enabled (e.g., game not started yet)
    if (!enabled || !roomCode) {
      return;
    }

    gameRefCount++;

    const topic = `game:${roomCode}`;

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

      const maybeAutoSelectDealer = (
        gameState: ServerGameState,
        legalActions: LegalAction[],
        position: Position | null
      ) => {
        if (!shouldAutoSelectDealer(gameState, legalActions, position)) return;

        const handNumber =
          typeof gameState.hand_number === 'number' ? gameState.hand_number : 'initial';
        const key = `${roomCode}:${handNumber}`;
        if (dealerSelectionRequestKey === key) return;

        dealerSelectionRequestKey = key;
        channel.push('select_dealer', {}).receive('error', (error: unknown) => {
          console.debug('[GameChannel] Auto dealer selection skipped', error);
        });
      };

      channel
        .join()
        .receive('ok', (resp: unknown) => {
          console.log('[GameChannel] Joined', topic, resp);
          const response = resp as Record<string, unknown> | undefined;

          // Batch all state updates to avoid navigation context issues
          unstable_batchedUpdates(() => {
            setChannelStatus(true, Boolean(response?.reconnected));
            setError(null);

            const position = response?.position as Position | undefined;
            if (position) {
              console.log('[GameChannel] Setting position from join:', position);
              youPositionRef.current = position;
              setYouPosition(position);
            } else {
              console.warn('[GameChannel] No position in join response');
            }

            const role = response?.role as 'player' | 'spectator' | undefined;
            setRole(role ?? null);

            const gameState = extractGameState(response);
            console.log(
              '[GameChannel] Extracted game state from join:',
              gameState ? 'success' : 'null'
            );
            if (gameState) {
              console.log('[GameChannel] Setting server state, phase:', gameState.phase);
              setServerState(gameState);
            }

            const legalActions = (response?.legal_actions as LegalAction[] | undefined) ?? [];
            console.log('[GameChannel] Legal actions from join:', legalActions.length);
            setLegalActions(legalActions);
            setTurnTimer(normalizeTurnTimer(response?.turn_timer));

            if (gameState) {
              maybeAutoSelectDealer(gameState, legalActions, position ?? youPositionRef.current);
            }
          });
        })
        .receive('error', (resp) => {
          console.error('[GameChannel] Unable to join', topic, resp);
          if (globalGameChannel === channel) {
            globalGameChannel = null;
            currentTopic = null;
          }
          channel.leave();
          setChannelStatus(false);
          clearTurnTimer();
          const reason =
            (resp as { reason?: string } | undefined)?.reason || 'Unable to join game room.';
          setError(reason);
        });

      channel.on('game_state', (payload: unknown) => {
        console.log('[GameChannel] game_state event received:', payload);
        const data = payload as Record<string, unknown> | undefined;
        const gameState = extractGameState(data);
        if (gameState) {
          console.log('[GameChannel] Setting server state from event, phase:', gameState.phase);
          const legalActions = (data?.legal_actions as LegalAction[] | undefined) ?? [];
          console.log('[GameChannel] Legal actions from event:', legalActions.length);
          unstable_batchedUpdates(() => {
            setServerState(gameState);
            setLegalActions(legalActions);
            maybeAutoSelectDealer(gameState, legalActions, youPositionRef.current);
          });
        } else {
          console.warn('[GameChannel] Invalid game_state payload', payload);
        }
      });

      channel.on('turn_timer_started', (payload: unknown) => {
        setTurnTimer(normalizeTurnTimer(payload));
      });

      channel.on('turn_timer_cancelled', (payload: unknown) => {
        const data = payload as { timer_id?: number } | undefined;
        clearTurnTimer(data?.timer_id ?? null);
      });

      channel.on('turn_auto_played', (payload: unknown) => {
        const data = payload as Record<string, unknown> | undefined;
        const scope = data?.scope;
        const position = (data?.position as Position | null | undefined) ?? null;
        const action = data?.action as Record<string, unknown> | undefined;

        if (scope === 'room') {
          onSeatEventRef.current?.({
            message: `Dealer selection timed out. The server ${describeAction(action)}.`,
            variant: 'warning',
          });
          return;
        }

        if (position && position === youPositionRef.current) {
          onSeatEventRef.current?.({
            message: `Time expired. The server ${describeAction(action)} for you.`,
            variant: 'warning',
          });
        }
      });

      channel.on('force_disconnect', () => {
        clearTurnTimer();
        setRole(null);
        setChannelStatus(false, false);
        setError(
          'Disconnected for inactivity after repeated turn timeouts. Retry to rejoin when ready.'
        );
      });

      channel.on('turn_changed', (payload: unknown) => {
        const data = payload as Record<string, unknown> | undefined;
        const pos: Position | null =
          (data?.position as Position) ||
          (data?.current_player as Position) ||
          (data?.current_turn as Position) ||
          null;
        updateCurrentTurn(pos);
      });

      channel.on('presence_state', (state) => {
        presences = Presence.syncState(presences, state);
        const entries = Presence.list(presences, (id, { metas }) => ({
          id,
          position: (metas[0] as Record<string, unknown> | undefined)?.position as Position | null,
        }));
        entries.forEach(({ id, position }) => setPlayerConnected(id, position, true));
      });

      channel.on('presence_diff', (diff) => {
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

      channel.on('player_disconnected', (payload: unknown) => {
        const data = payload as Record<string, unknown> | undefined;
        const playerId = (data?.user_id as string) || null;
        const position = (data?.position as Position) || null;
        setPlayerConnected(playerId, position, false);
      });

      channel.on('player_reconnected', (payload: unknown) => {
        const data = payload as Record<string, unknown> | undefined;
        const playerId = (data?.user_id as string) || null;
        const position = (data?.position as Position) || null;
        if (position) {
          setSeatStatus(position, 'normal');
        }
        setPlayerConnected(playerId, position, true);
      });

      channel.on('player_ready', (payload: unknown) => {
        const data = payload as Record<string, unknown> | undefined;
        const position = data?.position as Position | undefined;
        if (position) {
          addReadyPlayer(position);
        }
      });

      channel.on('player_reconnecting', (payload: unknown) => {
        const data = payload as Record<string, unknown> | undefined;
        const position = (data?.position as Position) || null;
        if (position) {
          setPlayerConnected(null, position, false);
          setSeatStatus(position, 'reconnecting');
        }
      });

      channel.on('bot_substitute_active', (payload: unknown) => {
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

      channel.on('player_reclaimed_seat', (payload: unknown) => {
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

      channel.on('seat_permanently_botted', (payload: unknown) => {
        const data = payload as Record<string, unknown> | undefined;
        const position = (data?.position as Position) || null;
        if (position) {
          setSeatStatus(position, 'permanent_bot');
          setPlayerConnected(null, position, true);
        }
      });

      channel.on('substitute_available', (payload: unknown) => {
        const data = payload as Record<string, unknown> | undefined;
        const position = (data?.position as Position) || null;
        if (position) {
          setSeatStatus(position, 'vacant');
          setPlayerConnected(null, position, false);
        }
      });

      channel.on('substitute_seat_closed', (payload: unknown) => {
        const data = payload as Record<string, unknown> | undefined;
        const position = (data?.position as Position) || null;
        if (position) {
          setSeatStatus(position, 'permanent_bot');
          setPlayerConnected(null, position, true);
        }
      });

      channel.on('substitute_joined', (payload: unknown) => {
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

      channel.on('progression_summary', (payload: unknown) => {
        const summary = parseProgressionSummary(payload);
        if (summary) onProgressionSummaryRef.current?.(summary);
      });

      channel.on('owner_decision_available', (payload: unknown) => {
        const data = payload as Record<string, unknown> | undefined;
        const position = (data?.position as Position) || null;
        const playerName = seatDisplayName(
          position,
          ((data?.player_name as string) || (data?.username as string) || null) as string | null
        );
        if (position) {
          onOwnerDecisionRef.current?.({ position, playerName });
        }
      });

      channel.onError((reason) => {
        console.warn('[GameChannel] Error', reason);
        setChannelStatus(false, true);
      });

      channel.onClose(() => {
        console.log('[GameChannel] Closed', topic);
        const wasActive = globalGameChannel === channel;
        if (wasActive) {
          globalGameChannel = null;
          currentTopic = null;
        }
        setChannelStatus(false, false);
        setRole(null);
        // An unexpected close (socket drop, server restart) leaves no channel
        // behind and nothing re-runs the effect — reconnect ourselves while a
        // screen still needs this topic. Intentional leave() sets refCount 0.
        if (wasActive && gameRefCount > 0) {
          setTimeout(() => {
            if (gameRefCount > 0 && !globalGameChannel) {
              console.log('[GameChannel] Reconnecting after close', topic);
              connect();
            }
          }, 1200);
        }
      });

      globalGameChannel = channel;
    };

    connect();

    return () => {
      gameRefCount--;
      if (gameRefCount === 0 && globalGameChannel) {
        console.log('[GameChannel] Leaving', currentTopic);
        globalGameChannel.leave();
        globalGameChannel = null;
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
    addReadyPlayer,
    setChannelStatus,
    setError,
  ]);
};

export function pushGameAction(event: string, payload: object) {
  const channel = globalGameChannel;
  if (!channel) {
    console.warn('[GameChannel] Cannot push, no active channel');
    return Promise.reject(new Error('No active game channel'));
  }

  return new Promise<void>((resolve, reject) => {
    channel
      .push(event, payload)
      .receive('ok', () => resolve())
      .receive('error', (error: unknown) => reject(error))
      .receive('timeout', () => reject(new Error('Request timed out')));
  });
}
