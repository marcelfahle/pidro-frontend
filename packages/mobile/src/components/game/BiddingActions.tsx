import { useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pushGameAction } from '@/channels/hooks/useGameChannel';
import { PidroText } from '@/components/ui/PidroText';
import { PressableFX } from '@/components/ui/PressableFX';
import { Surface } from '@/components/ui/Surface';
import { PidroColors, PidroLayout, PidroRadii, PidroSpacing } from '@/design/tokens';
import { cardSize } from '@/game/canvas/layout';
import { useGameStore, useGameViewModel } from '@/stores/game';
import type { LegalAction } from '@/types/game';

const ALL_BID_VALUES = [6, 7, 8, 9, 10, 11, 12, 13, 14] as const;
const CARD_RATIO = 110 / 78;
const PORTRAIT_UTILITY_RESERVE = 72;

export function BiddingActions({ isYourTurn }: { isYourTurn: boolean }) {
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
  const canAct = isYourTurn && (bidOptions.length > 0 || canPass);

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

  const compactPortrait = !landscape && height < 720;
  const compactControls = landscape || compactPortrait;
  const buttonSize = compactControls ? PidroLayout.touchTarget : 54;
  const gridGap = compactControls ? PidroSpacing.xxs : PidroSpacing.xs;
  const panelPaddingHorizontal = landscape
    ? 6
    : compactPortrait
      ? PidroSpacing.xxs
      : PidroSpacing.sm;
  const panelPaddingVertical = landscape ? 6 : compactPortrait ? 0 : PidroSpacing.sm;
  const controlGap = landscape ? 6 : compactPortrait ? 2 : PidroSpacing.xs;
  const gridWidth = buttonSize * 3 + gridGap * 2;
  const panelWidth = gridWidth + panelPaddingHorizontal * 2;
  const gridHeight = buttonSize * 3 + gridGap * 2;
  const panelHeight =
    gridHeight + controlGap + PidroLayout.touchTarget + panelPaddingVertical * 2 + 2;
  const assumedBottomInset = Math.max(insets.bottom, landscape ? 21 : 34);
  const availableHeight = height - insets.top - assumedBottomInset;
  const referenceTop = insets.top + availableHeight * (landscape ? 0.11 : 0.355);
  const safeTop = insets.top + (landscape ? PidroLayout.touchTarget : 172);
  const cardHeight = cardSize(Math.min(width, height)) * CARD_RATIO;
  const tableBottom = height - assumedBottomInset - (landscape ? 0 : PORTRAIT_UTILITY_RESERVE);
  const handCenter = tableBottom - cardHeight * (landscape ? 0.56 : 1.35);
  const handTop = handCenter - (cardHeight * (landscape ? 0.9 : 1)) / 2;
  const latestPanelTop = handTop - PidroSpacing.xs - panelHeight;
  const errorReserve = submissionError ? PidroSpacing.xl : 0;
  const panelTop = Math.max(
    insets.top + PidroSpacing.xs,
    Math.min(Math.max(referenceTop, safeTop), latestPanelTop) - errorReserve
  );

  return (
    <View
      style={[
        styles.overlay,
        {
          paddingTop: panelTop,
        },
      ]}
      pointerEvents="box-none">
      <Surface
        testID="bidding-window"
        variant="window"
        accessibilityLabel={`Place your bid. ${bidContext}`}
        accessibilityState={{ busy: isSubmitting }}
        style={[
          styles.panel,
          {
            width: panelWidth,
            gap: controlGap,
            paddingHorizontal: panelPaddingHorizontal,
            paddingVertical: panelPaddingVertical,
          },
        ]}>
        <View testID="bidding-grid" style={[styles.bidGrid, { width: gridWidth, gap: gridGap }]}>
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
                {!isLegal ? <View pointerEvents="none" style={styles.disabledSlash} /> : null}
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
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 54,
    alignItems: 'center',
    paddingHorizontal: PidroSpacing.sm,
  },
  panel: {
    alignItems: 'center',
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
  disabledSlash: {
    position: 'absolute',
    width: '76%',
    height: 2,
    borderRadius: PidroRadii.full,
    backgroundColor: PidroColors.textSoft,
    transform: [{ rotate: '-45deg' }],
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
