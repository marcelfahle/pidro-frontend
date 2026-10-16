/**
 * What the end-of-hand panel shows (PID-236), read from the viewer's seat: the
 * bid, how it went, and the point cards each team took. The server says what
 * every card was worth and who kept it; this only sorts it into the trays.
 */
import type { Card, ServerLastHand, Suit, TeamKey } from '@/types/game';
import type { Position } from '@/types/lobby';
import { PIDRO_POINTS, type PointsSide } from './points';

/** How long the panel stays: a missed bid of ours is not lingered on. */
export const HAND_RESULT_MS = 3000;
export const HAND_MISSED_MS = 2000;

export type HandOutcome =
  | 'we-made'
  | 'we-missed'
  | 'they-made'
  | 'they-missed'
  // A spectator takes no side.
  | 'made'
  | 'missed';

export type HandResultTray = {
  team: TeamKey;
  side: PointsSide;
  points: number;
  cards: { card: Card; points: number }[];
};

export type HandResultView = {
  outcome: HandOutcome;
  /** Only our made bid is gold and stamped in; everything else is quiet. */
  loud: boolean;
  headline: { key: 'game.made_it' } | { key: 'game.missed_by'; n: number };
  bidder: Position;
  bid: number;
  trump: Suit | null;
  /** What the bidders won. */
  won: number;
  /** When they missed: the player on our team who took a five. */
  pidro: Position | null;
  /** Us then them; N/S then E/W for a spectator. */
  trays: [HandResultTray, HandResultTray];
  closeMs: number;
};

const teamOf = (position: Position): TeamKey =>
  position === 'north' || position === 'south' ? 'north_south' : 'east_west';
const other = (team: TeamKey): TeamKey => (team === 'north_south' ? 'east_west' : 'north_south');

export function handResultView(hand: ServerLastHand, viewer: Position | null): HandResultView {
  const us = viewer ? teamOf(viewer) : 'north_south';
  const ours = hand.bidding_team === us;
  const outcome: HandOutcome = !viewer
    ? hand.made
      ? 'made'
      : 'missed'
    : `${ours ? 'we' : 'they'}-${hand.made ? 'made' : 'missed'}`;
  const won = hand.captured[hand.bidding_team];
  const pointCards = hand.point_cards ?? [];
  const tray = (team: TeamKey): HandResultTray => ({
    team,
    side: !viewer ? 'neutral' : team === us ? 'ours' : 'theirs',
    points: hand.captured[team],
    cards: pointCards
      .filter((pointCard) => pointCard.team === team)
      .map(({ card, points }) => ({ card, points })),
  });
  const ourFive =
    outcome === 'they-missed'
      ? pointCards.find((pointCard) => pointCard.team === us && pointCard.points >= PIDRO_POINTS)
      : undefined;
  return {
    outcome,
    loud: outcome === 'we-made',
    headline: hand.made ? { key: 'game.made_it' } : { key: 'game.missed_by', n: hand.bid - won },
    bidder: hand.bidder,
    bid: hand.bid,
    trump: hand.trump ?? null,
    won,
    pidro: ourFive?.position ?? null,
    trays: [tray(us), tray(other(us))],
    closeMs: outcome === 'we-missed' ? HAND_MISSED_MS : HAND_RESULT_MS,
  };
}
