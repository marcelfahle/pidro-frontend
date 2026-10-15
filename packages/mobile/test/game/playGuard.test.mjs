import { describe, expect, it } from 'bun:test';
import { PLAY_SETTLE_MS, playHoldUntil } from '../../src/game/usePlayGuard.ts';

describe('card play guard', () => {
  it('holds taps for a moment after the hand settles', () => {
    expect(playHoldUntil(1_000, null)).toBe(1_000 + PLAY_SETTLE_MS);
  });

  it("holds taps for the dealer's rob, bounded by its own length", () => {
    const rob = { started_at_ms: 50_000, ends_at_ms: 53_500 };
    expect(playHoldUntil(1_000, rob)).toBe(1_000 + 3_500 + PLAY_SETTLE_MS);
    expect(playHoldUntil(1_000, { started_at_ms: 9, ends_at_ms: 3 })).toBe(1_000 + PLAY_SETTLE_MS);
  });
});
