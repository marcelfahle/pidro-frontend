/**
 * Skia game-table screen container. The canvas is the table surface; the existing
 * RN overlays (top bar, connection banner, info bar, bidding, trump, hand-select,
 * game-over) are layered ABOVE it, all driven by the shared controller (M4).
 * NOTE: web loads CanvasKit through the platform-specific loader before this
 * module is imported. Native imports this module directly.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import type { Room } from '@/types/lobby';
import type { ActiveTurnTimer, Card, RelativePosition, ServerGameState, Suit } from '@/types/game';
import { useGameTableController } from '@/game/useGameTableController';
import { useGameStore } from '@/stores/game';
import { ConnectionBanner } from '@/components/ui/ConnectionBanner';
import { Button } from '@/components/ui/Button';
import { BiddingActions } from '@/components/game/BiddingActions';
import { TrumpSelectionModal } from '@/components/game/TrumpSelectionModal';
import { HandSelector } from '@/components/game/HandSelector';
import { GameOverOverlay } from '@/components/game/GameOverOverlay';
import type { ProgressionSummary } from '@/channels/hooks/useGameChannel';
import { getRankLabel, SUIT_SYMBOLS } from '@/utils/cards';
import { useCardTextures } from './cardTextures';
import { useTableModel, type TableModel } from './tableModel';
import { useHandPresentationReady } from './useHandPresentationReady';
import { T } from './tokens';
import GameCanvas from './GameCanvas';
import { SeatLayer } from './SeatLayer';
import { Scoreboard } from './Scoreboard';
import { TableChromeBars, useTableReserves } from './TableChrome';

type Props = {
  room: Room;
  progressionSummary?: ProgressionSummary | null;
  onLeave: () => void;
  onPlayAgain?: (room: Room) => void;
};

function cardLabel(card: Card): string {
  return `${getRankLabel(card.rank)}${SUIT_SYMBOLS[card.suit]}`;
}

function trickCardForPlayer(state: ServerGameState | null, absolutePosition: string): Card | null {
  const currentTrick = state?.current_trick;
  const plays = Array.isArray(currentTrick)
    ? currentTrick
    : currentTrick && typeof currentTrick === 'object' && 'plays' in currentTrick
      ? (currentTrick as unknown as { plays?: unknown }).plays
      : null;
  if (!Array.isArray(plays)) return null;
  const play = plays.find(
    (candidate: { player?: string; position?: string; card?: Card }) =>
      candidate?.player === absolutePosition || candidate?.position === absolutePosition
  );
  return play?.card ?? null;
}

function statusText(
  player: NonNullable<ReturnType<typeof useGameTableController>['viewModel']>['players'][number],
  state: ServerGameState | null
): string {
  const phase = state?.phase ?? 'bidding';
  const absolutePosition = player.absolutePosition;
  const bid = state?.bids?.[absolutePosition as keyof NonNullable<ServerGameState['bids']>];
  const cut = state?.dealer_selection_cuts?.[absolutePosition] ?? null;
  const playedCard = trickCardForPlayer(state, absolutePosition);
  const lastTrick =
    state?.tricks && state.tricks.length > 0 ? state.tricks[state.tricks.length - 1] : null;

  switch (phase) {
    case 'dealer_selection':
      if (cut) return `Draws ${cardLabel(cut)}`;
      if (playedCard) return `Draws ${cardLabel(playedCard)}`;
      return player.isCurrentTurn ? 'Drawing' : 'Waiting';
    case 'bidding':
      if (bid === 'pass') return 'Passed';
      if (typeof bid === 'number') return `Bet ${bid}`;
      return player.isCurrentTurn ? 'Bidding' : 'Waiting';
    case 'declaring':
    case 'declaring_trump':
    case 'trump_declaration':
      if (player.isCurrentTurn) return 'Naming';
      return state?.trump ? `Trump ${SUIT_SYMBOLS[state.trump]}` : 'Waiting';
    case 'discarding':
    case 'second_deal':
      return player.isCurrentTurn ? 'Selecting hand' : 'Waiting';
    case 'playing':
      if (playedCard) return `Plays ${cardLabel(playedCard)}`;
      if (player.isCurrentTurn) return 'Turn';
      if (lastTrick?.winner === absolutePosition) return 'Won trick';
      return 'Ready';
    case 'scoring':
    case 'hand_complete':
      return 'Ready';
    case 'complete':
    case 'game_over':
      return 'Finished';
    default:
      return player.isCurrentTurn ? 'Turn' : 'Waiting';
  }
}

function useTurnTimerProgress(
  turnTimer: ActiveTurnTimer | null
): { position: string; progress: number } | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (
      !turnTimer ||
      turnTimer.scope !== 'seat' ||
      !turnTimer.position ||
      turnTimer.durationMs <= 0 ||
      turnTimer.remainingMs <= 0
    ) {
      return;
    }

    const expiresAt = turnTimer.receivedAtMs + turnTimer.remainingMs;
    const id = setInterval(() => {
      const nextNow = Date.now();
      setNow(nextNow);
      if (nextNow >= expiresAt) clearInterval(id);
    }, 200);
    return () => clearInterval(id);
  }, [turnTimer]);

  if (!turnTimer || turnTimer.scope !== 'seat' || !turnTimer.position) return null;
  if (turnTimer.durationMs <= 0) return null;

  const elapsedMs = now - turnTimer.receivedAtMs;
  const remainingTotalMs = Math.max(0, turnTimer.remainingMs - elapsedMs);
  if (remainingTotalMs <= 0) return null;

  const countdownRemainingMs = Math.min(turnTimer.durationMs, remainingTotalMs);
  return {
    position: turnTimer.position,
    progress: countdownRemainingMs / turnTimer.durationMs,
  };
}

function TimedSeatLayer({
  seats,
  dealerRel,
  topReserve,
  bottomReserve,
  statusByRel,
  players,
}: {
  seats: TableModel['seats'];
  dealerRel: RelativePosition | null;
  topReserve: number;
  bottomReserve: number;
  statusByRel: Partial<Record<RelativePosition, string>> | undefined;
  players: NonNullable<ReturnType<typeof useGameTableController>['viewModel']>['players'];
}) {
  const turnTimer = useGameStore((state) => state.turnTimer);
  const timerProgress = useTurnTimerProgress(turnTimer);
  const timerProgressByRel = timerProgress
    ? players.reduce(
        (acc, player) => {
          if (player.absolutePosition === timerProgress.position) {
            acc[player.relativePosition] = timerProgress.progress;
          }
          return acc;
        },
        {} as Partial<Record<RelativePosition, number>>
      )
    : undefined;

  return (
    <SeatLayer
      seats={seats}
      dealerRel={dealerRel}
      topReserve={topReserve}
      bottomReserve={bottomReserve}
      statusByRel={statusByRel}
      timerProgressByRel={timerProgressByRel}
    />
  );
}

export function GameCanvasTable({ room, progressionSummary, onLeave, onPlayAgain }: Props) {
  const controller = useGameTableController(room);
  const textures = useCardTextures();
  const model = useTableModel(controller);
  const isBiddingTurn = controller.phase === 'bidding' && controller.isYourTurn;
  const isHandReady = useHandPresentationReady(model.yourHand, textures, isBiddingTurn);
  const insets = useSafeAreaInsets();
  const reserves = useTableReserves();
  const { topReserve, bottomReserve } = reserves;

  const {
    trumpSuit,
    serverState,
    youPositionAbs,
    isChannelJoined,
    isYourTurn,
    isSecondDeal,
    isGameOver,
    showTrumpSelection,
    viewModel,
    yourHand,
    handleDeclareTrump,
    handleSelectHand,
    handlePlayCard,
  } = controller;

  const statusByRel = viewModel?.players.reduce(
    (acc, player) => {
      acc[player.relativePosition] = statusText(player, serverState);
      return acc;
    },
    {} as Partial<Record<RelativePosition, string>>
  );
  return (
    <GestureHandlerRootView testID="game-table" style={{ flex: 1, backgroundColor: T.bgDeep }}>
      {/* The table surface */}
      <GameCanvas
        model={model}
        textures={textures}
        onPlayCard={handlePlayCard}
        topReserve={topReserve}
        bottomReserve={bottomReserve}
      />

      {/* Seat furniture (avatars, names, dealer chip, turn rings, opponent backs) over the canvas */}
      <TimedSeatLayer
        seats={model.seats}
        dealerRel={viewModel?.dealerRelative ?? null}
        topReserve={topReserve}
        bottomReserve={bottomReserve}
        statusByRel={statusByRel}
        players={viewModel?.players ?? []}
      />

      <TableChromeBars reserves={reserves} />

      {/* Gold scoreboard plaque (top-left) — matches the original */}
      <Scoreboard
        scores={serverState?.scores ?? null}
        youPosition={youPositionAbs}
        handNumber={serverState?.hand_number ?? serverState?.round_number ?? null}
        roomCode={viewModel?.roomCode ?? room.code}
        top={insets.top}
        left={insets.left}
      />

      {/* Connection banner (top-centre) */}
      {!isGameOver && (
        <View style={[styles.bannerWrap, { top: insets.top + 10 }]} pointerEvents="box-none">
          <ConnectionBanner isConnected={isChannelJoined} />
        </View>
      )}

      {/* Leave button (top-right) */}
      <View
        style={[styles.topRight, { top: insets.top + 8, right: insets.right + 10 }]}
        pointerEvents="box-none">
        <Button label="Leave" variant="outline" size="sm" onPress={onLeave} />
      </View>

      {/* Second-deal hand selection */}
      {isSecondDeal && viewModel && yourHand && (
        <View
          style={[
            styles.centerOverlay,
            {
              paddingTop: insets.top + 64,
              paddingBottom: insets.bottom + 16,
            },
          ]}
          pointerEvents="box-none">
          <HandSelector
            viewModel={viewModel}
            cards={yourHand}
            trumpSuit={trumpSuit}
            onSelectHand={handleSelectHand}
          />
        </View>
      )}

      {/* Bidding + trump selection (PartialModal floats from the bottom) */}
      <BiddingActions isYourTurn={isYourTurn} isHandReady={isHandReady} />
      <TrumpSelectionModal
        isOpen={showTrumpSelection}
        onSelectTrump={async (s: Suit) => {
          await handleDeclareTrump(s);
        }}
        cards={yourHand}
      />

      {/* Game over */}
      {isGameOver && viewModel && serverState && (
        <GameOverOverlay
          viewModel={viewModel}
          serverState={serverState}
          progressionSummary={progressionSummary}
          onBackToLobby={onLeave}
          onPlayAgain={() => onPlayAgain?.(room) ?? onLeave()}
        />
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  bannerWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 46,
  },
  topRight: {
    position: 'absolute',
    zIndex: 120,
    elevation: 120,
  },
  centerOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
});
