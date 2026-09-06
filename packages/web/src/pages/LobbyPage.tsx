import type { BotDifficulty, Room, SeatType } from '@pidro/shared';
import { useLobbyStore } from '@pidro/shared';
import { ArrowLeft, Plus } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { lobbyApi } from '../api/lobby';
import { useLobbyChannel } from '../channels/useLobbyChannel';
import { CreateGameModal } from '../components/lobby/CreateGameModal';
import { RoomTable } from '../components/lobby/RoomTable';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../stores/auth';
import './LobbyPage.css';

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <h3 className="mb-3 text-base font-extrabold text-white">
      {title}
      {count != null && count > 0 && <span className="ml-2 text-cyan-50/50">({count})</span>}
    </h3>
  );
}

interface CategorizedRooms {
  myRejoinable: Room[];
  openTables: Room[];
  substituteNeeded: Room[];
  spectatable: Room[];
}

export function LobbyPage() {
  const lobby = useLobbyStore((s) => s.lobby);
  const stats = useLobbyStore((s) => s.stats);
  const lobbyLoading = useLobbyStore((s) => s.isLoading);
  const lobbyError = useLobbyStore((s) => s.error);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  // Real-time lobby updates via WebSocket channel
  useLobbyChannel();

  // Create game modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Action state (join/substitute/watch)
  const [actionLoadingCode, setActionLoadingCode] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{
    code: string;
    message: string;
  } | null>(null);
  const [query, setQuery] = useState('');

  // Filter the authoritative categories without inferring roles or admission locally.
  const categories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filter = (rooms: Room[]) =>
      normalizedQuery
        ? rooms.filter((room) => {
            const haystack = `${room.name ?? ''} ${room.code}`.toLowerCase();
            return haystack.includes(normalizedQuery);
          })
        : rooms;

    return {
      myRejoinable: filter(lobby.my_rejoinable),
      openTables: [...filter(lobby.open_tables)].sort((a, b) =>
        a.created_at && b.created_at
          ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          : 0,
      ),
      substituteNeeded: filter(lobby.substitute_needed),
      spectatable: filter(lobby.spectatable),
    } satisfies CategorizedRooms;
  }, [lobby, query]);

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
      setActionLoadingCode(code);
      setActionError(null);
      try {
        await lobbyApi.joinRoom(code);
        navigate(`/game/${code}`);
      } catch (err: unknown) {
        const errorCode = (err as { response?: { data?: { errors?: { code?: string }[] } } })
          ?.response?.data?.errors?.[0]?.code;

        if (errorCode === 'ALREADY_IN_ROOM') {
          try {
            await lobbyApi.leaveRoom(code);
            await lobbyApi.joinRoom(code);
            navigate(`/game/${code}`);
            return;
          } catch {
            setActionError({
              code,
              message: 'You are already in another game. Please leave it first.',
            });
          }
        } else {
          setActionError({ code, message: 'Failed to join game.' });
        }
        setActionLoadingCode(null);
      }
    },
    [navigate],
  );

  const handleRejoin = useCallback(
    (code: string) => {
      navigate(`/game/${code}`);
    },
    [navigate],
  );

  const handleWatch = useCallback(
    async (code: string) => {
      setActionLoadingCode(code);
      setActionError(null);
      try {
        await lobbyApi.watchRoom(code);
        navigate(`/game/${code}`);
      } catch {
        setActionError({ code, message: 'Failed to watch game.' });
        setActionLoadingCode(null);
      }
    },
    [navigate],
  );

  return (
    <div className="lobby-screen">
      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
        <header className="mb-6 flex flex-wrap items-center gap-3">
          <Button
            className="lobby-action lobby-action-secondary"
            aria-label="Back"
            onClick={() => navigate('/home')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="min-w-0 flex-1 text-[22px] font-extrabold">Create or Join Table</h1>
          <Button
            className="lobby-action"
            disabled={actionLoadingCode !== null}
            onClick={() => setCreateModalOpen(true)}
          >
            <Plus className="h-5 w-5" /> Create Game
          </Button>
        </header>

        <section aria-label="Tables">
          <div>
            <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-white/75">
              <span>Players Online {stats.online_players}</span>
              <span>Ongoing Games {stats.active_games}</span>
            </div>

            <div className="mb-4">
              <input
                type="search"
                aria-label="Search rooms"
                placeholder="Search table name or code"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="lobby-search"
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {lobbyError && !lobbyLoading && (
                <div
                  role="alert"
                  className="mb-4 rounded-lg border border-red-400/40 bg-red-950/50 p-4"
                >
                  <p className="text-sm text-red-100">{lobbyError}</p>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="lobby-action lobby-action-secondary mt-3"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Section 1: Your Tables (rejoinable games) */}
              {categories.myRejoinable.length > 0 && (
                <div className="mb-6">
                  <SectionHeader title="Your Tables" count={categories.myRejoinable.length} />
                  <RoomTable
                    rooms={categories.myRejoinable}
                    onAction={handleRejoin}
                    actionLabel="Rejoin"
                    actionLoadingCode={actionLoadingCode}
                    actionError={actionError}
                  />
                </div>
              )}

              {/* Section 2: Open Tables (waiting rooms) */}
              {(categories.openTables.length > 0 || lobbyLoading) && (
                <div className="mb-6">
                  <SectionHeader title="Open Tables" count={categories.openTables.length} />
                  <RoomTable
                    rooms={categories.openTables}
                    onAction={handleJoin}
                    actionLoadingCode={actionLoadingCode}
                    actionError={actionError}
                    loading={lobbyLoading}
                  />
                </div>
              )}

              {!lobbyLoading &&
                !lobbyError &&
                Object.values(categories).every((rooms) => rooms.length === 0) && (
                  <div className="lobby-room p-6 text-center">
                    <p className="font-extrabold">
                      {query.trim() ? 'No matching tables' : 'No games available. Create one!'}
                    </p>
                    {query.trim() && (
                      <Button
                        className="lobby-action lobby-action-secondary mt-4"
                        onClick={() => setQuery('')}
                      >
                        Clear search
                      </Button>
                    )}
                  </div>
                )}

              {/* Section 3: Need a Player (substitute needed) */}
              {categories.substituteNeeded.length > 0 && (
                <div className="mb-6">
                  <SectionHeader title="Need a Player" count={categories.substituteNeeded.length} />
                  <RoomTable
                    rooms={categories.substituteNeeded}
                    onAction={handleJoin}
                    actionLabel="Substitute"
                    actionLoadingCode={actionLoadingCode}
                    actionError={actionError}
                  />
                </div>
              )}

              {/* Section 4: Watch (spectatable games) */}
              {categories.spectatable.length > 0 && (
                <div className="mb-6">
                  <SectionHeader title="Watch" count={categories.spectatable.length} />
                  <RoomTable
                    rooms={categories.spectatable}
                    onAction={handleWatch}
                    actionLabel="Watch"
                    actionLoadingCode={actionLoadingCode}
                    actionError={actionError}
                  />
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

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
