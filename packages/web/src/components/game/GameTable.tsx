import type {
  Card as CardType,
  GameViewModel,
  LegalAction,
  ServerGameState,
  Suit,
} from "@pidro/shared";
import { getRankLabel, SUIT_SYMBOLS, useGameStore } from "@pidro/shared";
import { useShallow } from "zustand/react/shallow";
import { BiddingPanel } from "./BiddingPanel";
import { GameInfoBar } from "./GameInfoBar";
import { GamePlayerCard } from "./GamePlayerCard";
import { HandSelector } from "./HandSelector";
import { PlayerHand } from "./PlayerHand";
import { TrickArea } from "./TrickArea";
import { TrumpSelector } from "./TrumpSelector";

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

  const north = players.find((p) => p.relativePosition === "north");
  const east = players.find((p) => p.relativePosition === "east");
  const south = players.find((p) => p.relativePosition === "south");
  const west = players.find((p) => p.relativePosition === "west");

  function avatarProps(player: NonNullable<typeof north>) {
    const name = player.username ?? (player.isYou ? "You" : "Player");
    return {
      displayName: name,
      statusText: playerStatusText(
        player.absolutePosition,
        viewModel,
        serverState,
      ),
      initial: name[0]?.toUpperCase() ?? "?",
      isCurrentTurn: player.isCurrentTurn,
      isConnected: player.isConnected,
      seatStatus: player.seatStatus,
    };
  }

  function getPlayerCards(absPos: string) {
    const playerView =
      serverState?.players?.[absPos as keyof typeof serverState.players];
    if (!playerView) return { cards: null, cardCount: 0 };

    if (Array.isArray(playerView.hand)) {
      return {
        cards: playerView.hand as CardType[],
        cardCount: playerView.hand.length,
      };
    }

    const count =
      typeof playerView.hand === "number"
        ? playerView.hand
        : (playerView.card_count ?? 0);

    return { cards: null, cardCount: count };
  }

  function handProps(
    player: NonNullable<typeof north>,
    position: "north" | "east" | "south" | "west",
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
      statusText: playerStatusText(
        player.absolutePosition,
        viewModel,
        serverState,
      ),
      onPlayCard: player.isYou ? onPlayCard : undefined,
    };
  }

  const youPlayer = players.find((p) => p.isYou);
  const youCardsRaw = youPlayer
    ? getPlayerCards(youPlayer.absolutePosition).cards
    : null;
  const youCards =
    optimisticCard && youCardsRaw
      ? youCardsRaw.filter(
          (c) =>
            !(c.rank === optimisticCard.rank && c.suit === optimisticCard.suit),
        )
      : youCardsRaw;

  // South cards with optimistic filtering
  const southCards = south ? getPlayerCards(south.absolutePosition) : null;
  const filteredSouthCards =
    south && optimisticCard && south.isYou && southCards?.cards
      ? {
          cards: southCards.cards.filter(
            (c) =>
              !(
                c.rank === optimisticCard.rank && c.suit === optimisticCard.suit
              ),
          ),
          cardCount: southCards.cardCount - 1,
        }
      : southCards;

  return (
    <div className="flex h-full w-full flex-col">
      {/* ── Game zone: top ~85% ── */}
      <div className="relative h-[87%] shrink-0 overflow-hidden">
        {/* Info bar */}
        <div className="absolute inset-x-0 top-0 z-30 flex justify-center">
          <GameInfoBar
            phase={phase}
            trumpSuit={trumpSuit}
            scores={serverState?.scores ?? null}
            viewerPosition={viewerPosition}
            viewerIsSpectator={viewerIsSpectator}
            roundNumber={serverState?.round_number ?? null}
            roomCode={roomCode}
            currentBid={serverState?.current_bid ?? null}
            bidWinner={serverState?.bid_winner ?? null}
            turnTimer={turnTimer}
          />
        </div>

        {/* North: cards peeking from top + avatar below */}
        {north && (
          <div className="absolute left-1/2 top-0 z-20 flex w-[50%] -translate-x-1/2 flex-col items-center gap-1 max-sm:w-[60%]">
            <div className="mt-[-10px]">
              <PlayerHand {...handProps(north, "north")} />
            </div>
            <GamePlayerCard {...avatarProps(north)} compact />
          </div>
        )}

        {/* West: avatar above hand — fixed top so it aligns with east */}
        {west && (
          <div className="absolute left-0 top-[26%] z-20 flex flex-col items-start gap-1.5 pl-2">
            <GamePlayerCard
              {...avatarProps(west)}
              compact
              imagePosition="left"
            />
            <div className="flex h-[35dvh] w-[80px] translate-x-[-45%] items-center justify-center max-sm:w-[48px]">
              <PlayerHand {...handProps(west, "west")} />
            </div>
          </div>
        )}

        {/* East: avatar above hand — fixed top so it aligns with west */}
        {east && (
          <div className="absolute right-0 top-[26%] z-20 flex flex-col items-end gap-1.5 pr-2">
            <GamePlayerCard
              {...avatarProps(east)}
              compact
              imagePosition="right"
            />
            <div className="flex h-[35dvh] w-[80px] translate-x-[45%] items-center justify-center max-sm:w-[48px]">
              <PlayerHand {...handProps(east, "east")} />
            </div>
          </div>
        )}

        {/* Center content (trick area, trump selector, hand selector, phase labels) */}
        {phase !== "bidding" && (
          <div className="absolute inset-x-[20%] top-[20%] bottom-[12%] z-10 flex items-center justify-center max-lg:inset-x-[16%] max-md:inset-x-[10%] max-sm:inset-x-[6%] max-sm:top-[16%]">
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
        {phase === "bidding" && serverState && (
          <div className="absolute left-1/2 top-[45%] z-30 -translate-x-1/2 -translate-y-1/2">
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
          <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-1 px-2 pb-1">
            {filteredSouthCards && (
              <div className="w-[75%] max-lg:w-[85%] max-md:w-[92%] max-sm:w-full">
                <PlayerHand
                  {...handProps(south, "south")}
                  {...filteredSouthCards}
                  shaking={south.isYou && handShaking}
                />
              </div>
            )}
            <GamePlayerCard {...avatarProps(south)} compact className="mt-2" />
          </div>
        )}
      </div>

      {/* ── Control strip: bottom ~15% ── */}
      <div className="relative flex h-[13%] shrink-0 items-end justify-end px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          aria-label="Leave Game"
          onClick={onLeave}
          className="pidro-icon-button"
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
  const currentPlay = serverState?.current_trick?.find(
    (play) => play.player === absolutePosition,
  );
  const lastTrick =
    serverState?.tricks && serverState.tricks.length > 0
      ? serverState.tricks[serverState.tricks.length - 1]
      : null;
  const bid =
    serverState?.bids?.[
      absolutePosition as keyof NonNullable<ServerGameState["bids"]>
    ];

  switch (phase) {
    case "dealer_selection":
      if (currentPlay) return `Draws ${getRankLabel(currentPlay.card.rank)}`;
      return viewModel.currentTurnAbsolute === absolutePosition
        ? "Drawing"
        : "Waiting";
    case "bidding":
      if (bid === "pass") return "Passed";
      if (typeof bid === "number") return `Bet ${bid}`;
      return viewModel.currentTurnAbsolute === absolutePosition
        ? "Bidding"
        : "Waiting";
    case "declaring":
    case "declaring_trump":
    case "trump_declaration":
      if (viewModel.currentTurnAbsolute === absolutePosition)
        return "Choose trump";
      return viewModel.trumpSuit
        ? `Trump ${SUIT_SYMBOLS[viewModel.trumpSuit]}`
        : "Waiting";
    case "discarding":
    case "second_deal":
      return viewModel.currentTurnAbsolute === absolutePosition
        ? "Selecting hand"
        : "Waiting";
    case "playing":
      if (currentPlay) return `Plays ${getRankLabel(currentPlay.card.rank)}`;
      if (viewModel.currentTurnAbsolute === absolutePosition) return "Turn";
      if (lastTrick?.winner === absolutePosition) return "Won trick";
      return "Ready";
    case "scoring":
    case "hand_complete":
      return "Ready";
    case "complete":
    case "game_over":
      return "Finished";
    default:
      return viewModel.dealerAbsolute === absolutePosition
        ? "Dealer"
        : "Waiting";
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
  if (phase === "bidding" && serverState) {
    return null;
  }

  if (
    (phase === "declaring" ||
      phase === "declaring_trump" ||
      phase === "trump_declaration") &&
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

  if (
    phase === "second_deal" &&
    serverState &&
    youCards &&
    youCards.length > 6
  ) {
    return (
      <HandSelector
        viewModel={viewModel}
        cards={youCards}
        trumpSuit={trumpSuit}
        onSelectHand={onSelectHand}
      />
    );
  }

  if (phase === "playing" && serverState) {
    return (
      <TrickArea
        viewModel={viewModel}
        serverState={serverState}
        optimisticCard={optimisticCard}
      />
    );
  }

  const phaseLabels: Record<string, string> = {
    dealing: "Dealing cards...",
    dealer_selection: "Selecting dealer...",
    discarding: "Discarding...",
    second_deal: "Second deal in progress...",
    scoring: "Scoring hand...",
    hand_complete: "Hand complete",
    complete: "Game finished",
    game_over: "Game finished",
  };

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <span className="text-lg font-black uppercase tracking-[0.14em] text-cyan-50">
        {phaseLabels[phase] ?? "Game in progress..."}
      </span>
      <span className="text-sm text-cyan-50/75">
        Watch the table for the next active player or completed trick.
      </span>
    </div>
  );
}
