import { Globe, HelpCircle, Music, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  type AchievementItem,
  AchievementListRow,
  AggressionMeter,
  Badge,
  CardBack,
  DangerButton,
  Divider,
  GlassButton,
  GlassCard,
  HeaderBanner,
  PidroButton,
  PidroInput,
  PlayingCard,
  ProgressBar,
  ScoreBanner,
  SettingsTile,
  SkillBlock,
  StatGrid,
  StatusDot,
  TrumpIndicator,
  VeteranBar,
} from '../components/ds';
import { DealerChip } from '../components/game/DealerChip';
import { GamePlayerCard } from '../components/game/GamePlayerCard';
import { IdentityBadge } from '../components/profile/IdentityBadge';
import { PlayerAvatar } from '../components/profile/PlayerAvatar';
import { SKILL_MATERIALS, type SkillTier } from '../components/profile/ranking';
import { SkillEmblem } from '../components/profile/SkillEmblem';
import { PageHeader } from '../components/ui/PageHeader';
import { PidroWordmark } from '../components/ui/PidroWordmark';
import { PlayerMiniCard } from '../components/ui/PlayerMiniCard';

const SKILL_ORDER: SkillTier[] = ['provisional', 'bronze', 'silver', 'gold', 'platinum', 'master'];

const ACHIEVEMENTS: AchievementItem[] = [
  { name: 'Player', desc: 'Finish 10 games', state: 'earned', on: 'Apr 2024' },
  { name: 'Win Streak', desc: 'Win 3 games in a row', state: 'earned', on: 'Jul 2024' },
  {
    name: 'Partnership',
    desc: 'Win 10 games with the same partner',
    state: 'locked',
    progress: '6 / 10',
  },
  { name: 'Homerun', desc: 'Bid 14 and make it', state: 'soon' },
];

function ShowcasePanel({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section className="pidro-panel p-5 sm:p-6">
      <div className="mb-5">
        <div className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-50/55">
          {eyebrow}
        </div>
        <h2 className="mt-2 text-2xl font-black uppercase tracking-[0.06em] text-white">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-cyan-50/55">
      {children}
    </div>
  );
}

export function DesignSystemPage() {
  return (
    <div className="pidro-page items-start py-4">
      <div className="pidro-window w-full max-w-[1240px] overflow-hidden">
        <main className="relative max-h-[calc(100vh-2rem)] overflow-y-auto px-4 pb-10 pt-6 sm:px-6 lg:px-8">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,rgba(94,237,255,0.18),transparent_60%)]" />

          <div className="relative z-10 flex flex-col gap-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <PidroWordmark className="max-sm:mx-auto" />
              <div className="flex flex-wrap items-center gap-3 max-sm:w-full max-sm:justify-center">
                <Link to="/playground">
                  <GlassButton size="sm">Animation Lab</GlassButton>
                </Link>
                <Link to="/login">
                  <GlassButton size="sm">Login</GlassButton>
                </Link>
                <Link to="/lobby">
                  <PidroButton size="sm">Lobby</PidroButton>
                </Link>
              </div>
            </div>

            <PageHeader
              title="Pidro Design System"
              size="lg"
              subtitle="The Pidro brand kit, recreated from the Claude design handoff: wood-and-glass primitives, the four-axis player identity (Veteran · Skill · Playstyle · Mastery), and the game-table elements."
            />

            {/* ── Buttons ───────────────────────────────────────── */}
            <ShowcasePanel eyebrow="Controls" title="Buttons">
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="pidro-glass-box p-4">
                  <SubLabel>Primary — wood &amp; gold (glass-lacquer top)</SubLabel>
                  <div className="flex flex-wrap items-center gap-3">
                    <PidroButton size="sm">Single Player</PidroButton>
                    <PidroButton size="md">Multiplayer</PidroButton>
                    <PidroButton size="md" disabled>
                      Disabled
                    </PidroButton>
                  </div>
                </div>
                <div className="pidro-glass-box p-4">
                  <SubLabel>Secondary — frosted glass</SubLabel>
                  <div className="flex flex-wrap items-center gap-3">
                    <GlassButton size="sm">Glass sm</GlassButton>
                    <GlassButton size="lg">Glass lg</GlassButton>
                    <GlassButton size="md" premium>
                      Premium
                    </GlassButton>
                    <DangerButton size="md">Delete User</DangerButton>
                  </div>
                </div>
              </div>
            </ShowcasePanel>

            {/* ── Banners & surfaces ────────────────────────────── */}
            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <ShowcasePanel eyebrow="Surfaces" title="Banners & Glass">
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-4">
                    <HeaderBanner size="sm">Settings</HeaderBanner>
                    <HeaderBanner size="md">Create or Join Table</HeaderBanner>
                  </div>
                  <GlassCard style={{ marginTop: 8 }}>
                    <div className="text-sm leading-6 text-cyan-50/85">
                      Frosted glass container — the workhorse surface. Cyan border, subtle
                      cross-hatch texture, soft glow.
                    </div>
                  </GlassCard>
                  <Divider label="VS" />
                </div>
              </ShowcasePanel>

              <ShowcasePanel eyebrow="Atoms" title="Badges, Inputs & Bars">
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Badge variant="cyan">Online</Badge>
                    <Badge variant="gold">Premium</Badge>
                    <Badge variant="green">Ready</Badge>
                    <span className="ml-2 inline-flex items-center gap-2 text-sm text-cyan-50/80">
                      <StatusDot online /> online
                    </span>
                    <span className="inline-flex items-center gap-2 text-sm text-cyan-50/80">
                      <StatusDot online={false} /> offline
                    </span>
                  </div>
                  <PidroInput placeholder="Search tables…" />
                  <div className="space-y-2">
                    <ProgressBar value={0.45} label="45%" />
                    <ProgressBar value={0.8} color="var(--pidro-gold)" label="XP" />
                  </div>
                </div>
              </ShowcasePanel>
            </div>

            {/* ── Player identity ───────────────────────────────── */}
            <ShowcasePanel eyebrow="Player Identity" title="Avatars, Skill & Dedication">
              <div className="space-y-7">
                <div>
                  <SubLabel>Skill emblem — swaps per tier (skill never carries a number)</SubLabel>
                  <div className="pidro-glass-box flex flex-wrap items-end gap-6 p-5">
                    {SKILL_ORDER.map((tier) => (
                      <div key={tier} className="flex flex-col items-center gap-2">
                        <SkillEmblem tier={tier} size={56} />
                        <span className="text-[11px] font-bold text-cyan-50/75">
                          {SKILL_MATERIALS[tier].name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <SubLabel>
                    Identity badge (Halo) — dedication ring + level, skill coin pinned
                  </SubLabel>
                  <div className="pidro-glass-box flex flex-wrap items-end gap-8 p-6">
                    <IdentityBadge
                      name="ThunderThor88"
                      level={23}
                      progress={0.45}
                      tier="gold"
                      size={96}
                      withTitle
                    />
                    <IdentityBadge
                      name="Maja"
                      level={7}
                      progress={0.7}
                      tier="provisional"
                      size={80}
                      withTitle
                    />
                    <IdentityBadge
                      name="Old Pete"
                      level={100}
                      progress={1}
                      tier="master"
                      prestige={8}
                      size={96}
                      withTitle
                    />
                    <IdentityBadge name="Rook" level={12} progress={0.3} tier="silver" size={56} />
                    <IdentityBadge
                      name="Ace"
                      level={48}
                      progress={0.85}
                      tier="platinum"
                      size={56}
                    />
                  </div>
                </div>

                <div>
                  <SubLabel>Round avatar — in-game states</SubLabel>
                  <div className="pidro-glass-box flex flex-wrap items-center gap-6 p-5">
                    {[
                      { node: <PlayerAvatar initial="T" online />, label: 'Online' },
                      { node: <PlayerAvatar initial="M" state="active" />, label: 'Active turn' },
                      { node: <PlayerAvatar initial="P" online={false} />, label: 'Offline' },
                      { node: <PlayerAvatar isBot />, label: 'Bot' },
                      { node: <PlayerAvatar isVacant />, label: 'Open seat' },
                    ].map((x) => (
                      <div key={x.label} className="flex flex-col items-center gap-2">
                        {x.node}
                        <span className="text-[10px] text-cyan-50/65">{x.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <SubLabel>Menu &amp; in-game cards</SubLabel>
                  <div className="flex flex-wrap items-start gap-4">
                    <PlayerMiniCard
                      username="ThunderThor88"
                      profile={{
                        level: 23,
                        progress: 0.45,
                        tier: 'gold',
                        prestige: 0,
                        title: 'Fixture',
                      }}
                    />
                    <GamePlayerCard
                      displayName="ThunderThor88"
                      statusText="Ready"
                      initial="T"
                      isYou
                      isDealer
                      isConnected
                      className="max-w-[260px]"
                    />
                  </div>
                </div>
              </div>
            </ShowcasePanel>

            {/* ── Profile axes ──────────────────────────────────── */}
            <div className="grid gap-6 xl:grid-cols-2">
              <ShowcasePanel eyebrow="Dedication & Skill" title="Profile Blocks">
                <div className="space-y-6">
                  <GlassCard>
                    <VeteranBar level={23} into={1200} span={3200} />
                  </GlassCard>
                  <GlassCard>
                    <SkillBlock tier="gold" />
                  </GlassCard>
                  <GlassCard>
                    <SkillBlock tier="provisional" ratedGames={4} />
                  </GlassCard>
                </div>
              </ShowcasePanel>

              <ShowcasePanel eyebrow="Playstyle & Stats" title="Meter & Stat Grid">
                <div className="space-y-6">
                  <GlassCard>
                    <AggressionMeter value={0.72} avgBid={9} width="100%" />
                  </GlassCard>
                  <GlassCard>
                    <AggressionMeter value={null} width="100%" />
                  </GlassCard>
                  <StatGrid
                    stats={[
                      { label: 'Games', value: '1,284' },
                      { label: 'Win rate', value: '51.8%', accent: 'var(--pidro-text-cyan)' },
                      { label: 'Wins', value: '665' },
                      { label: 'Best streak', value: '11', accent: 'var(--pidro-gold)' },
                    ]}
                  />
                </div>
              </ShowcasePanel>
            </div>

            {/* ── Mastery ───────────────────────────────────────── */}
            <ShowcasePanel eyebrow="Mastery" title="Achievements">
              <div className="flex flex-col gap-2.5">
                {ACHIEVEMENTS.map((a) => (
                  <AchievementListRow key={a.name} a={a} />
                ))}
              </div>
            </ShowcasePanel>

            {/* ── Table & cards ─────────────────────────────────── */}
            <ShowcasePanel eyebrow="Game Table" title="Score, Cards & Tiles">
              <div className="space-y-6">
                <div className="pidro-glass-box flex flex-wrap items-center gap-6 p-5">
                  <ScoreBanner scoreA={37} scoreB={29} />
                  <TrumpIndicator suit="hearts" size={52} />
                  <TrumpIndicator suit="spades" size={52} />
                  <DealerChip />
                </div>

                <div>
                  <SubLabel>Playing cards &amp; backs</SubLabel>
                  <div className="pidro-glass-box flex flex-wrap items-end gap-4 p-5">
                    <PlayingCard rank="A" suit="hearts" size="sm" />
                    <PlayingCard rank="K" suit="spades" size="md" />
                    <PlayingCard rank="10" suit="diamonds" size="lg" />
                    <PlayingCard rank="Q" suit="clubs" size="lg" selected />
                    <CardBack size="md" />
                    <CardBack size="lg" />
                  </div>
                </div>

                <div>
                  <SubLabel>Settings tiles</SubLabel>
                  <div className="grid max-w-[420px] grid-cols-4 gap-3">
                    <SettingsTile icon={<Music className="h-9 w-9" />} label="Sound" status="On" />
                    <SettingsTile
                      icon={<Globe className="h-9 w-9" />}
                      label="Language"
                      status="EN"
                    />
                    <SettingsTile icon={<Shield className="h-9 w-9" />} label="Privacy" />
                    <SettingsTile icon={<HelpCircle className="h-9 w-9" />} label="Help" />
                  </div>
                </div>
              </div>
            </ShowcasePanel>
          </div>
        </main>
      </div>
    </div>
  );
}
