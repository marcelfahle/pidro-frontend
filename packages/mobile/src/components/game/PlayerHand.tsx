import { useMemo } from 'react';
import { Image, Text, TouchableOpacity, View, StyleSheet, useWindowDimensions } from 'react-native';
import type { Card, GamePhase, Suit } from '@/types/game';
import { formatSuitLabel } from '@/utils/cards';
import { getCardImage } from '@/utils/cardImages';

const SUIT_ORDER: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];

function sortCards(cards: Card[], trumpSuit: Suit | null | undefined): Card[] {
  return [...cards].sort((a, b) => {
    const aIsTrump = trumpSuit && a.suit === trumpSuit;
    const bIsTrump = trumpSuit && b.suit === trumpSuit;

    // Trump cards come first
    if (aIsTrump && !bIsTrump) return -1;
    if (!aIsTrump && bIsTrump) return 1;

    // Within same trump status, sort by suit order
    const aSuitIndex = SUIT_ORDER.indexOf(a.suit);
    const bSuitIndex = SUIT_ORDER.indexOf(b.suit);
    if (aSuitIndex !== bSuitIndex) return aSuitIndex - bSuitIndex;

    // Within same suit, sort by rank (high to low)
    return b.rank - a.rank;
  });
}

const COLORS = {
  white: '#ffffff',
  white90: 'rgba(255, 255, 255, 0.9)',
  white80: 'rgba(255, 255, 255, 0.8)',
  white70: 'rgba(255, 255, 255, 0.7)',
  white50: 'rgba(255, 255, 255, 0.5)',
  white15: 'rgba(255, 255, 255, 0.15)',
  white10: 'rgba(255, 255, 255, 0.1)',
  white05: 'rgba(255, 255, 255, 0.05)',
  black30: 'rgba(0, 0, 0, 0.3)',
  blue200: 'rgb(191, 219, 254)',
  blue200_70: 'rgba(191, 219, 254, 0.7)',
  blue100_70: 'rgba(219, 234, 254, 0.7)',
  blue400: 'rgb(96, 165, 250)',
  yellow200: 'rgb(254, 240, 138)',
  yellow200_80: 'rgba(254, 240, 138, 0.8)',
  yellow400_20: 'rgba(250, 204, 21, 0.2)',
};

interface PlayingCardProps {
  card: Card;
  highlight?: boolean;
  disabled?: boolean;
  onPress?: (card: Card) => void;
  offset?: number;
  index?: number;
}

function PlayingCard({
  card,
  highlight,
  disabled,
  onPress,
  offset = 0,
  index = 0,
}: PlayingCardProps) {
  const cardImage = getCardImage(card);
  const CardWrapper = onPress ? TouchableOpacity : View;

  return (
    <CardWrapper
      disabled={disabled}
      onPress={onPress ? () => onPress(card) : undefined}
      style={[
        styles.card,
        highlight && styles.cardHighlight,
        disabled && styles.cardDisabled,
        { marginLeft: index === 0 ? 0 : offset, zIndex: index },
      ]}>
      <Image source={cardImage} style={styles.cardImage} resizeMode="contain" />
    </CardWrapper>
  );
}

interface PlayerHandProps {
  cards?: Card[] | null;
  cardCount?: number | null;
  isYourTurn?: boolean;
  trumpSuit?: Suit | null;
  phase?: GamePhase;
  onCardPress?: (card: Card) => void;
  isSubmittingPlay?: boolean;
}

const CARD_WIDTH = 80;
const CONTAINER_PADDING = 32;

export function PlayerHand({
  cards,
  cardCount,
  isYourTurn,
  trumpSuit,
  phase,
  onCardPress,
  isSubmittingPlay,
}: PlayerHandProps) {
  const { width: screenWidth } = useWindowDimensions();
  const sortedCards = useMemo(() => (cards ? sortCards(cards, trumpSuit) : []), [cards, trumpSuit]);
  const hasCards = sortedCards.length > 0;
  const pendingMessage =
    phase === 'bidding'
      ? 'Waiting for cards from the dealer...'
      : 'No cards to show yet. Stay tuned!';

  const cardOverlap = useMemo(() => {
    if (sortedCards.length <= 1) return 0;
    const availableWidth = screenWidth - CONTAINER_PADDING;
    const totalCardWidth = sortedCards.length * CARD_WIDTH;
    if (totalCardWidth <= availableWidth) return 0;
    const overlap = (totalCardWidth - availableWidth) / (sortedCards.length - 1);
    return -overlap;
  }, [sortedCards.length, screenWidth]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>Your Hand</Text>
          <Text style={styles.headerInfo}>
            {hasCards
              ? `${sortedCards.length} card${sortedCards.length > 1 ? 's' : ''}`
              : pendingMessage}
          </Text>
          {onCardPress && isYourTurn && phase === 'playing' && (
            <Text style={styles.headerHint}>Tap a card to play{isSubmittingPlay ? '…' : ''}</Text>
          )}
        </View>

        <View style={styles.badges}>
          {trumpSuit && (
            <View style={styles.trumpBadge}>
              <Text style={styles.trumpBadgeText}>Trump: {formatSuitLabel(trumpSuit)}</Text>
            </View>
          )}
          {isYourTurn && (
            <View style={styles.turnBadge}>
              <Text style={styles.turnBadgeText}>Your turn</Text>
            </View>
          )}
        </View>
      </View>

      {hasCards ? (
        <View style={styles.cardFan}>
          {sortedCards.map((card, idx) => (
            <PlayingCard
              key={`${card.suit}-${card.rank}-${idx}`}
              card={card}
              onPress={onCardPress}
              disabled={isSubmittingPlay}
              offset={cardOverlap}
              index={idx}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No cards yet</Text>
          {typeof cardCount === 'number' && cardCount > 0 && (
            <Text style={styles.emptyStateHint}>Server shows {cardCount} card(s)</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: 16,
  },

  // Header
  header: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: COLORS.blue200_70,
  },
  headerInfo: { fontSize: 14, fontWeight: '600', color: COLORS.white },
  headerHint: { marginTop: 2, fontSize: 12, color: COLORS.yellow200_80 },

  // Badges
  badges: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trumpBadge: {
    borderRadius: 9999,
    backgroundColor: COLORS.white10,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  trumpBadgeText: { fontSize: 12, fontWeight: '600', color: COLORS.white80 },
  turnBadge: {
    borderRadius: 9999,
    backgroundColor: COLORS.yellow400_20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  turnBadgeText: { fontSize: 12, fontWeight: '600', color: COLORS.yellow200 },

  // Card Fan (overlapping layout)
  cardFan: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Playing Card
  card: {
    height: 112,
    width: 80,
    borderRadius: 8,
    overflow: 'hidden',
  },
  cardHighlight: { borderColor: COLORS.blue400, borderWidth: 2 },
  cardDisabled: { opacity: 0.6 },
  cardImage: {
    width: '100%',
    height: '100%',
  },

  // Empty State
  emptyState: {
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.white15,
    backgroundColor: COLORS.white05,
    paddingVertical: 24,
  },
  emptyStateText: { fontSize: 14, fontWeight: '600', color: COLORS.white80 },
  emptyStateHint: { fontSize: 12, color: COLORS.blue100_70 },
});
