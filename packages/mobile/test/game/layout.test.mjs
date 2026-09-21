import { describe, expect, it } from 'bun:test';
import { computeLayout, playedCardTarget } from '../../src/game/canvas/layout.ts';

describe('played-card piles', () => {
  for (const [width, height] of [
    [390, 844],
    [844, 390],
    [820, 1180],
    [1180, 820],
  ]) {
    it(`exposes the rank edge at every seat on ${width}×${height}`, () => {
      const layout = computeLayout(width, height, { top: 0, bottom: 0, left: 0, right: 0 });
      for (const count of [2, 4, 6]) {
        for (const seat of ['north', 'east', 'south', 'west']) {
          for (let i = 1; i < count; i++) {
            const older = playedCardTarget(layout, seat, i - 1, count);
            const newer = playedCardTarget(layout, seat, i, count);
            // Newer cards are on top. In card-local coordinates they must move
            // right, exposing the older card's left-hand rank/suit index.
            const dx = newer.x - older.x;
            const dy = newer.y - older.y;
            const localX = dx * Math.cos(older.rot) + dy * Math.sin(older.rot);
            const localY = -dx * Math.sin(older.rot) + dy * Math.cos(older.rot);
            expect(localX).toBeGreaterThan(0);
            expect(localX).toBeLessThan(layout.cardW * older.scale);
            expect(localY).toBeCloseTo(0);
          }
        }
      }
      expect(playedCardTarget(layout, 'east', 0, 1)).toMatchObject({
        x: layout.trick.cx + layout.trick.r,
        y: layout.trick.cy,
        rot: -Math.PI / 2,
      });
    });
  }
});
