import type { Position, ServerHandSummary, TeamKey } from '@pidro/shared';

/** A fresh snapshot is the whole ledger, including when joining mid-game. */
export function handHistoryRows(
  history: readonly ServerHandSummary[] | null | undefined,
  viewer: Position | null
) {
  const us: TeamKey =
    !viewer || viewer === 'north' || viewer === 'south' ? 'north_south' : 'east_west';
  const them: TeamKey = us === 'north_south' ? 'east_west' : 'north_south';
  return [...(history ?? [])].reverse().map((hand) => ({
    number: hand.hand_number,
    bidder: hand.bidder,
    ours: hand.bidding_team === us,
    bid: hand.bid,
    trump: hand.trump ?? null,
    made: hand.made,
    captured: [hand.captured[us], hand.captured[them]],
    totals: [hand.scores[us], hand.scores[them]],
  }));
}
