import type {
  GameViewModel,
  Position,
  ServerGameState,
  ServerTrick,
  Suit,
} from "@pidro/shared";
import { mapAbsoluteToRelative, SUIT_SYMBOLS } from "@pidro/shared";
import { useEffect, useRef, useState } from "react";
import { Card, getPidroPoints } from "./Card";

function trickWinnerLabel(
  winner: Position,
  youPosition: Position | null,
): string {
  if (!youPosition) return isNorthSouth(winner) ? "NS" : "EW";
  const sameTeam = isNorthSouth(winner) === isNorthSouth(youPosition);
  return sameTeam ? "Us" : "Them";
}

function trickPointTotal(trick: ServerTrick, trumpSuit: Suit | null): number {
  let pts = 0;
  for (const play of trick.cards) {
    const p = trumpSuit
      ? getPidroPoints(play.card.rank, play.card.suit, trumpSuit)
      : null;
    if (p != null) pts += p;
  }
  return pts;
}

function isNorthSouth(position: Position): boolean {
  return position === "north" || position === "south";
}

const CARD_ENTER_CLASSES: Record<string, string> = {
  north: "animate-card-enter-north",
  south: "animate-card-enter-south",
  east: "animate-card-enter-east",
  west: "animate-card-enter-west",
};

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
  const youPosition =
    viewModel.players.find((p) => p.isYou)?.absolutePosition ?? null;
  const viewerPosition = viewModel.viewerPositionAbsolute;
  const currentTrick = serverState.current_trick ?? [];
  const tricks = serverState.tricks ?? [];
  const trickNumber = tricks.length + 1;
  const trumpSuit: Suit | null = viewModel.trumpSuit;

  // Track which slots had cards on the previous render to detect newly played cards
  const prevSlotKeysRef = useRef<Set<string>>(new Set());

  const trickByRelative: Record<
    string,
    { card: { rank: number; suit: Suit }; isLeader: boolean }
  > = {};
  for (let i = 0; i < currentTrick.length; i++) {
    const play = currentTrick[i];
    const relPos = mapAbsoluteToRelative(play.player, viewerPosition);
    trickByRelative[relPos] = { card: play.card, isLeader: i === 0 };
  }

  // Show optimistic card in the south (you) slot if not already present
  if (optimisticCard && !trickByRelative.south) {
    trickByRelative.south = {
      card: optimisticCard,
      isLeader: currentTrick.length === 0,
    };
  }

  // Determine which slots are new (just played this render)
  const currentSlotKeys = new Set(Object.keys(trickByRelative));
  const newSlots = new Set<string>();
  for (const key of currentSlotKeys) {
    if (!prevSlotKeysRef.current.has(key)) {
      newSlots.add(key);
    }
  }
  useEffect(() => {
    prevSlotKeysRef.current = currentSlotKeys;
  });

  // Track trick win: detect when the last completed trick just appeared
  const prevTrickCountRef = useRef(tricks.length);
  const [winningSlot, setWinningSlot] = useState<string | null>(null);

  useEffect(() => {
    if (tricks.length > prevTrickCountRef.current && tricks.length > 0) {
      const lastTrick = tricks[tricks.length - 1];
      const winRelPos = mapAbsoluteToRelative(lastTrick.winner, viewerPosition);
      setWinningSlot(winRelPos);
      const timer = setTimeout(() => setWinningSlot(null), 1000);
      return () => clearTimeout(timer);
    }
    prevTrickCountRef.current = tricks.length;
  }, [tricks.length, viewerPosition, tricks]);

  let trickPoints = 0;
  for (const play of currentTrick) {
    const pts = trumpSuit
      ? getPidroPoints(play.card.rank, play.card.suit, trumpSuit)
      : null;
    if (pts != null) trickPoints += pts;
  }

  const currentTurnPlayer = viewModel.players.find((p) => p.isCurrentTurn);
  const isYourTurn = currentTurnPlayer?.isYou ?? false;

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center">
      {/* Trick points — top left, aligned with north avatar row */}
      {trickPoints > 0 && (
        <div className="absolute left-0 -top-8 rounded-full border border-[#ffcc54]/30 bg-[#ffcc54]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#fff0b2]">
          {trickPoints} pts
        </div>
      )}

      {/* Card grid — tight cross layout */}
      <div className="grid grid-cols-[1fr_auto_1fr] grid-rows-[auto_auto_auto] place-items-center gap-3">
        {/* Row 1: north */}
        <div />
        <TrickSlot
          position="north"
          data={trickByRelative.north}
          trumpSuit={trumpSuit}
          animate={newSlots.has("north")}
          isWinner={winningSlot === "north"}
        />
        <div />

        {/* Row 2: west — trump — east */}
        <TrickSlot
          position="west"
          data={trickByRelative.west}
          trumpSuit={trumpSuit}
          animate={newSlots.has("west")}
          isWinner={winningSlot === "west"}
        />
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-cyan-300/15 bg-black/10 shadow-inner max-sm:h-10 max-sm:w-10">
          <span className="text-2xl text-cyan-50/50 max-sm:text-xl">
            {trumpSuit ? SUIT_SYMBOLS[trumpSuit] : "•"}
          </span>
        </div>
        <TrickSlot
          position="east"
          data={trickByRelative.east}
          trumpSuit={trumpSuit}
          animate={newSlots.has("east")}
          isWinner={winningSlot === "east"}
        />

        {/* Row 3: south */}
        <div />
        <TrickSlot
          position="south"
          data={trickByRelative.south}
          trumpSuit={trumpSuit}
          animate={newSlots.has("south")}
          isWinner={winningSlot === "south"}
        />
        <div />
      </div>

      {tricks.length > 0 && (
        <div className="flex w-full flex-wrap items-center justify-center gap-2">
          {tricks.map((trick, idx) => {
            const pts = trickPointTotal(trick, trumpSuit);
            const trickKey = `trick-${idx.toString()}-${trick.winner}`;
            return (
              <div
                key={trickKey}
                className="rounded-2xl border border-cyan-300/15 bg-black/10 px-3 py-2 text-center"
              >
                <div className="flex justify-center -space-x-3">
                  {trick.cards.map((play) => (
                    <Card
                      key={`${play.card.rank}-${play.card.suit}`}
                      card={play.card}
                      size="sm"
                      isTrump={play.card.suit === trumpSuit}
                    />
                  ))}
                </div>
                <div className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-50/72">
                  #{idx + 1} {trickWinnerLabel(trick.winner, youPosition)}
                  {pts > 0 ? ` ${pts}pt` : ""}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const POSITION_LABELS: Record<string, string> = {
  north: "N",
  east: "E",
  south: "S",
  west: "W",
};

function TrickSlot({
  position,
  data,
  trumpSuit,
  animate = false,
  isWinner = false,
}: {
  position: string;
  data?: { card: { rank: number; suit: Suit }; isLeader: boolean };
  trumpSuit: Suit | null;
  animate?: boolean;
  isWinner?: boolean;
}) {
  // Fixed-size slot — always reserves space so the grid doesn't shift
  const pointValue =
    data && trumpSuit
      ? (getPidroPoints(data.card.rank, data.card.suit, trumpSuit) ?? undefined)
      : undefined;

  const animClass = data && animate ? (CARD_ENTER_CLASSES[position] ?? "") : "";
  const winClass = data && isWinner ? "animate-trick-win" : "";

  return (
    <div
      className={`flex h-[5.5rem] w-[3.75rem] items-center justify-center max-sm:h-[4.5rem] max-sm:w-[3rem] ${animClass} ${winClass}`.trim()}
    >
      {data && (
        <Card
          card={data.card}
          size="md"
          isTrump={data.card.suit === trumpSuit}
          pointValue={pointValue}
        />
      )}
    </div>
  );
}
