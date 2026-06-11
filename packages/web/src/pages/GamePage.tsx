import type { ActiveTurnTimer, Card, Position, Room, SeatType, Suit } from '@pidro/shared';
import { useGameStore, useGameViewModel, useLobbyStore } from '@pidro/shared';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { lobbyApi } from '../api/lobby';
import { getProfile, veteranProgressFraction } from '../api/profile';
import {
  type OwnerDecisionEvent,
  pushGameAction,
  type SeatEvent,
  useGameChannel,
} from '../channels/useGameChannel';
import { useLobbyChannel } from '../channels/useLobbyChannel';
import { GameOverOverlay } from '../components/game/GameOverOverlay';
import { GameTable } from '../components/game/GameTable';
import { OwnerDecisionBanner } from '../components/game/OwnerDecisionBanner';
import { WaitingRoom } from '../components/game/WaitingRoom';
import type { ProgressionSummary } from '../components/profile/postgame';
import { ConnectionBanner } from '../components/ui/ConnectionBanner';
import { Spinner } from '../components/ui/Spinner';
import { ToastContainer, useToast } from '../components/ui/Toast';
import { useAuthStore } from '../stores/auth';

function getHttpStatus(err: unknown): number | undefined {
  return (err as { response?: { status?: number } })?.response?.status;
}

const ROOM_POLL_INTERVAL = 3000;

function deriveSeatConfig(room: Room): {
  seat_2: SeatType;
  seat_3: SeatType;
  seat_4: SeatType;
} {
  const seats = room.seats ?? [];
  const seatType = (index: number): SeatType => {
    const seat = seats.find((s) => s.seat_index === index);
    if (seat?.player?.is_bot) return 'ai';
    return 'open';
  };
  return { seat_2: seatType(1), seat_3: seatType(2), seat_4: seatType(3) };
}

/**
 * The REST room payload carries seat occupancy but no usernames. The lobby
 * channel list does — when this game was opened from the lobby, merge those
 * names in. The signed-in player's own name is always known locally.
 */
function enrichRoomWithKnownNames(room: Room, you: { id: string; username: string } | null): Room {
  if (!room.seats?.length) return room;

  const lobbyRoom = useLobbyStore.getState().rooms.find((r) => r.code === room.code);
  const byPosition = new Map(
    (lobbyRoom?.seats ?? [])
      .filter((s) => s.position && s.player?.username)
      .map((s) => [s.position, s.player] as const),
  );

  return {
    ...room,
    seats: room.seats.map((seat) => {
      if (!seat.position || seat.player?.username) return seat;

      const positionUserId = room.positions?.[seat.position] ?? null;
      if (you && positionUserId === you.id) {
        return {
          ...seat,
          player: { id: you.id, username: you.username, is_bot: false },
          player_id: you.id,
        };
      }

      const known = byPosition.get(seat.position);
      if (!known) return seat;
      return { ...seat, player: { ...known }, player_id: known.id };
    }),
  };
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
          <h2 className="mb-5 text-xl font-black uppercase tracking-[0.14em] text-[#ffd83e]">
            {title}
          </h2>
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
  const username = useAuthStore((s) => s.user?.username ?? null);
  const you = useMemo(
    () => (userId && username ? { id: userId, username } : null),
    [userId, username],
  );

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

  // Decorate our own seat with progression (level + skill metal on the
  // avatar chip; progress feeds the game-over halo). Best-effort: servers
  // without the profile endpoint just leave the seat unranked.
  useEffect(() => {
    if (!youPositionAbs) return;
    let active = true;
    getProfile()
      .then((p) => {
        if (!active) return;
        useGameStore.getState().setPlayerRank(youPositionAbs, {
          level: p.veteran.level,
          tier: p.skill.provisional ? 'provisional' : p.skill.tier,
          prestige: p.veteran.prestige,
          progress: veteranProgressFraction(p.veteran.progress),
        });
      })
      .catch(() => {
        /* no profile on this server — seat stays unranked */
      });
    return () => {
      active = false;
    };
  }, [youPositionAbs]);

  // Keep the lobby feed alive while in-game: it's the only payload that
  // carries other humans' usernames. Merge them into seat meta as they land.
  useLobbyChannel();
  const lobbyRooms = useLobbyStore((s) => s.rooms);
  useEffect(() => {
    if (!code) return;
    const lobbyRoom = lobbyRooms.find((r) => r.code === code);
    if (!lobbyRoom?.seats?.length) return;

    const { playerMeta: meta, setSeatStatus } = useGameStore.getState();
    for (const seat of lobbyRoom.seats) {
      const pos = seat.position;
      const username = seat.player?.username;
      if (!pos || !username || seat.player?.is_bot) continue;
      const m = meta[pos];
      if (m && !m.username) {
        setSeatStatus(pos, m.seatStatus, username);
      }
    }
  }, [lobbyRooms, code]);

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
  const [progressionSummary, setProgressionSummary] = useState<ProgressionSummary | null>(null);
  const dismissedSeatsRef = useRef<Set<Position>>(new Set());

  const fetchRoom = useCallback(
    async (roomCode: string, playerId: string) => {
      const currentFetchId = ++fetchIdRef.current;
      setRoomLoading(true);
      setRoomError(null);
      setChannelEnabled(false);
      try {
        const room = enrichRoomWithKnownNames(await lobbyApi.getRoom(roomCode), you);
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
          // Room HTTP endpoint returned 404 — the room may still exist on the
          // server (e.g. after a browser refresh where the REST cache is stale).
          // Attempt a direct WebSocket channel join which will either reconnect
          // us or give a definitive error.
          setChannelEnabled(true);
          setRoomLoading(false);
          return;
        } else if (status === 403) {
          setRoomError('You do not have access to this room.');
        } else {
          setRoomError('Failed to connect to server. Please check your connection.');
        }
      } finally {
        if (fetchIdRef.current === currentFetchId) setRoomLoading(false);
      }
    },
    [initFromRoom, you],
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
    onProgressionSummary: setProgressionSummary,
  });

  useEffect(() => {
    if (!code || !userId || !channelEnabled) return;
    if (serverState !== null) return;
    // Stop polling if the channel join already failed (room gone)
    if (lastError) return;

    const interval = setInterval(async () => {
      try {
        const room = enrichRoomWithKnownNames(await lobbyApi.getRoom(code), you);
        initFromRoom({ room, youPlayerId: userId });
      } catch {
        // Ignore polling errors while waiting room is active.
      }
    }, ROOM_POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [code, userId, channelEnabled, serverState, lastError, initFromRoom, you]);

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
    navigate('/home');
  }, [code, navigate, role]);

  const handleBackToLobby = useCallback(() => {
    navigate('/home');
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
      navigate('/home');
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

  const hasGameStarted = serverState !== null && serverState.phase != null;
  const isGameOver =
    serverState !== null && (serverState.phase === 'complete' || serverState.phase === 'game_over');

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

  if (roomError && !isGameOver) {
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
              onClick={() => navigate('/home')}
              className="rounded-[7px] border border-cyan-300/40 bg-cyan-400/10 px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-white"
            >
              Back to Menu
            </button>
          </div>
        }
      >
        <p className="text-red-200">{roomError}</p>
      </ShellMessage>
    );
  }

  if (lastError && !isChannelJoined && !isGameOver) {
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
              onClick={() => navigate('/home')}
              className="rounded-[7px] border border-cyan-300/40 bg-cyan-400/10 px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-white"
            >
              Back to Menu
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

  const isMyTurn = viewModel?.currentTurnAbsolute === youPositionAbs;
  const visibleDecision =
    ownerDecisionQueue.length > 0 && !hasActiveTurnWindow(turnTimer) && !isMyTurn
      ? ownerDecisionQueue[0]
      : null;

  if (hasGameStarted && viewModel) {
    return (
      <div className="pidro-game-shell select-none">
        <ConnectionBanner isConnected={isChannelJoined} />
        <ToastContainer messages={toastMessages} onDismiss={dismissToast} />
        <div className="pidro-window pidro-game-frame">
          <div className="relative h-full w-full">
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
                progressionSummary={progressionSummary}
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
