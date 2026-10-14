import { describe, expect, it } from 'bun:test';
import { avatarLabel, avatarParts } from '../../src/features/avatar';

describe('avatar parts by size', () => {
  it('matches the profile avatar on the board', () => {
    const parts = avatarParts(150);
    expect(parts.ring).toBe(6);
    expect(parts.pin).toMatchObject({ size: 48, right: -8, top: 2 });
    expect(parts.level).toMatchObject({ minWidth: 52, height: 28, fontSize: 15 });
    expect(parts.dealer).toMatchObject({ size: 36, left: -14, bottom: 6 });
    expect(parts.turn).toEqual({ radius: 88, stroke: 4 });
  });

  it('matches the table seat on the board', () => {
    const parts = avatarParts(56);
    expect(parts.ring).toBe(3);
    expect(parts.pin?.size).toBe(20);
    expect(parts.level).toMatchObject({ minWidth: 26, height: 18, fontSize: 10, bottom: -9 });
    expect(parts.dealer?.size).toBe(22);
    expect(parts.turn).toEqual({ radius: 34, stroke: 3.5 });
    expect(parts.gem).toBe(12);
  });

  it('keeps every other board size', () => {
    expect(avatarParts(104)).toMatchObject({
      ring: 5,
      pin: { size: 36 },
      level: { minWidth: 42, height: 24, fontSize: 13 },
    });
    expect(avatarParts(64)).toMatchObject({
      ring: 3.5,
      pin: { size: 24 },
      level: { minWidth: 30, height: 20, fontSize: 11 },
      dealer: { size: 26 },
    });
    expect(avatarParts(44)).toMatchObject({
      ring: 2.5,
      pin: { size: 17 },
      level: { minWidth: 22, height: 16, fontSize: 9 },
      dealer: { size: 19 },
    });
  });

  it('interpolates between board sizes instead of snapping to one', () => {
    const parts = avatarParts(48);
    expect(parts.ring).toBe(2.5);
    expect(parts.pin?.size).toBe(18);
    expect(parts.level?.minWidth).toBe(23);
    expect(parts.dealer?.size).toBe(20);
  });

  it('drops the level and dealer at 36 but keeps the pin', () => {
    const parts = avatarParts(36);
    expect(parts.ring).toBe(2);
    expect(parts.pin?.size).toBe(15);
    expect(parts.level).toBeNull();
    expect(parts.dealer).toBeNull();
  });

  it('is the ring alone at 24', () => {
    expect(avatarParts(24)).toMatchObject({
      ring: 1.5,
      pin: null,
      gem: null,
      level: null,
      dealer: null,
      turn: null,
    });
  });

  it('grows in proportion above the largest board size', () => {
    expect(avatarParts(300)).toMatchObject({ ring: 12, pin: { size: 96 }, dealer: { size: 72 } });
  });

  it('switches name and status to iPad type at 64', () => {
    expect(avatarParts(56).name).toEqual({ fontSize: 13, lineHeight: 16 });
    expect(avatarParts(64).status).toEqual({ fontSize: 13, lineHeight: 17 });
  });
});

describe('avatar label', () => {
  it('says the seat in one sentence', () => {
    expect(
      avatarLabel({
        name: 'Kalle',
        dealer: true,
        level: 18,
        pin: 'founding_tester',
        status: 'Plays nine of hearts',
      })
    ).toBe('Kalle, dealer, level 18, Founding Tester, plays nine of hearts');
  });

  it('names the turn and an urgent turn', () => {
    expect(avatarLabel({ name: 'Mikko', turn: {} })).toBe('Mikko, their turn');
    expect(avatarLabel({ name: 'Mikko', turn: { urgent: true } })).toBe(
      'Mikko, their turn, almost out of time'
    );
  });

  it('says why a seat is away when no status says it', () => {
    expect(avatarLabel({ name: 'Jussi', away: 'reconnecting' })).toBe('Jussi, reconnecting');
    expect(avatarLabel({ name: 'Jussi', away: 'bot', status: 'Bot is playing' })).toBe(
      'Jussi, bot is playing'
    );
  });

  it('names a bot seat and an open seat with no name', () => {
    expect(avatarLabel({ kind: 'bot', status: 'Bid 7' })).toBe('Bot, bid 7');
    expect(avatarLabel({ kind: 'open' })).toBe('Open seat');
  });

  it('keeps level 0', () => {
    expect(avatarLabel({ name: 'New', level: 0 })).toBe('New, level 0');
  });
});
