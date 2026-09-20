import type { DealerPresentation } from '@pidro/shared';

export const DEAL_CARD_STAGGER_MS = 70;
export const DEAL_CARD_TRAVEL_MS = 460;
export const DEAL_ACTION_REVEAL_BUFFER_MS = 100;
export const HAND_PRESENTATION_TIMEOUT_MS = 2_000;

export function dealAnimationDurationMs(cardCount: number): number {
  if (cardCount <= 0) return 0;
  return (cardCount - 1) * DEAL_CARD_STAGGER_MS + DEAL_CARD_TRAVEL_MS;
}

/** Seek server time, including time spent loading textures or suspended offscreen.
 * A late arrival gets the result, not a compressed blink of the drawing motion.
 * Expiry changes only the presentation, never the authoritative game phase.
 */
export function dealerPresentationAt(timing: DealerPresentation | null | undefined, now: number) {
  if (!timing) return { selected: true, progress: 1, travelMs: 0 };
  const serverNow = timing.serverTimeMs + Math.max(0, now - timing.receivedAtMs);
  const elapsed = Math.max(0, serverNow - timing.startedAtMs);
  const remaining = Math.max(0, timing.endsAtMs - serverNow);
  const selected = elapsed >= 1200 || remaining <= 900;
  const progress = selected ? 1 : Math.min(1, elapsed / 600);
  return { selected, progress, travelMs: selected ? 0 : Math.max(0, 600 - elapsed) };
}
