import type { BotDifficulty, SeatType } from '@pidro/shared';
import { useLobbyStore } from '@pidro/shared';
import { ArrowLeft, LogOut, Settings } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { lobbyApi } from '../api/lobby';
import { useLobbyChannel } from '../channels/useLobbyChannel';
import { CreateGameModal } from '../components/lobby/CreateGameModal';
import { RoomTable } from '../components/lobby/RoomTable';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { PageHeader } from '../components/ui/PageHeader';
import { PlayerMiniCard } from '../components/ui/PlayerMiniCard';
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
  const [query, setQuery] = useState('');

  const visibleRooms = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return rooms;
    return rooms.filter((room) => {
      const haystack = `${room.name ?? ''} ${room.code}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [rooms, query]);

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
      } catch (err: unknown) {
        const errorCode = (err as { response?: { data?: { errors?: { code?: string }[] } } })
          ?.response?.data?.errors?.[0]?.code;

        if (errorCode === 'ALREADY_IN_ROOM') {
          // Auto-leave stale room and retry
          try {
            await lobbyApi.leaveRoom(code);
            await lobbyApi.joinRoom(code);
            navigate(`/game/${code}`);
            return;
          } catch {
            setJoinError('You are already in another game. Please leave it first.');
          }
        } else {
          setJoinError('Failed to join game.');
        }
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
    <div className="pidro-page">
      <div className="pidro-window min-h-[720px]">
        <div className="pidro-titlebar">Pidro</div>
        <main className="relative flex h-full flex-col gap-6 px-4 pb-4 pt-8 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <PlayerMiniCard username={user?.username} />
            <div className="flex items-center gap-2">
              <IconButton
                label="Back"
                icon={<ArrowLeft className="h-6 w-6" strokeWidth={2.2} />}
                onClick={() => navigate('/home')}
              />
              <IconButton
                label="Settings"
                icon={<Settings className="h-6 w-6" strokeWidth={2.2} />}
                disabled
              />
              <IconButton
                label="Log Out"
                icon={<LogOut className="h-6 w-6" strokeWidth={2.2} />}
                onClick={handleSignOut}
              />
            </div>
          </div>

          <div className="space-y-2">
            <PageHeader title="Create or Join Table" size="md" />
            <p className="text-center text-sm text-cyan-50/75">
              Browse open rooms, or spin up a fresh table and fill the empty seats with bots.
            </p>
          </div>

          <section className="pidro-table-grid flex-1 gap-5">
            <div className="pidro-panel flex min-h-[420px] flex-col p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4 text-sm font-black uppercase tracking-[0.16em] text-cyan-50/80">
                  <span>Players Online - {stats.online_players}</span>
                  <span>Ongoing Games - {stats.active_games}</span>
                </div>
                <Button onClick={() => setCreateModalOpen(true)} size="sm">
                  Create Game
                </Button>
              </div>

              <div className="mb-4">
                <input
                  type="search"
                  aria-label="Search rooms"
                  placeholder="Search..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pidro-input"
                />
              </div>

              <div className="min-h-0 flex-1">
                <RoomTable
                  rooms={visibleRooms}
                  onJoin={handleJoin}
                  joinLoading={joinLoading}
                  joinError={joinError}
                  loading={lobbyLoading}
                />
              </div>
            </div>

            <aside className="flex flex-col gap-4">
              <div className="pidro-panel p-5">
                <h2 className="text-lg font-black uppercase tracking-[0.12em] text-white">
                  Table Notes
                </h2>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-cyan-50/80">
                  <li>Rooms update live through the lobby channel.</li>
                  <li>Open seats can be filled by people or bots.</li>
                  <li>Portrait mode keeps the board playable on narrow screens.</li>
                </ul>
              </div>

              <div className="pidro-panel p-5">
                <h2 className="text-lg font-black uppercase tracking-[0.12em] text-white">
                  Quick Start
                </h2>
                <div className="mt-4 space-y-3 text-sm leading-6 text-cyan-50/80">
                  <p>1. Create a room or join any waiting table.</p>
                  <p>2. Fill seats with bots if you want a solo practice round.</p>
                  <p>3. Hit ready once the room is full and play from either orientation.</p>
                </div>
                <Button className="mt-5 w-full" onClick={() => setCreateModalOpen(true)}>
                  Quick Table
                </Button>
              </div>
            </aside>
          </section>
        </main>
      </div>

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
