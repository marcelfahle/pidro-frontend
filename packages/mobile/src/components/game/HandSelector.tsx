import { useState } from 'react';
import { Image, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { DecisionWindow } from '@/components/ui/DecisionWindow';
import { PidroText } from '@/components/ui/PidroText';
import { PressableFX } from '@/components/ui/PressableFX';
import { Surface } from '@/components/ui/Surface';
import { PidroColors, PidroRadii, PidroSpacing } from '@/design/tokens';
import type { Card, GameViewModel, Suit } from '@/types/game';
import { getCardImage } from '@/utils/cardImages';
import { getRankLabel } from '@/utils/cards';

interface HandSelectorProps {
  viewModel: GameViewModel;
  cards: Card[];
  trumpSuit: Suit | null;
  onSelectHand: (cards: Card[]) => void | Promise<void>;
}

const RED_SUITS = new Set<Suit>(['hearts', 'diamonds']);

function getPidroPoints(rank: number, suit: Suit, trumpSuit: Suit): number | null {
  if (suit === trumpSuit) {
    if (rank === 14 || rank === 2 || rank === 11) return 1;
    if (rank === 10) return 10;
    if (rank === 5) return 5;
  }
  if (rank === 5) {
    const trumpIsRed = RED_SUITS.has(trumpSuit);
    const cardIsRed = RED_SUITS.has(suit);
    if (trumpIsRed !== cardIsRed) return 5;
  }
  return null;
}

const TARGET_COUNT = 6;

export function HandSelector({ viewModel, cards, trumpSuit, onSelectHand }: HandSelectorProps) {
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const youPlayer = viewModel.players.find((player) => player.isYou);
  const isYourTurn = youPlayer?.isCurrentTurn ?? false;

  if (!isYourTurn) {
    const currentTurnPlayer = viewModel.players.find((player) => player.isCurrentTurn);
    return (
      <Surface variant="window" style={styles.waitingWindow}>
        <PidroText role="label" align="center">
          Waiting for {currentTurnPlayer?.username ?? 'the dealer'}
        </PidroText>
        <PidroText role="metadata" tone="muted" align="center">
          They are choosing the cards to keep.
        </PidroText>
      </Surface>
    );
  }

  const toggleCard = (index: number) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(index)) next.delete(index);
      else if (next.size < TARGET_COUNT) next.add(index);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (isSubmitting || selected.size !== TARGET_COUNT) return;
    setIsSubmitting(true);
    try {
      await onSelectHand(cards.filter((_, index) => selected.has(index)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const cardWidth = landscape ? 56 : 64;
  const cardHeight = cardWidth * (110 / 78);

  return (
    <DecisionWindow
      testID="hand-selection-window"
      title="Choose your hand"
      description={`Select exactly ${TARGET_COUNT} cards to keep.`}
      context={
        <PidroText role="metadata" tone={selected.size === TARGET_COUNT ? 'gold' : 'cyan'}>
          {selected.size} of {TARGET_COUNT} selected · Swipe to review all {cards.length} cards
        </PidroText>
      }
      compact={landscape}
      footer={
        <Button
          label="Keep selected cards"
          onPress={handleConfirm}
          loading={isSubmitting}
          disabled={selected.size !== TARGET_COUNT}
          style={styles.confirmButton}
        />
      }
      style={{ width: Math.min(width - 24, landscape ? 760 : 520), maxHeight: height - 40 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cardRow}
        accessibilityLabel="Cards available to keep">
        {cards.map((card, index) => {
          const isSelected = selected.has(index);
          const disabled = !isSelected && selected.size >= TARGET_COUNT;
          const points = trumpSuit ? getPidroPoints(card.rank, card.suit, trumpSuit) : null;

          return (
            <PressableFX
              key={`${card.suit}-${card.rank}-${index}`}
              accessibilityRole="button"
              accessibilityLabel={`${getRankLabel(card.rank)} of ${card.suit}${points !== null ? `, worth ${points} ${points === 1 ? 'point' : 'points'}` : ''}`}
              accessibilityState={{ selected: isSelected, disabled: isSubmitting || disabled }}
              onPress={() => toggleCard(index)}
              disabled={isSubmitting || disabled}
              style={[
                styles.card,
                { width: cardWidth, height: cardHeight },
                isSelected && styles.cardSelected,
                disabled && styles.cardDisabled,
              ]}
              pressedStyle={styles.cardPressed}>
              <Image source={getCardImage(card)} style={styles.cardImage} resizeMode="contain" />
              {points !== null ? (
                <View style={styles.pointBadge}>
                  <PidroText role="metadata" style={styles.pointText} maxFontSizeMultiplier={1}>
                    {points} pt
                  </PidroText>
                </View>
              ) : null}
              {isSelected ? (
                <View style={styles.selectedBadge}>
                  <PidroText role="metadata" style={styles.selectedText} maxFontSizeMultiplier={1}>
                    ✓
                  </PidroText>
                </View>
              ) : null}
            </PressableFX>
          );
        })}
      </ScrollView>
    </DecisionWindow>
  );
}

const styles = StyleSheet.create({
  waitingWindow: {
    width: 'auto',
    maxWidth: 380,
    gap: PidroSpacing.xs,
    padding: PidroSpacing.md,
  },
  cardRow: {
    alignItems: 'center',
    gap: PidroSpacing.xs,
    paddingTop: PidroSpacing.xs,
    paddingBottom: PidroSpacing.sm,
  },
  card: {
    overflow: 'hidden',
    borderRadius: PidroRadii.tight,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: PidroColors.panel,
  },
  cardSelected: {
    borderColor: PidroColors.cyan,
    transform: [{ translateY: -6 }],
  },
  cardDisabled: {
    opacity: 0.42,
  },
  cardPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }],
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  pointBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    borderRadius: PidroRadii.full,
    backgroundColor: PidroColors.gold,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  pointText: {
    color: PidroColors.ink,
    fontSize: 9,
    lineHeight: 11,
  },
  selectedBadge: {
    position: 'absolute',
    right: 3,
    bottom: 3,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: PidroRadii.full,
    backgroundColor: PidroColors.cyan,
  },
  selectedText: {
    color: PidroColors.ink,
    fontSize: 12,
    lineHeight: 14,
  },
  confirmButton: {
    minWidth: 180,
  },
});
