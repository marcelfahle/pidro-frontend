import type { BotDifficulty, SeatType } from '@pidro/shared';
import { useLobbyStore } from '@pidro/shared';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { lobbyApi } from '../api/lobby';
import { useLobbyChannel } from '../channels/useLobbyChannel';
import { CreateGameModal } from '../components/lobby/CreateGameModal';
import { RoomTable } from '../components/lobby/RoomTable';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../stores/auth';

export function LobbyPage() {
  const rooms = useLobbyStore((s) => s.rooms);
  const stats = useLobbyStore((s) => s.stats);
  const lobbyLoading = useLobbyStore((s) => s.isLoading);
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const navigate = useNavigate();

  // Real-time lobby updates via WebSocket channel
  useLobbyChannel();

  // Create game modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Join game state
  const [joinLoading, setJoinLoading] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  const handleCreateGame = useCallback(
    async (config: {
      name: string;
      seats: { seat_2: SeatType; seat_3: SeatType; seat_4: SeatType };
      botDifficulty: string;
    }) => {
      setCreateLoading(true);
      setCreateError(null);
      try {
        const hasBot =
          config.seats.seat_2 === 'ai' ||
          config.seats.seat_3 === 'ai' ||
          config.seats.seat_4 === 'ai';
        const result = await lobbyApi.createRoom({
          name: config.name,
          settings: { min_games: 1, time_limit: 0, private: false },
          seats: config.seats,
          ...(hasBot && { bot_difficulty: config.botDifficulty as BotDifficulty }),
        });
        const code = result?.code;
        if (!code) throw new Error('No room code returned');
        setCreateModalOpen(false);
        navigate(`/game/${code}`);
      } catch {
        setCreateError('Failed to create game. Please try again.');
      } finally {
        setCreateLoading(false);
      }
    },
    [navigate],
  );

  const handleJoin = useCallback(
    async (code: string) => {
      setJoinLoading(code);
      setJoinError(null);
      try {
        await lobbyApi.joinRoom(code);
        navigate(`/game/${code}`);
      } catch {
        setJoinError('Failed to join game.');
        setJoinLoading(null);
      }
    },
    [navigate],
  );

  const handleSignOut = useCallback(() => {
    clearSession();
    navigate('/login');
  }, [clearSession, navigate]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold text-emerald-700">Pidro</h1>
          <div className="flex items-center gap-4">
            {stats.online_players > 0 && (
              <span className="text-sm text-gray-500">{stats.online_players} online</span>
            )}
            <span className="text-sm font-medium text-gray-700">{user?.username}</span>
            <Button variant="secondary" size="sm" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Games{rooms.length > 0 && ` (${rooms.filter((r) => r.status === 'waiting').length})`}
          </h2>
          <Button onClick={() => setCreateModalOpen(true)}>Create Game</Button>
        </div>

        <RoomTable
          rooms={rooms}
          onJoin={handleJoin}
          joinLoading={joinLoading}
          joinError={joinError}
          loading={lobbyLoading}
        />
      </main>

      {/* Create game modal */}
      <CreateGameModal
        open={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setCreateError(null);
        }}
        onSubmit={handleCreateGame}
        username={user?.username ?? 'Player'}
        loading={createLoading}
        error={createError}
      />
    </div>
  );
}
