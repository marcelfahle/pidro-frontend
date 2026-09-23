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
import type { RematchVote } from '@pidro/shared';
import type { Room } from '@/types/lobby';
import type { ActiveTurnTimer, Card, RelativePosition, ServerGameState, Suit } from '@/types/game';
import { useGameTableController } from '@/game/useGameTableController';
import { useDealHaptics } from '@/game/useGameHaptics';
import { useGameStore } from '@/stores/game';
import { ConnectionBanner } from '@/components/ui/ConnectionBanner';
import { TableSettings } from './TableSettings';
import { WatchingBadge } from '@/components/game/WatchingBadge';
import { BiddingActions } from '@/components/game/BiddingActions';
import { TrumpSelectionModal } from '@/components/game/TrumpSelectionModal';
import { DealerSecondDeal } from '@/components/game/DealerSecondDeal';
import { GameOverOverlay } from '@/components/game/GameOverOverlay';
import type { ProgressionSummary } from '@/channels/hooks/useGameChannel';
import { getRankLabel, SUIT_SYMBOLS } from '@/utils/cards';
import { useCardTextures } from './cardTextures';
import { useTableModel, type TableModel } from './tableModel';
import { useHandPresentationReady } from './useHandPresentationReady';
import { useDealPresentation } from './useDealPresentation';
import { T } from './tokens';
import GameCanvas from './GameCanvas';
import { SeatLayer } from './SeatLayer';
import { Scoreboard } from './Scoreboard';
import { TableChromeBars, useTableReserves } from './TableChrome';

type Props = {
  room: Room;
  progressionSummary?: ProgressionSummary | null;
  onLeave: () => void;
  onPlayAgain?: () => void;
  rematch?: RematchVote | null;
  rematchPending?: boolean;
  /** False once the room has moved on from the finished game (next game starting). */
  roomFinished?: boolean;
  onHome?: () => void;
};

const HIDDEN_PRESENTATION_HAND: Card[] = [];

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
  dealing,
  topReserve,
  bottomReserve,
  statusByRel,
  players,
}: {
  seats: TableModel['seats'];
  dealerRel: RelativePosition | null;
  dealing: boolean;
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
      dealing={dealing}
      topReserve={topReserve}
      bottomReserve={bottomReserve}
      statusByRel={statusByRel}
      timerProgressByRel={timerProgressByRel}
    />
  );
}

export function GameCanvasTable({
  room,
  progressionSummary,
  onLeave,
  onPlayAgain,
  rematch,
  rematchPending,
  roomFinished = true,
  onHome,
}: Props) {
  const controller = useGameTableController(room);
  const role = useGameStore((state) => state.role);
  const dealerRobPresentation = useGameStore((state) => state.presentation?.dealer_rob ?? null);
  const isPrivateDealerRob =
    controller.youPositionAbs === dealerRobPresentation?.dealer && !!dealerRobPresentation.pool;
  const isSpectator = role === 'spectator';
  const textures = useCardTextures();
  const serverModel = useTableModel(
    controller,
    isPrivateDealerRob ? HIDDEN_PRESENTATION_HAND : undefined
  );
  const model = useDealPresentation(serverModel, controller.viewModel?.dealerRelative ?? null);
  useDealHaptics(model);
  const isBiddingTurn = controller.phase === 'bidding' && controller.isYourTurn;
  const facesReady = useHandPresentationReady(serverModel.yourHand, textures, isBiddingTurn);
  const isHandReady = !model.dealStage && facesReady;
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
    canSelectHand,
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
      acc[player.relativePosition] = model.dealStage ? 'Dealing' : statusText(player, serverState);
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
        dealerRel={
          controller.phase === 'dealer_selection' ? null : (viewModel?.dealerRelative ?? null)
        }
        dealing={model.dealStage === 'dealing'}
        topReserve={topReserve}
        bottomReserve={bottomReserve}
        statusByRel={statusByRel}
        players={viewModel?.players ?? []}
      />

      <TableChromeBars reserves={reserves} />

      {/* Gold scoreboard plaque (top-left) — matches the original */}
      {!(isGameOver && roomFinished) && (
        <Scoreboard
          scores={serverState?.scores ?? null}
          youPosition={youPositionAbs}
          handNumber={serverState?.hand_number ?? serverState?.round_number ?? null}
          roomCode={viewModel?.roomCode ?? room.code}
          top={insets.top}
          left={insets.left}
        />
      )}

      {/* Connection banner (top-centre) */}
      {!isGameOver && (
        <View style={[styles.bannerWrap, { top: insets.top + 10 }]} pointerEvents="box-none">
          <ConnectionBanner isConnected={isChannelJoined} />
        </View>
      )}

      {!(isGameOver && roomFinished) && (
        <>
          <TableSettings onLeave={onLeave} isSpectator={isSpectator} isGameOver={isGameOver} />
          {isSpectator && <WatchingBadge />}
        </>
      )}

      {/* Dealer rob: symbolic for public views; selectable only with an authoritative private pool. */}
      {(isSecondDeal || dealerRobPresentation) && viewModel && (
        <View
          style={[
            isPrivateDealerRob ? styles.robbedCardsOverlay : styles.centerOverlay,
            isPrivateDealerRob
              ? { bottom: insets.bottom + bottomReserve + 116 }
              : {
                  paddingTop: insets.top + 64,
                  paddingBottom: insets.bottom + 16,
                },
          ]}
          pointerEvents="box-none">
          <DealerSecondDeal
            viewModel={viewModel}
            cards={yourHand}
            trumpSuit={trumpSuit}
            canSelectHand={canSelectHand}
            automaticPresentation={dealerRobPresentation}
            onSelectHand={handleSelectHand}
          />
        </View>
      )}

      {/* Bidding + trump selection (PartialModal floats from the bottom) */}
      <BiddingActions
        isYourTurn={isYourTurn}
        isHandReady={isHandReady}
        topReserve={topReserve}
        bottomReserve={bottomReserve}
      />
      <TrumpSelectionModal
        isOpen={showTrumpSelection}
        onSelectTrump={async (s: Suit) => {
          await handleDeclareTrump(s);
        }}
        cards={yourHand}
      />

      {/* Game over */}
      {isGameOver && roomFinished && viewModel && serverState && (
        <GameOverOverlay
          viewModel={viewModel}
          serverState={serverState}
          progressionSummary={progressionSummary}
          onHome={onHome ?? onLeave}
          onPlayAgain={onPlayAgain ?? onLeave}
          rematch={rematch}
          rematchPending={rematchPending}
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
  centerOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  robbedCardsOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    alignItems: 'center',
  },
});
