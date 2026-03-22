import type {
  GameViewModel,
  Position,
  ServerGameState,
  Suit,
} from "@pidro/shared";
import { mapAbsoluteToRelative, SUIT_SYMBOLS } from "@pidro/shared";
import { useEffect, useRef, useState } from "react";
import { Card, getPidroPoints } from "./Card";

function isNorthSouth(position: Position): boolean {
  return position === "north" || position === "south";
}

const CARD_ENTER_CLASSES: Record<string, string> = {
  north: "animate-card-enter-north",
  south: "animate-card-enter-south",
  east: "animate-card-enter-east",
  west: "animate-card-enter-west",
};

interface PlayedCard {
  card: { rank: number; suit: Suit };
  trickIndex: number;
  isLatest: boolean;
}

interface TrickAreaProps {
  viewModel: GameViewModel;
  serverState: ServerGameState;
  optimisticCard?: { rank: number; suit: Suit } | null;
}

export function TrickArea({
  viewModel,
  serverState,
  optimisticCard,
}: TrickAreaProps) {
  const viewerPosition = viewModel.viewerPositionAbsolute;
  const currentTrick = serverState.current_trick ?? [];
  const tricks = serverState.tricks ?? [];
  const trumpSuit: Suit | null = viewModel.trumpSuit;

  // Accumulate all cards per relative position across all tricks
  const cardsByPosition: Record<string, PlayedCard[]> = {
    north: [],
    east: [],
    south: [],
    west: [],
  };

  // Add completed trick cards
  for (let t = 0; t < tricks.length; t++) {
    for (const play of tricks[t].cards) {
      const relPos = mapAbsoluteToRelative(play.player, viewerPosition);
      cardsByPosition[relPos]?.push({
        card: play.card,
        trickIndex: t,
        isLatest: false,
      });
    }
  }

  // Add current trick cards
  for (const play of currentTrick) {
    const relPos = mapAbsoluteToRelative(play.player, viewerPosition);
    cardsByPosition[relPos]?.push({
      card: play.card,
      trickIndex: tricks.length,
      isLatest: true,
    });
  }

  // Add optimistic card
  if (optimisticCard && cardsByPosition.south.every((c) => !c.isLatest)) {
    cardsByPosition.south.push({
      card: optimisticCard,
      trickIndex: tricks.length,
      isLatest: true,
    });
  }

  // Track new cards for enter animation
  const totalCardCount = Object.values(cardsByPosition).reduce(
    (sum, arr) => sum + arr.length,
    0,
  );
  const prevCountRef = useRef(totalCardCount);
  const [animateLatest, setAnimateLatest] = useState(false);

  useEffect(() => {
    if (totalCardCount > prevCountRef.current) {
      setAnimateLatest(true);
      const timer = setTimeout(() => setAnimateLatest(false), 300);
      return () => clearTimeout(timer);
    }
    prevCountRef.current = totalCardCount;
  }, [totalCardCount]);

  // Trick points for current trick
  let trickPoints = 0;
  for (const play of currentTrick) {
    const pts = trumpSuit
      ? getPidroPoints(play.card.rank, play.card.suit, trumpSuit)
      : null;
    if (pts != null) trickPoints += pts;
  }

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center">
      {/* Trick points — top left */}
      {trickPoints > 0 && (
        <div className="absolute left-0 -top-8 rounded-full border border-[#ffcc54]/30 bg-[#ffcc54]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#fff0b2]">
          {trickPoints} pts
        </div>
      )}

      {/* Card grid — tight cross layout */}
      <div className="grid grid-cols-[1fr_auto_1fr] grid-rows-[auto_auto_auto] place-items-center gap-3">
        {/* Row 1: north */}
        <div />
        <PositionStack
          position="north"
          cards={cardsByPosition.north}
          trumpSuit={trumpSuit}
          animateLatest={animateLatest}
        />
        <div />

        {/* Row 2: west — trump — east */}
        <PositionStack
          position="west"
          cards={cardsByPosition.west}
          trumpSuit={trumpSuit}
          animateLatest={animateLatest}
        />
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-cyan-300/15 bg-black/10 shadow-inner max-sm:h-10 max-sm:w-10">
          <span className="text-2xl text-cyan-50/50 max-sm:text-xl">
            {trumpSuit ? SUIT_SYMBOLS[trumpSuit] : "•"}
          </span>
        </div>
        <PositionStack
          position="east"
          cards={cardsByPosition.east}
          trumpSuit={trumpSuit}
          animateLatest={animateLatest}
        />

        {/* Row 3: south */}
        <div />
        <PositionStack
          position="south"
          cards={cardsByPosition.south}
          trumpSuit={trumpSuit}
          animateLatest={animateLatest}
        />
        <div />
      </div>
    </div>
  );
}

function PositionStack({
  position,
  cards,
  trumpSuit,
  animateLatest,
}: {
  position: string;
  cards: PlayedCard[];
  trumpSuit: Suit | null;
  animateLatest: boolean;
}) {
  // Fixed-size container so grid doesn't shift
  // Stack cards with tight overlap
  // West grows leftward, east grows rightward (away from center trump)
  const reverseOrder = position === "west" || position === "east";
  const displayCards = reverseOrder ? [...cards].reverse() : cards;

  return (
    <div className="flex h-[5.5rem] w-[3.75rem] items-center justify-center max-sm:h-[4.5rem] max-sm:w-[3rem]">
      {displayCards.length > 0 && (
        <div
          className={`flex flex-row items-center ${position === "west" ? "flex-row-reverse" : ""}`}
        >
          {displayCards.map((played, i) => {
            const isLast = reverseOrder
              ? i === 0
              : i === displayCards.length - 1;
            const animClass =
              isLast && played.isLatest && animateLatest
                ? (CARD_ENTER_CLASSES[position] ?? "")
                : "";

            // All positions: horizontal overlap
            const overlapProp =
              position === "west" ? "marginRight" : "marginLeft";
            const style: React.CSSProperties = {
              position: "relative",
              zIndex: reverseOrder ? displayCards.length - i : i,
              ...(i > 0 ? { [overlapProp]: -35 } : {}),
            };

            return (
              <div
                key={`${played.trickIndex}-${played.card.rank}-${played.card.suit}`}
                className={animClass}
                style={style}
              >
                <Card
                  card={played.card}
                  size="md"
                  isTrump={played.card.suit === trumpSuit}
                  pointValue={
                    isLast && trumpSuit
                      ? (getPidroPoints(
                          played.card.rank,
                          played.card.suit,
                          trumpSuit,
                        ) ?? undefined)
                      : undefined
                  }
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
