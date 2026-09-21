import { useEffect } from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { PidroText } from '@/components/ui/PidroText';
import { Surface } from '@/components/ui/Surface';
import { PidroColors, PidroRadii, PidroSpacing } from '@/design/tokens';
import type { Card, DealerRobPresentation, GameViewModel, Suit } from '@/types/game';
import { getCardImage } from '@/utils/cardImages';
import { HandSelector } from './HandSelector';

type Props = {
  viewModel: GameViewModel;
  cards: Card[] | null;
  trumpSuit: Suit | null;
  canSelectHand: boolean;
  automaticPresentation?: DealerRobPresentation | null;
  onSelectHand: (cards: Card[]) => void | Promise<void>;
};

const BACK: ImageSourcePropType =
  Platform.OS === 'web' ? { uri: '/cards/cardback.png' } : require('~/assets/images/cardback.png');

/**
 * A deliberately symbolic three-card pack: it communicates the physical dealer
 * rob without encoding the private number of cards in the stock or dealer pool.
 */
export function DealerSecondDeal({
  viewModel,
  cards,
  trumpSuit,
  canSelectHand,
  automaticPresentation,
  onSelectHand,
}: Props) {
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(reducedMotion ? 1 : 0);
  const offset = useSharedValue(reducedMotion ? 0 : -18);
  const dealer = viewModel.players.find(
    (player) => player.absolutePosition === viewModel.dealerAbsolute
  );
  const youAreDealer = dealer?.isYou ?? false;
  const hasAuthoritativePool = canSelectHand && !!cards && cards.length >= 6;
  const hasAutomaticPrivatePool =
    youAreDealer && !!automaticPresentation?.pool && !!automaticPresentation.kept;

  useEffect(() => {
    if (reducedMotion) {
      opacity.value = 1;
      offset.value = 0;
      return;
    }
    opacity.value = withTiming(1, { duration: 180 });
    offset.value = withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) });
  }, [offset, opacity, reducedMotion]);

  const motion = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: offset.value }],
  }));

  if (hasAutomaticPrivatePool) {
    return (
      <Animated.View style={motion}>
        <AutomaticDealerRob presentation={automaticPresentation} />
      </Animated.View>
    );
  }

  if (hasAuthoritativePool) {
    return (
      <HandSelector
        viewModel={viewModel}
        cards={cards}
        trumpSuit={trumpSuit}
        onSelectHand={onSelectHand}
      />
    );
  }

  return (
    <Animated.View style={motion}>
      <Surface
        testID="dealer-second-deal-status"
        variant="window"
        accessibilityRole="summary"
        style={styles.statusWindow}>
        <View testID="dealer-pack-symbol" style={styles.pack} accessibilityElementsHidden>
          {[0, 1, 2].map((index) => (
            <Image
              key={index}
              source={BACK}
              resizeMode="contain"
              style={[
                styles.cardBack,
                { left: index * 14, transform: [{ rotate: `${index - 1}deg` }] },
              ]}
            />
          ))}
        </View>
        <View style={styles.copy}>
          <PidroText role="label" tone="gold">
            {youAreDealer ? 'Gathering the pack' : 'Dealer takes the pack'}
          </PidroText>
          <PidroText role="metadata" tone="soft">
            {youAreDealer
              ? 'Waiting for your complete set of cards.'
              : `${dealer?.username ?? 'The dealer'} is choosing six cards to keep.`}
          </PidroText>
        </View>
      </Surface>
    </Animated.View>
  );
}

function AutomaticCard({
  card,
  index,
  step,
}: {
  card: Card;
  index: number;
  step: number;
}) {
  return (
    <View
      testID="automatic-pool-card"
      style={[
        styles.automaticCard,
        { marginLeft: index === 0 ? 0 : step - 52, zIndex: index },
      ]}>
      <Image source={getCardImage(card)} style={styles.automaticCardImage} resizeMode="contain" />
    </View>
  );
}

function AutomaticDealerRob({ presentation }: { presentation: DealerRobPresentation }) {
  const { width } = useWindowDimensions();
  const pool = presentation.pool ?? [];
  const availableWidth = Math.min(width - 24, 520);
  const step = pool.length > 1 ? Math.min(56, (availableWidth - 52) / (pool.length - 1)) : 0;

  return (
    <View
      testID="automatic-dealer-rob"
      accessibilityRole="summary"
      accessibilityLabel="Dealer's combined card pool"
      style={styles.automaticStage}>
      <PidroText role="metadata" tone="gold" align="center">
        Combined pool
      </PidroText>
      <View
        style={[styles.automaticRow, { width: availableWidth }]}
        accessibilityLabel="Dealer's combined card pool">
        {pool.map((card, index) => (
          <AutomaticCard
            key={`${card.suit}-${card.rank}-${index}`}
            card={card}
            index={index}
            step={step}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statusWindow: {
    width: 310,
    maxWidth: '100%',
    minHeight: 116,
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.md,
    padding: PidroSpacing.md,
  },
  pack: {
    width: 88,
    height: 84,
  },
  cardBack: {
    position: 'absolute',
    top: 0,
    width: 58,
    height: 82,
    borderRadius: PidroRadii.tight,
    borderWidth: 1,
    borderColor: PidroColors.cyanBorderStrong,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: PidroSpacing.xs,
  },
  automaticStage: {
    width: '100%',
    alignItems: 'center',
    gap: PidroSpacing.xs,
  },
  automaticRow: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  automaticCard: {
    width: 52,
    height: 73,
    overflow: 'hidden',
    borderRadius: PidroRadii.tight,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: PidroColors.panel,
  },
  automaticCardImage: {
    width: '100%',
    height: '100%',
  },
});
