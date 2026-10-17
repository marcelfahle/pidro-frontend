import type { Card, GameViewModel, Suit } from '@/types/game';
import { HandSelector } from './HandSelector';

type Props = {
  viewModel: GameViewModel;
  cards: Card[] | null;
  trumpSuit: Suit | null;
  canSelectHand: boolean;
  onSelectHand: (cards: Card[]) => void | Promise<void>;
};

/**
 * A dealer picking by hand chooses six from their pool here. Nothing else of
 * the dealer's pick is said in words: the pack is taken and the extras are
 * thrown on the table, for the dealer and everyone watching.
 */
export function DealerSecondDeal({
  viewModel,
  cards,
  trumpSuit,
  canSelectHand,
  onSelectHand,
}: Props) {
  if (!canSelectHand || !cards || cards.length < 6) return null;
  return (
    <HandSelector
      viewModel={viewModel}
      cards={cards}
      trumpSuit={trumpSuit}
      onSelectHand={onSelectHand}
    />
  );
}
