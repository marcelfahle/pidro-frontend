import type { Card as CardType, Suit } from '@pidro/shared';
import { SUIT_COLORS_RAW, SUIT_SYMBOLS } from '@pidro/shared';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import pidroLogoUrl from '../assets/pidro-logo.png';
import { GlassButton, PidroButton } from '../components/ds';
import { Card, getPidroPoints } from '../components/game/Card';
import { useAuthStore } from '../stores/auth';

/**
 * Interactive "How to Play" walkthrough for Finnish Pidro. Each step pairs a
 * short rule with a hands-on demo built from the real game components —
 * three steps (bid, call trump, win a trick) require the player to act
 * before they can continue.
 */

const TRUMP: Suit = 'hearts';

/** The sample hand used across the walkthrough — heavy in hearts on purpose. */
const SAMPLE_HAND: CardType[] = [
  { rank: 14, suit: 'hearts' },
  { rank: 12, suit: 'hearts' },
  { rank: 10, suit: 'hearts' },
  { rank: 7, suit: 'hearts' },
  { rank: 5, suit: 'hearts' },
  { rank: 5, suit: 'diamonds' },
  { rank: 13, suit: 'spades' },
  { rank: 8, suit: 'clubs' },
  { rank: 3, suit: 'diamonds' },
];

const KEPT_HAND: CardType[] = SAMPLE_HAND.filter(
  (c) => c.suit === 'hearts' || (c.rank === 5 && c.suit === 'diamonds'),
);

const POINT_CARDS: { card: CardType; points: number; label: string }[] = [
  { card: { rank: 14, suit: 'hearts' }, points: 1, label: 'Ace' },
  { card: { rank: 11, suit: 'hearts' }, points: 1, label: 'Jack' },
  { card: { rank: 10, suit: 'hearts' }, points: 1, label: 'Ten' },
  { card: { rank: 2, suit: 'hearts' }, points: 1, label: 'Two' },
  { card: { rank: 5, suit: 'hearts' }, points: 5, label: 'Right 5' },
  { card: { rank: 5, suit: 'diamonds' }, points: 5, label: 'Wrong 5' },
];

type StepId =
  | 'welcome'
  | 'deal'
  | 'bidding'
  | 'trump'
  | 'fives'
  | 'discard'
  | 'tricks'
  | 'points'
  | 'scoring'
  | 'ready';

const STEPS: { id: StepId; title: string }[] = [
  { id: 'welcome', title: 'Welcome to Pidro' },
  { id: 'deal', title: 'The Deal' },
  { id: 'bidding', title: 'Bidding' },
  { id: 'trump', title: 'Call Trump' },
  { id: 'fives', title: 'The Two Fives' },
  { id: 'discard', title: 'Discard & Reload' },
  { id: 'tricks', title: 'Play Tricks' },
  { id: 'points', title: 'The 14 Points' },
  { id: 'scoring', title: 'Make Your Bid' },
  { id: 'ready', title: "You're Ready" },
];

export function TutorialPage() {
  const navigate = useNavigate();
  const isAuthed = useAuthStore((s) => s.status === 'authenticated');

  const [stepIndex, setStepIndex] = useState(0);
  const [chosenBid, setChosenBid] = useState<number | null>(null);
  const [bidHint, setBidHint] = useState<string | null>(null);
  const [trumpPicked, setTrumpPicked] = useState(false);
  const [trumpHint, setTrumpHint] = useState<string | null>(null);
  const [discarded, setDiscarded] = useState(false);
  const [trickWon, setTrickWon] = useState(false);
  const [trickHint, setTrickHint] = useState<string | null>(null);
  const [shakingCard, setShakingCard] = useState<string | null>(null);

  const step = STEPS[stepIndex];

  const stepComplete = useMemo(() => {
    switch (step.id) {
      case 'bidding':
        return chosenBid !== null;
      case 'trump':
        return trumpPicked;
      case 'tricks':
        return trickWon;
      default:
        return true;
    }
  }, [step.id, chosenBid, trumpPicked, trickWon]);

  const goNext = useCallback(() => {
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }, []);
  const goBack = useCallback(() => {
    setStepIndex((i) => Math.max(i - 1, 0));
  }, []);

  const handleExit = useCallback(() => {
    navigate(isAuthed ? '/home' : '/login');
  }, [navigate, isAuthed]);

  const handleBid = (amount: number) => {
    setChosenBid(amount);
    setBidHint(null);
  };

  const handlePassAttempt = () => {
    setBidHint('Passing is always safe — but this hand is too good to waste. Try a bid!');
  };

  const handleTrumpPick = (suit: Suit) => {
    if (suit === TRUMP) {
      setTrumpPicked(true);
      setTrumpHint(null);
    } else {
      const count = SAMPLE_HAND.filter((c) => c.suit === suit).length;
      setTrumpHint(
        `You only hold ${count} ${suit === 'diamonds' ? 'diamond' : suit.slice(0, -1)}${count === 1 ? '' : 's'}. Hearts is your power suit — five of them!`,
      );
    }
  };

  const handleTrickPlay = (card: CardType) => {
    if (card.rank === 14) {
      setTrickWon(true);
      setTrickHint(null);
    } else {
      setShakingCard(`${card.rank}-${card.suit}`);
      setTrickHint('The King is winning that trick — only your Ace beats it. Go big!');
      setTimeout(() => setShakingCard(null), 450);
    }
  };

  return (
    <div className="pidro-page">
      <div className="pidro-window flex h-dvh flex-col items-center overflow-y-auto px-4 py-4 short:py-2">
        {/* Header */}
        <div className="flex w-full max-w-[640px] items-center justify-between">
          <img
            src={pidroLogoUrl}
            alt="Pidro"
            className="pointer-events-none w-[88px] select-none short:w-[64px]"
          />
          <div className="text-center">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-50/55">
              How to play · {stepIndex + 1}/{STEPS.length}
            </div>
            <h1 className="font-[family-name:var(--pidro-font-display)] text-xl text-[var(--pidro-gold)] [text-shadow:var(--pidro-shadow-text)] short:text-lg">
              {step.title}
            </h1>
          </div>
          <button
            type="button"
            aria-label="Close tutorial"
            onClick={handleExit}
            className="pidro-icon-button !h-10 !w-10 shrink-0"
          >
            <span aria-hidden="true" className="text-lg font-black">
              ×
            </span>
          </button>
        </div>

        {/* Progress dots */}
        <div className="mt-2 flex gap-1.5">
          {STEPS.map((s, i) => (
            <span
              key={s.id}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === stepIndex
                  ? 'w-5 bg-[var(--pidro-cyan)]'
                  : i < stepIndex
                    ? 'w-1.5 bg-[var(--pidro-cyan)]/60'
                    : 'w-1.5 bg-white/15'
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div
          key={step.id}
          className="tutorial-step-enter mt-4 flex w-full max-w-[640px] flex-1 flex-col short:mt-2"
        >
          <div className="pidro-panel flex flex-1 flex-col items-center justify-center gap-4 rounded-xl p-5 text-center short:gap-2.5 short:p-3">
            {step.id === 'welcome' && <WelcomeStep />}
            {step.id === 'deal' && <DealStep />}
            {step.id === 'bidding' && (
              <BiddingStep
                chosenBid={chosenBid}
                hint={bidHint}
                onBid={handleBid}
                onPass={handlePassAttempt}
              />
            )}
            {step.id === 'trump' && (
              <TrumpStep picked={trumpPicked} hint={trumpHint} onPick={handleTrumpPick} />
            )}
            {step.id === 'fives' && <FivesStep />}
            {step.id === 'discard' && (
              <DiscardStep discarded={discarded} onDiscard={() => setDiscarded(true)} />
            )}
            {step.id === 'tricks' && (
              <TricksStep
                won={trickWon}
                hint={trickHint}
                shakingCard={shakingCard}
                onPlay={handleTrickPlay}
              />
            )}
            {step.id === 'points' && <PointsStep />}
            {step.id === 'scoring' && <ScoringStep bid={chosenBid ?? 9} />}
            {step.id === 'ready' && <ReadyStep isAuthed={isAuthed} onExit={handleExit} />}
          </div>

          {/* Navigation */}
          <div className="mt-3 flex w-full items-center justify-between gap-3 pb-2 short:mt-2">
            <GlassButton onClick={goBack} disabled={stepIndex === 0}>
              Back
            </GlassButton>
            {step.id !== 'ready' && (
              <PidroButton size="sm" onClick={goNext} disabled={!stepComplete}>
                {stepComplete ? 'Next' : stepActionLabel(step.id)}
              </PidroButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function stepActionLabel(id: StepId): string {
  switch (id) {
    case 'bidding':
      return 'Place a bid…';
    case 'trump':
      return 'Pick a suit…';
    case 'tricks':
      return 'Play a card…';
    default:
      return 'Next';
  }
}

/* ── Steps ──────────────────────────────────────────────────────────── */

function StepCopy({ children }: { children: React.ReactNode }) {
  return (
    <p className="max-w-[460px] text-[15px] font-semibold leading-relaxed text-cyan-50/85 short:text-[13px]">
      {children}
    </p>
  );
}

function Gold({ children }: { children: React.ReactNode }) {
  return <span className="font-black text-[var(--pidro-gold)]">{children}</span>;
}

function WelcomeStep() {
  return (
    <>
      <StepCopy>
        Pidro is a trick-taking card game for <Gold>four players in two teams</Gold> — you and the
        player across the table against the other two.
      </StepCopy>
      <SeatDiagram />
      <StepCopy>
        Every hand has <Gold>14 points</Gold> on the table. First team to <Gold>62 points</Gold>{' '}
        wins the game.
      </StepCopy>
    </>
  );
}

function SeatDiagram() {
  const seat = (label: string, you: boolean, ally: boolean) => (
    <div
      className={`flex h-14 w-14 flex-col items-center justify-center rounded-full border-2 text-[10px] font-black uppercase tracking-wide short:h-11 short:w-11 ${
        you || ally
          ? 'border-[var(--pidro-cyan)] bg-cyan-400/15 text-cyan-100 shadow-[0_0_14px_rgba(0,207,255,0.3)]'
          : 'border-white/25 bg-black/20 text-white/70'
      }`}
    >
      {you ? 'You' : label}
    </div>
  );

  return (
    <div className="grid grid-cols-3 grid-rows-3 place-items-center gap-1 rounded-full border border-cyan-300/15 bg-black/10 p-4 short:p-2">
      <div />
      {seat('Partner', false, true)}
      <div />
      {seat('Rival', false, false)}
      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-50/40">vs</div>
      {seat('Rival', false, false)}
      <div />
      {seat('You', true, false)}
      <div />
    </div>
  );
}

function DealStep() {
  return (
    <>
      <StepCopy>
        Each player is dealt <Gold>nine cards</Gold>, three at a time. Here's yours — a monster in
        hearts:
      </StepCopy>
      <div className="flex flex-wrap items-center justify-center">
        {SAMPLE_HAND.map((card, i) => (
          <div
            key={`${card.rank}-${card.suit}`}
            className="tutorial-card-enter"
            style={{
              marginLeft: i === 0 ? 0 : -16,
              zIndex: i,
              animationDelay: `${i * 70}ms`,
            }}
          >
            <Card card={card} size="md" />
          </div>
        ))}
      </div>
      <StepCopy>
        Five hearts, including the <Gold>5</Gold> — plus the 5 of diamonds. Remember those fives.
      </StepCopy>
    </>
  );
}

function BiddingStep({
  chosenBid,
  hint,
  onBid,
  onPass,
}: {
  chosenBid: number | null;
  hint: string | null;
  onBid: (amount: number) => void;
  onPass: () => void;
}) {
  return (
    <>
      <StepCopy>
        Starting left of the dealer, each player gets <Gold>one chance</Gold> to bid{' '}
        <Gold>6–14</Gold> — how many of the 14 points your team will win — or pass. Highest bidder
        names trump. If everyone passes, the dealer is forced to bid 6.
      </StepCopy>
      <StepCopy>With five hearts and two fives in reach, this hand is worth a real bid:</StepCopy>
      <div className="grid grid-cols-5 gap-1.5 max-sm:grid-cols-3">
        {[6, 7, 8, 9, 10, 11, 12, 13, 14].map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => onBid(amount)}
            className={`rounded-md border px-4 py-2 text-sm font-black transition-all ${
              chosenBid === amount
                ? 'border-[var(--pidro-gold)] bg-[var(--pidro-gold)]/20 text-[var(--pidro-gold)] shadow-[0_0_12px_rgba(255,212,38,0.3)]'
                : 'border-cyan-200/65 bg-cyan-400/12 text-white hover:-translate-y-0.5 hover:border-cyan-100'
            }`}
          >
            {amount}
          </button>
        ))}
        <button
          type="button"
          onClick={onPass}
          className="rounded-md border border-cyan-200/30 bg-white/8 px-4 py-2 text-[11px] font-black uppercase tracking-wide text-cyan-50/80 transition-all hover:bg-white/14 max-sm:col-span-3"
        >
          Pass
        </button>
      </div>
      {hint && <Hint>{hint}</Hint>}
      {chosenBid !== null && (
        <Hint tone="success">
          You bid {chosenBid} — the table folds. The contract is yours: take at least {chosenBid} of
          the 14 points.
        </Hint>
      )}
    </>
  );
}

function TrumpStep({
  picked,
  hint,
  onPick,
}: {
  picked: boolean;
  hint: string | null;
  onPick: (suit: Suit) => void;
}) {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  return (
    <>
      <StepCopy>
        You won the bid, so you <Gold>name the trump suit</Gold> — nobody knew it during bidding.
        Only trump cards matter in Pidro. Pick your strongest suit:
      </StepCopy>
      <div className="grid grid-cols-4 gap-2 max-sm:grid-cols-2">
        {suits.map((suit) => (
          <button
            key={suit}
            type="button"
            onClick={() => onPick(suit)}
            className={`rounded-[8px] border bg-[linear-gradient(180deg,#fcfcfc_0%,#ececec_100%)] px-4 py-2.5 shadow-[0_8px_14px_rgba(0,0,0,0.14)] transition-transform hover:-translate-y-0.5 ${
              picked && suit === TRUMP
                ? 'border-[var(--pidro-gold)] ring-2 ring-[var(--pidro-gold)]/60'
                : 'border-white/50'
            }`}
          >
            <div className="text-3xl short:text-2xl" style={{ color: SUIT_COLORS_RAW[suit] }}>
              {SUIT_SYMBOLS[suit]}
            </div>
            <div className="mt-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-800">
              {suit}
            </div>
          </button>
        ))}
      </div>
      {hint && <Hint>{hint}</Hint>}
      {picked && <Hint tone="success">Hearts it is. Every heart is now a trump card.</Hint>}
    </>
  );
}

function FivesStep() {
  return (
    <>
      <StepCopy>
        Here's the Pidro twist: trump isn't just one suit. The <Gold>5 of trump</Gold> and the{' '}
        <Gold>5 of the same-color suit</Gold> are both trump — and each is worth{' '}
        <Gold>5 points</Gold>.
      </StepCopy>
      <div className="flex items-center justify-center gap-4">
        <div className="flex flex-col items-center gap-1.5">
          <Card card={{ rank: 5, suit: 'hearts' }} size="lg" isTrump pointValue={5} />
          <span className="text-[10px] font-black uppercase tracking-wide text-[var(--pidro-gold)]">
            Right 5
          </span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <Card card={{ rank: 5, suit: 'diamonds' }} size="lg" isTrump pointValue={5} />
          <span className="text-[10px] font-black uppercase tracking-wide text-[var(--pidro-gold)]">
            Wrong 5
          </span>
        </div>
      </div>
      <StepCopy>
        Hearts are trump, so the 5♦ sneaks into the trump suit too. These two cards carry{' '}
        <Gold>10 of the 14 points</Gold> — guard them with your life.
      </StepCopy>
    </>
  );
}

function DiscardStep({ discarded, onDiscard }: { discarded: boolean; onDiscard: () => void }) {
  const shown = discarded ? KEPT_HAND : SAMPLE_HAND;
  return (
    <>
      <StepCopy>
        Everyone now <Gold>throws away every non-trump card</Gold> and the dealer refills each
        player back up to six. By the time play starts, every card in every hand is trump.
      </StepCopy>
      <div className="flex flex-wrap items-center justify-center">
        {shown.map((card, i) => {
          const isTrump = card.suit === TRUMP || (card.rank === 5 && card.suit === 'diamonds');
          return (
            <div
              key={`${card.rank}-${card.suit}`}
              className="transition-all duration-300"
              style={{ marginLeft: i === 0 ? 0 : -16, zIndex: i }}
            >
              <Card
                card={card}
                size="md"
                isTrump={discarded ? false : isTrump}
                className={!isTrump && !discarded ? 'opacity-90 saturate-[0.55]' : ''}
              />
            </div>
          );
        })}
      </div>
      {!discarded ? (
        <PidroButton size="sm" onClick={onDiscard}>
          Toss the junk
        </PidroButton>
      ) : (
        <Hint tone="success">
          Six cards, all trump. If you run out of trumps mid-hand, you sit out the rest of it.
        </Hint>
      )}
    </>
  );
}

function TricksStep({
  won,
  hint,
  shakingCard,
  onPlay,
}: {
  won: boolean;
  hint: string | null;
  shakingCard: string | null;
  onPlay: (card: CardType) => void;
}) {
  const tableCards: { card: CardType; label: string }[] = [
    { card: { rank: 11, suit: 'hearts' }, label: 'Rival' },
    { card: { rank: 9, suit: 'hearts' }, label: 'Partner' },
    { card: { rank: 13, suit: 'hearts' }, label: 'Rival' },
  ];
  const yourOptions: CardType[] = [
    { rank: 14, suit: 'hearts' },
    { rank: 12, suit: 'hearts' },
    { rank: 7, suit: 'hearts' },
  ];

  return (
    <>
      <StepCopy>
        The bid winner leads the first trick. <Gold>Highest trump takes it</Gold>, and the winner
        leads the next. The rival's King is winning — take it back!
      </StepCopy>
      <div
        className={`flex items-end justify-center gap-2 rounded-xl border border-cyan-300/15 bg-black/10 px-4 py-3 ${won ? 'animate-trick-win' : ''}`}
      >
        {tableCards.map(({ card, label }) => (
          <div key={`${card.rank}-${card.suit}`} className="flex flex-col items-center gap-1">
            <Card card={card} size="md" />
            <span className="text-[9px] font-black uppercase tracking-wide text-cyan-50/55">
              {label}
            </span>
          </div>
        ))}
        {won && (
          <div className="flex flex-col items-center gap-1">
            <Card card={{ rank: 14, suit: 'hearts' }} size="md" isTrump />
            <span className="text-[9px] font-black uppercase tracking-wide text-[var(--pidro-gold)]">
              You
            </span>
          </div>
        )}
      </div>
      {!won ? (
        <>
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-50/60">
            Your hand — pick the winner
          </div>
          <div className="flex items-center justify-center gap-2">
            {yourOptions.map((card) => (
              <div
                key={`${card.rank}-${card.suit}`}
                className={shakingCard === `${card.rank}-${card.suit}` ? 'animate-shake' : ''}
              >
                <Card card={card} size="md" playable onClick={() => onPlay(card)} />
              </div>
            ))}
          </div>
        </>
      ) : (
        <Hint tone="success">
          Your Ace takes the trick — and the Jack in it is worth a point. You lead the next trick.
        </Hint>
      )}
      {hint && !won && <Hint>{hint}</Hint>}
    </>
  );
}

function PointsStep() {
  return (
    <>
      <StepCopy>
        Six trump cards carry all <Gold>14 points</Gold>:
      </StepCopy>
      <div className="flex flex-wrap items-end justify-center gap-2">
        {POINT_CARDS.map(({ card, points, label }) => (
          <div key={`${card.rank}-${card.suit}`} className="flex flex-col items-center gap-1">
            <Card card={card} size="md" pointValue={points} isTrump />
            <span className="text-[9px] font-black uppercase tracking-wide text-cyan-50/55">
              {label}
            </span>
          </div>
        ))}
      </div>
      <StepCopy>
        One quirk: the <Gold>Two</Gold> scores for whoever was <Gold>dealt</Gold> it — nobody can
        take it from you in a trick.
      </StepCopy>
    </>
  );
}

function ScoringStep({ bid }: { bid: number }) {
  return (
    <>
      <StepCopy>
        You bid <Gold>{bid}</Gold>. Take at least {bid} points and your team{' '}
        <Gold>keeps everything it won</Gold>. Fall short and you <Gold>lose the whole bid</Gold> —
        your score can go negative. The defending team always banks its points.
      </StepCopy>
      <div className="grid w-full max-w-[420px] grid-cols-2 gap-3">
        <div className="rounded-xl border border-[#4ae06a]/35 bg-[#4ae06a]/10 p-3">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#9ef0b0]">
            Made it
          </div>
          <div className="mt-1 text-2xl font-black text-white">
            took {Math.min(14, bid + 1)} → +{Math.min(14, bid + 1)}
          </div>
        </div>
        <div className="rounded-xl border border-[#ff5252]/35 bg-[#ff5252]/10 p-3">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#ffb3b3]">
            Went set
          </div>
          <div className="mt-1 text-2xl font-black text-white">took 4 → −{bid}</div>
        </div>
      </div>
      <StepCopy>
        That's the whole gamble: bid big enough to win the right to name trump, but never more than
        your hand can deliver.
      </StepCopy>
    </>
  );
}

function ReadyStep({ isAuthed, onExit }: { isAuthed: boolean; onExit: () => void }) {
  const navigate = useNavigate();
  return (
    <>
      <StepCopy>
        Deal nine. Bid 6–14. Call trump. Keep six. Win the points — especially those fives. First
        team to <Gold>62</Gold> takes the game.
      </StepCopy>
      <div className="flex flex-col items-center gap-3">
        <PidroButton size="md" onClick={() => navigate(isAuthed ? '/home' : '/register')}>
          {isAuthed ? 'Play Now' : 'Create Account'}
        </PidroButton>
        <GlassButton onClick={onExit}>{isAuthed ? 'Back to Menu' : 'Back to Sign In'}</GlassButton>
      </div>
    </>
  );
}

function Hint({
  children,
  tone = 'info',
}: {
  children: React.ReactNode;
  tone?: 'info' | 'success';
}) {
  return (
    <div
      className={`max-w-[440px] rounded-lg border px-4 py-2 text-[13px] font-bold short:text-[12px] ${
        tone === 'success'
          ? 'border-[#4ae06a]/35 bg-[#4ae06a]/10 text-[#c9f5d2]'
          : 'border-[var(--pidro-gold)]/35 bg-[var(--pidro-gold)]/10 text-[#ffe9a3]'
      }`}
    >
      {children}
    </div>
  );
}

// Re-export for tests that want to assert on point math used in the demos.
export { getPidroPoints };
