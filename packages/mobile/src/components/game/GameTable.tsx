import { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { Background } from '@/components/ui/Background';
import type { Room, Position } from '@/types/lobby';
import type { Card, RelativePosition, Suit } from '@/types/game';
import { useGameStore, useGameViewModel } from '@/stores/game';
import { pushGameAction, type ProgressionSummary } from '@/channels/hooks/useGameChannel';
import { useShallow } from 'zustand/react/shallow';
import { PlayerHand } from '@/components/game/PlayerHand';
import { TrickArea } from '@/components/game/TrickArea';
import { TrumpSelectionModal } from '@/components/game/TrumpSelectionModal';
import { HandSelector } from '@/components/game/HandSelector';
import { GameInfoBar } from '@/components/game/GameInfoBar';
import { GameOverOverlay } from '@/components/game/GameOverOverlay';
import { PlayerAvatar } from '@/components/game/PlayerAvatar';
import { ConnectionBanner } from '@/components/ui/ConnectionBanner';
import { BiddingActions } from '@/components/game/BiddingActions';
import { SUIT_SYMBOLS, getRankLabel } from '@/utils/cards';

interface GameTableProps {
  room: Room;
  progressionSummary?: ProgressionSummary | null;
  onLeave: () => void;
  onPlayAgain?: (room: Room) => void;
}

const COLORS = {
  white: '#ffffff',
  white90: 'rgba(255, 255, 255, 0.9)',
  white80: 'rgba(255, 255, 255, 0.8)',
  white70: 'rgba(255, 255, 255, 0.7)',
  white60: 'rgba(255, 255, 255, 0.6)',
  white50: 'rgba(255, 255, 255, 0.5)',
  white15: 'rgba(255, 255, 255, 0.15)',
  white10: 'rgba(255, 255, 255, 0.1)',
  white05: 'rgba(255, 255, 255, 0.05)',
  black30: 'rgba(0, 0, 0, 0.3)',
  blue200: 'rgb(191, 219, 254)',
  blue200_70: 'rgba(191, 219, 254, 0.7)',
  blue500: 'rgb(59, 130, 246)',
  blue500_90: 'rgba(59, 130, 246, 0.9)',
  emerald500_70: 'rgba(16, 185, 129, 0.7)',
  yellow200: 'rgb(254, 240, 138)',
  yellow300: 'rgb(253, 224, 71)',
  yellow300_80: 'rgba(253, 224, 71, 0.8)',
  yellow400_20: 'rgba(250, 204, 21, 0.2)',
  red400: 'rgb(248, 113, 113)',
  red500_20: 'rgba(239, 68, 68, 0.2)',
  red500_30: 'rgba(239, 68, 68, 0.3)',
  slate500: 'rgb(100, 116, 139)',
  slate600: 'rgb(71, 85, 105)',
  purple900_40: 'rgba(88, 28, 135, 0.4)',
  purple800_30: 'rgba(107, 33, 168, 0.3)',
  purple900_30: 'rgba(88, 28, 135, 0.3)',
};

function AdBanner() {
  return (
    <View style={styles.adBanner}>
      <View style={styles.adContent}>
        <Text style={styles.adTitle}>🃏 Pidro Pro</Text>
        <Text style={styles.adSubtitle}>No ads • Exclusive themes</Text>
      </View>
      <View style={styles.adButton}>
        <Text style={styles.adButtonText}>Upgrade</Text>
      </View>
    </View>
  );
}

function TurnIndicator({
  currentTurnRelative,
  isYourTurn,
}: {
  currentTurnRelative: RelativePosition | null;
  isYourTurn: boolean;
}) {
  if (!currentTurnRelative) return null;

  return (
    <View style={styles.turnIndicator}>
      <Text style={[styles.turnIndicatorText, isYourTurn && styles.turnIndicatorTextYours]}>
        {isYourTurn ? 'Your turn!' : `${currentTurnRelative}'s turn`}
      </Text>
    </View>
  );
}

// BiddingActions extracted to ./BiddingActions.tsx (shared by legacy + Skia tables).

// TODO(controller-retrofit): migrate this table's derivations + handlers to
// useGameTableController (src/game/useGameTableController) so the legacy and Skia
// tables share one source of truth. Deferred to keep the reference table stable.
export function GameTable({ room, progressionSummary, onLeave, onPlayAgain }: GameTableProps) {
  const insets = useSafeAreaInsets();
  const viewModel = useGameViewModel();
  const roomTitle = room.name || room.metadata?.name || room.code;
  const { serverState, youPositionAbs, isChannelJoined } = useGameStore(
    useShallow((state) => ({
      serverState: state.serverState,
      youPositionAbs: state.youPositionAbs,
      isChannelJoined: state.isChannelJoined,
    }))
  );
  const hasViewModel = Boolean(viewModel);
  const phase = viewModel?.phase ?? 'bidding';
  const trumpSuit = viewModel?.trumpSuit ?? null;
  const players = viewModel?.players ?? [];
  const currentTurnRelative = viewModel?.currentTurnRelative ?? null;

  const yourHand = useMemo(() => {
    if (!serverState || !youPositionAbs) return null;
    const hand = serverState.players?.[youPositionAbs]?.hand;
    // Only return if it's an array (your own cards), not a number (masked count)
    return Array.isArray(hand) ? hand : null;
  }, [serverState, youPositionAbs]);

  const yourCardCount = useMemo(() => {
    if (!serverState || !youPositionAbs) return null;
    const view = serverState.players?.[youPositionAbs];
    if (!view) return null;
    const { hand, card_count } = view;
    if (Array.isArray(hand)) return hand.length;
    if (typeof hand === 'number') return hand;
    if (typeof card_count === 'number') return card_count;
    return null;
  }, [serverState, youPositionAbs]);

  const currentTrick = useMemo(() => {
    if (!serverState) return null;
    const trick = (serverState as unknown as Record<string, unknown>).current_trick;
    if (!trick) return null;
    if (typeof trick === 'object' && 'plays' in (trick as object)) {
      return (trick as { plays: unknown }).plays;
    }
    return trick;
  }, [serverState]);

  const [isPlayingCard, setIsPlayingCard] = useState(false);

  const getByRelative = (rel: RelativePosition) => players.find((p) => p.relativePosition === rel);

  const south = getByRelative('south');
  const north = getByRelative('north');
  const east = getByRelative('east');
  const west = getByRelative('west');

  const isYourTurn = south?.isCurrentTurn ?? false;

  const getCardCountForPlayer = useCallback(
    (absPosition: Position | null): number | null => {
      if (!absPosition || !serverState?.players) return null;
      const view = serverState.players[absPosition];
      if (!view) return null;
      const { hand, card_count } = view;
      if (typeof hand === 'number') return hand;
      if (Array.isArray(hand)) return hand.length;
      if (typeof card_count === 'number') return card_count;
      return null;
    },
    [serverState]
  );

  const getLastMoveForPlayer = useCallback(
    (absPosition: Position | null) => {
      if (!absPosition || !currentTrick) return null;
      const playsArray = Array.isArray(currentTrick) ? currentTrick : null;
      if (!playsArray) return null;
      const play = playsArray.find((p: { player?: string }) => p?.player === absPosition);
      if (!play?.card) return null;
      return `${getRankLabel(play.card.rank)}${SUIT_SYMBOLS[play.card.suit as keyof typeof SUIT_SYMBOLS]}`;
    },
    [currentTrick]
  );

  const isPlayingTurn = isYourTurn && phase === 'playing';

  const isDeclaringPhase =
    phase === 'declaring' || phase === 'declaring_trump' || phase === 'trump_declaration';
  const showTrumpSelection = isDeclaringPhase && isYourTurn;

  const showActionError = useCallback((action: string, err: unknown) => {
    const message =
      typeof err === 'object' && err !== null && 'reason' in err
        ? String((err as { reason: string }).reason)
        : `${action} failed`;
    Alert.alert('Action Failed', message);
  }, []);

  const handleDeclareTrump = useCallback(
    async (suit: Suit) => {
      try {
        const promise = pushGameAction('declare_trump', { suit });
        if (!promise) return;
        await promise;
      } catch (error) {
        showActionError('Declare trump', error);
      }
    },
    [showActionError]
  );

  const handlePlayCard = async (card: Card) => {
    if (isPlayingCard || !isPlayingTurn) return;
    setIsPlayingCard(true);
    try {
      const promise = pushGameAction('play_card', { card });
      if (!promise) return;
      await promise;
    } catch (error) {
      showActionError('Play card', error);
    } finally {
      setIsPlayingCard(false);
    }
  };

  const handleSelectHand = useCallback(
    (cards: Card[]) => {
      const promise = pushGameAction('select_hand', {
        cards: cards.map((c) => ({ rank: c.rank, suit: c.suit })),
      });
      if (!promise) return;
      promise.catch((error) => showActionError('Select hand', error));
    },
    [showActionError]
  );

  const isGameOver =
    phase === 'complete' || phase === 'game_over' || (phase as string) === 'finished';
  const isSecondDeal = phase === 'second_deal' && yourHand && yourHand.length > 6;

  if (!hasViewModel) {
    return (
      <Background>
        <View style={styles.container}>
          <View style={[styles.topBar, { paddingTop: insets.top }]}>
            <View>
              <Text style={styles.loadingText}>Loading game...</Text>
              <Text style={styles.headerTitle}>{roomTitle}</Text>
            </View>
            <TouchableOpacity onPress={onLeave} style={styles.leaveButton}>
              <Feather name="log-out" size={14} color={COLORS.red400} />
              <Text style={styles.leaveButtonText}>Leave</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Waiting for game state...</Text>
          </View>
          <View style={[styles.bottomBar, { paddingBottom: insets.bottom }]}>
            <AdBanner />
          </View>
        </View>
      </Background>
    );
  }

  return (
    <Background>
      <View style={styles.container}>
        {/* Top Bar - extends to notch, content padded */}
        <View style={[styles.topBar, { paddingTop: insets.top }]}>
          <View>
            <Text style={styles.headerTitle}>{roomTitle}</Text>
          </View>
          <TouchableOpacity onPress={onLeave} style={styles.leaveButton}>
            <Feather name="log-out" size={14} color={COLORS.red400} />
            <Text style={styles.leaveButtonText}>Leave</Text>
          </TouchableOpacity>
        </View>

        <ConnectionBanner isConnected={isChannelJoined} />

        {/* Game Info Bar - scores, phase, trump */}
        <GameInfoBar
          phase={phase}
          trumpSuit={trumpSuit}
          scores={serverState?.scores ?? null}
          youPosition={youPositionAbs}
          roundNumber={serverState?.round_number ?? null}
        />

        {/* Game Area - Flexible, takes remaining space */}
        <View style={styles.gameArea}>
          {isSecondDeal && viewModel ? (
            <HandSelector
              viewModel={viewModel}
              cards={yourHand!}
              trumpSuit={trumpSuit}
              onSelectHand={handleSelectHand}
            />
          ) : (
            <>
              <View style={styles.tableArea}>
                <View style={styles.tableCenterContent}>
                  <TrickArea
                    plays={currentTrick}
                    players={players}
                    currentTurnRelative={currentTurnRelative}
                    trumpSuit={trumpSuit}
                  />
                  <TurnIndicator
                    currentTurnRelative={currentTurnRelative}
                    isYourTurn={isYourTurn}
                  />
                </View>

                {north && (
                  <PlayerAvatar
                    position="north"
                    playerName={north.username}
                    isCurrentPlayer={north.isYou}
                    isTeammate={north.isTeammate}
                    isCurrentTurn={north.isCurrentTurn}
                    lastMove={getLastMoveForPlayer(north.absolutePosition)}
                    cardCount={getCardCountForPlayer(north.absolutePosition)}
                  />
                )}
                {east && (
                  <PlayerAvatar
                    position="east"
                    playerName={east.username}
                    isCurrentPlayer={east.isYou}
                    isTeammate={east.isTeammate}
                    isCurrentTurn={east.isCurrentTurn}
                    lastMove={getLastMoveForPlayer(east.absolutePosition)}
                    cardCount={getCardCountForPlayer(east.absolutePosition)}
                  />
                )}
                {south && (
                  <PlayerAvatar
                    position="south"
                    playerName={south.username}
                    isCurrentPlayer={south.isYou}
                    isTeammate={south.isTeammate}
                    isCurrentTurn={south.isCurrentTurn}
                    lastMove={getLastMoveForPlayer(south.absolutePosition)}
                    cardCount={getCardCountForPlayer(south.absolutePosition)}
                  />
                )}
                {west && (
                  <PlayerAvatar
                    position="west"
                    playerName={west.username}
                    isCurrentPlayer={west.isYou}
                    isTeammate={west.isTeammate}
                    isCurrentTurn={west.isCurrentTurn}
                    lastMove={getLastMoveForPlayer(west.absolutePosition)}
                    cardCount={getCardCountForPlayer(west.absolutePosition)}
                  />
                )}
              </View>

              {/* Player's Hand - part of game area */}
              <View style={styles.handArea}>
                <PlayerHand
                  cards={yourHand}
                  cardCount={yourCardCount}
                  isYourTurn={isYourTurn}
                  trumpSuit={trumpSuit}
                  phase={phase}
                  onCardPress={isPlayingTurn ? handlePlayCard : undefined}
                  isSubmittingPlay={isPlayingCard}
                />
              </View>
            </>
          )}
        </View>

        {/* Bottom Bar - extends to home indicator, ad centered */}
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom }]}>
          <AdBanner />
        </View>

        {/* Game Over Overlay */}
        {isGameOver && viewModel && serverState && (
          <GameOverOverlay
            viewModel={viewModel}
            serverState={serverState}
            progressionSummary={progressionSummary}
            onBackToLobby={onLeave}
            onPlayAgain={() => onPlayAgain?.(room) ?? onLeave()}
          />
        )}
      </View>
      <BiddingActions isYourTurn={isYourTurn} />
      <TrumpSelectionModal
        isOpen={showTrumpSelection}
        onSelectTrump={handleDeclareTrump}
        cards={yourHand}
      />
    </Background>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Top Bar - content area below notch
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.purple900_40,
    zIndex: 120,
    elevation: 120,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.white },

  // Leave Button
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 9999,
    backgroundColor: COLORS.red500_20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  leaveButtonText: { fontWeight: '600', color: COLORS.red400 },

  // Game Area - Flexible, takes remaining space
  gameArea: {
    flex: 1,
    justifyContent: 'space-between',
  },

  // Table Area - The playing field
  tableArea: {
    flex: 1,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  tableCenterContent: {
    position: 'relative',
    zIndex: 10,
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },

  // Hand Area - Player's cards at bottom of game area
  handArea: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },

  // Bottom Bar - extends to edge, holds ad banner
  bottomBar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.purple900_40,
    paddingTop: 8,
  },

  // Ad Banner - Standard mobile banner is 320x50
  adBanner: {
    width: 320,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.slate600,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  adContent: {
    flex: 1,
  },
  adTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  adSubtitle: {
    fontSize: 11,
    color: COLORS.white70,
  },
  adButton: {
    backgroundColor: COLORS.yellow300,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  adButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.slate600,
  },

  // Loading
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: COLORS.white60 },

  // Turn Indicator
  turnIndicator: {
    alignItems: 'center',
    borderRadius: 9999,
    backgroundColor: COLORS.black30,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  turnIndicatorText: { fontSize: 14, fontWeight: '700', color: COLORS.white },
  turnIndicatorTextYours: { color: COLORS.yellow300 },

  // Bidding Actions (Modal content)
  biddingSending: { marginTop: 8, fontSize: 12, color: COLORS.yellow300 },
  biddingOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  bidButton: {
    borderRadius: 12,
    backgroundColor: COLORS.blue500,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  passButton: {
    borderRadius: 12,
    backgroundColor: COLORS.slate500,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bidButtonDisabled: { opacity: 0.6 },
  bidButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.white },

  // Bid History
  bidHistoryContainer: { marginTop: 12 },
  bidHistoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: COLORS.blue200_70,
  },
  bidHistoryEmpty: { fontSize: 12, color: COLORS.blue200_70 },
  bidHistoryList: {
    marginTop: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bidHistoryItem: {
    borderRadius: 9999,
    backgroundColor: COLORS.white10,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  bidHistoryText: { fontSize: 12, fontWeight: '500', color: COLORS.white },
});
