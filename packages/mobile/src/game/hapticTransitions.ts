import type { TableModel } from './canvas/tableModel';

export type TableHapticEvent = 'deal_packet' | 'hand_shuffle' | 'dealer_cut_sequence' | 'your_turn';

function dealtCardCount(model: TableModel): number {
  return Object.values(model.seats).reduce((total, seat) => total + (seat?.cardCount ?? 0), 0);
}

/** Your turn counts once your cards are in hand, not while they are still being dealt. */
export function isYourTurn(model: TableModel): boolean {
  return (
    !model.dealStage && Object.values(model.seats).some((seat) => seat?.isYou && seat.isCurrentTurn)
  );
}

function cutSequenceKey(model: TableModel): string {
  return (['north', 'east', 'south', 'west'] as const)
    .map((seat) => model.dealerCuts[seat]?.key ?? '')
    .join('|');
}

/** Classifies only live model transitions; the initial snapshot is intentionally silent. */
export function getTableHapticEvents(
  previous: TableModel | null,
  next: TableModel
): TableHapticEvent[] {
  if (!previous) return [];

  const events: TableHapticEvent[] = [];
  if (next.dealStage === 'dealing' && dealtCardCount(next) > dealtCardCount(previous)) {
    events.push('deal_packet');
  }
  if (next.dealStage === 'sorting' && previous.dealStage !== 'sorting') {
    events.push('hand_shuffle');
  }

  const nextCutKey = cutSequenceKey(next);
  if (
    next.phase === 'dealer_selection' &&
    nextCutKey.replaceAll('|', '') &&
    nextCutKey !== cutSequenceKey(previous)
  ) {
    events.push('dealer_cut_sequence');
  }
  if (isYourTurn(next) && !isYourTurn(previous)) events.push('your_turn');
  return events;
}
