import type { Card, Suit } from '@/types/game';
import type { ImageSourcePropType } from 'react-native';

const CARD_IMAGES: Record<Suit, Record<number, ImageSourcePropType>> = {
  clubs: {
    2: require('~/assets/images/cards/clubs_2.png'),
    3: require('~/assets/images/cards/clubs_3.png'),
    4: require('~/assets/images/cards/clubs_4.png'),
    5: require('~/assets/images/cards/clubs_5.png'),
    6: require('~/assets/images/cards/clubs_6.png'),
    7: require('~/assets/images/cards/clubs_7.png'),
    8: require('~/assets/images/cards/clubs_8.png'),
    9: require('~/assets/images/cards/clubs_9.png'),
    10: require('~/assets/images/cards/clubs_10.png'),
    11: require('~/assets/images/cards/clubs_11.png'),
    12: require('~/assets/images/cards/clubs_12.png'),
    13: require('~/assets/images/cards/clubs_13.png'),
    14: require('~/assets/images/cards/clubs_14.png'),
  },
  diamonds: {
    2: require('~/assets/images/cards/diamonds_2.png'),
    3: require('~/assets/images/cards/diamonds_3.png'),
    4: require('~/assets/images/cards/diamonds_4.png'),
    5: require('~/assets/images/cards/diamonds_5.png'),
    6: require('~/assets/images/cards/diamonds_6.png'),
    7: require('~/assets/images/cards/diamonds_7.png'),
    8: require('~/assets/images/cards/diamonds_8.png'),
    9: require('~/assets/images/cards/diamonds_9.png'),
    10: require('~/assets/images/cards/diamonds_10.png'),
    11: require('~/assets/images/cards/diamonds_11.png'),
    12: require('~/assets/images/cards/diamonds_12.png'),
    13: require('~/assets/images/cards/diamonds_13.png'),
    14: require('~/assets/images/cards/diamonds_14.png'),
  },
  hearts: {
    2: require('~/assets/images/cards/hearts_2.png'),
    3: require('~/assets/images/cards/hearts_3.png'),
    4: require('~/assets/images/cards/hearts_4.png'),
    5: require('~/assets/images/cards/hearts_5.png'),
    6: require('~/assets/images/cards/hearts_6.png'),
    7: require('~/assets/images/cards/hearts_7.png'),
    8: require('~/assets/images/cards/hearts_8.png'),
    9: require('~/assets/images/cards/hearts_9.png'),
    10: require('~/assets/images/cards/hearts_10.png'),
    11: require('~/assets/images/cards/hearts_11.png'),
    12: require('~/assets/images/cards/hearts_12.png'),
    13: require('~/assets/images/cards/hearts_13.png'),
    14: require('~/assets/images/cards/hearts_14.png'),
  },
  spades: {
    2: require('~/assets/images/cards/spades_2.png'),
    3: require('~/assets/images/cards/spades_3.png'),
    4: require('~/assets/images/cards/spades_4.png'),
    5: require('~/assets/images/cards/spades_5.png'),
    6: require('~/assets/images/cards/spades_6.png'),
    7: require('~/assets/images/cards/spades_7.png'),
    8: require('~/assets/images/cards/spades_8.png'),
    9: require('~/assets/images/cards/spades_9.png'),
    10: require('~/assets/images/cards/spades_10.png'),
    11: require('~/assets/images/cards/spades_11.png'),
    12: require('~/assets/images/cards/spades_12.png'),
    13: require('~/assets/images/cards/spades_13.png'),
    14: require('~/assets/images/cards/spades_14.png'),
  },
};

export function getCardImage(card: Card): ImageSourcePropType {
  return CARD_IMAGES[card.suit][card.rank];
}
