import { View, Image, StyleSheet } from 'react-native';

const cardBack = require('~/assets/images/cardback.png');

type Orientation = 'horizontal' | 'vertical';

interface OpponentHandProps {
  cardCount: number | null;
  orientation?: Orientation;
}

const CARD_WIDTH = 32;
const CARD_HEIGHT = 44;
const CARD_OVERLAP = 12;

export function OpponentHand({ cardCount, orientation = 'horizontal' }: OpponentHandProps) {
  const count = cardCount ?? 0;

  if (count === 0) return null;

  const isVertical = orientation === 'vertical';
  const containerStyle = isVertical ? styles.containerVertical : styles.containerHorizontal;

  const cards = Array.from({ length: count }, (_, i) => {
    const offset = i * CARD_OVERLAP;
    const positionStyle = isVertical ? { top: offset } : { left: offset };

    return (
      <View key={i} style={[styles.cardWrapper, positionStyle]}>
        <Image source={cardBack} style={[styles.card, isVertical && styles.cardRotated]} />
      </View>
    );
  });

  const totalWidth = isVertical ? CARD_HEIGHT : CARD_WIDTH + (count - 1) * CARD_OVERLAP;
  const totalHeight = isVertical ? CARD_WIDTH + (count - 1) * CARD_OVERLAP : CARD_HEIGHT;

  return <View style={[containerStyle, { width: totalWidth, height: totalHeight }]}>{cards}</View>;
}

const styles = StyleSheet.create({
  containerHorizontal: {
    position: 'relative',
  },
  containerVertical: {
    position: 'relative',
  },
  cardWrapper: {
    position: 'absolute',
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 4,
  },
  cardRotated: {
    width: CARD_HEIGHT,
    height: CARD_WIDTH,
    transform: [{ rotate: '90deg' }],
  },
});
