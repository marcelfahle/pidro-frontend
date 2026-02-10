import type { Card, Room, SeatType, Suit } from '@pidro/shared';
import { useGameStore, useGameViewModel } from '@pidro/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { lobbyApi } from '../api/lobby';
import { pushGameAction, useGameChannel } from '../channels/useGameChannel';
import { GameOverOverlay } from '../components/game/GameOverOverlay';
import { GameTable } from '../components/game/GameTable';
import { WaitingRoom } from '../components/game/WaitingRoom';
import { ConnectionBanner } from '../components/ui/ConnectionBanner';
import { Spinner } from '../components/ui/Spinner';
import { ToastContainer, useToast } from '../components/ui/Toast';
import { useAuthStore } from '../stores/auth';

/** Derive seat config from a Room's seats for "Play Again" room creation. */
function deriveSeatConfig(room: Room): { seat_2: SeatType; seat_3: SeatType; seat_4: SeatType } {
  const seats = room.seats ?? [];
  // Seats are indexed: 0=north(host), 1=east(seat_2), 2=south(seat_3), 3=west(seat_4)
  const seatType = (index: number): SeatType => {
    const seat = seats.find((s) => s.seat_index === index);
    if (seat?.player?.is_bot) return 'ai';
    return 'open';
  };
  return { seat_2: seatType(1), seat_3: seatType(2), seat_4: seatType(3) };
}

export function GamePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const userId = useAuthStore((s) => s.user?.id ?? null);

  const { serverState, playerMeta, isChannelJoined, lastError, initFromRoom, reset } = useGameStore(
    useShallow((s) => ({
      serverState: s.serverState,
      playerMeta: s.playerMeta,
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

  // Preserve room config for "Play Again" — uses ref to avoid re-render cycles
  const roomConfigRef = useRef<{
    name: string;
    seats: { seat_2: SeatType; seat_3: SeatType; seat_4: SeatType };
  } | null>(null);

  const { messages: toastMessages, addToast, dismissToast } = useToast();

  // 1. Fetch room data and initialize game store
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

        // Capture room config for "Play Again"
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

  // 2. Connect game channel once room data is loaded
  useGameChannel({ roomCode: code ?? '', enabled: channelEnabled });

  // 3. Clean up game store on unmount
  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  // Helper to push a game action and show toast on error
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

        // Trigger shake animation on card play errors
        if (event === 'play_card') {
          setHandShaking(true);
          setTimeout(() => setHandShaking(false), 400);
        }
      }
    },
    [addToast],
  );

  // Game action handlers
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
        // Best effort - navigate regardless
      });
    }
    navigate('/lobby');
  }, [code, navigate]);

  const handleBackToLobby = useCallback(() => {
    navigate('/lobby');
  }, [navigate]);

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

  // Invalid code
  if (!code) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">Invalid game code.</p>
      </div>
    );
  }

  // Loading room data
  if (roomLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-emerald-900">
        <Spinner size="lg" />
        <p className="text-emerald-300">Loading game...</p>
      </div>
    );
  }

  // Room fetch error
  if (roomError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-emerald-900">
        <p className="text-red-400">{roomError}</p>
        <button
          type="button"
          onClick={() => navigate('/lobby')}
          className="rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
        >
          Back to Lobby
        </button>
      </div>
    );
  }

  // Channel error
  if (lastError && !isChannelJoined) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-emerald-900">
        <p className="text-red-400">{lastError}</p>
        <button
          type="button"
          onClick={() => navigate('/lobby')}
          className="rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
        >
          Back to Lobby
        </button>
      </div>
    );
  }

  // Determine game state: waiting vs active game
  const hasGameStarted = serverState !== null && serverState.phase !== 'dealer_selection';
  const isGameOver =
    serverState !== null && (serverState.phase === 'complete' || serverState.phase === 'game_over');

  // Active game
  if (hasGameStarted && viewModel) {
    return (
      <div className="flex min-h-screen flex-col bg-emerald-900">
        {/* Connection status banner */}
        <ConnectionBanner isConnected={isChannelJoined} />

        {/* Toast notifications for game action errors */}
        <ToastContainer messages={toastMessages} onDismiss={dismissToast} />

        {/* Top bar */}
        <header className="flex items-center justify-between px-4 py-2">
          <h1 className="text-sm font-medium text-emerald-400">Pidro</h1>
          <button
            type="button"
            onClick={handleLeave}
            className="rounded px-3 py-1 text-xs text-emerald-400 transition-colors hover:bg-emerald-800 hover:text-white"
          >
            Leave Game
          </button>
        </header>

        <div className="relative flex-1">
          <GameTable
            viewModel={viewModel}
            onPlayCard={handlePlayCard}
            onBid={handleBid}
            onPass={handlePass}
            onDeclareTrump={handleDeclareTrump}
            onSelectHand={handleSelectHand}
            handShaking={handShaking}
          />

          {/* Game over overlay on top of the table */}
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
    );
  }

  // Waiting room (no game state yet, or still in dealer_selection)
  return (
    <div className="flex min-h-screen flex-col bg-emerald-900">
      <WaitingRoom roomCode={code} playerMeta={playerMeta} onLeave={handleLeave} />
    </div>
  );
}
