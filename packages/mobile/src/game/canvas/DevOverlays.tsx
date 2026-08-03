/**
 * DEV harness overlays — renders the M4 RN overlays over the Skia canvas with mock
 * data, selected by `?phase=` on /table-dev, so each overlay is screenshot-verifiable
 * over the blue felt without a live Phoenix game. Pure RN (no Skia import).
 * Throwaway scaffold.
 *   ?phase=playing|bidding|declaring|second_deal|game_over
 */
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type {
  Card,
  GameViewModel,
  RelativePlayerView,
  ServerGameState,
  ServerPlayerView,
} from '@/types/game';
import type { Position } from '@/types/lobby';
import { useGameStore } from '@/stores/game';
import { ConnectionBanner } from '@/components/ui/ConnectionBanner';
import { BiddingActions } from '@/components/game/BiddingActions';
import { TrumpSelectionModal } from '@/components/game/TrumpSelectionModal';
import { HandSelector } from '@/components/game/HandSelector';
import { GameOverOverlay } from '@/components/game/GameOverOverlay';

const noop = () => {};

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

const PLAYERS: RelativePlayerView[] = [
  seat('south', 'south', { username: 'You', isYou: true, isOpponent: false, isCurrentTurn: true }),
  seat('north', 'north', { username: 'Nora', isTeammate: true }),
  seat('east', 'east', { username: 'Eli' }),
  seat('west', 'west', { username: 'Wynn' }),
];

const VM: GameViewModel = {
  roomCode: 'DEV01',
  phase: 'playing',
  viewerPositionAbsolute: 'south',
  trumpSuit: 'spades',
  dealerAbsolute: 'north',
  dealerRelative: 'north',
  currentTurnAbsolute: 'south',
  currentTurnRelative: 'south',
  players: PLAYERS,
};

const SERVER_PLAYERS: Record<Position, ServerPlayerView> = {
  north: { card_count: 9 },
  east: { card_count: 9 },
  south: { card_count: 9 },
  west: { card_count: 9 },
};

const SCORES = { north_south: 42, east_west: 31 };

const GAME_OVER_SERVER: ServerGameState = {
  phase: 'game_over',
  winner: 'north_south',
  current_player: null,
  players: SERVER_PLAYERS,
  scores: SCORES,
  round_number: 7,
};

const BIDDING_SERVER: ServerGameState = {
  phase: 'bidding',
  current_player: 'south',
  players: SERVER_PLAYERS,
  current_bid: 6,
  highest_bid: { position: 'north', amount: 6 },
  bids: { north: 6, east: 'pass', south: 7, west: 'pass' },
  scores: { north_south: 0, east_west: 0 },
  round_number: 1,
};

const HAND6: Card[] = [
  { suit: 'spades', rank: 14 },
  { suit: 'spades', rank: 11 },
  { suit: 'spades', rank: 5 },
  { suit: 'hearts', rank: 13 },
  { suit: 'diamonds', rank: 10 },
  { suit: 'clubs', rank: 12 },
];

const HAND12: Card[] = [
  { suit: 'spades', rank: 14 },
  { suit: 'spades', rank: 11 },
  { suit: 'spades', rank: 5 },
  { suit: 'spades', rank: 2 },
  { suit: 'hearts', rank: 13 },
  { suit: 'hearts', rank: 10 },
  { suit: 'hearts', rank: 5 },
  { suit: 'diamonds', rank: 14 },
  { suit: 'diamonds', rank: 9 },
  { suit: 'clubs', rank: 12 },
  { suit: 'clubs', rank: 7 },
  { suit: 'clubs', rank: 3 },
];

export function DevOverlays({ phase, isHandReady }: { phase: string; isHandReady: boolean }) {
  const insets = useSafeAreaInsets();

  // Seed the store so the store-driven BiddingActions shows in dev (no Phoenix).
  useEffect(() => {
    if (phase !== 'bidding') return;
    const prev = useGameStore.getState();
    // Realistic legal set: every raise above the current bid (6) up to 14.
    useGameStore.setState({
      serverState: BIDDING_SERVER,
      legalActions: [
        ...([7, 8, 9, 10, 11, 12, 13, 14] as const).map(
          (amount) => ({ type: 'bid', amount }) as const
        ),
        { type: 'pass' },
      ],
    });
    return () =>
      useGameStore.setState({ serverState: prev.serverState, legalActions: prev.legalActions });
  }, [phase]);

  return (
    <>
      {/* Scoreboard lives on the canvas now; just the connection banner floats here. */}
      <View style={[styles.topStack, { paddingTop: insets.top }]} pointerEvents="box-none">
        <ConnectionBanner isConnected />
      </View>

      {phase === 'bidding' && <BiddingActions isYourTurn isHandReady={isHandReady} />}

      {phase === 'declaring' && (
        <TrumpSelectionModal isOpen onSelectTrump={async () => {}} cards={HAND6} />
      )}

      {phase === 'second_deal' && (
        <View
          style={[
            styles.centerOverlay,
            { paddingTop: insets.top + 64, paddingBottom: insets.bottom + 16 },
          ]}
          pointerEvents="box-none">
          <HandSelector viewModel={VM} cards={HAND12} trumpSuit="spades" onSelectHand={noop} />
        </View>
      )}

      {phase === 'game_over' && (
        <GameOverOverlay
          viewModel={VM}
          serverState={GAME_OVER_SERVER}
          onBackToLobby={noop}
          onPlayAgain={noop}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  topStack: { position: 'absolute', top: 0, left: 0, right: 0, gap: 8 },
  centerOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
});
