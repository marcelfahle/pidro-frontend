import { Link } from 'react-router-dom';
import { Card } from '../components/game/Card';
import { GameInfoBar } from '../components/game/GameInfoBar';
import { GamePlayerCard } from '../components/game/GamePlayerCard';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { PidroWordmark } from '../components/ui/PidroWordmark';
import { PlayerMiniCard } from '../components/ui/PlayerMiniCard';

const SAMPLE_CARDS = [
  { rank: 14, suit: 'hearts' as const },
  { rank: 11, suit: 'spades' as const },
  { rank: 10, suit: 'diamonds' as const },
  { rank: 5, suit: 'clubs' as const },
];

const BUTTON_SIZES = ['xs', 'sm', 'md', 'lg', 'xl'] as const;

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
                <Link to="/login">
                  <Button variant="glass" size="sm">
                    Login
                  </Button>
                </Link>
                <Link to="/lobby">
                  <Button variant="gold" size="sm">
                    Lobby
                  </Button>
                </Link>
              </div>
            </div>

            <PageHeader
              title="Pidro Design System"
              size="lg"
              subtitle="Static in-app workbench for the legacy-inspired web UI. This is the fast path now; if we later want isolated docs for web and React Native separately, we can add Storybook on top of these same primitives."
            />

            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <ShowcasePanel eyebrow="Header System" title="Page Headers">
                <div className="space-y-8">
                  <PageHeader title="Create or Join Table" size="lg" />
                  <PageHeader title="Multiplayer Lobby" size="md" />
                  <PageHeader title="Round Complete" size="sm" />
                </div>
              </ShowcasePanel>

              <ShowcasePanel eyebrow="Principles" title="Working Rules">
                <div className="grid gap-3 text-sm leading-6 text-cyan-50/80">
                  <div className="pidro-glass-box p-4">
                    Headers use the brown-gold ribbon treatment from legacy Pidro and should anchor
                    the top of major screens.
                  </div>
                  <div className="pidro-glass-box p-4">
                    Glass buttons are for utility and secondary actions. Gold buttons are for
                    primary table actions.
                  </div>
                  <div className="pidro-glass-box p-4">
                    Playing cards stay literal and readable first. Decorative flourish belongs
                    around them, not on them.
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  <Badge variant="blue">Glass</Badge>
                  <Badge variant="yellow">Primary</Badge>
                  <Badge variant="green">Playable</Badge>
                  <Badge variant="red">Danger</Badge>
                </div>

                <div className="pidro-glass-box mt-6 p-4">
                  <div className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-cyan-50/55">
                    Score Plaque
                  </div>
                  <div className="flex justify-center">
                    <GameInfoBar
                      phase="playing"
                      trumpSuit="diamonds"
                      scores={{ north_south: 37, east_west: 29 }}
                      viewerPosition="south"
                      roundNumber={6}
                      roomCode="DSGN"
                      currentBid={9}
                      bidWinner="north"
                    />
                  </div>
                </div>
              </ShowcasePanel>
            </div>

            <ShowcasePanel eyebrow="Button Kit" title="Buttons">
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="pidro-glass-box border-[#ffcc54]/20 p-4">
                  <div className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-[#ffe7a1]/70">
                    Gold Buttons
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {BUTTON_SIZES.map((size) => (
                      <Button key={`gold-${size}`} variant="gold" size={size}>
                        {`Gold ${size}`}
                      </Button>
                    ))}
                    <Button variant="gold" size="md" loading>
                      Loading
                    </Button>
                    <Button variant="gold" size="md" disabled>
                      Disabled
                    </Button>
                  </div>
                </div>

                <div className="pidro-glass-box border-cyan-300/20 p-4">
                  <div className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-cyan-50/65">
                    Glass Buttons
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {BUTTON_SIZES.map((size) => (
                      <Button key={`glass-${size}`} variant="glass" size={size}>
                        {`Glass ${size}`}
                      </Button>
                    ))}
                    <Button variant="danger" size="md">
                      Danger
                    </Button>
                    <Button variant="glass" size="md" disabled>
                      Disabled
                    </Button>
                  </div>
                </div>
              </div>
            </ShowcasePanel>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <ShowcasePanel eyebrow="Playing Cards" title="Card Faces">
                <div className="space-y-6">
                  <div>
                    <div className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-cyan-50/55">
                      Sizes
                    </div>
                    <div className="pidro-glass-box flex flex-wrap items-end gap-4 p-4">
                      <Card card={SAMPLE_CARDS[0]} size="sm" />
                      <Card card={SAMPLE_CARDS[1]} size="md" />
                      <Card card={SAMPLE_CARDS[2]} size="lg" />
                      <Card faceDown size="sm" />
                      <Card faceDown size="md" />
                      <Card faceDown size="lg" />
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-cyan-50/55">
                      States
                    </div>
                    <div className="pidro-glass-box flex flex-wrap items-end gap-4 p-4">
                      <Card card={SAMPLE_CARDS[0]} size="lg" playable />
                      <Card card={SAMPLE_CARDS[1]} size="lg" selected />
                      <Card card={SAMPLE_CARDS[2]} size="lg" isTrump pointValue={10} />
                      <Card card={SAMPLE_CARDS[3]} size="lg" isTrump pointValue={5} />
                    </div>
                  </div>
                </div>
              </ShowcasePanel>

              <ShowcasePanel eyebrow="Player Cards" title="Menu And In-Game">
                <div className="space-y-5">
                  <div className="flex flex-wrap items-start gap-4">
                    <PlayerMiniCard username="ThunderThor88" subtitle="Menu" />
                    <GamePlayerCard
                      displayName="ThunderThor88"
                      roleLabel="Teammate"
                      statusText="Ready"
                      initial="T"
                      isYou
                      isDealer
                      isCurrentTurn={false}
                      isConnected
                      className="max-w-[260px]"
                    />
                  </div>

                  <div className="pidro-glass-box p-4 text-sm leading-6 text-cyan-50/78">
                    The menu card is for account identity on non-game screens. The in-game card is
                    for seat/state information around the table.
                  </div>
                </div>
              </ShowcasePanel>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
