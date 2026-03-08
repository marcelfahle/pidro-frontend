import type { Card, Room, SeatType, Suit } from '@pidro/shared';
import { useGameStore, useGameViewModel } from '@pidro/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { lobbyApi } from '../api/lobby';
import { pushGameAction, type SeatEvent, useGameChannel } from '../channels/useGameChannel';
import { GameOverOverlay } from '../components/game/GameOverOverlay';
import { GameTable } from '../components/game/GameTable';
import { WaitingRoom } from '../components/game/WaitingRoom';
import { ConnectionBanner } from '../components/ui/ConnectionBanner';
import { Spinner } from '../components/ui/Spinner';
import { ToastContainer, useToast } from '../components/ui/Toast';
import { useAuthStore } from '../stores/auth';

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
        <div className="pidro-titlebar">Pidro</div>
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
    isChannelJoined,
    lastError,
    initFromRoom,
    reset,
  } = useGameStore(
    useShallow((s) => ({
      serverState: s.serverState,
      playerMeta: s.playerMeta,
      readyPlayers: s.readyPlayers,
      youPositionAbs: s.youPositionAbs,
      isChannelJoined: s.isChannelJoined,
      lastError: s.lastError,
      initFromRoom: s.initFromRoom,
      reset: s.reset,
    })),
  );

  const viewModel = useGameViewModel();

  const [roomLoading, setRoomLoading] = useState(true);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [channelEnabled, setChannelEnabled] = useState(false);
  const [handShaking, setHandShaking] = useState(false);

  const roomConfigRef = useRef<{
    name: string;
    seats: { seat_2: SeatType; seat_3: SeatType; seat_4: SeatType };
  } | null>(null);

  const { messages: toastMessages, addToast, dismissToast } = useToast();

  const handleSeatEvent = useCallback(
    (event: SeatEvent) => {
      addToast(event.message, event.variant);
    },
    [addToast],
  );

  useEffect(() => {
    if (!code || !userId) return;

    const roomCode = code;
    const playerId = userId;
    let cancelled = false;

    async function fetchRoom() {
      setRoomLoading(true);
      setRoomError(null);
      try {
        const room = await lobbyApi.getRoom(roomCode);
        if (cancelled) return;

        roomConfigRef.current = {
          name: room.name ?? 'Game Room',
          seats: deriveSeatConfig(room),
        };

        initFromRoom({ room, youPlayerId: playerId });
        setChannelEnabled(true);
      } catch {
        if (!cancelled) {
          setRoomError('Failed to load game room.');
        }
      } finally {
        if (!cancelled) setRoomLoading(false);
      }
    }

    fetchRoom();

    return () => {
      cancelled = true;
    };
  }, [code, userId, initFromRoom]);

  useGameChannel({ roomCode: code ?? '', enabled: channelEnabled, onSeatEvent: handleSeatEvent });

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
          setHandShaking(true);
          setTimeout(() => setHandShaking(false), 400);
        }
      }
    },
    [addToast],
  );

  const handlePlayCard = useCallback(
    (card: Card) => {
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
      lobbyApi.leaveRoom(code).catch(() => {
        // Best effort
      });
    }
    navigate('/lobby');
  }, [code, navigate]);

  const handleBackToLobby = useCallback(() => {
    navigate('/lobby');
  }, [navigate]);

  const handleReady = useCallback(() => {
    pushAction('ready', {});
  }, [pushAction]);

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
    return (
      <ShellMessage
        title="Room Error"
        action={
          <button
            type="button"
            onClick={() => navigate('/lobby')}
            className="rounded-[7px] border border-cyan-300/40 bg-cyan-400/10 px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-white"
          >
            Back to Lobby
          </button>
        }
      >
        <p className="text-red-200">{roomError}</p>
      </ShellMessage>
    );
  }

  if (lastError && !isChannelJoined) {
    return (
      <ShellMessage
        title="Connection Error"
        action={
          <button
            type="button"
            onClick={() => navigate('/lobby')}
            className="rounded-[7px] border border-cyan-300/40 bg-cyan-400/10 px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-white"
          >
            Back to Lobby
          </button>
        }
      >
        <p className="text-red-200">{lastError}</p>
      </ShellMessage>
    );
  }

  const hasGameStarted = serverState !== null && serverState.phase != null;
  const isGameOver =
    serverState !== null && (serverState.phase === 'complete' || serverState.phase === 'game_over');

  if (hasGameStarted && viewModel) {
    return (
      <div className="pidro-page">
        <ConnectionBanner isConnected={isChannelJoined} />
        <ToastContainer messages={toastMessages} onDismiss={dismissToast} />
        <div className="pidro-window min-h-[760px]">
          <div className="pidro-titlebar">Pidro</div>
          <div className="relative">
            <GameTable
              viewModel={viewModel}
              onPlayCard={handlePlayCard}
              onBid={handleBid}
              onPass={handlePass}
              onDeclareTrump={handleDeclareTrump}
              onSelectHand={handleSelectHand}
              onLeave={handleLeave}
              handShaking={handShaking}
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
      <div className="pidro-window min-h-[760px]">
        <div className="pidro-titlebar">Pidro</div>
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
