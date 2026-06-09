import { BarChart3, CircleHelp, LogOut, Settings, Spade, Star, Trophy } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { lobbyApi } from '../api/lobby';
import { getProfile, veteranProgressFraction } from '../api/profile';
import homeBackgroundUrl from '../assets/legacy/home-bg.jpg';
import pidroLogoUrl from '../assets/pidro-logo.png';
import { GlassCard, PidroButton } from '../components/ds';
import { IconButton } from '../components/ui/IconButton';
import { type MiniProfile, PlayerMiniCard } from '../components/ui/PlayerMiniCard';
import { useAuthStore } from '../stores/auth';

export function HomePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const [singlePlayerLoading, setSinglePlayerLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<MiniProfile | undefined>(undefined);

  // Pull the player's progression once for the identity badge. Best-effort:
  // if it fails (offline / older server), the badge falls back to the plain
  // avatar — the menu still works.
  useEffect(() => {
    let active = true;
    getProfile()
      .then((p) => {
        if (!active) return;
        setProfile({
          level: p.veteran.level,
          progress: veteranProgressFraction(p.veteran.progress),
          tier: p.skill.provisional ? 'provisional' : p.skill.tier,
          prestige: p.veteran.prestige,
          title: p.veteran.title,
        });
      })
      .catch(() => {
        /* no profile yet — keep the fallback avatar */
      });
    return () => {
      active = false;
    };
  }, []);

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
              src={pidroLogoUrl}
              alt=""
              aria-hidden="true"
              className="mt-[72px] w-[340px] max-w-[78vw] select-none opacity-[0.98] drop-shadow-[0_0_44px_rgba(0,160,255,0.4)] max-md:mt-[88px] max-md:w-[272px]"
            />
          </div>

          <div className="relative z-10 flex items-start justify-between gap-3">
            <PlayerMiniCard username={user?.username} profile={profile} />
          </div>

          <section className="relative z-10 mx-auto flex w-full max-w-[460px] flex-1 flex-col items-center justify-center gap-6 px-1 pb-8 pt-[168px] max-md:gap-5 max-md:pt-[202px]">
            <div className="w-full max-w-[260px] space-y-3 max-md:max-w-[248px]">
              <PidroButton
                size="md"
                fullWidth
                disabled={singlePlayerLoading}
                onClick={handleSinglePlayer}
              >
                {singlePlayerLoading ? 'Starting…' : 'Single Player'}
              </PidroButton>

              <PidroButton size="md" fullWidth onClick={handleMultiplayer}>
                Multiplayer
              </PidroButton>
            </div>

            {error && <p className="text-center text-sm font-bold text-red-200">{error}</p>}
          </section>

          {/* Bottom bar — Remove Ads centered, icon groups on the sides */}
          <div className="relative z-10 mt-auto h-[var(--pidro-control-size)]">
            <div className="absolute inset-y-0 left-0 flex items-center gap-2.5 max-md:gap-2">
              <IconButton
                label="Settings"
                icon={<Settings className="pidro-metal-icon h-6 w-6" strokeWidth={2.2} />}
                disabled
              />
              <IconButton
                label="Leaderboard"
                icon={<BarChart3 className="pidro-metal-icon h-6 w-6" strokeWidth={2.2} />}
                className="max-md:hidden"
                disabled
              />
              <IconButton
                label="Achievements"
                icon={<Trophy className="pidro-metal-icon h-6 w-6" strokeWidth={2.2} />}
                className="max-md:hidden"
                onClick={() => navigate('/profile')}
              />
              <IconButton
                label="How to Play"
                icon={<CircleHelp className="pidro-metal-icon h-6 w-6" strokeWidth={2.2} />}
                onClick={() => navigate('/tutorial')}
              />
            </div>

            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <GlassCard style={{ padding: '10px 20px', borderRadius: 'var(--pidro-radius-md)' }}>
                <div className="flex items-center gap-3">
                  <Star className="pidro-metal-icon--gold h-5 w-5 shrink-0 fill-current" />
                  <span className="text-left leading-tight">
                    <span className="block font-[family-name:var(--pidro-font-display)] text-[15px] font-bold text-[var(--pidro-gold)] max-md:text-sm">
                      Remove Ads
                    </span>
                    <span className="block text-[11px] text-[var(--pidro-text-secondary)] max-md:hidden">
                      Play without interruptions!
                    </span>
                  </span>
                </div>
              </GlassCard>
            </div>

            <div className="absolute inset-y-0 right-0 flex items-center gap-2.5 max-md:gap-2">
              <IconButton
                label="Profile"
                icon={<Spade className="pidro-metal-icon--gold h-6 w-6 fill-current" />}
                onClick={() => navigate('/profile')}
              />
              <IconButton
                label="Log Out"
                icon={<LogOut className="pidro-metal-icon h-6 w-6" strokeWidth={2.2} />}
                onClick={handleLogout}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
