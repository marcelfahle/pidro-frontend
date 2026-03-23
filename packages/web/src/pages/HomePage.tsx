import { LogOut, Settings } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { lobbyApi } from '../api/lobby';
import homeBackgroundUrl from '../assets/legacy/home-bg.jpg';
import homeLogoUrl from '../assets/legacy/home-logo.png';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { PlayerMiniCard } from '../components/ui/PlayerMiniCard';
import { useAuthStore } from '../stores/auth';

export function HomePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const [singlePlayerLoading, setSinglePlayerLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = useCallback(() => {
    clearSession();
    navigate('/login');
  }, [clearSession, navigate]);

  const handleMultiplayer = useCallback(() => {
    navigate('/lobby');
  }, [navigate]);

  const handleSinglePlayer = useCallback(async () => {
    setSinglePlayerLoading(true);
    setError(null);

    try {
      const result = await lobbyApi.createRoom({
        name: `${user?.username ?? 'Player'}'s solo table`,
        settings: { min_games: 1, time_limit: 0, private: false },
        seats: { seat_2: 'ai', seat_3: 'ai', seat_4: 'ai' },
        bot_difficulty: 'basic',
      });
      const code = result?.code;
      if (!code) throw new Error('No room code returned');
      navigate(`/game/${code}`);
    } catch (err: unknown) {
      const errorCode = (err as { response?: { data?: { errors?: { code?: string }[] } } })
        ?.response?.data?.errors?.[0]?.code;
      if (errorCode === 'ALREADY_IN_ROOM') {
        setError("You're already in a game. Leave it first or go to the lobby to rejoin.");
      } else {
        setError('Failed to create a solo table. Try multiplayer or retry.');
      }
    } finally {
      setSinglePlayerLoading(false);
    }
  }, [navigate, user?.username]);

  return (
    <div className="pidro-page">
      <div className="pidro-window pidro-window--home flex h-dvh flex-col">
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-0 opacity-[0.96]"
            style={{
              backgroundImage: `url(${homeBackgroundUrl})`,
              backgroundPosition: 'center top',
              backgroundRepeat: 'no-repeat',
              backgroundSize: 'cover',
            }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,31,56,0.08)_0%,rgba(3,19,41,0.26)_100%)]" />
        </div>
        <main className="relative z-10 flex flex-1 flex-col px-4 pb-4 pt-4 sm:px-6 sm:pb-6">
          <div className="pidro-home-hero pointer-events-none absolute inset-x-0 z-0 flex justify-center">
            <img
              src={homeLogoUrl}
              alt=""
              aria-hidden="true"
              className="w-[760px] max-w-none select-none opacity-[0.98] drop-shadow-[0_16px_34px_rgba(0,0,0,0.36)] max-md:w-[520px]"
            />
          </div>

          <div className="relative z-10 flex items-start justify-between gap-3">
            <PlayerMiniCard username={user?.username} />
          </div>

          <section className="relative z-10 mx-auto flex w-full max-w-[460px] flex-1 flex-col items-center justify-center gap-6 px-1 pb-8 pt-[168px] max-md:gap-5 max-md:pt-[202px]">
            <div className="w-full max-w-[260px] space-y-3 max-md:max-w-[248px]">
              <Button
                variant="gold"
                size="xl"
                loading={singlePlayerLoading}
                onClick={handleSinglePlayer}
                className="w-full tracking-[0.05em]"
              >
                Single Player
              </Button>

              <Button
                variant="gold"
                size="xl"
                disabled
                className="w-full tracking-[0.05em] !opacity-40"
              >
                Multiplayer
              </Button>
            </div>

            {error && <p className="text-center text-sm font-bold text-red-200">{error}</p>}
          </section>

          <div className="mt-auto flex items-end justify-between pb-0">
            <div>
              <IconButton
                label="Settings"
                icon={<Settings className="h-6 w-6" strokeWidth={2.2} />}
                disabled
              />
            </div>
            <div>
              <IconButton
                label="Log Out"
                icon={<LogOut className="h-6 w-6" strokeWidth={2.2} />}
                onClick={handleLogout}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
