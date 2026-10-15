import { describe, expect, it } from 'bun:test';
import {
  cardSize,
  computeLayout,
  handLeft,
  handScale,
  handStep,
  northBackWidth,
  northFanTop,
  northFanWidth,
  playedCardTarget,
  showsTicker,
  TIGHT_AVATAR,
  TIGHT_SOUTH_SLOT,
  tickerPlacement,
  utilityDockReserve,
} from '../../src/game/canvas/layout.ts';

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

describe('side stacks and the hand', () => {
  const none = { top: 0, bottom: 0, left: 0, right: 0 };

  it('drops landscape side stacks below the trick line, and their cards leave from there', () => {
    const landscape = computeLayout(874, 402, { top: 0, bottom: 21, left: 62, right: 62 });
    expect(landscape.sides.cy).toBeGreaterThan(landscape.trick.cy);
    expect(landscape.seats.east.y).toBe(landscape.sides.cy);
    expect(landscape.seats.west.y).toBe(landscape.sides.cy);

    const portrait = computeLayout(402, 874, { top: 62, bottom: 34, left: 0, right: 0 }, 60, 72);
    expect(portrait.sides.cy).toBe(portrait.trick.cy);
  });

  it('puts the left edge of a fuller hand further left', () => {
    const layout = computeLayout(844, 390, none);
    expect(handLeft(layout, 9)).toBeLessThan(handLeft(layout, 6));
    expect(handLeft(layout, 1)).toBeCloseTo(
      layout.hand.cx - (layout.cardW * handScale(layout.profile) * 1.03) / 2
    );
  });
});

describe('portrait trick fits between North and your hand', () => {
  for (const [width, height, insets] of [
    [360, 640, { top: 24, bottom: 0, left: 0, right: 0 }],
    [360, 640, { top: 24, bottom: 48, left: 0, right: 0 }],
    [375, 667, { top: 20, bottom: 0, left: 0, right: 0 }],
    [390, 844, { top: 47, bottom: 34, left: 0, right: 0 }],
    [402, 874, { top: 62, bottom: 34, left: 0, right: 0 }],
    [440, 956, { top: 62, bottom: 34, left: 0, right: 0 }],
  ]) {
    it(`clears North's seat and the hand on ${width}×${height}`, () => {
      const L = computeLayout(width, height, insets, 60, utilityDockReserve(height));
      const half = (L.cardH * L.trick.pileScale) / 2;
      const northCardTop = L.trick.cy - L.trick.r - half;
      const southCardBottom = L.trick.cy + L.trick.r + half;
      // North's fan and seat, as SeatLayer stacks them under the header.
      const northSeatBottom =
        insets.top +
        60 +
        8 +
        Math.min(58, Math.max(31, L.cardW * 0.66)) * (110 / 78) +
        12 +
        (L.tight ? TIGHT_AVATAR : 98);
      expect(northCardTop).toBeGreaterThanOrEqual(northSeatBottom);
      expect(southCardBottom).toBeLessThanOrEqual(L.hand.cy - L.cardH / 2);
    });
  }
});

describe('tight phones', () => {
  const dock = (height) => utilityDockReserve(height);
  for (const [width, height, insets, tight] of [
    [360, 640, { top: 24, bottom: 0, left: 0, right: 0 }, true],
    [375, 667, { top: 20, bottom: 0, left: 0, right: 0 }, true],
    [390, 844, { top: 47, bottom: 34, left: 0, right: 0 }, false],
    [402, 874, { top: 62, bottom: 34, left: 0, right: 0 }, false],
  ]) {
    it(`${tight ? 'go' : 'stay out of'} tight on ${width}×${height}`, () => {
      expect(computeLayout(width, height, insets, 60, dock(height)).tight).toBe(tight);
    });
  }

  it('leave your avatar a slot at the left of a full hand', () => {
    const L = computeLayout(360, 640, { top: 24, bottom: 0, left: 0, right: 0 }, 60, dock(640));
    const avatarLeft = L.hand.cx - L.hand.maxWidth / 2 - TIGHT_SOUTH_SLOT;
    expect(avatarLeft).toBeGreaterThanOrEqual(8);
    expect(avatarLeft + TIGHT_AVATAR).toBeLessThanOrEqual(handLeft(L, 9));
  });
});

describe('the plaque ticker keeps off North’s fan', () => {
  const noInsets = { top: 0, bottom: 0, left: 0, right: 0 };
  const plaque = { plaqueLeft: 12, plaqueTop: 8 };

  for (const [width, height] of [
    [390, 844],
    [430, 932],
  ]) {
    it(`ends its lines within half a back of the fan on ${width}×${height}`, () => {
      const L = computeLayout(width, height, noInsets, 64, 0);
      const { lineMaxWidth, drop } = tickerPlacement(L, { tableTop: 64, ...plaque });
      const fanLeft = L.seats.north.x - northFanWidth(L.cardW, 9) / 2;
      // The line, then the chevron and its gap.
      expect(plaque.plaqueLeft + lineMaxWidth + 16).toBeLessThanOrEqual(
        fanLeft + northBackWidth(L.cardW) / 2 + 0.5
      );
      expect(drop).toBe(0);
    });
  }

  it('drops below the fan beside the plaque in landscape', () => {
    const L = computeLayout(844, 390, noInsets, 64, 0);
    const { lineMaxWidth, drop } = tickerPlacement(L, { tableTop: 64, ...plaque });
    const fanBottom = northFanTop(L, 64) + (northBackWidth(L.cardW) * 110) / 78;
    expect(plaque.plaqueTop + drop).toBeGreaterThanOrEqual(fanBottom);
    expect(lineMaxWidth).toBe(168);
  });
});

describe('small phones leave the ticker out', () => {
  for (const [width, height, insets, shown] of [
    [360, 640, { top: 24, bottom: 0, left: 0, right: 0 }, false],
    [375, 667, { top: 20, bottom: 0, left: 0, right: 0 }, false],
    [640, 360, { top: 0, bottom: 0, left: 0, right: 0 }, false],
    [667, 375, { top: 0, bottom: 0, left: 0, right: 0 }, false],
    [390, 844, { top: 47, bottom: 34, left: 0, right: 0 }, true],
    [844, 390, { top: 0, bottom: 21, left: 47, right: 47 }, true],
  ]) {
    it(`${shown ? 'shows' : 'hides'} it on ${width}×${height}`, () => {
      const portrait = height > width;
      const L = computeLayout(
        width,
        height,
        insets,
        portrait ? 60 : 0,
        portrait ? utilityDockReserve(height) : 0
      );
      expect(showsTicker(L)).toBe(shown);
      expect(tickerPlacement(L, { tableTop: 60, plaqueLeft: 12, plaqueTop: 8 }) !== null).toBe(
        shown
      );
    });
  }
});

describe('landscape: your played card lands above your hand', () => {
  for (const [width, height, side, bottom] of [
    [640, 360, 0, 0],
    [667, 375, 0, 0],
    [844, 390, 47, 21],
    [874, 402, 62, 21],
    [932, 430, 59, 21],
    [956, 440, 62, 21],
  ]) {
    it(`on ${width}×${height}`, () => {
      const L = computeLayout(width, height, { top: 0, bottom, left: side, right: side });
      const south = playedCardTarget(L, 'south', 0, 1);
      const pileBottom = south.y + (L.cardH * south.scale) / 2;
      const handTop = L.hand.cy - (L.cardH * handScale(L.profile)) / 2;
      expect(pileBottom).toBeLessThanOrEqual(handTop - 8 + 0.5);
    });
  }
});

describe('landscape phones draw a larger hand beside your seat', () => {
  // Android (0, or a 48pt button bar on either side) and iPhones with the
  // Dynamic Island on either side.
  for (const [width, height, insets] of [
    [640, 360, { top: 0, bottom: 0, left: 0, right: 0 }],
    [640, 360, { top: 0, bottom: 0, left: 48, right: 0 }],
    [640, 360, { top: 0, bottom: 0, left: 0, right: 48 }],
    [667, 375, { top: 0, bottom: 0, left: 0, right: 0 }],
    [844, 390, { top: 0, bottom: 21, left: 47, right: 47 }],
    [844, 390, { top: 0, bottom: 21, left: 47, right: 0 }],
    [932, 430, { top: 0, bottom: 21, left: 59, right: 59 }],
    [932, 430, { top: 0, bottom: 21, left: 0, right: 59 }],
  ]) {
    it(`on ${width}×${height} ${JSON.stringify(insets)}`, () => {
      const L = computeLayout(width, height, insets);
      const handW = L.cardW * handScale(L.profile);
      expect(handW).toBeCloseTo(cardSize(height) * 1.2);
      expect(handW).toBeGreaterThanOrEqual(64);

      // Your seat: 70pt in, a 52pt avatar, a 10pt gap and at least 56pt of name.
      const seatRight = insets.left + 70 + 52 + 10 + 56;
      for (const n of [1, 6, 9]) {
        const left = handLeft(L, n);
        const right = left + (n - 1) * handStep(L, n) + handW * 1.03;
        expect(left).toBeGreaterThanOrEqual(seatRight + 6);
        expect(right).toBeLessThanOrEqual(width - insets.right - 8);
      }
      // A full hand fits at its usual overlap: every rank in reach of a thumb.
      expect(handStep(L, 9)).toBeCloseTo(L.cardW * 0.72);
      expect(L.hand.cy + (L.cardH * handScale(L.profile)) / 2).toBeLessThanOrEqual(
        height - insets.bottom
      );
    });
  }

  it('keeps a hand that fits on the table’s axis', () => {
    const L = computeLayout(932, 430, { top: 0, bottom: 21, left: 59, right: 59 });
    expect(L.hand.cx).toBe(466);
  });

  it('squeezes the hand before it reaches your seat on a narrow window', () => {
    const L = computeLayout(560, 340, { top: 0, bottom: 0, left: 48, right: 48 });
    expect(handStep(L, 9)).toBeLessThan(L.cardW * 0.72);
    expect(handLeft(L, 9)).toBeGreaterThanOrEqual(48 + 188 + 6);
  });
});
