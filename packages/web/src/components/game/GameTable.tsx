import type {
  Card as CardType,
  GameViewModel,
  LegalAction,
  ServerGameState,
  Suit,
} from '@pidro/shared';
import { getRankLabel, SUIT_SYMBOLS, useGameStore } from '@pidro/shared';
import { useShallow } from 'zustand/react/shallow';
import { BiddingPanel } from './BiddingPanel';
import { DealerChip } from './DealerChip';
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

  const north = players.find((p) => p.relativePosition === 'north');
  const east = players.find((p) => p.relativePosition === 'east');
  const south = players.find((p) => p.relativePosition === 'south');
  const west = players.find((p) => p.relativePosition === 'west');

  function avatarProps(player: NonNullable<typeof north>) {
    const name = player.username ?? (player.isYou ? 'You' : 'Player');
    return {
      displayName: name,
      statusText: playerStatusText(player.absolutePosition, viewModel, serverState),
      initial: name[0]?.toUpperCase() ?? '?',
      isDealer: viewModel.dealerAbsolute === player.absolutePosition,
      isCurrentTurn: player.isCurrentTurn,
      isConnected: player.isConnected,
      seatStatus: player.seatStatus,
      team: (player.isYou || player.isTeammate ? 'us' : 'them') as 'us' | 'them',
    };
  }

  const isPlayerDealer = (player: NonNullable<typeof north>) =>
    phase !== 'dealer_selection' && viewModel.dealerAbsolute === player.absolutePosition;

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
      {/* ── Game zone: top ~85% ── */}
      <div className="relative h-[87%] shrink-0 overflow-hidden short:h-[calc(100%-2.75rem)]">
        {/* Score */}
        <div className="absolute left-3 top-0 z-30 flex items-start max-sm:left-2">
          <GameInfoBar
            scores={serverState?.scores ?? null}
            viewerPosition={viewerPosition}
            viewerIsSpectator={viewerIsSpectator}
            handNumber={serverState?.round_number ?? null}
            roomCode={roomCode}
            turnTimer={turnTimer}
          />
        </div>

        {/* Leave — quiet glass door in the top-right corner, clear of play */}
        <button
          type="button"
          aria-label="Leave Game"
          onClick={onLeave}
          className="group absolute right-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-[10px] border border-cyan-300/25 bg-[rgba(10,32,60,0.7)] text-cyan-100/70 shadow-[0_2px_8px_rgba(0,0,0,0.3)] backdrop-blur-sm transition-all hover:border-cyan-200/60 hover:text-cyan-50 hover:brightness-115 active:scale-[0.97] max-sm:right-2 max-sm:top-2"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-[18px] w-[18px] transition-transform group-hover:translate-x-0.5"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>

        {/* North: cards peeking from top + avatar below */}
        {north && (
          <div className="absolute left-1/2 top-[6px] z-20 flex w-[50%] -translate-x-1/2 flex-col items-center gap-2.5 max-sm:w-[60%] short:gap-1">
            <div className="mt-[-10px] short:hidden">
              <PlayerHand {...handProps(north, 'north')} />
            </div>
            <div className="flex items-center gap-1.5">
              <GamePlayerCard {...avatarProps(north)} compact />
              {isPlayerDealer(north) && <DealerChip />}
            </div>
          </div>
        )}

        {/* West: avatar above hand — fixed top so it aligns with east */}
        {west && (
          <div className="absolute left-0 top-[26%] z-20 flex flex-col items-start gap-1.5 pl-2 short:top-[22%]">
            <div className="flex items-center gap-1.5">
              <GamePlayerCard {...avatarProps(west)} compact imagePosition="left" />
              {isPlayerDealer(west) && <DealerChip />}
            </div>
            <div className="flex h-[clamp(220px,32vw,330px)] w-[80px] translate-x-[calc(-45%-16px)] items-center justify-center max-sm:w-[48px] short:h-[150px] short:w-[48px]">
              <PlayerHand {...handProps(west, 'west')} />
            </div>
          </div>
        )}

        {/* East: avatar above hand — fixed top so it aligns with west */}
        {east && (
          <div className="absolute right-0 top-[26%] z-20 flex flex-col items-end gap-1.5 pr-2 short:top-[22%]">
            <div className="flex items-center gap-1.5">
              {isPlayerDealer(east) && <DealerChip />}
              <GamePlayerCard {...avatarProps(east)} compact imagePosition="right" />
            </div>
            <div className="flex h-[clamp(220px,32vw,330px)] w-[80px] translate-x-[calc(45%+16px)] items-center justify-center max-sm:w-[48px] short:h-[150px] short:w-[48px]">
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
            <div className="mt-2 flex items-center gap-1.5 short:mt-0.5">
              <GamePlayerCard {...avatarProps(south)} compact />
              {isPlayerDealer(south) && <DealerChip />}
            </div>
          </div>
        )}
      </div>

      {/* ── Control strip: bottom ~15% (ad slot only — leave lives top-right) ── */}
      <div className="flex h-[13%] shrink-0 items-center justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] short:h-11 short:pb-1.5">
        <div className="pidro-ad-slot flex items-center justify-center rounded-lg border border-dashed border-cyan-300/20 bg-black/20 text-[10px] font-bold uppercase tracking-widest text-cyan-50/30 short:hidden">
          Ad Space
        </div>
      </div>
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
