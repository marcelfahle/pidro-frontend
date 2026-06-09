import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfile, type PlayerProfile, veteranProgressFraction } from '../api/profile';
import {
  type AchievementItem,
  AchievementListRow,
  AggressionMeter,
  GlassCard,
  HeaderBanner,
  SkillBlock,
  StatGrid,
  VeteranBar,
} from '../components/ds';
import { IdentityBadge } from '../components/profile/IdentityBadge';
import { veteranTitle } from '../components/profile/ranking';
import { Spinner } from '../components/ui/Spinner';
import { useAuthStore } from '../stores/auth';

function catalogToItems(profile: PlayerProfile): AchievementItem[] {
  return profile.achievements_catalog.map((c) => ({
    name: c.name,
    desc: c.description,
    state: c.earned ? 'earned' : 'locked',
  }));
}

export function ProfilePage() {
  const navigate = useNavigate();
  const username = useAuthStore((s) => s.user?.username) ?? 'Player';
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let active = true;
    getProfile()
      .then((p) => {
        if (!active) return;
        setProfile(p);
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('error');
      });
    return () => {
      active = false;
    };
  }, []);

  const tier = profile
    ? profile.skill.provisional
      ? 'provisional'
      : profile.skill.tier
    : 'provisional';
  const progress = profile ? profile.veteran.progress : 'max';
  const [into, span] = progress === 'max' ? [0, 0] : (progress as [number, number]);

  return (
    <div className="pidro-page items-start py-4">
      <div className="pidro-window w-full max-w-[760px] overflow-hidden">
        <main className="relative max-h-[calc(100vh-2rem)] overflow-y-auto px-4 pb-10 pt-6 sm:px-6">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top,rgba(94,237,255,0.16),transparent_60%)]" />

          <div className="relative z-10 flex flex-col items-center gap-6">
            <HeaderBanner size="lg">My Profile</HeaderBanner>

            {status === 'loading' && (
              <div className="flex h-64 items-center justify-center">
                <Spinner />
              </div>
            )}

            {status === 'error' && (
              <GlassCard style={{ width: '100%' }}>
                <div className="text-center text-sm text-cyan-50/80">
                  Couldn’t load your profile right now. Your progression is safe — try again
                  shortly.
                </div>
              </GlassCard>
            )}

            {status === 'ready' && profile && (
              <div className="flex w-full flex-col gap-5">
                {/* Identity header */}
                <GlassCard>
                  <div className="flex flex-wrap items-center gap-5">
                    <IdentityBadge
                      name={username}
                      level={profile.veteran.level}
                      progress={veteranProgressFraction(profile.veteran.progress)}
                      tier={tier}
                      prestige={profile.veteran.prestige}
                      size={96}
                    />
                    <div className="min-w-0">
                      <div className="font-[family-name:var(--pidro-font-display)] text-2xl text-white">
                        {username}
                      </div>
                      <div className="font-[family-name:var(--pidro-font-display)] text-base text-cyan-100/90">
                        {veteranTitle(profile.veteran.level).full}
                      </div>
                      <div className="mt-1 text-sm text-cyan-50/70">
                        Level {profile.veteran.level}
                        {profile.veteran.prestige > 0 && (
                          <span className="ml-1 font-bold text-[var(--pidro-gold-light)]">
                            ★{profile.veteran.prestige}
                          </span>
                        )}
                        {' · '}
                        {profile.account_age_days != null
                          ? `${profile.account_age_days} days at the table`
                          : 'New to the table'}
                      </div>
                    </div>
                  </div>
                </GlassCard>

                {/* Veteran */}
                <GlassCard>
                  <VeteranBar
                    level={profile.veteran.level}
                    into={into}
                    span={span}
                    prestige={profile.veteran.prestige}
                  />
                </GlassCard>

                {/* Skill — emblem block, μ/σ never shown */}
                <GlassCard>
                  <SkillBlock tier={tier} />
                </GlassCard>

                {/* Playstyle */}
                <GlassCard>
                  <AggressionMeter
                    value={
                      profile.playstyle.aggression_insufficient
                        ? null
                        : profile.playstyle.aggression_needle
                    }
                    avgBid={profile.playstyle.avg_winning_bid}
                    width="100%"
                  />
                </GlassCard>

                {/* Lifetime stats */}
                <StatGrid
                  stats={[
                    { label: 'Games', value: profile.games_played.toLocaleString() },
                    {
                      label: 'Win rate',
                      value: `${Math.round((profile.win_rate ?? 0) * 100)}%`,
                      accent: 'var(--pidro-text-cyan)',
                    },
                    { label: 'Wins', value: profile.wins.toLocaleString() },
                    { label: 'Losses', value: profile.losses.toLocaleString() },
                  ]}
                />

                {/* Mastery */}
                <div className="mt-2">
                  <div className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-cyan-50/55">
                    Achievements
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {catalogToItems(profile).map((a) => (
                      <AchievementListRow key={a.name} a={a} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate('/home')}
          className="pidro-icon-button absolute bottom-5 left-5 z-20"
        >
          <ArrowLeft className="pidro-metal-icon h-6 w-6" strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}
