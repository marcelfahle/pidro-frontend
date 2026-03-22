import type { ActiveTurnTimer, Card, Position, Room, SeatType, Suit } from '@pidro/shared';
import { useGameStore, useGameViewModel } from '@pidro/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { lobbyApi } from '../api/lobby';
import {
  type OwnerDecisionEvent,
  pushGameAction,
  type SeatEvent,
  useGameChannel,
} from '../channels/useGameChannel';
import { GameOverOverlay } from '../components/game/GameOverOverlay';
import { GameTable } from '../components/game/GameTable';
import { OwnerDecisionBanner } from '../components/game/OwnerDecisionBanner';
import { WaitingRoom } from '../components/game/WaitingRoom';
import { ConnectionBanner } from '../components/ui/ConnectionBanner';
import { Spinner } from '../components/ui/Spinner';
import { ToastContainer, useToast } from '../components/ui/Toast';
import { useAuthStore } from '../stores/auth';

function getHttpStatus(err: unknown): number | undefined {
  return (err as { response?: { status?: number } })?.response?.status;
}

const ROOM_POLL_INTERVAL = 3000;

function deriveSeatConfig(room: Room): { seat_2: SeatType; seat_3: SeatType; seat_4: SeatType } {
  const seats = room.seats ?? [];
  const seatType = (index: number): SeatType => {
    const seat = seats.find((s) => s.seat_index === index);
    if (seat?.player?.is_bot) return 'ai';
    return 'open';
  };
  return { seat_2: seatType(1), seat_3: seatType(2), seat_4: seatType(3) };
}

function hasActiveTurnWindow(turnTimer: ActiveTurnTimer | null): boolean {
  if (!turnTimer || turnTimer.scope !== 'seat') {
    return false;
  }

  const elapsedMs = Date.now() - turnTimer.receivedAtMs;
  const remainingMs = Math.max(0, turnTimer.remainingMs - elapsedMs);
  const transitionRemainingMs = Math.max(0, remainingMs - turnTimer.durationMs);
  return transitionRemainingMs <= 0 && remainingMs > 0;
}

function ShellMessage({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="pidro-page">
      <div className="pidro-window flex min-h-[520px] items-center justify-center">
        <div className="pidro-panel w-full max-w-lg p-8 text-center">
          <div className="mb-5 flex justify-center">
            <div className="pidro-banner">{title}</div>
          </div>
          <div className="text-base text-cyan-50/80">{children}</div>
          {action && <div className="mt-6 flex justify-center">{action}</div>}
        </div>
      </div>
    </div>
  );
}

export function GamePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const userId = useAuthStore((s) => s.user?.id ?? null);

  const {
    serverState,
    playerMeta,
    readyPlayers,
    youPositionAbs,
    role,
    turnTimer,
    isChannelJoined,
    lastError,
    initFromRoom,
    setError,
    reset,
  } = useGameStore(
    useShallow((s) => ({
      serverState: s.serverState,
      playerMeta: s.playerMeta,
      readyPlayers: s.readyPlayers,
      youPositionAbs: s.youPositionAbs,
      role: s.role,
      turnTimer: s.turnTimer,
      isChannelJoined: s.isChannelJoined,
      lastError: s.lastError,
      initFromRoom: s.initFromRoom,
      setError: s.setError,
      reset: s.reset,
    })),
  );

  const viewModel = useGameViewModel();

  const [roomLoading, setRoomLoading] = useState(true);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [channelEnabled, setChannelEnabled] = useState(false);
  const [handShaking, setHandShaking] = useState(false);
  const [optimisticCard, setOptimisticCard] = useState<Card | null>(null);
  const fetchIdRef = useRef(0);

  const roomConfigRef = useRef<{
    name: string;
    hostId: string | null;
    seats: { seat_2: SeatType; seat_3: SeatType; seat_4: SeatType };
  } | null>(null);

  const { messages: toastMessages, addToast, dismissToast } = useToast();

  const [ownerDecisionQueue, setOwnerDecisionQueue] = useState<OwnerDecisionEvent[]>([]);
  const dismissedSeatsRef = useRef<Set<Position>>(new Set());

  const fetchRoom = useCallback(
    async (roomCode: string, playerId: string) => {
      const currentFetchId = ++fetchIdRef.current;
      setRoomLoading(true);
      setRoomError(null);
      setChannelEnabled(false);
      try {
        const room = await lobbyApi.getRoom(roomCode);
        if (fetchIdRef.current !== currentFetchId) return;

        roomConfigRef.current = {
          name: room.name ?? 'Game Room',
          hostId: room.host_id ?? null,
          seats: deriveSeatConfig(room),
        };

        initFromRoom({ room, youPlayerId: playerId });
        setChannelEnabled(true);
      } catch (err: unknown) {
        if (fetchIdRef.current !== currentFetchId) return;
        const status = getHttpStatus(err);
        if (status === 404) {
          setRoomError('Room not found. It may have been closed.');
        } else if (status === 403) {
          setRoomError('You do not have access to this room.');
        } else {
          setRoomError('Failed to connect to server. Please check your connection.');
        }
      } finally {
        if (fetchIdRef.current === currentFetchId) setRoomLoading(false);
      }
    },
    [initFromRoom],
  );

  const handleRetry = useCallback(() => {
    setOptimisticCard(null);
    reset();
    if (code && userId) {
      fetchRoom(code, userId);
    }
  }, [reset, code, userId, fetchRoom]);

  const handleSeatEvent = useCallback(
    (event: SeatEvent) => {
      addToast(event.message, event.variant);
    },
    [addToast],
  );

  const handleOwnerDecision = useCallback(
    (event: OwnerDecisionEvent) => {
      const isOwner = roomConfigRef.current?.hostId === userId;
      if (!isOwner) return;
      if (dismissedSeatsRef.current.has(event.position)) return;

      setOwnerDecisionQueue((prev) => {
        if (prev.some((e) => e.position === event.position)) return prev;
        return [...prev, event];
      });
    },
    [userId],
  );

  const handleOpenSeat = useCallback(
    (position: Position) => {
      dismissedSeatsRef.current.add(position);
      setOwnerDecisionQueue((prev) => prev.filter((e) => e.position !== position));
      pushGameAction('open_seat', { position }).catch((err: unknown) => {
        const message =
          typeof err === 'object' && err !== null && 'reason' in err
            ? String((err as { reason: string }).reason)
            : 'Failed to open seat';
        addToast(message, 'error');
      });
    },
    [addToast],
  );

  const handleKeepBot = useCallback((position: Position) => {
    dismissedSeatsRef.current.add(position);
    setOwnerDecisionQueue((prev) => prev.filter((e) => e.position !== position));
  }, []);

  useEffect(() => {
    if (!code || !userId) return;
    fetchRoom(code, userId);
  }, [code, userId, fetchRoom]);

  useGameChannel({
    roomCode: code ?? '',
    enabled: channelEnabled,
    onSeatEvent: handleSeatEvent,
    onOwnerDecision: handleOwnerDecision,
  });

  useEffect(() => {
    if (!code || !userId || !channelEnabled) return;
    if (serverState !== null) return;

    const interval = setInterval(async () => {
      try {
        const room = await lobbyApi.getRoom(code);
        initFromRoom({ room, youPlayerId: userId });
      } catch {
        // Ignore polling errors while waiting room is active.
      }
    }, ROOM_POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [code, userId, channelEnabled, serverState, initFromRoom]);

  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  const pushAction = useCallback(
    async (event: string, payload: object) => {
      try {
        await pushGameAction(event, payload);
      } catch (err: unknown) {
        const message =
          typeof err === 'object' && err !== null && 'reason' in err
            ? String((err as { reason: string }).reason)
            : 'Action failed';
        addToast(message, 'error');

        if (event === 'play_card') {
          setOptimisticCard(null);
          setHandShaking(true);
          setTimeout(() => setHandShaking(false), 400);
        }
      }
    },
    [addToast],
  );

  const handlePlayCard = useCallback(
    (card: Card) => {
      setOptimisticCard(card);
      pushAction('play_card', { card: { rank: card.rank, suit: card.suit } });
    },
    [pushAction],
  );

  const handleBid = useCallback(
    (amount: number) => {
      pushAction('bid', { amount });
    },
    [pushAction],
  );

  const handlePass = useCallback(() => {
    pushAction('pass', {});
  }, [pushAction]);

  const handleDeclareTrump = useCallback(
    (suit: Suit) => {
      pushAction('declare_trump', { suit });
    },
    [pushAction],
  );

  const handleSelectHand = useCallback(
    (cards: Card[]) => {
      pushAction('select_hand', {
        cards: cards.map((c) => ({ rank: c.rank, suit: c.suit })),
      });
    },
    [pushAction],
  );

  const handleLeave = useCallback(() => {
    if (code) {
      const leavePromise =
        role === 'spectator' ? lobbyApi.unwatchRoom(code) : lobbyApi.leaveRoom(code);

      leavePromise.catch(() => {
        // Best effort
      });
    }
    navigate('/lobby');
  }, [code, navigate, role]);

  const handleBackToLobby = useCallback(() => {
    navigate('/lobby');
  }, [navigate]);

  const handleReady = useCallback(() => {
    pushAction('ready', {});
  }, [pushAction]);

  const handleWatchAsSpectator = useCallback(async () => {
    if (!code || !userId) {
      return;
    }

    setRoomLoading(true);
    setRoomError(null);
    setChannelEnabled(false);

    try {
      await lobbyApi.watchRoom(code);
      setError(null);
      await fetchRoom(code, userId);
    } catch (err: unknown) {
      const status = getHttpStatus(err);
      setRoomLoading(false);
      setChannelEnabled(false);
      setError(
        status === 404 || status === 403
          ? 'This game is no longer available to spectate.'
          : 'Unable to watch this game right now.',
      );
    }
  }, [code, userId, setError, fetchRoom]);

  const handlePlayAgain = useCallback(async () => {
    const config = roomConfigRef.current;
    if (!config) {
      navigate('/lobby');
      return;
    }

    const hasBot =
      config.seats.seat_2 === 'ai' || config.seats.seat_3 === 'ai' || config.seats.seat_4 === 'ai';

    try {
      const result = await lobbyApi.createRoom({
        name: config.name,
        settings: { min_games: 1, time_limit: 0, private: false },
        seats: config.seats,
        ...(hasBot && { bot_difficulty: 'basic' }),
      });
      const newCode = result?.code;
      if (!newCode) throw new Error('No room code returned');
      navigate(`/game/${newCode}`);
    } catch {
      addToast('Failed to create new game', 'error');
    }
  }, [navigate, addToast]);

  // Clear optimistic card when server state updates (confirms the play)
  const prevServerStateRef = useRef(serverState);
  if (serverState !== prevServerStateRef.current) {
    prevServerStateRef.current = serverState;
    if (optimisticCard) {
      setOptimisticCard(null);
    }
  }

  if (!code) {
    return <ShellMessage title="Invalid Game Code">Invalid game code.</ShellMessage>;
  }

  if (roomLoading) {
    return (
      <ShellMessage title="Loading">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p>Loading game...</p>
        </div>
      </ShellMessage>
    );
  }

  if (roomError) {
    const isNotFound = roomError.includes('not found');
    return (
      <ShellMessage
        title={isNotFound ? 'Room Not Found' : 'Connection Error'}
        action={
          <div className="flex gap-3">
            {!isNotFound && (
              <button
                type="button"
                onClick={handleRetry}
                className="rounded-[7px] border border-emerald-300/40 bg-emerald-400/10 px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-white"
              >
                Retry
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/lobby')}
              className="rounded-[7px] border border-cyan-300/40 bg-cyan-400/10 px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-white"
            >
              Back to Lobby
            </button>
          </div>
        }
      >
        <p className="text-red-200">{roomError}</p>
      </ShellMessage>
    );
  }

  if (lastError && !isChannelJoined) {
    const isTimeoutDisconnect = lastError.toLowerCase().includes('inactivity');
    const canWatchAsSpectator =
      lastError.toLowerCase().includes('seat permanently filled') ||
      lastError.toLowerCase().includes('grace period expired');

    return (
      <ShellMessage
        title={
          isTimeoutDisconnect
            ? 'Disconnected for Inactivity'
            : canWatchAsSpectator
              ? 'Seat Filled'
              : 'Connection Error'
        }
        action={
          <div className="flex gap-3">
            {!canWatchAsSpectator && (
              <button
                type="button"
                onClick={handleRetry}
                className="rounded-[7px] border border-emerald-300/40 bg-emerald-400/10 px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-white"
              >
                Retry
              </button>
            )}
            {canWatchAsSpectator && (
              <button
                type="button"
                onClick={handleWatchAsSpectator}
                className="rounded-[7px] border border-emerald-300/40 bg-emerald-400/10 px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-white"
              >
                Watch as Spectator
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/lobby')}
              className="rounded-[7px] border border-cyan-300/40 bg-cyan-400/10 px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-white"
            >
              Back to Lobby
            </button>
          </div>
        }
      >
        <p className="text-red-200">
          {canWatchAsSpectator
            ? 'Your seat was filled. The game continues without you.'
            : lastError}
        </p>
      </ShellMessage>
    );
  }

  const hasGameStarted = serverState !== null && serverState.phase != null;
  const isGameOver =
    serverState !== null && (serverState.phase === 'complete' || serverState.phase === 'game_over');

  const isMyTurn = viewModel?.currentTurnAbsolute === youPositionAbs;
  const visibleDecision =
    ownerDecisionQueue.length > 0 && !hasActiveTurnWindow(turnTimer) && !isMyTurn
      ? ownerDecisionQueue[0]
      : null;

  if (hasGameStarted && viewModel) {
    return (
      <div className="relative h-dvh w-full overflow-hidden">
        <ConnectionBanner isConnected={isChannelJoined} />
        <ToastContainer messages={toastMessages} onDismiss={dismissToast} />
        <div className="pidro-window h-full w-full">
          <div className="relative h-full">
            {visibleDecision && (
              <OwnerDecisionBanner
                playerName={visibleDecision.playerName}
                position={visibleDecision.position}
                onOpenSeat={handleOpenSeat}
                onKeepBot={handleKeepBot}
              />
            )}

            <GameTable
              viewModel={viewModel}
              onPlayCard={handlePlayCard}
              onBid={handleBid}
              onPass={handlePass}
              onDeclareTrump={handleDeclareTrump}
              onSelectHand={handleSelectHand}
              onLeave={handleLeave}
              handShaking={handShaking}
              optimisticCard={optimisticCard}
            />

            {isGameOver && (
              <GameOverOverlay
                viewModel={viewModel}
                serverState={serverState}
                onBackToLobby={handleBackToLobby}
                onPlayAgain={handlePlayAgain}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pidro-page">
      <ConnectionBanner isConnected={isChannelJoined} />
      <ToastContainer messages={toastMessages} onDismiss={dismissToast} />
      <div className="pidro-window h-dvh">
        <WaitingRoom
          roomCode={code}
          playerMeta={playerMeta}
          readyPlayers={readyPlayers}
          youPosition={youPositionAbs}
          onReady={handleReady}
          onLeave={handleLeave}
        />
      </div>
    </div>
  );
}
