import type { Card as CardType, GameViewModel, Suit } from '@pidro/shared';
import { useState } from 'react';
import { Card, getPidroPoints } from './Card';

interface HandSelectorProps {
  viewModel: GameViewModel;
  cards: CardType[];
  trumpSuit: Suit | null;
  onSelectHand: (cards: CardType[]) => void;
}

/**
 * Shown during the second_deal phase when the dealer has more than 6 cards.
 * The dealer must select exactly 6 cards to keep; the rest are discarded.
 */
export function HandSelector({ viewModel, cards, trumpSuit, onSelectHand }: HandSelectorProps) {
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const targetCount = 6; // Pidro rules: dealer keeps exactly 6 cards

  const youPlayer = viewModel.players.find((p) => p.isYou);
  const isYourTurn = youPlayer?.isCurrentTurn ?? false;

  // If it's not our turn during second_deal, show waiting message
  if (!isYourTurn) {
    const currentTurnPlayer = viewModel.players.find((p) => p.isCurrentTurn);
    const waitingForName = currentTurnPlayer?.username ?? 'dealer';
    return (
      <div className="flex h-full w-full items-center justify-center">
        <span className="text-sm text-emerald-400/60">
          Waiting for {waitingForName} to select cards...
        </span>
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
    const selectedCards = cards.filter((_, i) => selected.has(i));
    onSelectHand(selectedCards);
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-2">
      <span className="text-sm font-medium text-yellow-400">
        Select {targetCount} cards to keep
      </span>

      <div className="text-xs text-emerald-300">
        {selected.size}/{targetCount} selected
      </div>

      {/* Card display */}
      <div className="flex flex-wrap justify-center gap-1">
        {cards.map((card, i) => {
          const isSelected = selected.has(i);
          const pointValue = trumpSuit
            ? (getPidroPoints(card.rank, card.suit, trumpSuit) ?? undefined)
            : undefined;

          return (
            <Card
              key={`${card.rank}-${card.suit}`}
              card={card}
              size="md"
              selected={isSelected}
              isTrump={card.suit === trumpSuit}
              playable={true}
              pointValue={pointValue}
              onClick={() => toggleCard(i)}
            />
          );
        })}
      </div>

      {/* Confirm button */}
      <button
        type="button"
        onClick={handleConfirm}
        disabled={selected.size !== targetCount}
        className="rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Confirm Selection
      </button>
    </div>
  );
}
