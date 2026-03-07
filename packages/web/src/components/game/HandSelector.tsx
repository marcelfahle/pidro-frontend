import type { Card as CardType, GameViewModel, Suit } from '@pidro/shared';
import { useState } from 'react';
import { Card, getPidroPoints } from './Card';

interface HandSelectorProps {
  viewModel: GameViewModel;
  cards: CardType[];
  trumpSuit: Suit | null;
  onSelectHand: (cards: CardType[]) => void;
}

export function HandSelector({ viewModel, cards, trumpSuit, onSelectHand }: HandSelectorProps) {
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const targetCount = 6;

  const youPlayer = viewModel.players.find((p) => p.isYou);
  const isYourTurn = youPlayer?.isCurrentTurn ?? false;

  if (!isYourTurn) {
    const currentTurnPlayer = viewModel.players.find((p) => p.isCurrentTurn);
    const waitingForName = currentTurnPlayer?.username ?? 'dealer';
    return (
      <div className="pidro-panel px-5 py-3 text-sm font-black text-cyan-50/80">
        Waiting for {waitingForName} to select cards...
      </div>
    );
  }

  function toggleCard(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else if (next.size < targetCount) {
        next.add(index);
      }
      return next;
    });
  }

  function handleConfirm() {
    onSelectHand(cards.filter((_, i) => selected.has(i)));
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4">
      <div className="text-sm font-black uppercase tracking-[0.16em] text-[#fff0b2]">
        Select {targetCount} cards to keep
      </div>
      <div className="text-xs font-black uppercase tracking-[0.16em] text-cyan-50/70">
        {selected.size}/{targetCount} selected
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {cards.map((card, i) => {
          const pointValue = trumpSuit
            ? (getPidroPoints(card.rank, card.suit, trumpSuit) ?? undefined)
            : undefined;

          return (
            <Card
              key={`${card.rank}-${card.suit}`}
              card={card}
              size="md"
              selected={selected.has(i)}
              isTrump={card.suit === trumpSuit}
              playable={true}
              pointValue={pointValue}
              onClick={() => toggleCard(i)}
            />
          );
        })}
      </div>
      <button
        type="button"
        onClick={handleConfirm}
        disabled={selected.size !== targetCount}
        className="rounded-[7px] border-2 border-[#d99d1b] bg-[linear-gradient(180deg,rgba(255,213,88,0.22)_0%,transparent_36%),linear-gradient(180deg,#6d3000_0%,#4a1900_38%,#2f1100_100%)] px-6 py-3 text-sm font-black uppercase tracking-[0.12em] text-[#ffd84a] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Confirm Selection
      </button>
    </div>
  );
}
