import type { Card as CardType, Position, RelativePosition } from '@pidro/shared';
import { mapAbsoluteToRelative, POS_ORDER } from '@pidro/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from './Card';
import { DealerChip } from './DealerChip';

export type DealerRevealBeat =
  | { kind: 'reveal'; index: number; position: Position; relPos: RelativePosition }
  | { kind: 'highlight'; position: Position };

interface DealerSelectionRevealProps {
  cuts: Record<Position, CardType>;
  dealer: Position | null;
  viewerPosition: Position;
  /** ms between each card revealing (default 350). */
  revealIntervalMs?: number;
  /** ms to wait after the last card lands before highlighting the winner (default 200). */
  highlightDelayMs?: number;
  /** Fired as each beat of the sequence occurs — instrumentation for the animation playground. */
  onBeat?: (beat: DealerRevealBeat) => void;
}

const CARD_ENTER_CLASSES: Record<string, string> = {
  north: 'animate-card-enter-north',
  south: 'animate-card-enter-south',
  east: 'animate-card-enter-east',
  west: 'animate-card-enter-west',
};

export function DealerSelectionReveal({
  cuts,
  dealer,
  viewerPosition,
  revealIntervalMs = 350,
  highlightDelayMs = 200,
  onBeat,
}: DealerSelectionRevealProps) {
  // Snapshot cuts on mount so re-deals don't flicker the animation
  const [stableCuts] = useState(cuts);
  const [visibleCount, setVisibleCount] = useState(0);
  const [highlightWinner, setHighlightWinner] = useState(false);
  // Freeze dealer once we start highlighting
  const frozenDealer = useRef<Position | null>(null);

  const byRelPos = useMemo(() => {
    const map: Partial<Record<string, { position: Position; card: CardType }>> = {};
    for (const pos of POS_ORDER) {
      if (!stableCuts[pos]) continue;
      const rel = mapAbsoluteToRelative(pos, viewerPosition);
      map[rel] = { position: pos, card: stableCuts[pos] };
    }
    return map;
  }, [stableCuts, viewerPosition]);

  const totalCards = (['north', 'east', 'south', 'west'] as const).filter(
    (r) => byRelPos[r],
  ).length;

  // The order cards reveal in — matches the slot render order below (N, W, E, S).
  const revealOrder = useMemo(() => {
    const order: Array<{ relPos: RelativePosition; position: Position }> = [];
    for (const rel of ['north', 'west', 'east', 'south'] as const) {
      const entry = byRelPos[rel];
      if (entry) order.push({ relPos: rel, position: entry.position });
    }
    return order;
  }, [byRelPos]);

  // Keep the latest onBeat without re-subscribing the reveal timers.
  const onBeatRef = useRef(onBeat);
  onBeatRef.current = onBeat;
  const firedReveals = useRef(0);

  // Reveal cards one by one
  useEffect(() => {
    if (visibleCount >= totalCards) return;
    const timer = setTimeout(() => setVisibleCount((c) => c + 1), revealIntervalMs);
    return () => clearTimeout(timer);
  }, [visibleCount, totalCards, revealIntervalMs]);

  // Once all visible and dealer known, highlight winner
  useEffect(() => {
    if (visibleCount < totalCards || !dealer || highlightWinner) return;
    frozenDealer.current = dealer;
    const timer = setTimeout(() => setHighlightWinner(true), highlightDelayMs);
    return () => clearTimeout(timer);
  }, [visibleCount, totalCards, dealer, highlightWinner, highlightDelayMs]);

  // Emit a beat as each card becomes visible (playground instrumentation; no-op without onBeat).
  useEffect(() => {
    while (firedReveals.current < visibleCount) {
      const entry = revealOrder[firedReveals.current];
      if (entry) {
        onBeatRef.current?.({
          kind: 'reveal',
          index: firedReveals.current,
          position: entry.position,
          relPos: entry.relPos,
        });
      }
      firedReveals.current += 1;
    }
  }, [visibleCount, revealOrder]);

  // Emit the winner-highlight beat.
  useEffect(() => {
    if (!highlightWinner) return;
    const pos = frozenDealer.current;
    if (pos) onBeatRef.current?.({ kind: 'highlight', position: pos });
  }, [highlightWinner]);

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
    const animClass = isVisible ? (CARD_ENTER_CLASSES[relPos] ?? '') : 'opacity-0';

    return (
      <div className="flex h-[5.5rem] w-[3.75rem] items-center justify-center max-sm:h-[4.5rem] max-sm:w-[3rem]">
        <div
          className={`${animClass} ${
            isWinner ? 'scale-110 rounded-lg ring-2 ring-amber-400 transition-all' : ''
          }`}
          style={
            isWinner ? { transitionDuration: 'var(--dealer-highlight-duration, 300ms)' } : undefined
          }
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
        {slotFor('north')}
        <div />

        {slotFor('west')}
        <div className="flex h-14 w-14 items-center justify-center max-sm:h-10 max-sm:w-10">
          <DealerChip />
        </div>
        {slotFor('east')}

        <div />
        {slotFor('south')}
        <div />
      </div>
    </div>
  );
}
