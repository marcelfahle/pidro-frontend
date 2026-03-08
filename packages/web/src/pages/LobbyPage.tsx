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
import { IconButton } from '../components/ui/IconButton';
import { PageHeader } from '../components/ui/PageHeader';
import { useAuthStore } from '../stores/auth';

function SectionHeader({
  title,
  count,
  className,
}: {
  title: string;
  count?: number;
  className?: string;
}) {
  return (
    <h3
      className={`mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-50/80 ${className ?? ''}`}
    >
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

function categorizeRooms(rooms: Room[], userId: string | undefined): CategorizedRooms {
  const result: CategorizedRooms = {
    myRejoinable: [],
    openTables: [],
    substituteNeeded: [],
    spectatable: [],
  };

  for (const room of rooms) {
    if (room.status === 'waiting') {
      result.openTables.push(room);
    } else if (room.status === 'playing') {
      const isMyRoom =
        userId &&
        (room.player_ids?.includes(userId) ||
          room.seats?.some((s) => s.player_id === userId || s.player?.id === userId));

      if (isMyRoom) {
        result.myRejoinable.push(room);
      } else {
        const hasVacantSeat = room.seats?.some((s) => s.status === 'free' && !s.player) ?? false;
        if (hasVacantSeat) {
          result.substituteNeeded.push(room);
        } else {
          result.spectatable.push(room);
        }
      }
    }
  }

  // Sort open tables newest first
  result.openTables.sort((a, b) => {
    if (a.created_at && b.created_at) {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    return 0;
  });

  return result;
}

export function LobbyPage() {
  const rooms = useLobbyStore((s) => s.rooms);
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

  // Action state (join/substitute)
  const [actionLoadingCode, setActionLoadingCode] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{
    code: string;
    message: string;
  } | null>(null);
  const [query, setQuery] = useState('');

  // Filter rooms by search query, then categorize
  const categories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = normalizedQuery
      ? rooms.filter((room) => {
          const haystack = `${room.name ?? ''} ${room.code}`.toLowerCase();
          return haystack.includes(normalizedQuery);
        })
      : rooms;

    return categorizeRooms(filtered, user?.id);
  }, [rooms, query, user?.id]);

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
    (code: string) => {
      navigate(`/game/${code}`);
    },
    [navigate],
  );

  return (
    <div className="pidro-page">
      <div className="pidro-window flex min-h-[720px] flex-col max-md:h-[calc(100dvh-24px)] max-md:min-h-[calc(100dvh-24px)]">
        <div className="pidro-titlebar">Pidro</div>
        <main className="relative flex flex-1 flex-col px-4 pb-4 pt-6 sm:px-6 sm:pt-7">
          <div className="relative z-10 -mb-8 max-md:-mb-7">
            <PageHeader title="Create or Join Table" size="md" />
          </div>

          <section className="mb-4 flex min-h-0 flex-1 pt-2">
            <div className="pidro-panel flex min-h-[420px] flex-1 flex-col p-4 pt-8 sm:p-5 sm:pt-9">
              <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-50/82 sm:text-[11px]">
                <span>Players Online {stats.online_players}</span>
                <span>Ongoing Games {stats.active_games}</span>
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

              <div className="min-h-0 flex-1 overflow-y-auto">
                {lobbyError && !lobbyLoading && (
                  <div className="mb-4 rounded-[16px] border border-red-400/30 bg-red-500/10 p-4 text-center">
                    <p className="text-sm font-black uppercase tracking-[0.1em] text-red-200">
                      {lobbyError}
                    </p>
                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="mt-3 rounded-[7px] border border-red-300/30 bg-red-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-red-100"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {/* Section 1: Your Tables (rejoinable games) */}
                {categories.myRejoinable.length > 0 && (
                  <div className="mb-6">
                    <SectionHeader
                      title="Your Tables"
                      count={categories.myRejoinable.length}
                      className="text-amber-200/90"
                    />
                    <div className="space-y-3">
                      {categories.myRejoinable.map((room) => (
                        <div
                          key={room.code}
                          className="rounded-[20px] border border-amber-400/40 bg-[linear-gradient(180deg,rgba(255,180,50,0.12)_0%,transparent_40%),rgba(80,40,0,0.55)] p-4 shadow-[0_12px_24px_rgba(0,0,0,0.18)]"
                        >
                          <div className="flex flex-wrap items-center gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="truncate text-lg font-black text-amber-50">
                                  {room.name || room.code}
                                </span>
                                <span className="inline-flex items-center rounded-full border border-amber-300/40 bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-amber-100">
                                  In Progress
                                </span>
                              </div>
                              <div className="mt-2 text-sm font-black uppercase tracking-[0.1em] text-amber-200/70">
                                Room {room.code}
                              </div>
                            </div>
                            <Button size="sm" onClick={() => handleRejoin(room.code)}>
                              Rejoin
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section 2: Open Tables (waiting rooms) */}
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

                {/* Section 3: Need a Player (substitute needed) */}
                {categories.substituteNeeded.length > 0 && (
                  <div className="mb-6">
                    <SectionHeader
                      title="Need a Player"
                      count={categories.substituteNeeded.length}
                    />
                    <div className="space-y-3">
                      {categories.substituteNeeded.map((room, i) => (
                        <div
                          key={room.code}
                          className="rounded-[20px] border border-dashed border-cyan-300/30 bg-cyan-950/30 p-4"
                        >
                          <div className="flex flex-wrap items-center gap-4">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-200/25 bg-cyan-400/8 text-2xl font-black text-cyan-50/80">
                              #{i + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="truncate text-lg font-black text-white">
                                  {room.name || room.code}
                                </span>
                                <span className="inline-flex items-center rounded-full border border-yellow-300/40 bg-yellow-500/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-yellow-100">
                                  Needs Sub
                                </span>
                              </div>
                              <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-black uppercase tracking-[0.1em] text-cyan-50/72">
                                <span>Room {room.code}</span>
                              </div>
                              {actionError?.code === room.code && (
                                <p className="mt-2 text-xs font-black uppercase tracking-[0.08em] text-red-200">
                                  {actionError.message}
                                </p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              loading={actionLoadingCode === room.code}
                              onClick={() => handleJoin(room.code)}
                            >
                              Substitute
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section 4: Watch (spectatable games) */}
                {categories.spectatable.length > 0 && (
                  <div className="mb-6">
                    <SectionHeader title="Watch" count={categories.spectatable.length} />
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {categories.spectatable.map((room) => {
                        const playerCount = room.player_count ?? room.players_count ?? 0;
                        return (
                          <div
                            key={room.code}
                            className="w-48 flex-shrink-0 rounded-[16px] border border-cyan-300/20 bg-cyan-950/40 p-3"
                          >
                            <div className="truncate text-sm font-black text-white">
                              {room.name || room.code}
                            </div>
                            <div className="mt-1 text-[10px] font-black uppercase tracking-[0.1em] text-cyan-50/60">
                              {playerCount} players
                            </div>
                            <Button
                              size="xs"
                              variant="secondary"
                              className="mt-2 w-full"
                              onClick={() => handleWatch(room.code)}
                            >
                              Watch
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          <div className="mt-auto flex items-end justify-between pb-0">
            <IconButton
              label="Back"
              icon={<ArrowLeft className="h-6 w-6" strokeWidth={2.2} />}
              onClick={() => navigate('/home')}
            />
            <IconButton
              label="Create Game"
              icon={<Plus className="h-7 w-7" strokeWidth={2.4} />}
              onClick={() => setCreateModalOpen(true)}
            />
          </div>
        </main>
      </div>

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
