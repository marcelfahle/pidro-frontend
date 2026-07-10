import { useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pushGameAction } from '@/channels/hooks/useGameChannel';
import { Button } from '@/components/ui/Button';
import { DecisionWindow } from '@/components/ui/DecisionWindow';
import { PidroText } from '@/components/ui/PidroText';
import { PressableFX } from '@/components/ui/PressableFX';
import { PidroColors, PidroLayout, PidroRadii, PidroSpacing } from '@/design/tokens';
import { useGameStore, useGameViewModel } from '@/stores/game';
import type { LegalAction } from '@/types/game';

const ALL_BID_VALUES = [6, 7, 8, 9, 10, 11, 12, 13, 14] as const;

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
      setSubmissionError('We could not send that choice. Check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!showBiddingPanel || !canAct) return null;

  const buttonSize = landscape ? 46 : 54;
  const panelWidth = landscape ? Math.min(width - 120, 660) : Math.min(width - 24, 360);

  return (
    <View
      style={[
        styles.overlay,
        {
          paddingTop: insets.top + PidroSpacing.lg,
          paddingBottom: insets.bottom + PidroSpacing.lg,
        },
      ]}
      pointerEvents="box-none">
      <DecisionWindow
        testID="bidding-window"
        title="Place your bid"
        description={`${bidContext} Choose a legal bid or pass.`}
        compact={landscape}
        footer={
          <Button
            label="Pass"
            variant="outline"
            onPress={() => sendAction('pass', {})}
            disabled={!canPass || isSubmitting}
            style={styles.passButton}
          />
        }
        style={{ width: panelWidth }}>
        <View style={[styles.bidGrid, landscape && styles.bidGridLandscape]}>
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
        {submissionError ? (
          <PidroText role="metadata" tone="danger" align="center">
            {submissionError}
          </PidroText>
        ) : null}
      </DecisionWindow>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 54,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: PidroSpacing.sm,
  },
  bidGrid: {
    alignSelf: 'center',
    maxWidth: 190,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: PidroSpacing.xs,
  },
  bidGridLandscape: {
    maxWidth: '100%',
    flexWrap: 'nowrap',
  },
  bidButton: {
    minWidth: PidroLayout.touchTarget,
    minHeight: PidroLayout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
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
    opacity: 0.42,
  },
  bidButtonPressed: {
    opacity: 0.76,
    transform: [{ scale: 0.97 }],
  },
  passButton: {
    minWidth: 120,
  },
});
