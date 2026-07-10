import { Image, View, StyleSheet, ImageSourcePropType } from 'react-native';
import type {
  Card,
  RelativePlayerView,
  RelativePosition,
  ServerTrickPlay,
  Suit,
} from '@/types/game';
import type { Position } from '@/types/lobby';
import { getCardImage } from '@/utils/cardImages';

const SUIT_IMAGES: Record<Suit, ImageSourcePropType> = {
  hearts: require('~/assets/images/heart.png'),
  diamonds: require('~/assets/images/diamond.png'),
  clubs: require('~/assets/images/club.png'),
  spades: require('~/assets/images/spade.png'),
};

interface TrickAreaProps {
  plays?: unknown;
  players: RelativePlayerView[];
  currentTurnRelative: RelativePosition | null;
  trumpSuit?: Suit | null;
}

const positionStyleMap: Record<RelativePosition, object> = {
  north: { top: -12, left: '50%', transform: [{ translateX: -28 }] },
  south: { bottom: -12, left: '50%', transform: [{ translateX: -28 }] },
  east: { right: -12, top: '50%', transform: [{ translateY: -40 }] },
  west: { left: -12, top: '50%', transform: [{ translateY: -40 }] },
};

function TrickCard({ card }: { card: Card }) {
  const cardImage = getCardImage(card);

  return (
    <View style={styles.trickCard}>
      <Image source={cardImage} style={styles.cardImage} resizeMode="contain" />
    </View>
  );
}

function normalizePlay(raw: unknown): ServerTrickPlay | null {
  if (!raw || typeof raw !== 'object') return null;

  const obj = raw as Record<string, unknown>;

  // Backend sends: {position: "west", card: {rank: 14, suit: "diamonds"}}
  const playerKey = 'position' in obj ? 'position' : 'player' in obj ? 'player' : null;
  if (!playerKey || typeof obj[playerKey] !== 'string') return null;
  if (!obj.card || typeof obj.card !== 'object') return null;

  const card = obj.card as Record<string, unknown>;
  if (typeof card.rank !== 'number' || typeof card.suit !== 'string') return null;

  return {
    player: obj[playerKey] as Position,
    card: { rank: card.rank, suit: card.suit as Suit },
  };
}

export function TrickArea({ plays, players, trumpSuit }: TrickAreaProps) {
  const playsByRelative: Partial<Record<RelativePosition, Card>> = {};

  // Debug: log what we receive
  console.log('[TrickArea] plays:', JSON.stringify(plays, null, 2));

  if (Array.isArray(plays)) {
    plays.forEach((raw) => {
      const play = normalizePlay(raw);
      console.log('[TrickArea] normalized:', raw, '->', play);
      if (!play) return;
      const found = players.find((p) => p.absolutePosition === play.player);
      if (found) {
        playsByRelative[found.relativePosition] = play.card;
      }
    });
  }

  const trumpImage = trumpSuit ? SUIT_IMAGES[trumpSuit] : SUIT_IMAGES.spades;

  return (
    <View style={styles.container}>
      <Image source={trumpImage} style={styles.trumpImage} resizeMode="contain" />

      {(['north', 'east', 'south', 'west'] as RelativePosition[]).map((pos) => {
        const card = playsByRelative[pos];
        if (!card) return null;
        return (
          <View key={pos} style={[styles.cardSlot, positionStyleMap[pos]]}>
            <TrickCard card={card} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    height: 200,
    width: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trumpImage: {
    width: 64,
    height: 64,
  },

  cardSlot: {
    position: 'absolute',
    alignItems: 'center',
  },

  trickCard: {
    height: 80,
    width: 56,
    borderRadius: 6,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
});
