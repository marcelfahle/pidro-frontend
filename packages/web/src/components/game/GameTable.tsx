import type {
  Card as CardType,
  GameViewModel,
  LegalAction,
  ServerGameState,
  Suit,
} from '@pidro/shared';
import { useGameStore } from '@pidro/shared';
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
  handShaking?: boolean;
}

export function GameTable({
  viewModel,
  onPlayCard,
  onBid,
  onPass,
  onDeclareTrump,
  onSelectHand,
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

  // Get current player's cards for HandSelector
  const youPlayer = players.find((p) => p.isYou);
  const youCards = youPlayer ? getPlayerCards(youPlayer.absolutePosition).cards : null;

  return (
    <div className="flex h-full flex-col">
      {/* Table area */}
      <div className="relative flex flex-1 items-center justify-center">
        <div className="relative grid h-[500px] w-[700px] grid-cols-[100px_1fr_100px] grid-rows-[auto_1fr_auto] gap-2 rounded-2xl bg-emerald-800 p-4 shadow-2xl">
          {/* North player - top center */}
          <div className="col-span-3 flex justify-center">
            {north && (
              <PlayerHand
                position="north"
                {...getPlayerCards(north.absolutePosition)}
                username={north.username}
                isYou={north.isYou}
                isDealer={viewModel.dealerAbsolute === north.absolutePosition}
                isCurrentTurn={north.isCurrentTurn}
                isConnected={north.isConnected}
                legalActions={north.isYou ? legalActions : []}
                trumpSuit={trumpSuit}
                onPlayCard={north.isYou ? onPlayCard : undefined}
              />
            )}
          </div>

          {/* West player - left */}
          <div className="flex items-center justify-center">
            {west && (
              <PlayerHand
                position="west"
                {...getPlayerCards(west.absolutePosition)}
                username={west.username}
                isYou={west.isYou}
                isDealer={viewModel.dealerAbsolute === west.absolutePosition}
                isCurrentTurn={west.isCurrentTurn}
                isConnected={west.isConnected}
                legalActions={west.isYou ? legalActions : []}
                trumpSuit={trumpSuit}
                onPlayCard={west.isYou ? onPlayCard : undefined}
              />
            )}
          </div>

          {/* Center area - phase-dependent content */}
          <div className="flex items-center justify-center">
            <div className="flex h-full w-full items-center justify-center rounded-xl bg-emerald-900/40">
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

          {/* East player - right */}
          <div className="flex items-center justify-center">
            {east && (
              <PlayerHand
                position="east"
                {...getPlayerCards(east.absolutePosition)}
                username={east.username}
                isYou={east.isYou}
                isDealer={viewModel.dealerAbsolute === east.absolutePosition}
                isCurrentTurn={east.isCurrentTurn}
                isConnected={east.isConnected}
                legalActions={east.isYou ? legalActions : []}
                trumpSuit={trumpSuit}
                onPlayCard={east.isYou ? onPlayCard : undefined}
              />
            )}
          </div>

          {/* South player - bottom center */}
          <div className="col-span-3 flex justify-center">
            {south && (
              <PlayerHand
                position="south"
                {...getPlayerCards(south.absolutePosition)}
                username={south.username}
                isYou={south.isYou}
                isDealer={viewModel.dealerAbsolute === south.absolutePosition}
                isCurrentTurn={south.isCurrentTurn}
                isConnected={south.isConnected}
                legalActions={south.isYou ? legalActions : []}
                trumpSuit={trumpSuit}
                onPlayCard={south.isYou ? onPlayCard : undefined}
                shaking={south.isYou && handShaking}
              />
            )}
          </div>
        </div>
      </div>

      {/* Bottom info bar */}
      <div className="px-4 pb-4">
        <GameInfoBar
          phase={phase}
          trumpSuit={trumpSuit}
          scores={serverState?.scores ?? null}
          roundNumber={serverState?.round_number ?? null}
          roomCode={roomCode}
        />
      </div>
    </div>
  );
}

/** Routes to the correct center area component based on current game phase. */
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

  // Fallback for phases without interactive components
  const phaseLabels: Record<string, string> = {
    dealing: 'Dealing cards...',
    dealer_selection: 'Selecting dealer...',
    discarding: 'Discarding...',
    second_deal: 'Second deal in progress...',
    scoring: 'Scoring hand...',
    complete: 'Game finished',
    game_over: 'Game finished',
  };

  return (
    <span className="text-sm text-emerald-400/60">
      {phaseLabels[phase] ?? 'Game in progress...'}
    </span>
  );
}
