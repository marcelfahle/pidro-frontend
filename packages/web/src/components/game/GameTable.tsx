import type {
  ActiveTurnTimer,
  Card as CardType,
  GameViewModel,
  LegalAction,
  ServerGameState,
  Suit,
} from '@pidro/shared';
import { getRankLabel, SUIT_COLORS_RAW, SUIT_SYMBOLS, useGameStore } from '@pidro/shared';
import { useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { BiddingPanel } from './BiddingPanel';
import { DealerSelectionReveal } from './DealerSelectionReveal';
import { GameInfoBar } from './GameInfoBar';
import { GamePlayerCard } from './GamePlayerCard';
import { HandSelector } from './HandSelector';
import { PlayerHand } from './PlayerHand';
import { TrickArea } from './TrickArea';
import { TrumpSelector } from './TrumpSelector';

interface GameTableProps {
  viewModel: GameViewModel;
  onPlayCard: (card: CardType) => void;
  onBid: (amount: number) => void;
  onPass: () => void;
  onDeclareTrump: (suit: Suit) => void;
  onSelectHand: (cards: CardType[]) => void;
  onLeave: () => void;
  handShaking?: boolean;
  optimisticCard?: CardType | null;
}

export function GameTable({
  viewModel,
  onPlayCard,
  onBid,
  onPass,
  onDeclareTrump,
  onSelectHand,
  onLeave,
  handShaking = false,
  optimisticCard = null,
}: GameTableProps) {
  const { serverState, legalActions, turnTimer } = useGameStore(
    useShallow((s) => ({
      serverState: s.serverState as ServerGameState | null,
      legalActions: s.legalActions as LegalAction[],
      turnTimer: s.turnTimer,
    })),
  );

  const { phase, trumpSuit, roomCode, players } = viewModel;
  const viewerIsSpectator = !players.some((player) => player.isYou);
  const viewerPosition = viewModel.viewerPositionAbsolute;

  const cuts = serverState?.dealer_selection_cuts;
  const showDealerReveal = phase === 'dealer_selection' && !!cuts && Object.keys(cuts).length > 0;
  const handNumber = serverState?.hand_number ?? serverState?.round_number ?? null;

  const north = players.find((p) => p.relativePosition === 'north');
  const east = players.find((p) => p.relativePosition === 'east');
  const south = players.find((p) => p.relativePosition === 'south');
  const west = players.find((p) => p.relativePosition === 'west');

  const timerTick = useTurnTimerProgress(turnTimer);
  // The pill box crowds SE/mini-class screens — go circle + floating text.
  const bareSeats = useMediaQuery('(max-width: 389px) and (orientation: portrait)');

  function avatarProps(player: NonNullable<typeof north>) {
    const name = player.username ?? (player.isYou ? 'You' : 'Player');
    return {
      displayName: name,
      statusText: playerStatusText(player.absolutePosition, viewModel, serverState),
      initial: name[0]?.toUpperCase() ?? '?',
      isDealer:
        phase !== 'dealer_selection' && viewModel.dealerAbsolute === player.absolutePosition,
      isCurrentTurn: player.isCurrentTurn,
      isConnected: player.isConnected,
      seatStatus: player.seatStatus,
      team: (player.isYou || player.isTeammate ? 'us' : 'them') as 'us' | 'them',
      rank: player.rank ?? null,
      timerProgress:
        timerTick && timerTick.position === player.absolutePosition ? timerTick.progress : null,
      bare: bareSeats,
    };
  }

  function getPlayerCards(absPos: string) {
    const playerView = serverState?.players?.[absPos as keyof typeof serverState.players];
    if (!playerView) return { cards: null, cardCount: 0 };

    if (Array.isArray(playerView.hand)) {
      return {
        cards: playerView.hand as CardType[],
        cardCount: playerView.hand.length,
      };
    }

    const count =
      typeof playerView.hand === 'number' ? playerView.hand : (playerView.card_count ?? 0);

    return { cards: null, cardCount: count };
  }

  function handProps(
    player: NonNullable<typeof north>,
    position: 'north' | 'east' | 'south' | 'west',
  ) {
    return {
      position,
      ...getPlayerCards(player.absolutePosition),
      username: player.username,
      isYou: player.isYou,
      isDealer: viewModel.dealerAbsolute === player.absolutePosition,
      isCurrentTurn: player.isCurrentTurn,
      isConnected: player.isConnected,
      isTeammate: player.isTeammate,
      seatStatus: player.seatStatus,
      legalActions: player.isYou ? legalActions : ([] as LegalAction[]),
      trumpSuit,
      statusText: playerStatusText(player.absolutePosition, viewModel, serverState),
      onPlayCard: player.isYou ? onPlayCard : undefined,
    };
  }

  const youPlayer = players.find((p) => p.isYou);
  const youCardsRaw = youPlayer ? getPlayerCards(youPlayer.absolutePosition).cards : null;
  const selectingHand = phase === 'second_deal' && (youCardsRaw?.length ?? 0) > 6;
  const youCards =
    optimisticCard && youCardsRaw
      ? youCardsRaw.filter(
          (c) => !(c.rank === optimisticCard.rank && c.suit === optimisticCard.suit),
        )
      : youCardsRaw;

  // South cards with optimistic filtering
  const southCards = south ? getPlayerCards(south.absolutePosition) : null;
  const filteredSouthCards =
    south && optimisticCard && south.isYou && southCards?.cards
      ? {
          cards: southCards.cards.filter(
            (c) => !(c.rank === optimisticCard.rank && c.suit === optimisticCard.suit),
          ),
          cardCount: southCards.cardCount - 1,
        }
      : southCards;

  return (
    <div className="flex h-full w-full flex-col">
      {/* ── Top bar: score · trump + hand · menu (safe-area aware) ── */}
      <div className="relative z-40 shrink-0 border-b border-cyan-200/12 bg-[linear-gradient(180deg,rgba(4,16,32,0.88)_0%,rgba(8,28,52,0.45)_100%)] pt-[env(safe-area-inset-top)]">
        <div className="relative h-11">
          {/* Score plaque hangs from the bar into the table */}
          <div className="absolute left-3 top-0 z-30 flex items-start max-sm:left-2">
            <GameInfoBar
              scores={serverState?.scores ?? null}
              viewerPosition={viewerPosition}
              viewerIsSpectator={viewerIsSpectator}
              handNumber={handNumber}
              roomCode={roomCode}
            />
          </div>

          {/* Center: hand number + trump suit */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2.5">
            {handNumber != null && (
              <span className="whitespace-nowrap text-[9px] font-black uppercase tracking-[0.22em] text-cyan-50/55">
                Hand {handNumber}
              </span>
            )}
            {trumpSuit && (
              <span
                role="img"
                aria-label={`Trump: ${trumpSuit}`}
                className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--pidro-gold)]/55 bg-[linear-gradient(180deg,#fcfcfc_0%,#e8e8e8_100%)] text-[13px] leading-none shadow-[0_1px_4px_rgba(0,0,0,0.4)]"
                style={{ color: SUIT_COLORS_RAW[trumpSuit] }}
              >
                {SUIT_SYMBOLS[trumpSuit]}
              </span>
            )}
          </div>

          <TableMenu onLeave={onLeave} />
        </div>
      </div>

      {/* ── Game zone ── */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {/* North: card backs tucked under the bar + seat pill at a fixed spot */}
        {north && (
          <div className="absolute left-1/2 top-0 z-20 flex -translate-x-1/2 flex-col items-center">
            {/* Fixed-height slot — the pill stays put even with zero cards */}
            <div className="flex h-[42px] items-start justify-center short:hidden">
              <div className="-mt-[34px]">
                <PlayerHand {...handProps(north, 'north')} />
              </div>
            </div>
            <div className="mt-2 short:mt-1.5">
              <GamePlayerCard {...avatarProps(north)} compact />
            </div>
          </div>
        )}

        {/* West: avatar above hand — fixed top so it aligns with east */}
        {west && (
          <div className="absolute left-0 top-[26%] z-20 flex flex-col items-start gap-1.5 pl-2 short:top-[22%]">
            <GamePlayerCard {...avatarProps(west)} compact imagePosition="left" />
            <div className="flex h-[clamp(220px,32vw,330px)] w-[80px] translate-x-[calc(-45%-16px)] items-center justify-center max-sm:w-[48px] max-sm:-translate-x-[20px] short:h-[150px] short:w-[48px] short:-translate-x-[20px]">
              <PlayerHand {...handProps(west, 'west')} />
            </div>
          </div>
        )}

        {/* East: avatar above hand — fixed top so it aligns with west */}
        {east && (
          <div className="absolute right-0 top-[26%] z-20 flex flex-col items-end gap-1.5 pr-2 short:top-[22%]">
            <GamePlayerCard {...avatarProps(east)} compact imagePosition="right" />
            <div className="flex h-[clamp(220px,32vw,330px)] w-[80px] translate-x-[calc(45%+16px)] items-center justify-center max-sm:w-[48px] max-sm:translate-x-[20px] short:h-[150px] short:w-[48px] short:translate-x-[20px]">
              <PlayerHand {...handProps(east, 'east')} />
            </div>
          </div>
        )}

        {/* Dealer selection reveal */}
        {showDealerReveal && cuts && (
          <div className="absolute inset-x-[20%] top-[20%] bottom-[12%] z-20 flex items-center justify-center max-lg:inset-x-[16%] max-md:inset-x-[10%] max-sm:inset-x-[6%] max-sm:top-[16%]">
            <DealerSelectionReveal
              cuts={cuts}
              dealer={serverState?.dealer ?? null}
              viewerPosition={viewModel.viewerPositionAbsolute}
            />
          </div>
        )}

        {/* Center content (trick area, trump selector, hand selector, phase labels) */}
        {!showDealerReveal && phase !== 'bidding' && (
          <div
            className={`absolute inset-x-[20%] top-[20%] bottom-[12%] z-10 flex items-center justify-center max-lg:inset-x-[16%] max-md:inset-x-[10%] max-sm:inset-x-[6%] max-sm:top-[16%] ${
              phase === 'playing'
                ? 'short:top-[18%] short:bottom-[39%] short:scale-[0.7]'
                : selectingHand
                  ? 'short:top-[8%] short:bottom-[10%]'
                  : 'short:top-[12%] short:bottom-[42%]'
            }`}
          >
            <CenterContent
              phase={phase}
              viewModel={viewModel}
              serverState={serverState}
              legalActions={legalActions}
              trumpSuit={trumpSuit}
              youCards={youCards}
              onBid={onBid}
              onPass={onPass}
              onDeclareTrump={onDeclareTrump}
              onSelectHand={onSelectHand}
              optimisticCard={optimisticCard}
            />
          </div>
        )}

        {/* Bidding panel — floating, centered in game zone, shifted up */}
        {!showDealerReveal && phase === 'bidding' && serverState && (
          <div className="absolute left-1/2 top-[calc(45%+44px)] z-30 -translate-x-1/2 -translate-y-1/2 short:top-[42%]">
            <BiddingPanel
              viewModel={viewModel}
              serverState={serverState}
              legalActions={legalActions}
              onBid={onBid}
              onPass={onPass}
            />
          </div>
        )}

        {/* South: hand + avatar anchored at bottom of game zone */}
        {south && (
          <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-1 px-2 pb-1 short:gap-0.5">
            {filteredSouthCards && (
              <div
                className={`w-[75%] max-lg:w-[85%] max-md:w-[92%] max-sm:w-full short:w-auto ${
                  selectingHand ? 'short:hidden' : ''
                }`}
              >
                <PlayerHand
                  {...handProps(south, 'south')}
                  {...filteredSouthCards}
                  shaking={south.isYou && handShaking}
                />
              </div>
            )}
            <div className="mt-2 short:mt-0.5">
              <GamePlayerCard {...avatarProps(south)} compact />
            </div>
          </div>
        )}
      </div>

      {/* ── Control strip: ad slot (portrait only — landscape uses every pixel) ── */}
      <div className="flex h-[12%] shrink-0 items-center justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] short:hidden">
        <div className="pidro-ad-slot flex items-center justify-center rounded-lg border border-dashed border-cyan-300/20 bg-black/20 text-[10px] font-bold uppercase tracking-widest text-cyan-50/30">
          Ad Space
        </div>
      </div>
    </div>
  );
}

/** Reactive CSS media query — used for the bare-seat treatment on tiny phones. */
function useMediaQuery(query: string): boolean {
  const supported = typeof window !== 'undefined' && typeof window.matchMedia === 'function';
  const [matches, setMatches] = useState(() => supported && window.matchMedia(query).matches);

  useEffect(() => {
    if (!supported) return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query, supported]);

  return matches;
}

/**
 * Live turn clock for the seat the server is timing. Returns the remaining
 * fraction (1 → 0) — full during the pre-countdown grace, then draining.
 */
function useTurnTimerProgress(
  turnTimer: ActiveTurnTimer | null,
): { position: string; progress: number } | null {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!turnTimer) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [turnTimer]);

  if (!turnTimer || turnTimer.scope !== 'seat' || !turnTimer.position) return null;
  if (turnTimer.durationMs <= 0) return null;

  const elapsedMs = now - turnTimer.receivedAtMs;
  const remainingTotalMs = Math.max(0, turnTimer.remainingMs - elapsedMs);
  if (remainingTotalMs <= 0) return null;

  const countdownRemainingMs = Math.min(turnTimer.durationMs, remainingTotalMs);
  return {
    position: turnTimer.position,
    progress: countdownRemainingMs / turnTimer.durationMs,
  };
}

/**
 * TableMenu — the quiet "more" menu in the top bar. Leaving the table lives
 * here behind a confirm step so quitting never reads as a primary action.
 * Room to grow: chat, sound, game info.
 */
function TableMenu({ onLeave }: { onLeave: () => void }) {
  const [open, setOpen] = useState(false);
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) setConfirmingLeave(false);
  }, [open]);

  return (
    <div ref={menuRef} className="absolute right-2 top-1/2 z-50 -translate-y-1/2">
      <button
        type="button"
        aria-label="Game menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`flex h-9 w-9 items-center justify-center rounded-[9px] border transition-all active:scale-[0.96] ${
          open
            ? 'border-cyan-200/50 bg-cyan-400/15 text-cyan-50'
            : 'border-transparent bg-transparent text-cyan-100/55 hover:bg-white/6 hover:text-cyan-50'
        }`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.4}
          strokeLinecap="round"
          className="h-[18px] w-[18px]"
        >
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-[210px] overflow-hidden rounded-xl border border-cyan-200/25 bg-[rgba(6,24,46,0.96)] shadow-[0_16px_40px_rgba(0,0,0,0.5)] backdrop-blur-md">
          <button
            type="button"
            onClick={() => {
              window.open('/tutorial', '_blank', 'noopener');
              setOpen(false);
            }}
            className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-[13px] font-bold text-cyan-50/85 transition-colors hover:bg-cyan-400/10"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 shrink-0 text-cyan-300/70"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <path d="M12 17h.01" />
            </svg>
            How to Play
          </button>

          <div className="mx-3 h-px bg-cyan-200/12" />

          {confirmingLeave ? (
            <div className="px-4 py-3">
              <div className="text-[12px] font-bold text-red-200/90">Leave the table?</div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingLeave(false)}
                  className="flex-1 rounded-md border border-cyan-200/30 bg-white/6 py-1.5 text-[11px] font-black uppercase tracking-[0.1em] text-cyan-50/80 transition-colors hover:bg-white/12"
                >
                  Stay
                </button>
                <button
                  type="button"
                  onClick={onLeave}
                  className="flex-1 rounded-md border border-red-400/50 bg-red-500/20 py-1.5 text-[11px] font-black uppercase tracking-[0.1em] text-red-100 transition-colors hover:bg-red-500/30"
                >
                  Leave
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingLeave(true)}
              className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-[13px] font-bold text-red-200/75 transition-colors hover:bg-red-500/10 hover:text-red-100"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 shrink-0"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Leave Table
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function playerStatusText(
  absolutePosition: string,
  viewModel: GameViewModel,
  serverState: ServerGameState | null,
): string {
  const phase = viewModel.phase;
  const currentPlay = serverState?.current_trick?.find((play) => play.player === absolutePosition);
  const lastTrick =
    serverState?.tricks && serverState.tricks.length > 0
      ? serverState.tricks[serverState.tricks.length - 1]
      : null;
  const bid = serverState?.bids?.[absolutePosition as keyof NonNullable<ServerGameState['bids']>];

  switch (phase) {
    case 'dealer_selection':
      if (currentPlay) return `Draws ${getRankLabel(currentPlay.card.rank)}`;
      return viewModel.currentTurnAbsolute === absolutePosition ? 'Drawing' : 'Waiting';
    case 'bidding':
      if (bid === 'pass') return 'Passed';
      if (typeof bid === 'number') return `Bet ${bid}`;
      return viewModel.currentTurnAbsolute === absolutePosition ? 'Bidding' : 'Waiting';
    case 'declaring':
    case 'declaring_trump':
    case 'trump_declaration':
      if (viewModel.currentTurnAbsolute === absolutePosition) return 'Naming';
      return viewModel.trumpSuit ? `Trump ${SUIT_SYMBOLS[viewModel.trumpSuit]}` : 'Waiting';
    case 'discarding':
    case 'second_deal':
      return viewModel.currentTurnAbsolute === absolutePosition ? 'Selecting hand' : 'Waiting';
    case 'playing':
      if (currentPlay) return `Plays ${getRankLabel(currentPlay.card.rank)}`;
      if (viewModel.currentTurnAbsolute === absolutePosition) return 'Turn';
      if (lastTrick?.winner === absolutePosition) return 'Won trick';
      return 'Ready';
    case 'scoring':
    case 'hand_complete':
      return 'Ready';
    case 'complete':
    case 'game_over':
      return 'Finished';
    default:
      return viewModel.dealerAbsolute === absolutePosition ? 'Dealer' : 'Waiting';
  }
}

function CenterContent({
  phase,
  viewModel,
  serverState,
  legalActions,
  trumpSuit,
  youCards,
  onBid,
  onPass,
  onDeclareTrump,
  onSelectHand,
  optimisticCard,
}: {
  phase: string;
  viewModel: GameViewModel;
  serverState: ServerGameState | null;
  legalActions: LegalAction[];
  trumpSuit: Suit | null;
  youCards: CardType[] | null;
  onBid: (amount: number) => void;
  onPass: () => void;
  onDeclareTrump: (suit: Suit) => void;
  onSelectHand: (cards: CardType[]) => void;
  optimisticCard?: CardType | null;
}) {
  if (phase === 'bidding' && serverState) {
    return null;
  }

  if (
    (phase === 'declaring' || phase === 'declaring_trump' || phase === 'trump_declaration') &&
    serverState
  ) {
    return (
      <TrumpSelector
        viewModel={viewModel}
        legalActions={legalActions}
        onDeclareTrump={onDeclareTrump}
      />
    );
  }

  if (phase === 'second_deal' && serverState && youCards && youCards.length > 6) {
    return (
      <HandSelector
        viewModel={viewModel}
        cards={youCards}
        trumpSuit={trumpSuit}
        onSelectHand={onSelectHand}
      />
    );
  }

  if (phase === 'playing' && serverState) {
    return (
      <TrickArea viewModel={viewModel} serverState={serverState} optimisticCard={optimisticCard} />
    );
  }

  if (phase === 'complete' || phase === 'game_over') {
    return (
      <span className="text-lg font-black uppercase tracking-[0.14em] text-cyan-50">
        Game finished
      </span>
    );
  }

  return (
    <div className="flex items-center justify-center">
      <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-50/40" />
    </div>
  );
}
