import { useState } from 'react';
import { Image, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { BevelButton } from '@/components/ui/BevelButton';
import { DecisionWindow } from '@/components/ui/DecisionWindow';
import { PidroText } from '@/components/ui/PidroText';
import { PressableFX } from '@/components/ui/PressableFX';
import { PidroColors, PidroRadii, PidroSpacing } from '@/design/tokens';
import type { Card, GameViewModel, Suit } from '@/types/game';
import { getCardImage } from '@/utils/cardImages';
import { getPidroPoints } from '@/utils/cards';
import { useTranslation } from '@/i18n';
import { actionTap, pushAttempt } from '@/diagnostics/actions';

interface HandSelectorProps {
  viewModel: GameViewModel;
  cards: Card[];
  trumpSuit: Suit | null;
  onSelectHand: (cards: Card[]) => void | Promise<void>;
}

const TARGET_COUNT = 6;

export function HandSelector({ viewModel, cards, trumpSuit, onSelectHand }: HandSelectorProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const youPlayer = viewModel.players.find((player) => player.isYou);
  const isYourTurn = youPlayer?.isCurrentTurn ?? false;

  // Everyone else watches the dealer's pick on the table, in no words.
  if (!isYourTurn) return null;

  const toggleCard = (index: number) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(index)) next.delete(index);
      else if (next.size < TARGET_COUNT) next.add(index);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (isSubmitting || selected.size !== TARGET_COUNT) {
      pushAttempt('select_hand').record('blocked', isSubmitting ? 'pending' : 'illegal_action');
      return;
    }
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
      title={t('game.choose_hand')}
      description={t('game.choose_hand_description', { count: TARGET_COUNT })}
      context={
        <PidroText role="metadata" tone={selected.size === TARGET_COUNT ? 'gold' : 'cyan'}>
          {t('game.selection_status', {
            selected: selected.size,
            target: TARGET_COUNT,
            count: cards.length,
          })}
        </PidroText>
      }
      compact={landscape}
      footer={
        <BevelButton
          label={t('game.keep_cards')}
          haptic={false}
          onPress={() => actionTap('select_hand', handleConfirm)}
          loading={isSubmitting}
          disabled={selected.size !== TARGET_COUNT}
          size="sm"
          style={styles.confirmButton}
        />
      }
      style={{ width: Math.min(width - 24, landscape ? 760 : 520), maxHeight: height - 40 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cardRow}
        accessibilityLabel={t('game.available_cards')}>
        {cards.map((card, index) => {
          const isSelected = selected.has(index);
          const disabled = !isSelected && selected.size >= TARGET_COUNT;
          const points = trumpSuit ? getPidroPoints(card.rank, card.suit, trumpSuit) : null;

          return (
            <PressableFX
              key={`${card.suit}-${card.rank}-${index}`}
              accessibilityRole="button"
              accessibilityLabel={t(
                points === null ? 'game.card_accessibility' : 'game.card_points_accessibility',
                {
                  rank:
                    card.rank === 11 || card.rank === 12 || card.rank === 13 || card.rank === 14
                      ? t(`game.rank.${card.rank}`)
                      : String(card.rank),
                  suit: t(`game.${card.suit}`),
                  points: points === null ? '' : t('game.points', { count: points }),
                }
              )}
              accessibilityState={{ selected: isSelected, disabled: isSubmitting || disabled }}
              onPress={() => actionTap('select_card', () => toggleCard(index))}
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
                    {t('game.points_short', { count: points })}
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
