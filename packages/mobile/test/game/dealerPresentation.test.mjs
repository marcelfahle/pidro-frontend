import { describe, expect, it } from 'bun:test';
import { dealerPresentationAt } from '../../src/game/canvas/animationTiming';

const timing = { startedAtMs: 10000, endsAtMs: 13000, serverTimeMs: 10200, receivedAtMs: 500 };
describe('server-owned dealer presentation', () => {
  it('seeks near-live network time and charges delayed rendering to the same clock', () => {
    expect(dealerPresentationAt(timing, 500)).toEqual({
      selected: false,
      progress: 1 / 3,
      travelMs: 400,
    });
    expect(dealerPresentationAt(timing, 700)).toEqual({
      selected: false,
      progress: 2 / 3,
      travelMs: 200,
    });
    expect(dealerPresentationAt(timing, 2000)).toEqual({
      selected: true,
      progress: 1,
      travelMs: 0,
    });
  });
  it('shows the selected dealer immediately for near-deadline and selected catch-up', () => {
    for (const serverTimeMs of [11800, 12950, 13000, 16000]) {
      expect(dealerPresentationAt({ ...timing, serverTimeMs }, 500)).toEqual({
        selected: true,
        progress: 1,
        travelMs: 0,
      });
    }
    // A short server window must not flash a compressed drawing animation.
    expect(dealerPresentationAt({ ...timing, endsAtMs: 10800 }, 500).selected).toBe(true);
  });
  it('does not invent or replay timing for legacy snapshots', () => {
    expect(dealerPresentationAt(null, 500)).toEqual({ selected: true, progress: 1, travelMs: 0 });
  });
});
