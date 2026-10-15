/**
 * Skia game-table screen container. The canvas is the table surface; the existing
 * RN overlays (top bar, connection banner, info bar, bidding, trump, hand-select,
 * game-over) are layered ABOVE it, all driven by the shared controller (M4).
 * NOTE: web loads CanvasKit through the platform-specific loader before this
 * module is imported. Native imports this module directly.
 */
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import type { RematchVote } from '@pidro/shared';
import type { Room } from '@/types/lobby';
import type { ActiveTurnTimer, Card, RelativePosition, ServerGameState, Suit } from '@/types/game';
import { useGameTableController } from '@/game/useGameTableController';
import { useTableHaptics } from '@/game/useGameHaptics';
import { usePlayGuard } from '@/game/usePlayGuard';
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
import { SeatLayer, type SeatLine, type SeatTurn } from './SeatLayer';
import { Scoreboard } from './Scoreboard';
import type { TickerRestingLine } from './ActionTicker';
import { buildHandLog } from '@/game/handLog';
import { bidSeatLine } from '@/features/game/bidding';

import { TABLE_HEADER, TableChromeBars, headerTop, useTableReserves } from './TableChrome';
import { TableSignals } from './TableSignals';
import { computeLayout, tickerPlacement } from './layout';
import { RuleSetChip } from '@/components/rules/RuleSet';
import { RulesExplainer, useRulesExplainer } from '@/components/rules/RulesExplainer';
import { PidroLayout, PidroSpacing } from '@/design/tokens';
import { t, useTranslation } from '@/i18n';
import { TableFeedback } from '@/components/game/TableFeedback';

type Props = {
  room: Room;
  rulesFixtureSeen?: boolean;
  progressionSummary?: ProgressionSummary | null;
  onLeave: () => void;
  onPlayAgain?: () => void;
  rematch?: RematchVote | null;
  rematchPending?: boolean;
  /** False once the room has moved on from the finished game (next game starting). */
  roomFinished?: boolean;
  onHome?: () => void;
  playAgainLabel?: string;
  showGuestSave?: boolean;
  onSaveGuest?: () => void;
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
): SeatLine | null {
  const phase = state?.phase ?? 'bidding';
  const absolutePosition = player.absolutePosition;
  const bid = state?.bids?.[absolutePosition as keyof NonNullable<ServerGameState['bids']>];
  const cut = state?.dealer_selection_cuts?.[absolutePosition] ?? null;
  const playedCard = trickCardForPlayer(state, absolutePosition);
  const lastTrick =
    state?.tricks && state.tricks.length > 0 ? state.tricks[state.tricks.length - 1] : null;
  const now = (text: string): SeatLine | null =>
    player.isCurrentTurn ? { text, tone: 'now' } : null;

  switch (phase) {
    case 'dealer_selection':
      if (cut) return { text: t('game.draws', { card: cardLabel(cut) }) };
      if (playedCard) return { text: t('game.draws', { card: cardLabel(playedCard) }) };
      return now(t('game.drawing'));
    case 'bidding':
      return bidSeatLine({
        bid,
        holdsHigh: state?.highest_bid?.position === absolutePosition,
        onTurn: player.isCurrentTurn,
        hand: state?.hand_number ?? state?.round_number,
      });
    case 'declaring':
    case 'declaring_trump':
    case 'trump_declaration':
      if (player.isCurrentTurn) return { text: t('game.choosing_trump'), tone: 'now' };
      return state?.trump ? { text: t('game.trump', { suit: SUIT_SYMBOLS[state.trump] }) } : null;
    case 'discarding':
    case 'second_deal':
      return now(t('game.picking'));
    case 'playing':
      if (playedCard) return { text: t('game.plays', { card: cardLabel(playedCard) }) };
      if (player.isCurrentTurn) return now(t('game.playing'));
      if (lastTrick?.winner === absolutePosition) return { text: t('game.took_trick') };
      return null;
    case 'scoring':
    case 'hand_complete':
      return null;
    case 'complete':
    case 'game_over':
      return { text: t('game.finished') };
    default:
      return now(t('game.playing'));
  }
}

/** The turn light turns urgent for the last five seconds. */
const URGENT_MS = 5_000;

function useTurnTimerProgress(
  turnTimer: ActiveTurnTimer | null
): { position: string; turn: SeatTurn } | null {
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
    turn: {
      progress: countdownRemainingMs / turnTimer.durationMs,
      urgent: countdownRemainingMs <= URGENT_MS,
    },
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
  statusByRel: Partial<Record<RelativePosition, SeatLine | null>> | undefined;
  players: NonNullable<ReturnType<typeof useGameTableController>['viewModel']>['players'];
}) {
  const turnTimer = useGameStore((state) => state.turnTimer);
  const timerProgress = useTurnTimerProgress(turnTimer);
  const turnByRel = timerProgress
    ? players.reduce(
        (acc, player) => {
          if (player.absolutePosition === timerProgress.position) {
            acc[player.relativePosition] = timerProgress.turn;
          }
          return acc;
        },
        {} as Partial<Record<RelativePosition, SeatTurn>>
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
      turnByRel={turnByRel}
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
  playAgainLabel,
  showGuestSave,
  onSaveGuest,
  rulesFixtureSeen,
}: Props) {
  const { locale } = useTranslation();
  const controller = useGameTableController();
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
  useTableHaptics(model);
  const isBiddingTurn = controller.phase === 'bidding' && controller.isYourTurn;
  const facesReady = useHandPresentationReady(serverModel.yourHand, textures, isBiddingTurn);
  const isHandReady = !model.dealStage && facesReady;
  const insets = useSafeAreaInsets();
  const reserves = useTableReserves();
  const { topReserve, bottomReserve } = reserves;
  const ruleSet = controller.serverState?.variant ?? 'finnish';
  const rules = useRulesExplainer(
    ruleSet,
    isSpectator || !controller.youPositionAbs,
    rulesFixtureSeen
  );
  const { width, height } = useWindowDimensions();
  const layout = computeLayout(width, height, insets, topReserve, bottomReserve);

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

  const playCard = usePlayGuard(handlePlayCard, {
    presentation: dealerRobPresentation,
    handReady: isHandReady,
  });

  const handLog = useMemo(
    () =>
      buildHandLog({
        handNumber: serverState?.hand_number ?? serverState?.round_number ?? null,
        bids: serverState?.bid_order,
        trump: serverState?.trump ?? null,
        tricks: controller.completedTricks,
        currentTrick: controller.currentTrick,
        lastHand: serverState?.last_hand ?? null,
        players: viewModel?.players ?? [],
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- buildHandLog translates through the stable global t
    [
      locale,
      serverState?.hand_number,
      serverState?.round_number,
      serverState?.bid_order,
      serverState?.trump,
      serverState?.last_hand,
      controller.completedTricks,
      controller.currentTrick,
      viewModel?.players,
    ]
  );

  // Classic's "Bet 6": from the first bid, the ticker rests on who holds the
  // bid; between hands, on how the last hand ended.
  const highBid = serverState?.highest_bid;
  const bidLine =
    highBid && typeof highBid.amount === 'number'
      ? buildHandLog({
          handNumber: 0,
          bids: [highBid],
          trump: null,
          tricks: [],
          currentTrick: [],
          lastHand: null,
          players: viewModel?.players ?? [],
        })[0]?.entries[0]
      : undefined;
  const lastResult = handLog[0]?.finished ? handLog[0].entries.at(-1) : undefined;
  const resting: TickerRestingLine | null = bidLine
    ? { who: bidLine.who, what: bidLine.what, ours: bidLine.ours }
    : lastResult
      ? { who: lastResult.who, what: lastResult.what, ours: lastResult.ours }
      : null;

  const statusByRel = viewModel?.players.reduce(
    (acc, player) => {
      acc[player.relativePosition] = model.dealStage
        ? { text: t('game.dealing') }
        : statusText(player, serverState);
      return acc;
    },
    {} as Partial<Record<RelativePosition, SeatLine | null>>
  );
  return (
    <GestureHandlerRootView testID="game-table" style={{ flex: 1, backgroundColor: T.bgDeep }}>
      {/* The table surface */}
      <GameCanvas
        model={model}
        textures={textures}
        onPlayCard={playCard}
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
      <TableSignals model={model} topReserve={topReserve} bottomReserve={bottomReserve} />

      <TableChromeBars reserves={reserves} />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          ...(controller.phase === 'playing'
            ? { top: layout.trick.cy + layout.cardW * 0.4, left: 0, right: 0 }
            : {
                // Centered on the menu button beside it.
                top: headerTop(insets.top) + PidroSpacing.xxs,
                right: insets.right + PidroLayout.touchTarget + PidroSpacing.lg,
              }),
          alignItems: 'center',
        }}>
        <View style={{ alignSelf: 'center' }}>
          <RuleSetChip
            ruleSet={ruleSet}
            flagOnly={controller.phase !== 'playing'}
            testID="table-rule-set"
          />
        </View>
      </View>
      <RulesExplainer
        ruleSet={ruleSet}
        tableCode={room.code}
        open={rules.open}
        onClose={rules.dismiss}
      />

      {/* Gold scoreboard plaque (top-left) — matches the original */}
      {!(isGameOver && roomFinished) && (
        <Scoreboard
          scores={serverState?.scores ?? null}
          youPosition={youPositionAbs}
          handNumber={serverState?.hand_number ?? serverState?.round_number ?? null}
          roomCode={viewModel?.roomCode ?? room.code}
          top={headerTop(insets.top)}
          left={insets.left}
          log={handLog}
          resting={resting}
          stateArrived={serverState != null}
          ticker={tickerPlacement(layout, {
            tableTop: insets.top + topReserve,
            plaqueLeft: insets.left + PidroSpacing.sm,
            plaqueTop: headerTop(insets.top),
          })}
          yourTurn={
            isYourTurn && (controller.phase === 'bidding' || controller.phase === 'playing')
          }
        />
      )}

      {/* Connection banner, in the notice slot */}
      {isChannelJoined && <TableFeedback notice={controller.actionNotice ?? null} />}
      {!isGameOver && (
        <View style={[styles.bannerWrap, reserves.noticeSlot]} pointerEvents="box-none">
          <ConnectionBanner isConnected={isChannelJoined} />
        </View>
      )}

      {!(isGameOver && roomFinished) && (
        <>
          <TableSettings
            onLeave={onLeave}
            isSpectator={isSpectator}
            isGameOver={isGameOver}
            onRules={rules.show}
          />
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
                  paddingTop: insets.top + TABLE_HEADER + PidroSpacing.xs,
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
          playAgainLabel={playAgainLabel}
          showGuestSave={showGuestSave}
          onSaveGuest={onSaveGuest}
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
