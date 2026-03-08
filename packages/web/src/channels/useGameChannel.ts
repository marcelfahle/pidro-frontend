import type { LegalAction, Position, ServerGameState } from '@pidro/shared';
import { useGameStore } from '@pidro/shared';
import type { Channel } from 'phoenix';
import { Presence } from 'phoenix';
import { useEffect, useRef } from 'react';
import { phoenixSocket } from './socket';

export interface SeatEvent {
  message: string;
  variant: 'warning' | 'success' | 'error';
}

let globalGameChannel: Channel | null = null;
let gameRefCount = 0;
let currentTopic: string | null = null;

interface UseGameChannelOptions {
  roomCode: string;
  enabled?: boolean;
  onSeatEvent?: (event: SeatEvent) => void;
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
}: UseGameChannelOptions) => {
  const setServerState = useGameStore((s) => s.setServerState);
  const setLegalActions = useGameStore((s) => s.setLegalActions);
  const setYouPosition = useGameStore((s) => s.setYouPosition);
  const setRole = useGameStore((s) => s.setRole);
  const updateCurrentTurn = useGameStore((s) => s.updateCurrentTurn);
  const setPlayerConnected = useGameStore((s) => s.setPlayerConnected);
  const setSeatStatus = useGameStore((s) => s.setSeatStatus);
  const addReadyPlayer = useGameStore((s) => s.addReadyPlayer);
  const setChannelStatus = useGameStore((s) => s.setChannelStatus);
  const setError = useGameStore((s) => s.setError);

  const onSeatEventRef = useRef(onSeatEvent);
  onSeatEventRef.current = onSeatEvent;

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
        })
        .receive('error', (resp) => {
          console.error('[GameChannel] Unable to join', topic, resp);
          setChannelStatus(false);
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
        const username = (data?.username as string) || null;
        if (position) {
          setSeatStatus(position, 'reconnecting');
          onSeatEventRef.current?.({
            message: `${username ?? 'A player'} is reconnecting...`,
            variant: 'warning',
          });
        }
      });

      channel.on('bot_substitute_active', (payload: unknown) => {
        const data = payload as Record<string, unknown> | undefined;
        const position = (data?.position as Position) || null;
        const username = (data?.username as string) || (data?.player_name as string) || null;
        if (position) {
          setSeatStatus(position, 'bot_substitute');
          onSeatEventRef.current?.({
            message: `${username ?? 'A player'} disconnected. Bot is filling in.`,
            variant: 'warning',
          });
        }
      });

      channel.on('player_reclaimed_seat', (payload: unknown) => {
        const data = payload as Record<string, unknown> | undefined;
        const position = (data?.position as Position) || null;
        const username = (data?.username as string) || (data?.player_name as string) || null;
        if (position) {
          setSeatStatus(position, 'normal');
          setPlayerConnected(null, position, true);
          onSeatEventRef.current?.({
            message: `${username ?? 'A player'} is back!`,
            variant: 'success',
          });
        }
      });

      channel.on('seat_permanently_botted', (payload: unknown) => {
        const data = payload as Record<string, unknown> | undefined;
        const position = (data?.position as Position) || null;
        if (position) {
          setSeatStatus(position, 'permanent_bot', 'Bot');
        }
      });

      channel.on('substitute_joined', (payload: unknown) => {
        const data = payload as Record<string, unknown> | undefined;
        const position = (data?.position as Position) || null;
        const username = (data?.username as string) || (data?.player_name as string) || null;
        if (position) {
          setSeatStatus(position, 'normal', username);
          setPlayerConnected(null, position, true);
          onSeatEventRef.current?.({
            message: `${username ?? 'A new player'} joined as substitute`,
            variant: 'success',
          });
        }
      });

      channel.onError(() => {
        setChannelStatus(false, true);
      });

      channel.onClose(() => {
        setChannelStatus(false, false);
        setRole(null);
      });

      globalGameChannel = channel;
    };

    connect();

    return () => {
      gameRefCount--;
      if (gameRefCount === 0 && globalGameChannel) {
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
