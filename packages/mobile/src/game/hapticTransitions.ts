import type { RelativePosition } from '@/types/game';
import type { TableModel } from './canvas/tableModel';

export type TableHapticEvent =
  'deal_packet' | 'hand_shuffle' | 'card_landed' | 'trick_complete' | 'dealer_cut_sequence';

function dealtCardCount(model: TableModel): number {
  return Object.values(model.seats).reduce((total, seat) => total + (seat?.cardCount ?? 0), 0);
}

function playedCards(model: TableModel): { key: string; seat: RelativePosition }[] {
  return (['north', 'east', 'south', 'west'] as const).flatMap((seat) =>
    (model.playedCards[seat] ?? []).map((card) => ({ key: card.key, seat }))
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

  const previousPlayedKeys = new Set(playedCards(previous).map(({ key }) => key));
  const nextPlayed = playedCards(next);
  const added = nextPlayed.filter(({ key }) => !previousPlayedKeys.has(key));
  // One authoritative play at a time is normal. Ignore bulk additions from a resync.
  if (added.length === 1) {
    if (nextPlayed.length % 4 === 0) events.push('trick_complete');
    else if (added[0].seat !== 'south') events.push('card_landed');
  }

  const nextCutKey = cutSequenceKey(next);
  if (
    next.phase === 'dealer_selection' &&
    nextCutKey.replaceAll('|', '') &&
    nextCutKey !== cutSequenceKey(previous)
  ) {
    events.push('dealer_cut_sequence');
  }
  return events;
}
