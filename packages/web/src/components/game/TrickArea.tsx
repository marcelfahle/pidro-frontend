import type { GameViewModel, ServerGameState, Suit } from "@pidro/shared";
import { mapAbsoluteToRelative, SUIT_SYMBOLS } from "@pidro/shared";
import { useEffect, useRef } from "react";
import { Card } from "./Card";

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

  // Track which cards have already been rendered so only truly new ones animate
  const seenCardsRef = useRef<Set<string>>(new Set());
  const allCardKeys = new Set<string>();
  for (const cards of Object.values(cardsByPosition)) {
    for (const played of cards) {
      allCardKeys.add(
        `${played.trickIndex}-${played.card.rank}-${played.card.suit}`,
      );
    }
  }
  const newCardKeys = new Set<string>();
  for (const key of allCardKeys) {
    if (!seenCardsRef.current.has(key)) {
      newCardKeys.add(key);
    }
  }
  useEffect(() => {
    seenCardsRef.current = new Set(allCardKeys);
  });

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center">
      {/* Card grid — tight cross layout */}
      <div className="grid grid-cols-[1fr_auto_1fr] grid-rows-[auto_auto_auto] place-items-center gap-3">
        {/* Row 1: north */}
        <div />
        <PositionStack
          position="north"
          cards={cardsByPosition.north}
          trumpSuit={trumpSuit}
          newCardKeys={newCardKeys}
        />
        <div />

        {/* Row 2: west — trump — east */}
        <PositionStack
          position="west"
          cards={cardsByPosition.west}
          trumpSuit={trumpSuit}
          newCardKeys={newCardKeys}
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
          newCardKeys={newCardKeys}
        />

        {/* Row 3: south */}
        <div />
        <PositionStack
          position="south"
          cards={cardsByPosition.south}
          trumpSuit={trumpSuit}
          newCardKeys={newCardKeys}
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
  newCardKeys,
}: {
  position: string;
  cards: PlayedCard[];
  trumpSuit: Suit | null;
  newCardKeys: Set<string>;
}) {
  // Always overlap to the right so the top-left rank of each card stays visible
  return (
    <div className="flex h-[5.5rem] w-[3.75rem] items-center justify-center max-sm:h-[4.5rem] max-sm:w-[3rem]">
      {cards.length > 0 && (
        <div className="flex flex-row items-center">
          {cards.map((played, i) => {
            const cardKey = `${played.trickIndex}-${played.card.rank}-${played.card.suit}`;
            const animClass = newCardKeys.has(cardKey)
              ? (CARD_ENTER_CLASSES[position] ?? "")
              : "";

            const style: React.CSSProperties = {
              position: "relative",
              zIndex: i,
              ...(i > 0 ? { marginLeft: -30 } : {}),
            };

            return (
              <div key={cardKey} className={animClass} style={style}>
                <Card
                  card={played.card}
                  size="md"
                  isTrump={played.card.suit === trumpSuit}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
