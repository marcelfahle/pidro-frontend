import type { Card as CardType, Position } from "@pidro/shared";
import { mapAbsoluteToRelative, POS_ORDER } from "@pidro/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "./Card";
import { DealerChip } from "./DealerChip";

interface DealerSelectionRevealProps {
  cuts: Record<Position, CardType>;
  dealer: Position | null;
  viewerPosition: Position;
}

const CARD_ENTER_CLASSES: Record<string, string> = {
  north: "animate-card-enter-north",
  south: "animate-card-enter-south",
  east: "animate-card-enter-east",
  west: "animate-card-enter-west",
};

export function DealerSelectionReveal({
  cuts,
  dealer,
  viewerPosition,
}: DealerSelectionRevealProps) {
  // Snapshot cuts on mount so re-deals don't flicker the animation
  const [stableCuts] = useState(cuts);
  const [visibleCount, setVisibleCount] = useState(0);
  const [highlightWinner, setHighlightWinner] = useState(false);
  // Freeze dealer once we start highlighting
  const frozenDealer = useRef<Position | null>(null);

  const byRelPos = useMemo(() => {
    const map: Partial<Record<string, { position: Position; card: CardType }>> =
      {};
    for (const pos of POS_ORDER) {
      if (!stableCuts[pos]) continue;
      const rel = mapAbsoluteToRelative(pos, viewerPosition);
      map[rel] = { position: pos, card: stableCuts[pos] };
    }
    return map;
  }, [stableCuts, viewerPosition]);

  const totalCards = (
    ["north", "east", "south", "west"] as const
  ).filter((r) => byRelPos[r]).length;

  // Reveal cards one by one
  useEffect(() => {
    if (visibleCount >= totalCards) return;
    const timer = setTimeout(() => setVisibleCount((c) => c + 1), 350);
    return () => clearTimeout(timer);
  }, [visibleCount, totalCards]);

  // Once all visible and dealer known, highlight winner
  useEffect(() => {
    if (visibleCount < totalCards || !dealer || highlightWinner) return;
    frozenDealer.current = dealer;
    const timer = setTimeout(() => setHighlightWinner(true), 200);
    return () => clearTimeout(timer);
  }, [visibleCount, totalCards, dealer, highlightWinner]);

  const winnerPos = frozenDealer.current;
  let revealIndex = 0;

  function slotFor(relPos: string) {
    const entry = byRelPos[relPos];
    if (!entry) {
      return (
        <div className="flex h-[5.5rem] w-[3.75rem] items-center justify-center max-sm:h-[4.5rem] max-sm:w-[3rem]" />
      );
    }

    const myIndex = revealIndex++;
    const isVisible = myIndex < visibleCount;
    const isWinner = highlightWinner && entry.position === winnerPos;
    const animClass = isVisible
      ? (CARD_ENTER_CLASSES[relPos] ?? "")
      : "opacity-0";

    return (
      <div className="flex h-[5.5rem] w-[3.75rem] items-center justify-center max-sm:h-[4.5rem] max-sm:w-[3rem]">
        <div
          className={`${animClass} ${
            isWinner
              ? "scale-110 rounded-lg ring-2 ring-amber-400 transition-all duration-300"
              : ""
          }`}
        >
          <Card card={entry.card} size="md" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center">
      <div className="grid grid-cols-[1fr_auto_1fr] grid-rows-[auto_auto_auto] place-items-center gap-3">
        <div />
        {slotFor("north")}
        <div />

        {slotFor("west")}
        <div className="flex h-14 w-14 items-center justify-center max-sm:h-10 max-sm:w-10">
          <DealerChip />
        </div>
        {slotFor("east")}

        <div />
        {slotFor("south")}
        <div />
      </div>
    </div>
  );
}
