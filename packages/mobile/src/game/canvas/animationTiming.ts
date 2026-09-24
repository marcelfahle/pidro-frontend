export const DEAL_CARD_STAGGER_MS = 70;
export const DEAL_CARD_TRAVEL_MS = 460;
export const DEAL_ACTION_REVEAL_BUFFER_MS = 100;
export const HAND_PRESENTATION_TIMEOUT_MS = 2_000;

// Twelve little packets, rather than 36 individual throws. The last packet
// settles before the player gets a beat to read their hand and then sort it.
export const DEAL_PACKET_INTERVAL_MS = 260;
export const DEAL_PACKET_CARD_STAGGER_MS = 24;
export const DEAL_PACKET_TRAVEL_MS = 300;
export const DEAL_SORT_PAUSE_MS = 2 * DEAL_PACKET_CARD_STAGGER_MS + DEAL_PACKET_TRAVEL_MS + 240;
export const DEAL_SORT_DURATION_MS = 560;

export const CUT_CARD_STAGGER_MS = 620;
export const CUT_CARD_TRAVEL_MS = 520;
export const CUT_WINNER_PAUSE_MS = 900;

const CLOCKWISE = ['north', 'east', 'south', 'west'] as const;
type Seat = (typeof CLOCKWISE)[number];

export function dealtCardCounts(dealer: Seat, packets: number): Record<Seat, number> {
  const counts = { north: 0, east: 0, south: 0, west: 0 };
  const start = CLOCKWISE.indexOf(dealer) + 1;
  for (let packet = 0; packet < Math.min(12, packets); packet++) {
    counts[CLOCKWISE[(start + packet) % 4]] += 3;
  }
  return counts;
}

export function dealAnimationDurationMs(cardCount: number): number {
  if (cardCount <= 0) return 0;
  return (cardCount - 1) * DEAL_CARD_STAGGER_MS + DEAL_CARD_TRAVEL_MS;
}
