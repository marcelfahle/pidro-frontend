import { describe, expect, it } from 'bun:test';
import { avatarParts } from '../../src/features/avatar';
import {
  AVATAR_SIZE,
  cardSize,
  computeLayout,
  handLeft,
  handLift,
  handScale,
  handStep,
  LANDSCAPE_SOUTH_LEFT,
  landscapeNameReach,
  landscapeNorthLeft,
  landscapeNorthShift,
  MENU_SLOT,
  NORTH_NAME_MIN,
  northChipBehind,
  northBackWidth,
  northFanTop,
  northFanWidth,
  northSeatBottom,
  playedCardTarget,
  sideSeatTop,
  seatNameGap,
  sideStacks,
  showsTicker,
  TIGHT_AVATAR,
  TIGHT_SOUTH_SLOT,
  tickerPlacement,
  TRUMP_BUTTON,
  trumpPicker,
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

describe('count help keeps the bid line on small phones (PID-220)', () => {
  it('hangs it below North’s fan, ending before North’s avatar', () => {
    const L = computeLayout(360, 640, { top: 24, bottom: 0, left: 0, right: 0 }, 60, 0);
    const plaqueBottom = 64;
    const placed = tickerPlacement(
      L,
      { tableTop: 84, plaqueLeft: 12, plaqueTop: 32, plaqueBottom },
      true
    );
    const fanBottom = northFanTop(L, 84) + (northBackWidth(L.cardW) * 110) / 78;
    expect(plaqueBottom + placed.drop).toBeGreaterThanOrEqual(fanBottom);
    // The line, then the chevron and its gap, short of the tight North avatar.
    expect(12 + placed.lineMaxWidth + 16).toBeLessThan(360 / 2 - 44 / 2);
  });
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

describe('the trump picker sits in the felt, clear of everything (PID-209)', () => {
  // The header row: an 8pt inset and the 53pt score plaque (TABLE_HEADER).
  const HEADER = 61;
  for (const [width, height, insets] of [
    [375, 667, { top: 20, bottom: 0, left: 0, right: 0 }],
    [390, 844, { top: 47, bottom: 34, left: 0, right: 0 }],
    [640, 360, { top: 0, bottom: 0, left: 0, right: 0 }],
    [844, 390, { top: 0, bottom: 21, left: 47, right: 47 }],
    [1024, 1366, { top: 24, bottom: 20, left: 0, right: 0 }],
  ]) {
    it(`on ${width}×${height}`, () => {
      const portrait = height > width;
      const tableTop = insets.top + (portrait ? HEADER : 0);
      const headerBottom = insets.top + HEADER + 8;
      const L = computeLayout(
        width,
        height,
        insets,
        portrait ? HEADER : 0,
        portrait ? utilityDockReserve(height) : 0
      );
      const P = trumpPicker(L, tableTop, headerBottom);
      const bottom = P.top + P.height;

      // A 2×2 grid in portrait, one row in landscape, of buttons 64pt or more.
      expect(P.columns).toBe(portrait ? 2 : 4);
      expect(Math.min(TRUMP_BUTTON.width, TRUMP_BUTTON.height)).toBeGreaterThanOrEqual(64);
      expect(P.width).toBe(P.columns * TRUMP_BUTTON.width + (P.columns - 1) * P.gap);

      // In the trick circle.
      expect(P.left + P.width / 2).toBeCloseTo(L.trick.cx);
      expect(Math.abs(P.top + P.height / 2 - L.trick.cy)).toBeLessThanOrEqual(L.trick.r);

      // The header, North and your hand stay clear.
      expect(P.top).toBeGreaterThanOrEqual(portrait ? tableTop : headerBottom);
      if (portrait) expect(P.top).toBeGreaterThanOrEqual(northSeatBottom(L, tableTop));
      // Your hand, its previewed trumps lifted, keeps a gap.
      expect(bottom).toBeLessThanOrEqual(
        L.hand.cy - (L.cardH * handScale(L.profile)) / 2 - handLift(L) - 8
      );

      // East and West: their stacks along the edges, their seats above them.
      // Roomy portraits give the seats a column beside the picker; small
      // phones and landscape bring them in, so the picker sits below them.
      const stackReach = (sideStacks(L).backW * 110) / 78;
      expect(P.left).toBeGreaterThanOrEqual(insets.left + stackReach);
      expect(P.left + P.width).toBeLessThanOrEqual(width - insets.right - stackReach);
      if (portrait && !L.tight) {
        const tablet = L.profile.startsWith('tablet');
        const column = Math.min(tablet ? 150 : 112, (width - (tablet ? 200 : 156)) / 2 - 8);
        expect(P.left).toBeGreaterThanOrEqual(insets.left + column);
      } else {
        const seat = L.tight ? TIGHT_AVATAR : portrait ? 56 : 52;
        expect(P.top).toBeGreaterThanOrEqual(
          sideSeatTop(L, { tableTop, seatHeight: seat, headerBottom }) + seat
        );
      }
    });
  }
});

describe('a 32-character name in every seat stays in its own place (PID-232)', () => {
  // The header row (TABLE_HEADER) and the gap SeatLayer leaves under it.
  const HEADER = 61;
  const overlap = (a, b) =>
    a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  const handBox = (L, n) => {
    const left = handLeft(L, n);
    const cardW = L.cardW * handScale(L.profile);
    const cardH = L.cardH * handScale(L.profile);
    return {
      left,
      right: left + (n - 1) * handStep(L, n) + cardW * 1.03,
      top: L.hand.cy - cardH / 2 - handLift(L),
      bottom: L.hand.cy + cardH / 2,
    };
  };
  // Every pile, up to three cards each, as played around the trick circle.
  const playedCards = (L) =>
    ['north', 'east', 'south', 'west'].flatMap((rel) =>
      [0, 1, 2].map((i) => {
        const card = playedCardTarget(L, rel, i, 3);
        const [w, h] = [L.cardW * card.scale, L.cardH * card.scale];
        const [x, y] = rel === 'east' || rel === 'west' ? [h / 2, w / 2] : [w / 2, h / 2];
        return { left: card.x - x, right: card.x + x, top: card.y - y, bottom: card.y + y };
      })
    );
  const expectApart = (seats, others, label) => {
    const names = Object.keys(seats);
    for (const [i, a] of names.entries()) {
      for (const b of names.slice(i + 1)) {
        expect(overlap(seats[a], seats[b]), `${label}: ${a} and ${b}`).toBe(false);
      }
      for (const [other, box] of others) {
        expect(overlap(seats[a], box), `${label}: ${a} and ${other}`).toBe(false);
      }
    }
  };

  // A name that long fills its whole reach: each seat is drawn at its widest,
  // the dealer chip after the name included.
  for (const [width, height, insets] of [
    [640, 360, { top: 0, bottom: 0, left: 0, right: 0 }],
    [640, 360, { top: 0, bottom: 0, left: 48, right: 0 }],
    [640, 360, { top: 0, bottom: 0, left: 0, right: 48 }],
    [640, 360, { top: 0, bottom: 21, left: 0, right: 59 }],
    [844, 390, { top: 0, bottom: 21, left: 47, right: 47 }],
    [844, 390, { top: 0, bottom: 0, left: 0, right: 0 }],
    [932, 430, { top: 0, bottom: 21, left: 59, right: 59 }],
  ]) {
    it(`landscape ${width}×${height} ${JSON.stringify(insets)}`, () => {
      const L = computeLayout(width, height, insets);
      const size = AVATAR_SIZE[L.profile];
      const gap = seatNameGap(L.profile);
      const chipW = avatarParts(size).dealer.size + gap;
      const headerBottom = insets.top + HEADER + 8;
      const sideTop = sideSeatTop(L, { tableTop: insets.top, seatHeight: size, headerBottom });
      const menu = {
        left: width - insets.right - MENU_SLOT,
        right: width - insets.right - 12,
        top: 8,
        bottom: 8 + 44,
      };
      for (const dealer of ['north', 'east', 'south', 'west']) {
        for (const n of [1, 6, 9]) {
          // A tucked chip sits behind North's avatar, not after its name.
          const tucked = dealer === 'north' && northChipBehind(L, insets, n, chipW);
          const chip = (rel) =>
            rel === dealer && rel !== 'south' && !(rel === 'north' && tucked) ? chipW : 0;
          const seatW = (rel) =>
            size +
            gap +
            landscapeNameReach(L, rel, { insets, southCards: n, northBacks: n, chip: chip(rel) }) +
            chip(rel);
          const southLeft = insets.left + LANDSCAPE_SOUTH_LEFT;
          const northLeft = landscapeNorthLeft(L, insets, n);
          const eastRight = width - insets.right - 12;
          const seats = {
            south: {
              left: southLeft,
              right: southLeft + seatW('south'),
              top: L.hand.cy - size / 2,
              bottom: L.hand.cy + size / 2,
            },
            north: {
              left: northLeft - (tucked ? chipW : 0),
              right: northLeft + seatW('north'),
              top: insets.top + 8,
              bottom: insets.top + 8 + size,
            },
            east: { left: eastRight - seatW('east'), right: eastRight, top: sideTop },
            west: { left: insets.left + 12, right: insets.left + 12 + seatW('west'), top: sideTop },
          };
          seats.east.bottom = seats.west.bottom = sideTop + size;
          for (const seat of Object.values(seats)) {
            expect(seat.left).toBeGreaterThanOrEqual(insets.left);
            expect(seat.right).toBeLessThanOrEqual(width - insets.right);
          }
          expect(seats.east.top).toBeGreaterThanOrEqual(headerBottom);
          expectApart(
            seats,
            [
              ['hand', handBox(L, n)],
              ['menu', menu],
              ...playedCards(L).map((card) => ['a played card', card]),
            ],
            `dealer ${dealer}, ${n} cards`
          );
        }
      }
    });
  }

  // A 640×360 Android phone with its nav bar on the right: North's dealer
  // chip tucks behind the avatar, and its fan moves left, so a long name
  // still shows its first several letters.
  for (const right of [48, 59]) {
    it(`landscape 640×360, ${right}pt right inset, North dealing`, () => {
      const insets = { top: 0, bottom: 0, left: 0, right };
      const L = computeLayout(640, 360, insets);
      const size = AVATAR_SIZE[L.profile];
      const dealer = avatarParts(size).dealer;
      const chipW = dealer.size + seatNameGap(L.profile);
      for (const n of [1, 6, 9]) {
        const reach = landscapeNameReach(L, 'north', { insets, northBacks: n, chip: chipW });
        expect(reach).toBeGreaterThanOrEqual(NORTH_NAME_MIN);
        const northLeft = landscapeNorthLeft(L, insets, n);
        const labelRight = northLeft + size + seatNameGap(L.profile) + reach;
        expect(labelRight).toBeLessThanOrEqual(640 - right - MENU_SLOT - 8);
        if (!northChipBehind(L, insets, n, chipW)) continue;
        // PlayerAvatar draws a chip behind the avatar 6pt off it, centered on the row.
        const chip = {
          left: northLeft - 6 - dealer.size,
          right: northLeft - 6,
          top: 8 + size / 2 - dealer.size / 2,
          bottom: 8 + size / 2 + dealer.size / 2,
        };
        const menu = { left: 640 - right - MENU_SLOT, right: 640 - right - 12, top: 8, bottom: 52 };
        const fanW = northFanWidth(L.cardW, n);
        const fanLeft = 320 - landscapeNorthShift(L, insets, n) - fanW / 2;
        const fanTop = northFanTop(L, 0);
        const fan = {
          left: fanLeft,
          right: fanLeft + fanW,
          top: fanTop,
          bottom: fanTop + (northBackWidth(L.cardW) * 110) / 78,
        };
        expect(overlap(chip, menu)).toBe(false);
        expect(overlap(chip, fan)).toBe(false);
      }
    });
  }

  it('portrait 390×844', () => {
    const [width, height, insets] = [390, 844, { top: 47, bottom: 34, left: 0, right: 0 }];
    const tableTop = insets.top + HEADER;
    const dock = utilityDockReserve(height);
    const L = computeLayout(width, height, insets, HEADER, dock);
    // Avatar, level chip, name and status, as SeatLayer stacks them.
    const parts = avatarParts(AVATAR_SIZE[L.profile]);
    const stack =
      AVATAR_SIZE[L.profile] +
      parts.level.height +
      parts.level.bottom +
      3 +
      parts.name.lineHeight +
      parts.status.lineHeight;
    const center = { left: width / 2 - 78, right: width / 2 + 78 };
    const side = Math.min(112, (width - 156) / 2 - 8);
    const sideTop = sideSeatTop(L, {
      tableTop,
      seatHeight: stack,
      headerBottom: insets.top + HEADER + 8,
    });
    const northTop = northSeatBottom(L, tableTop) - stack;
    const southBottom = height - insets.bottom - dock - 8;
    const seats = {
      north: { ...center, top: northTop, bottom: northTop + stack },
      south: { ...center, top: southBottom - stack, bottom: southBottom },
      east: { left: width - side, right: width, top: sideTop, bottom: sideTop + stack },
      west: { left: 0, right: side, top: sideTop, bottom: sideTop + stack },
    };
    expect(seats.north.top).toBeGreaterThanOrEqual(tableTop);
    for (const n of [1, 6, 9]) {
      expectApart(
        seats,
        [['hand', handBox(L, n)], ...playedCards(L).map((card) => ['a played card', card])],
        `${n} cards`
      );
    }
  });
});
