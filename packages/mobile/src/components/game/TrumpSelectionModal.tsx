import { useMemo, useState } from 'react';
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DecisionWindow } from '@/components/ui/DecisionWindow';
import { PidroText } from '@/components/ui/PidroText';
import { PressableFX } from '@/components/ui/PressableFX';
import { PidroColors, PidroLayout, PidroRadii, PidroSpacing } from '@/design/tokens';
import type { Card, Suit } from '@/types/game';

const SUIT_IMAGES = {
  hearts: require('~/assets/images/heart.png'),
  diamonds: require('~/assets/images/diamond.png'),
  clubs: require('~/assets/images/club.png'),
  spades: require('~/assets/images/spade.png'),
};

const SUITS: { value: Suit; label: string }[] = [
  { value: 'hearts', label: 'Hearts' },
  { value: 'diamonds', label: 'Diamonds' },
  { value: 'clubs', label: 'Clubs' },
  { value: 'spades', label: 'Spades' },
];

interface TrumpSelectionModalProps {
  isOpen: boolean;
  onSelectTrump: (suit: Suit) => Promise<void>;
  cards?: Card[] | null;
}

export function TrumpSelectionModal({ isOpen, onSelectTrump, cards }: TrumpSelectionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSuit, setSelectedSuit] = useState<Suit | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const landscape = width > height;

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
      setSubmissionError('We could not declare that suit. Check your connection and try again.');
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
          paddingTop: insets.top + PidroSpacing.lg,
          paddingBottom: insets.bottom + PidroSpacing.lg,
        },
      ]}
      pointerEvents="box-none">
      <DecisionWindow
        testID="trump-window"
        title="Choose trump"
        description="You won the bid. Choose the trump suit for this hand."
        compact={landscape}
        style={{ width: Math.min(width - 24, landscape ? 620 : 390) }}>
        <View style={[styles.suitGrid, landscape && styles.suitGridLandscape]}>
          {SUITS.map(({ value, label }) => {
            const count = suitCounts[value];
            const selected = selectedSuit === value;
            return (
              <PressableFX
                key={value}
                accessibilityRole="button"
                accessibilityLabel={`${label}, ${count} ${count === 1 ? 'card' : 'cards'} in your hand`}
                accessibilityState={{ selected, disabled: isSubmitting }}
                onPress={() => handleSelect(value)}
                disabled={isSubmitting}
                style={[
                  styles.suitButton,
                  landscape && styles.suitButtonLandscape,
                  selected && styles.suitButtonSelected,
                  isSubmitting && !selected && styles.suitButtonDisabled,
                ]}
                pressedStyle={styles.suitButtonPressed}>
                <Image
                  source={SUIT_IMAGES[value]}
                  style={[styles.suitImage, landscape && styles.suitImageLandscape]}
                  resizeMode="contain"
                />
                <View style={styles.suitCopy}>
                  <PidroText role="label" align="center">
                    {label}
                  </PidroText>
                  <PidroText role="metadata" tone={selected ? 'gold' : 'muted'} align="center">
                    {selected && isSubmitting
                      ? 'Declaring…'
                      : `${count} ${count === 1 ? 'card' : 'cards'}`}
                  </PidroText>
                </View>
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
