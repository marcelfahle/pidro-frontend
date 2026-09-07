import { useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pushGameAction } from '@/channels/hooks/useGameChannel';
import { PidroText } from '@/components/ui/PidroText';
import { PressableFX } from '@/components/ui/PressableFX';
import { PidroColors, PidroLayout, PidroRadii, PidroSpacing } from '@/design/tokens';
import { computeLayout } from '@/game/canvas/layout';
import { useGameStore, useGameViewModel } from '@/stores/game';
import type { LegalAction } from '@/types/game';

const ALL_BID_VALUES = [6, 7, 8, 9, 10, 11, 12, 13, 14] as const;
const GRID_GAP = PidroSpacing.xxs;
const CONTROL_GAP = PidroSpacing.xs;
const PANEL_PADDING = PidroSpacing.xxs;
const HAND_GAP = 18;
const MAX_BUTTON_SIZE = 54;
const FIXED_GROUP_HEIGHT = PidroLayout.touchTarget + GRID_GAP * 2 + CONTROL_GAP + PANEL_PADDING * 2;

export function BiddingActions({
  isYourTurn,
  isHandReady,
  topReserve,
  bottomReserve,
}: {
  isYourTurn: boolean;
  isHandReady: boolean;
  topReserve: number;
  bottomReserve: number;
}) {
  const serverState = useGameStore((state) => state.serverState);
  const legalActions = useGameStore((state) => state.legalActions);
  const viewModel = useGameViewModel();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const landscape = width > height;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const { bidOptions, legalBidSet, canPass } = useMemo(() => {
    const bids: number[] = [];
    let pass = false;
    legalActions.forEach((action: LegalAction) => {
      if (action.type === 'bid') bids.push(action.amount);
      if (action.type === 'pass') pass = true;
    });
    bids.sort((a, b) => a - b);
    return { bidOptions: bids, legalBidSet: new Set(bids), canPass: pass };
  }, [legalActions]);

  const highestAmount =
    serverState?.current_bid ??
    (typeof serverState?.highest_bid?.amount === 'number' ? serverState.highest_bid.amount : null);
  const highestPosition = serverState?.highest_bid?.position ?? serverState?.bid_winner ?? null;
  const highestPlayer = highestPosition
    ? viewModel?.players.find((player) => player.absolutePosition === highestPosition)
    : null;
  const bidContext = highestAmount
    ? `Current bid: ${highestAmount}${highestPlayer?.username ? ` by ${highestPlayer.username}` : ''}.`
    : 'No bid has been placed yet.';

  const showBiddingPanel = serverState?.phase === 'bidding';
  const canAct = isYourTurn && isHandReady && (bidOptions.length > 0 || canPass);

  const sendAction = async (event: 'bid' | 'pass', payload: Record<string, unknown>) => {
    setIsSubmitting(true);
    setSubmissionError(null);
    try {
      const promise = pushGameAction(event, payload);
      if (!promise) throw new Error('The game connection is not ready.');
      await promise;
    } catch (error) {
      console.error(`[Game] ${event} failed:`, error);
      setSubmissionError('Bid not sent. Check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!showBiddingPanel || !canAct) return null;

  const layout = computeLayout(width, height, insets, topReserve, bottomReserve);
  const handHeight = layout.cardH * (landscape ? 0.9 : 1);
  const handTop = layout.hand.cy - handHeight / 2;
  const tableTop = insets.top + topReserve;
  const sideBackWidth = Math.max(30, Math.min(56, layout.cardW * 0.62));
  const northClearance = tableTop + (landscape ? 56 : 82);
  const sideClearance =
    layout.trick.cy - (sideBackWidth * 3.4) / 2 - 62 + PidroLayout.touchTarget + HAND_GAP;
  const preferredTop = landscape ? northClearance : Math.max(northClearance, sideClearance);
  const availableHeight = handTop - HAND_GAP - preferredTop;
  const buttonSize = Math.max(
    PidroLayout.touchTarget,
    Math.min(MAX_BUTTON_SIZE, Math.floor((availableHeight - FIXED_GROUP_HEIGHT) / 3))
  );
  const gridWidth = buttonSize * 3 + GRID_GAP * 2;
  const hardTop = tableTop + HAND_GAP;

  return (
    <View
      style={[
        styles.overlay,
        {
          top: hardTop,
          bottom: height - handTop + HAND_GAP,
        },
      ]}
      pointerEvents="box-none">
      <View
        testID="bidding-window"
        accessible
        accessibilityLabel={`Place your bid. ${bidContext}`}
        accessibilityState={{ busy: isSubmitting }}
        style={styles.panel}>
        <View testID="bidding-grid" style={[styles.bidGrid, { width: gridWidth, gap: GRID_GAP }]}>
          {ALL_BID_VALUES.map((amount) => {
            const isLegal = legalBidSet.has(amount);
            return (
              <PressableFX
                key={amount}
                accessibilityRole="button"
                accessibilityLabel={`Bid ${amount}`}
                accessibilityState={{ disabled: !isLegal || isSubmitting }}
                onPress={() => sendAction('bid', { amount })}
                disabled={!isLegal || isSubmitting}
                style={[
                  styles.bidButton,
                  { width: buttonSize, height: buttonSize },
                  isLegal ? styles.bidButtonLegal : styles.bidButtonDisabled,
                ]}
                pressedStyle={styles.bidButtonPressed}>
                <PidroText
                  role="title"
                  tone={isLegal ? 'default' : 'muted'}
                  maxFontSizeMultiplier={1.2}>
                  {amount}
                </PidroText>
              </PressableFX>
            );
          })}
        </View>
        <PressableFX
          accessibilityRole="button"
          accessibilityLabel="Pass"
          accessibilityState={{ disabled: !canPass || isSubmitting }}
          onPress={() => sendAction('pass', {})}
          disabled={!canPass || isSubmitting}
          style={[
            styles.passButton,
            { width: gridWidth },
            canPass ? styles.passButtonEnabled : styles.bidButtonDisabled,
          ]}
          pressedStyle={styles.bidButtonPressed}>
          <PidroText role="title" maxFontSizeMultiplier={1.2}>
            PASS
          </PidroText>
        </PressableFX>
        {submissionError ? (
          <PidroText
            accessibilityLiveRegion="polite"
            role="metadata"
            tone="danger"
            align="center"
            numberOfLines={2}>
            {submissionError}
          </PidroText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 54,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: PidroSpacing.sm,
  },
  panel: {
    alignItems: 'center',
    gap: CONTROL_GAP,
    padding: PANEL_PADDING,
    borderRadius: PidroRadii.lg,
    backgroundColor: PidroColors.panelStrong,
  },
  bidGrid: {
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  bidButton: {
    minWidth: PidroLayout.touchTarget,
    minHeight: PidroLayout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: PidroRadii.surface,
    borderWidth: 1,
  },
  bidButtonLegal: {
    borderColor: PidroColors.cyanBorderStrong,
    backgroundColor: PidroColors.glassHover,
  },
  bidButtonDisabled: {
    borderColor: PidroColors.border,
    backgroundColor: PidroColors.panel,
    opacity: 0.58,
  },
  bidButtonPressed: {
    opacity: 0.76,
    backgroundColor: PidroColors.glass,
  },
  passButton: {
    minHeight: PidroLayout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: PidroRadii.surface,
    borderWidth: 1.5,
  },
  passButtonEnabled: {
    borderColor: PidroColors.cyanBorderStrong,
    backgroundColor: PidroColors.glassHover,
  },
});
