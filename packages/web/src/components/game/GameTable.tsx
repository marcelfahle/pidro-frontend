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
import { GameInfoBar } from './GameInfoBar';
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
}: GameTableProps) {
  const { serverState, legalActions } = useGameStore(
    useShallow((s) => ({
      serverState: s.serverState as ServerGameState | null,
      legalActions: s.legalActions as LegalAction[],
    })),
  );

  const { phase, trumpSuit, roomCode, players } = viewModel;

  const north = players.find((p) => p.relativePosition === 'north');
  const east = players.find((p) => p.relativePosition === 'east');
  const south = players.find((p) => p.relativePosition === 'south');
  const west = players.find((p) => p.relativePosition === 'west');

  function getPlayerCards(absPos: string) {
    const playerView = serverState?.players?.[absPos as keyof typeof serverState.players];
    if (!playerView) return { cards: null, cardCount: 0 };

    if (Array.isArray(playerView.hand)) {
      return { cards: playerView.hand as CardType[], cardCount: playerView.hand.length };
    }

    const count =
      typeof playerView.hand === 'number' ? playerView.hand : (playerView.card_count ?? 0);

    return { cards: null, cardCount: count };
  }

  const youPlayer = players.find((p) => p.isYou);
  const youCards = youPlayer ? getPlayerCards(youPlayer.absolutePosition).cards : null;

  return (
    <div className="flex h-full w-full items-center justify-center px-2 pb-3 pt-1 max-md:px-1 max-md:pb-2">
      <div className="relative aspect-[4/3] w-full max-h-[calc(100dvh-2rem)] max-w-[1120px] max-md:max-h-[calc(100dvh-1rem)] max-md:aspect-[10/16]">
        <div className="absolute left-4 top-0 right-auto z-20 flex max-md:inset-x-0 max-md:justify-center">
          <GameInfoBar
            phase={phase}
            trumpSuit={trumpSuit}
            scores={serverState?.scores ?? null}
            youPosition={youPlayer?.absolutePosition ?? null}
            roundNumber={serverState?.round_number ?? null}
            roomCode={roomCode}
          />
        </div>

        <div className="absolute inset-x-[18%] top-[24%] bottom-[22%] z-10 max-md:inset-x-[14%] max-md:top-[42%] max-md:bottom-[22%]">
          <div className="pidro-panel pidro-panel--glow flex h-full items-center justify-center rounded-[22px] p-4 sm:p-5">
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
            />
          </div>
        </div>

        {north && (
          <div className="absolute left-1/2 top-[16%] z-20 w-[46%] -translate-x-1/2 max-md:top-[24%] max-md:w-[46%]">
            <PlayerHand
              position="north"
              {...getPlayerCards(north.absolutePosition)}
              username={north.username}
              isYou={north.isYou}
              isDealer={viewModel.dealerAbsolute === north.absolutePosition}
              isCurrentTurn={north.isCurrentTurn}
              isConnected={north.isConnected}
              isTeammate={north.isTeammate}
              seatStatus={north.seatStatus}
              legalActions={north.isYou ? legalActions : []}
              trumpSuit={trumpSuit}
              statusText={playerStatusText(north.absolutePosition, viewModel, serverState)}
              onPlayCard={north.isYou ? onPlayCard : undefined}
            />
          </div>
        )}

        {west && (
          <div className="absolute left-[3%] top-1/2 z-20 w-[19%] -translate-y-1/2 max-md:left-[2%] max-md:top-[49%] max-md:w-[17%]">
            <PlayerHand
              position="west"
              {...getPlayerCards(west.absolutePosition)}
              username={west.username}
              isYou={west.isYou}
              isDealer={viewModel.dealerAbsolute === west.absolutePosition}
              isCurrentTurn={west.isCurrentTurn}
              isConnected={west.isConnected}
              isTeammate={west.isTeammate}
              seatStatus={west.seatStatus}
              legalActions={west.isYou ? legalActions : []}
              trumpSuit={trumpSuit}
              statusText={playerStatusText(west.absolutePosition, viewModel, serverState)}
              onPlayCard={west.isYou ? onPlayCard : undefined}
            />
          </div>
        )}

        {east && (
          <div className="absolute right-[3%] top-1/2 z-20 w-[19%] -translate-y-1/2 max-md:right-[2%] max-md:top-[49%] max-md:w-[17%]">
            <PlayerHand
              position="east"
              {...getPlayerCards(east.absolutePosition)}
              username={east.username}
              isYou={east.isYou}
              isDealer={viewModel.dealerAbsolute === east.absolutePosition}
              isCurrentTurn={east.isCurrentTurn}
              isConnected={east.isConnected}
              isTeammate={east.isTeammate}
              seatStatus={east.seatStatus}
              legalActions={east.isYou ? legalActions : []}
              trumpSuit={trumpSuit}
              statusText={playerStatusText(east.absolutePosition, viewModel, serverState)}
              onPlayCard={east.isYou ? onPlayCard : undefined}
            />
          </div>
        )}

        {south && (
          <div className="absolute bottom-[7%] left-1/2 z-20 w-[72%] -translate-x-1/2 max-md:bottom-[8%] max-md:w-[94%]">
            <PlayerHand
              position="south"
              {...getPlayerCards(south.absolutePosition)}
              username={south.username}
              isYou={south.isYou}
              isDealer={viewModel.dealerAbsolute === south.absolutePosition}
              isCurrentTurn={south.isCurrentTurn}
              isConnected={south.isConnected}
              isTeammate={south.isTeammate}
              seatStatus={south.seatStatus}
              legalActions={south.isYou ? legalActions : []}
              trumpSuit={trumpSuit}
              statusText={playerStatusText(south.absolutePosition, viewModel, serverState)}
              onPlayCard={south.isYou ? onPlayCard : undefined}
              shaking={south.isYou && handShaking}
            />
          </div>
        )}

        <button
          type="button"
          aria-label="Leave Game"
          onClick={onLeave}
          className="pidro-icon-button absolute bottom-[3%] right-[3%] z-30 max-md:bottom-[4%] max-md:right-[4%]"
        >
          <span className="text-xl font-black">⤴</span>
        </button>
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
      if (viewModel.currentTurnAbsolute === absolutePosition) return 'Choose trump';
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
}) {
  if (phase === 'bidding' && serverState) {
    return (
      <BiddingPanel
        viewModel={viewModel}
        serverState={serverState}
        legalActions={legalActions}
        onBid={onBid}
        onPass={onPass}
      />
    );
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
    return <TrickArea viewModel={viewModel} serverState={serverState} />;
  }

  const phaseLabels: Record<string, string> = {
    dealing: 'Dealing cards...',
    dealer_selection: 'Selecting dealer...',
    discarding: 'Discarding...',
    second_deal: 'Second deal in progress...',
    scoring: 'Scoring hand...',
    hand_complete: 'Hand complete',
    complete: 'Game finished',
    game_over: 'Game finished',
  };

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <span className="text-lg font-black uppercase tracking-[0.14em] text-cyan-50">
        {phaseLabels[phase] ?? 'Game in progress...'}
      </span>
      <span className="text-sm text-cyan-50/75">
        Watch the table for the next active player or completed trick.
      </span>
    </div>
  );
}
