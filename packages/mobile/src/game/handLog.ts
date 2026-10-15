/**
 * The hand as a list of plain lines, for the plaque's ticker and the hand log:
 * who bid what, trump, every card played, who took each trick and what the
 * server says it was worth, and how the hand scored. Built from one state
 * snapshot, so a reconnect rebuilds it whole. The server decides winners and
 * points; this only words them. Never throws on malformed state: a piece it
 * cannot read is left out.
 */
import type {
  Card,
  RelativePlayerView,
  ServerBid,
  ServerLastHand,
  Suit,
  TeamKey,
} from '@/types/game';
import type { Position } from '@/types/lobby';
import { getRankLabel, SUIT_SYMBOLS } from '@/utils/cards';

export type HandLogKind = 'bid' | 'trump' | 'play' | 'trick' | 'two' | 'result';

export type HandLogEntry = {
  /** Stable across snapshots: the same action keeps its id when the hand moves on. */
  id: string;
  kind: HandLogKind;
  /** Who acted, the part that may truncate on a narrow ticker; null for trump. */
  who: string | null;
  /** What they did; never truncated. */
  what: string;
  text: string;
  /** Your side's line; null for spectators and for trump. */
  ours: boolean | null;
  hand: number;
  /** The trick a play, take or 2 belongs to, from 1. */
  trick: number | null;
};

export type HandLogGroup = {
  hand: number;
  /** True once the server has scored the hand. */
  finished: boolean;
  entries: HandLogEntry[];
};

export type HandLogInput = {
  handNumber: number | null;
  /** The current hand's bids in the order made; unknown order shows no bids. */
  bids: ServerBid[] | null | undefined;
  trump: Suit | null;
  /** Finished tricks this hand, as the server sends them. */
  tricks: unknown;
  /** Plays of the trick in progress. */
  currentTrick: unknown;
  lastHand: ServerLastHand | null;
  players: Pick<RelativePlayerView, 'absolutePosition' | 'username' | 'isYou'>[];
};

type RawPlay = { player?: Position; position?: Position; card?: Card };
type RawTrick = {
  winner?: Position;
  points?: number;
  two_of_trump?: { position?: Position; points?: number } | null;
};

const POSITIONS = new Set<string>(['north', 'east', 'south', 'west']);
const isPosition = (value: unknown): value is Position =>
  typeof value === 'string' && POSITIONS.has(value);
const teamOf = (position: Position): TeamKey =>
  position === 'north' || position === 'south' ? 'north_south' : 'east_west';

function playsOf(trick: unknown): RawPlay[] {
  const plays = Array.isArray(trick)
    ? trick
    : trick && typeof trick === 'object'
      ? ((trick as { cards?: unknown; plays?: unknown }).cards ??
        (trick as { plays?: unknown }).plays)
      : null;
  return Array.isArray(plays) ? (plays as RawPlay[]) : [];
}

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);
const say = (who: string | null, what: string) => ({
  who,
  what,
  text: who ? `${who} ${what}` : what,
});

export function buildHandLog(input: HandLogInput): HandLogGroup[] {
  const you = input.players.find((player) => player.isYou);
  const yourTeam = you ? teamOf(you.absolutePosition) : null;
  const names = new Map<Position, string>();
  for (const player of input.players) {
    names.set(
      player.absolutePosition,
      player.isYou ? 'You' : (player.username ?? player.absolutePosition)
    );
  }
  const name = (position: Position) => names.get(position) ?? position;
  const ours = (team: TeamKey) => (yourTeam ? team === yourTeam : null);
  // "We" / "They" from your side; spectators see the table's sides.
  const side = (team: TeamKey) =>
    yourTeam ? (team === yourTeam ? 'We' : 'They') : team === 'north_south' ? 'N/S' : 'E/W';

  const handEntries = (
    hand: number,
    bids: ServerBid[] | null | undefined,
    trump: Suit | null | undefined,
    tricks: unknown,
    currentTrick: unknown
  ): HandLogEntry[] => {
    const entries: HandLogEntry[] = [];
    for (const bid of Array.isArray(bids) ? bids : []) {
      if (!isPosition(bid?.position)) continue;
      const pass = bid.amount === 'pass';
      if (!pass && typeof bid.amount !== 'number') continue;
      entries.push({
        id: `bid-${hand}-${bid.position}`,
        kind: 'bid',
        ...say(name(bid.position), pass ? 'passed' : `bid ${bid.amount}`),
        ours: ours(teamOf(bid.position)),
        hand,
        trick: null,
      });
    }
    if (trump && SUIT_SYMBOLS[trump]) {
      entries.push({
        id: `trump-${hand}`,
        kind: 'trump',
        ...say(null, `Trump ${SUIT_SYMBOLS[trump]}`),
        ours: null,
        hand,
        trick: null,
      });
    }

    const addPlays = (plays: RawPlay[], trick: number) => {
      plays.forEach((play, index) => {
        const position = play?.player ?? play?.position;
        if (!isPosition(position) || !play.card) return;
        const verb = names.get(position) === 'You' ? 'play' : 'plays';
        entries.push({
          id: `play-${hand}-${trick}-${index}`,
          kind: 'play',
          ...say(
            name(position),
            `${verb} ${getRankLabel(play.card.rank)}${SUIT_SYMBOLS[play.card.suit] ?? ''}`
          ),
          ours: ours(teamOf(position)),
          hand,
          trick,
        });
      });
    };

    const finished = (Array.isArray(tricks) ? tricks : []).filter(
      (trick) => playsOf(trick).length > 0
    );
    finished.forEach((raw, index) => {
      const trick = index + 1;
      addPlays(playsOf(raw), trick);
      const meta = raw as RawTrick;
      if (isPosition(meta.winner)) {
        const team = teamOf(meta.winner);
        const points = typeof meta.points === 'number' ? meta.points : 0;
        entries.push({
          id: `trick-${hand}-${trick}`,
          kind: 'trick',
          ...say(side(team), points > 0 ? `took it +${points}` : 'took it'),
          ours: ours(team),
          hand,
          trick,
        });
      }
      const two = meta.two_of_trump;
      if (two && isPosition(two.position) && typeof two.points === 'number') {
        const holder = names.get(two.position) === 'You' ? 'Your' : `${name(two.position)}'s`;
        entries.push({
          id: `two-${hand}-${trick}`,
          kind: 'two',
          ...say(holder, `2 +${two.points}`),
          ours: ours(teamOf(two.position)),
          hand,
          trick,
        });
      }
    });
    addPlays(playsOf(currentTrick), finished.length + 1);
    return entries;
  };

  const resultEntry = (last: ServerLastHand): HandLogEntry => {
    const team = last.bidding_team;
    const outcome = last.made ? 'made it' : 'were set';
    return {
      id: `result-${last.hand_number}`,
      kind: 'result',
      ...say(side(team), `${outcome} ${signed(last.delta?.[team] ?? 0)}`),
      ours: ours(team),
      hand: last.hand_number,
      trick: null,
    };
  };

  const hand = input.handNumber ?? 0;
  const last = input.lastHand;
  const groups: HandLogGroup[] = [];
  const current = handEntries(hand, input.bids, input.trump, input.tricks, input.currentTrick);

  if (last && last.hand_number < hand) {
    // The server has reset for the next hand; the last hand carries itself.
    groups.push({
      hand: last.hand_number,
      finished: true,
      entries: [
        ...handEntries(last.hand_number, last.bids, last.trump, last.tricks, null),
        resultEntry(last),
      ],
    });
  }
  const sameHandScored = !!last && last.hand_number === hand;
  if (current.length > 0 || sameHandScored) {
    groups.push({
      hand,
      finished: sameHandScored,
      // At game end there is no reset: the result closes the hand still on the table.
      entries: sameHandScored && last ? [...current, resultEntry(last)] : current,
    });
  }
  return groups;
}

export function handLogEntries(groups: HandLogGroup[]): HandLogEntry[] {
  return groups.flatMap((group) => group.entries);
}
