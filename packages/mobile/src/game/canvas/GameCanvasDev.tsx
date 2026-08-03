/**
 * DEV harness — renders the Skia table with a mock model + real card textures and
 * a LOCAL fake server so M2/M3 are provable on web without Phoenix. It exercises:
 *   mount → deal-in (stagger) → trump declared (glyph pop) → you play (fly to trick)
 *   → opponents follow (fly from seats) → trick completes and remains on the table.
 * The turn halo pulses on the active seat throughout.
 * Throwaway scaffold.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GameCanvas from './GameCanvas';
import { SeatLayer } from './SeatLayer';
import { Scoreboard } from './Scoreboard';
import { TableChromeBars, useTableReserves } from './TableChrome';
import { useCardTextures } from './cardTextures';
import { buildTableModel } from './tableModel';
import { useHandPresentationReady } from './useHandPresentationReady';
import type { Card, LegalAction, RelativePlayerView, RelativePosition, Suit } from '@/types/game';
import type { Position } from '@/types/lobby';

const seat = (
  abs: Position,
  rel: RelativePlayerView['relativePosition'],
  extra: Partial<RelativePlayerView>
): RelativePlayerView => ({
  absolutePosition: abs,
  relativePosition: rel,
  playerId: `p-${abs}`,
  username: extra.username ?? abs,
  isYou: false,
  isTeammate: false,
  isOpponent: true,
  isConnected: true,
  isCurrentTurn: false,
  seatStatus: 'normal',
  ...extra,
});

const basePlayers = (turn: RelativePosition): RelativePlayerView[] => [
  seat('south', 'south', {
    username: 'You',
    isYou: true,
    isOpponent: false,
    isCurrentTurn: turn === 'south',
  }),
  seat('north', 'north', {
    username: 'Nora',
    isTeammate: true,
    isCurrentTurn: turn === 'north',
  }),
  seat('east', 'east', { username: 'Eli', isCurrentTurn: turn === 'east' }),
  seat('west', 'west', { username: 'Wynn', isCurrentTurn: turn === 'west' }),
];

const INITIAL_HAND: Card[] = [
  { suit: 'spades', rank: 14 },
  { suit: 'spades', rank: 7 },
  { suit: 'hearts', rank: 13 },
  { suit: 'diamonds', rank: 11 },
  { suit: 'clubs', rank: 12 },
  { suit: 'hearts', rank: 2 },
];

// Demo cards the opponents "play" to complete a trick.
const OPP_PLAYS: { player: Position; card: Card }[] = [
  { player: 'west', card: { suit: 'diamonds', rank: 5 } },
  { player: 'north', card: { suit: 'clubs', rank: 7 } },
  { player: 'east', card: { suit: 'hearts', rank: 4 } },
];

const COUNTS: Record<string, number> = { south: 6, north: 8, east: 8, west: 7 };
type Play = { player: Position; card: Card };
const sameCard = (a: Card, b: Card) => a.suit === b.suit && a.rank === b.rank;

export type GameCanvasDevProps = {
  onHandPresentationReadyChange?: (ready: boolean) => void;
  autoPlay?: boolean;
};

export default function GameCanvasDev({
  onHandPresentationReadyChange,
  autoPlay = false,
}: GameCanvasDevProps) {
  const textures = useCardTextures();
  const insets = useSafeAreaInsets();
  const reserves = useTableReserves();
  const { topReserve, bottomReserve } = reserves;
  const [hand, setHand] = useState<Card[]>([]);
  const [trick, setTrick] = useState<Play[]>([]);
  const [tricks, setTricks] = useState<Play[][]>([]);
  const [trump, setTrump] = useState<Suit | null>(null);
  const [turn, setTurn] = useState<RelativePosition>('south');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const playing = useRef(false);

  const after = useCallback((ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  // Deal on mount, then declare trump (glyph pop).
  useEffect(() => {
    after(450, () => setHand(INITIAL_HAND));
    after(1300, () => setTrump('spades'));
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, [after]);

  // Fake server: legal = trumps (spades) + K♥ still in hand → others stay dimmed.
  const legalActions = useMemo<LegalAction[]>(
    () =>
      hand
        .filter((c) => c.suit === 'spades' || (c.suit === 'hearts' && c.rank === 13))
        .map((c) => ({ type: 'play_card', card: c })),
    [hand]
  );

  const onPlayCard = useCallback(
    (card: Card) => {
      if (playing.current) return;
      playing.current = true;
      const trickCards = [{ player: 'south' as Position, card }, ...OPP_PLAYS];
      setHand((h) => h.filter((c) => !sameCard(c, card)));
      setTurn('east');
      setTrick([trickCards[0]]);
      // opponents follow, flying in from their seats
      after(550, () => setTrick(trickCards.slice(0, 2)));
      after(1100, () => setTrick(trickCards.slice(0, 3)));
      after(1650, () => setTrick(trickCards));
      // Trick completes → cards stay on table as round history.
      after(2450, () => {
        setTricks((t) => [...t, trickCards]);
        setTrick([]);
        setTurn('north');
      });
    },
    [after]
  );

  const players = useMemo(() => basePlayers(turn), [turn]);
  const canPlay = turn === 'south' && hand.length > 0 && !trick.some((p) => p.player === 'south');

  const model = useMemo(
    () =>
      buildTableModel({
        phase: 'playing',
        trumpSuit: trump,
        players,
        yourHand: hand,
        yourCardCount: hand.length,
        currentTrick: trick,
        tricks,
        legalActions,
        currentTurnRelative: turn,
        canPlay,
        getCardCountForPlayer: (abs) => (abs ? (COUNTS[abs] ?? null) : null),
      }),
    [hand, trick, tricks, legalActions, trump, players, turn, canPlay]
  );
  const isHandReady = useHandPresentationReady(model.yourHand, textures);

  useEffect(() => {
    onHandPresentationReadyChange?.(isHandReady);
  }, [isHandReady, onHandPresentationReadyChange]);

  useEffect(() => {
    if (!autoPlay || !isHandReady) return;
    onPlayCard(INITIAL_HAND[0]);
  }, [autoPlay, isHandReady, onPlayCard]);

  return (
    <View style={{ flex: 1 }}>
      <GameCanvas
        model={model}
        textures={textures}
        onPlayCard={onPlayCard}
        topReserve={topReserve}
        bottomReserve={bottomReserve}
      />
      <SeatLayer
        seats={model.seats}
        dealerRel="south"
        topReserve={topReserve}
        bottomReserve={bottomReserve}
        statusByRel={{
          north: 'Passed',
          east: 'Bet 6',
          west: 'Passed',
          south: 'Passed',
        }}
      />
      <TableChromeBars reserves={reserves} />
      <Scoreboard
        scores={{ north_south: 36, east_west: 29 }}
        youPosition="south"
        handNumber={4}
        roomCode="DEV01"
        top={insets.top}
        left={insets.left}
      />
    </View>
  );
}
