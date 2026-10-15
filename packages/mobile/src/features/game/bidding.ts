/**
 * A seat's line while the hand is bid (PID-214). Every seat keeps its bid
 * until bidding ends, and whoever holds the high bid says so, so the round
 * reads at a glance where the plaque's ticker is left out. `short` is the line
 * for a seat with no name beside it (yours on a small phone). `pulse` names
 * the bid itself: it changes when the seat bids, not when somebody outbids it.
 */
export type BidSeatLine = {
  text: string;
  short: string;
  tone?: 'now' | 'quiet' | 'high';
  pulse?: string;
};

export function bidSeatLine({
  bid,
  holdsHigh,
  onTurn,
  hand,
}: {
  bid: number | 'pass' | null | undefined;
  holdsHigh: boolean;
  onTurn: boolean;
  hand?: number | null;
}): BidSeatLine | null {
  const pulse = `${hand ?? 0}:${bid}`;
  if (bid === 'pass') return { text: 'Passed', short: 'Passed', tone: 'quiet', pulse };
  if (typeof bid === 'number') {
    return holdsHigh
      ? { text: `Bid ${bid} · high`, short: `High ${bid}`, tone: 'high', pulse }
      : { text: `Bid ${bid}`, short: `Bid ${bid}`, pulse };
  }
  return onTurn ? { text: 'Bidding…', short: 'Bidding…', tone: 'now' } : null;
}
