import { useMemo, useState } from 'react';
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DecisionWindow } from '@/components/ui/DecisionWindow';
import { PidroText } from '@/components/ui/PidroText';
import { PressableFX } from '@/components/ui/PressableFX';
import { PidroColors, PidroLayout, PidroRadii, PidroSpacing } from '@/design/tokens';
import { computeLayout, northSeatBottom } from '@/game/canvas/layout';
import { useTableReserves } from '@/game/canvas/TableChrome';
import type { Card, Suit } from '@/types/game';
import { useTranslation } from '@/i18n';
import { localizedError } from '@pidro/shared';

const SUIT_IMAGES = {
  hearts: require('~/assets/images/heart.png'),
  diamonds: require('~/assets/images/diamond.png'),
  clubs: require('~/assets/images/club.png'),
  spades: require('~/assets/images/spade.png'),
};

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

interface TrumpSelectionModalProps {
  isOpen: boolean;
  onSelectTrump: (suit: Suit) => Promise<void>;
  cards?: Card[] | null;
}

export function TrumpSelectionModal({ isOpen, onSelectTrump, cards }: TrumpSelectionModalProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSuit, setSelectedSuit] = useState<Suit | null>(null);
  const [submissionError, setSubmissionError] = useState<unknown>(null);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const landscape = width > height;
  const { topReserve, bottomReserve } = useTableReserves();
  const layout = computeLayout(width, height, insets, topReserve, bottomReserve);
  const handTop = layout.hand.cy - layout.cardH / 2;
  // Every portrait uses the actual table band, including full-height North's
  // name/status and the lifted hand. Compact art yields, never type or targets.
  const paddingTop = landscape
    ? insets.top + PidroSpacing.lg
    : northSeatBottom(layout, insets.top + topReserve) + PidroSpacing.xs;
  const paddingBottom = landscape
    ? insets.bottom + PidroSpacing.lg
    : height - handTop + PidroSpacing.xxl;
  // The roomy two-row window needs about 350pt with its two-line description.
  const compact = landscape || height - paddingTop - paddingBottom < 360;

  const suitCounts = useMemo(() => {
    const counts: Record<Suit, number> = { hearts: 0, diamonds: 0, clubs: 0, spades: 0 };
    cards?.forEach((card) => {
      counts[card.suit] += 1;
    });
    return counts;
  }, [cards]);

  const handleSelect = async (suit: Suit) => {
    if (isSubmitting) return;
    setSelectedSuit(suit);
    setSubmissionError(null);
    setIsSubmitting(true);
    try {
      await onSelectTrump(suit);
    } catch (error) {
      console.error('[Game] Declare trump failed:', error);
      setSubmissionError(error);
      setSelectedSuit(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <View
      style={[
        styles.overlay,
        {
          paddingTop,
          paddingBottom,
        },
      ]}
      pointerEvents="box-none">
      <DecisionWindow
        testID="trump-window"
        title={t('game.choose_trump')}
        description={t('game.choose_trump_description')}
        compact={compact}
        scrollable={compact}
        style={{ width: Math.min(width - 24, landscape ? 620 : 390) }}>
        <View style={[styles.suitGrid, landscape && styles.suitGridLandscape]}>
          {SUITS.map((value) => {
            const label = t(`game.${value}`);
            const count = suitCounts[value];
            const selected = selectedSuit === value;
            return (
              <PressableFX
                key={value}
                accessibilityRole="button"
                accessibilityLabel={t('game.suit_hand', {
                  suit: label,
                  cards: t('game.cards', { count }),
                })}
                accessibilityState={{ selected, disabled: isSubmitting }}
                onPress={() => handleSelect(value)}
                disabled={isSubmitting}
                style={[
                  styles.suitButton,
                  compact && styles.suitButtonTight,
                  landscape && styles.suitButtonLandscape,
                  selected && styles.suitButtonSelected,
                  isSubmitting && !selected && styles.suitButtonDisabled,
                ]}
                pressedStyle={styles.suitButtonPressed}>
                <Image
                  source={SUIT_IMAGES[value]}
                  style={[styles.suitImage, compact && styles.suitImageLandscape]}
                  resizeMode="contain"
                />
                <View style={styles.suitCopy}>
                  <PidroText role="label" align="center">
                    {label}
                  </PidroText>
                  <PidroText role="metadata" tone={selected ? 'gold' : 'muted'} align="center">
                    {selected && isSubmitting ? t('game.declaring') : t('game.cards', { count })}
                  </PidroText>
                </View>
              </PressableFX>
            );
          })}
        </View>
        {submissionError ? (
          <PidroText role="metadata" tone="danger" align="center">
            {localizedError(submissionError, 'game.trump_failed')}
          </PidroText>
        ) : null}
      </DecisionWindow>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: PidroSpacing.sm,
  },
  suitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: PidroSpacing.sm,
  },
  suitGridLandscape: {
    flexWrap: 'nowrap',
  },
  suitButton: {
    width: '47%',
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    gap: PidroSpacing.xs,
    borderRadius: PidroRadii.surface,
    borderWidth: 1,
    borderColor: PidroColors.cyanBorder,
    backgroundColor: PidroColors.glass,
    padding: PidroSpacing.sm,
  },
  suitButtonLandscape: {
    width: '24%',
    minWidth: PidroLayout.touchTarget,
    minHeight: 68,
    flexDirection: 'row',
    padding: PidroSpacing.xs,
  },
  suitButtonTight: {
    minHeight: 48,
    flexDirection: 'row',
    padding: PidroSpacing.xxs,
  },
  suitButtonSelected: {
    borderColor: PidroColors.gold,
    backgroundColor: PidroColors.goldSoft,
  },
  suitButtonDisabled: {
    opacity: 0.48,
  },
  suitButtonPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
  suitImage: {
    width: 38,
    height: 38,
  },
  suitImageLandscape: {
    width: 30,
    height: 30,
  },
  suitCopy: {
    minWidth: 0,
  },
});
