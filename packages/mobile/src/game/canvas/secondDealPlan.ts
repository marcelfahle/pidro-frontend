/**
 * The second deal, frame by frame (`useSecondDealPresentation` plays them):
 * every seat throws down to its trumps in one swoop, the dealer gives each
 * seat its cards in one packet from the dealer's left, then takes the rest
 * of the pack. Pure: built only from the server's counts and hands.
 */
import type { RelativePosition } from './layout';
import type { TableCard, TableModel } from './tableModel';
import {
  SECOND_DEAL_CARD_MS,
  SECOND_DEAL_PACK,
  SECOND_DEAL_PACK_MS,
  SECOND_DEAL_ROB_CARD_MS,
  SECOND_DEAL_SETTLE_MS,
  SECOND_DEAL_START_MS,
  SECOND_DEAL_THROW_MS,
} from './animationTiming';

export const CLOCKWISE: RelativePosition[] = ['north', 'east', 'south', 'west'];
export const BEFORE = new Set(['bidding', 'declaring', 'discarding']);
export const AFTER = new Set(['second_deal', 'playing']);
export const DEALT = 9;

export type Counts = Partial<Record<RelativePosition, number>>;

/** What the table shows while the second deal plays out. */
export type SecondDealShow = {
  /** Cards still in the pack in the middle. */
  pack: number;
  /** Cards each seat has thrown face down in front of it. */
  thrown: Counts;
};

export type Frame = SecondDealShow & {
  /** Cards each seat has been given so far. */
  drawn: Counts;
  /** Backs in each opponent's hand. */
  hand: Counts;
  /** How long this frame holds before the next. */
  ms: number;
};

export type Plan = {
  frames: Frame[];
  /** Your own hand: what you threw, in order, and what you were given. */
  yourThrown: TableCard[] | null;
  yourDrawn: TableCard[] | null;
};

export function makePlan(model: TableModel, held: TableCard[] | null): Plan | null {
  const dealer = model.dealerRelative;
  if (!dealer) return null;
  const kept: Counts = {};
  const drawn: Counts = {};
  for (const rel of CLOCKWISE) {
    const seat = model.seats[rel];
    if (!seat) continue;
    if (!seat.secondDeal) {
      if (rel === 'south') continue;
      return null;
    }
    kept[rel] = seat.secondDeal.kept;
    if (rel !== dealer) drawn[rel] = seat.secondDeal.drawn ?? 0;
  }
  // Your own cards say what you threw and drew: the ones you held stay.
  let yourThrown: TableCard[] | null = null;
  let yourDrawn: TableCard[] | null = null;
  if (dealer !== 'south' && held && held.length > 0 && model.yourHand.length > 0) {
    const now = new Set(model.yourHand.map((card) => card.textureKey));
    const before = new Set(held.map((card) => card.textureKey));
    yourThrown = held.filter((card) => !now.has(card.textureKey));
    yourDrawn = model.yourHand.filter((card) => !before.has(card.textureKey));
    kept.south = held.length - yourThrown.length;
    drawn.south = yourDrawn.length;
  }
  if (kept.south == null) kept.south = model.seats.south?.secondDeal?.kept ?? DEALT;

  const start = CLOCKWISE.indexOf(dealer) + 1;
  const order: RelativePosition[] = [];
  for (let i = 0; i < 3; i++) {
    const rel = CLOCKWISE[(start + i) % 4];
    for (let n = 0; n < (drawn[rel] ?? 0); n++) order.push(rel);
  }
  // While a dealer picks by hand the server shows their whole pool; once
  // they have picked, the pack is what the others left.
  const dealerSeat = model.seats[dealer];
  const pool =
    model.phase === 'second_deal' && dealer !== 'south' ? (dealerSeat?.cardCount ?? null) : null;
  const rob =
    pool != null
      ? Math.max(0, pool - (kept[dealer] ?? 0))
      : Math.max(0, SECOND_DEAL_PACK - order.length);

  const frames: Frame[] = [];
  const hand: Counts = {};
  const thrown: Counts = {};
  const given: Counts = {};
  for (const rel of CLOCKWISE) {
    if (!model.seats[rel]) continue;
    hand[rel] = DEALT;
    thrown[rel] = 0;
  }
  let pack = 0;
  const push = (ms: number) =>
    frames.push({ hand: { ...hand }, thrown: { ...thrown }, drawn: { ...given }, pack, ms });

  push(SECOND_DEAL_START_MS);
  // Everyone throws down to their trumps at once, each in one swoop.
  for (const rel of CLOCKWISE) {
    if (hand[rel] == null) continue;
    thrown[rel] = DEALT - (kept[rel] ?? DEALT);
    hand[rel] = kept[rel] ?? DEALT;
  }
  push(SECOND_DEAL_THROW_MS);
  // The pack waits in its corner, then the dealer gives each seat its cards
  // in one packet, from the dealer's left.
  pack = order.length + rob;
  push(SECOND_DEAL_PACK_MS);
  for (let i = 0; i < 3; i++) {
    const rel = CLOCKWISE[(start + i) % 4];
    const n = drawn[rel] ?? 0;
    if (n === 0) continue;
    hand[rel] = (hand[rel] ?? 0) + n;
    given[rel] = n;
    pack -= n;
    push(SECOND_DEAL_CARD_MS);
  }
  // The dealer takes the rest of the pack in one go, then throws down to six.
  if (rob > 0) {
    hand[dealer] = (hand[dealer] ?? 0) + rob;
    pack -= rob;
    push(SECOND_DEAL_ROB_CARD_MS);
  }
  frames[frames.length - 1].ms = SECOND_DEAL_SETTLE_MS;
  return { frames, yourThrown, yourDrawn };
}
