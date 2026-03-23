import type {
  ActiveTurnTimer,
  GamePhase,
  LegalAction,
  Position,
  ServerGameState,
  ServerTurnTimerPayload,
} from '@pidro/shared';
import { useGameStore } from '@pidro/shared';
import type { Channel } from 'phoenix';
import { Presence } from 'phoenix';
import { useEffect, useRef } from 'react';
import { phoenixSocket } from './socket';

export interface SeatEvent {
  message: string;
  variant: 'warning' | 'success' | 'error';
}

export interface OwnerDecisionEvent {
  position: Position;
  playerName: string;
}

let globalGameChannel: Channel | null = null;
let gameRefCount = 0;
let currentTopic: string | null = null;
let isPageUnloading = false;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    isPageUnloading = true;
  });
}

interface UseGameChannelOptions {
  roomCode: string;
  enabled?: boolean;
  onSeatEvent?: (event: SeatEvent) => void;
  onOwnerDecision?: (event: OwnerDecisionEvent) => void;
}

function seatDisplayName(position: Position | null, fallback?: string | null): string {
  if (fallback) {
    return fallback;
  }

  if (!position) {
    return 'A player';
  }

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

export const useGameChannel = ({
  roomCode,
  enabled = true,
  onSeatEvent,
  onOwnerDecision,
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
  onSeatEventRef.current = onSeatEvent;

  const onOwnerDecisionRef = useRef(onOwnerDecision);
  onOwnerDecisionRef.current = onOwnerDecision;

  const youPositionRef = useRef(youPosition);
  youPositionRef.current = youPosition;

  useEffect(() => {
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

      channel
        .join()
        .receive('ok', (resp: unknown) => {
          const response = resp as Record<string, unknown> | undefined;

          setChannelStatus(true, Boolean(response?.reconnected));
          setError(null);

          const position = response?.position as Position | undefined;
          if (position) {
            setYouPosition(position);
          }

          const role = response?.role as 'player' | 'spectator' | undefined;
          setRole(role ?? null);

          const gameState = extractGameState(response);
          if (gameState) {
            setServerState(gameState);
          }

          const legalActions = (response?.legal_actions as LegalAction[] | undefined) ?? [];
          setLegalActions(legalActions);
          setTurnTimer(normalizeTurnTimer(response?.turn_timer));
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
        const data = payload as Record<string, unknown> | undefined;
        const gameState = extractGameState(data);
        if (gameState) {
          const legalActions = (data?.legal_actions as LegalAction[] | undefined) ?? [];
          setServerState(gameState);
          setLegalActions(legalActions);
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
          'Disconnected for inactivity after repeated turn timeouts. Retry to rejoin when ready.',
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
        for (const { id, position } of entries) {
          setPlayerConnected(id, position, true);
        }
      });

      channel.on('presence_diff', (diff) => {
        presences = Presence.syncDiff(presences, diff);

        const diffTyped = diff as {
          leaves?: Record<string, { metas: Record<string, unknown>[] }>;
          joins?: Record<string, { metas: Record<string, unknown>[] }>;
        };
        for (const [playerId, value] of Object.entries(diffTyped.leaves || {})) {
          const meta = value?.metas?.[0];
          const position = (meta?.position as Position) || null;
          setPlayerConnected(playerId, position, false);
        }
        for (const [playerId, value] of Object.entries(diffTyped.joins || {})) {
          const meta = value?.metas?.[0];
          const position = (meta?.position as Position) || null;
          setPlayerConnected(playerId, position, true);
        }
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

      channel.on('owner_decision_available', (payload: unknown) => {
        const data = payload as Record<string, unknown> | undefined;
        const position = (data?.position as Position) || null;
        const playerName = seatDisplayName(
          position,
          ((data?.player_name as string) || (data?.username as string) || null) as string | null,
        );
        if (position) {
          onOwnerDecisionRef.current?.({ position, playerName });
        }
      });

      channel.onError(() => {
        setChannelStatus(false, true);
      });

      channel.onClose(() => {
        if (globalGameChannel === channel) {
          globalGameChannel = null;
          currentTopic = null;
        }
        setChannelStatus(false, false);
        setRole(null);
      });

      globalGameChannel = channel;
    };

    connect();

    return () => {
      gameRefCount--;
      if (gameRefCount === 0 && globalGameChannel) {
        // During page refresh/unload, don't explicitly leave — let the socket
        // drop naturally so the backend treats it as a disconnect (with
        // reconnection window) rather than an intentional leave.
        if (!isPageUnloading) {
          globalGameChannel.leave();
        }
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
