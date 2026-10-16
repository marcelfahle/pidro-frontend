import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { getPidroPoints, getRankLabel, SUIT_SYMBOLS, type Card, type Suit } from '@pidro/shared';
import { gradientBg } from '@/components/ui/Bevel';
import { PidroText } from '@/components/ui/PidroText';
import { PidroColors, PidroFonts, PidroGameOver } from '@/design/tokens';
import { t } from '@/i18n';

const red = (suit: Suit) => suit === 'hearts' || suit === 'diamonds';

export const cardName = (card: Card) => `${getRankLabel(card.rank)}${SUIT_SYMBOLS[card.suit]}`;

/** A playing card on paper, drawn at any width; height follows at 10:7. */
export function PaperCard({
  card,
  width,
  pidro = false,
  style,
  children,
}: {
  card: Card;
  width: number;
  pidro?: boolean;
  style?: ViewStyle | (ViewStyle | false | null)[];
  children?: React.ReactNode;
}) {
  const ink = { color: red(card.suit) ? PidroColors.leagueCardRed : PidroColors.leagueCardInk };
  const rank = Math.round(width * 0.27);
  return (
    <View
      style={[
        styles.card,
        { width, height: Math.round(width / 0.7), borderRadius: Math.round(width * 0.09) },
        style,
      ]}>
      <View style={[styles.corner, { left: width * 0.08, top: width * 0.07 }]}>
        <PidroText style={[styles.rank, ink, { fontSize: rank, lineHeight: rank * 1.1 }]}>
          {getRankLabel(card.rank)}
        </PidroText>
        <PidroText style={[ink, { fontSize: rank * 0.72, lineHeight: rank * 0.8 }]}>
          {SUIT_SYMBOLS[card.suit]}
        </PidroText>
      </View>
      <PidroText
        style={[ink, styles.pip, { fontSize: width * 0.52, lineHeight: width * 0.62 }]}
        accessible={false}>
        {SUIT_SYMBOLS[card.suit]}
      </PidroText>
      {pidro && width >= 72 ? (
        <PidroText
          style={[
            styles.pidro,
            { right: width * 0.09, bottom: width * 0.07, fontSize: width * 0.09 },
          ]}>
          PIDRO
        </PidroText>
      ) : null}
      {children}
    </View>
  );
}

/**
 * The card that won the last trick, rising between two of its other cards. `rise` runs
 * 0→1 (the card comes up out of the trick), `fan` 0→1 (the others open out).
 */
export function LastTrickStage({
  winner,
  others,
  trump,
  width,
  rise,
  fan,
  sweep,
}: {
  winner: Card;
  others: Card[];
  trump?: Suit | null;
  width: number;
  rise: Animated.Value;
  fan: Animated.Value;
  sweep: boolean;
}) {
  const side = Math.round(width * 0.75);
  const sideHeight = Math.round(side / 0.7);
  const heroHeight = Math.round(width / 0.7);
  const stageWidth = width + side * 1.15;
  const pidro = getPidroPoints(winner.rank, winner.suit, trump) === 5;
  const label = t('game.last_trick_card', { card: cardName(winner) });
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={{ width: stageWidth, height: heroHeight + width * 0.12 }}>
      {others.map((card, index) => (
        <Animated.View
          key={`${card.rank}${card.suit}`}
          style={[
            styles.side,
            {
              left: index === 0 ? 0 : stageWidth - side,
              top: (heroHeight - sideHeight) / 2 + width * 0.12,
              opacity: fan,
              transform: [
                {
                  rotate: fan.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', index === 0 ? '-20deg' : '10deg'],
                  }),
                },
              ],
            },
          ]}>
          <PaperCard card={card} width={side} style={{ boxShadow: PidroGameOver.sideCardShadow }} />
        </Animated.View>
      ))}
      <Animated.View
        style={[
          styles.side,
          {
            left: (stageWidth - width) / 2,
            top: 0,
            opacity: rise.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
            transform: [
              { translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [width, 0] }) },
              {
                rotate: rise.interpolate({
                  inputRange: [0, 0.6, 1],
                  outputRange: ['-30deg', '-3deg', '-6deg'],
                }),
              },
              { scale: rise.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.6, 1.08, 1] }) },
            ],
          },
        ]}>
        <PaperCard
          card={winner}
          width={width}
          pidro={pidro}
          style={{ boxShadow: PidroGameOver.heroCardShadow }}>
          {sweep ? <Sheen width={width} /> : null}
        </PaperCard>
      </Animated.View>
    </View>
  );
}

/** One foil sweep across the card, then it rests. */
function Sheen({ width }: { width: number }) {
  const [x] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const sweep = Animated.timing(x, {
      toValue: 1,
      duration: 1400,
      delay: 1200,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: Platform.OS !== 'web',
    });
    sweep.start();
    return () => sweep.stop();
  }, [x]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.sheen,
        gradientBg(PidroGameOver.sheenGradient),
        {
          width: width * 0.6,
          transform: [
            {
              translateX: x.interpolate({ inputRange: [0, 1], outputRange: [-width, width * 1.6] }),
            },
            { skewX: '-12deg' },
          ],
        },
      ]}
    />
  );
}

/** The point cards your team took in its best hand, fanned. */
export function BestHandFan({ cards, width }: { cards: Card[]; width: number }) {
  const shown = cards.slice(0, 6);
  const step = Math.round(width * (shown.length > 3 ? 0.42 : 0.6));
  const middle = (shown.length - 1) / 2;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={shown.map(cardName).join(', ')}
      style={{
        width: width + step * (shown.length - 1) + width * 0.1,
        height: Math.round(width / 0.7) + width * 0.2,
      }}>
      {shown.map((card, index) => (
        <PaperCard
          key={`${card.rank}${card.suit}${index}`}
          card={card}
          width={width}
          style={[
            styles.fanned,
            {
              left: index * step,
              top: Math.abs(index - middle) * width * 0.08,
              transform: [{ rotate: `${(index - middle) * (shown.length > 3 ? 6 : 12)}deg` }],
            },
            card.rank === 5 && { boxShadow: PidroGameOver.bestCardShadow },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: PidroColors.leagueCardFace,
    borderWidth: 1,
    borderColor: PidroColors.leagueCardEdge,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: { position: 'absolute', alignItems: 'center' },
  rank: { fontFamily: PidroFonts.display, fontWeight: '400' },
  pip: { marginTop: '18%' },
  pidro: {
    position: 'absolute',
    fontFamily: PidroFonts.ui,
    fontWeight: '900',
    letterSpacing: 1,
    color: PidroGameOver.pidroInk,
  },
  side: { position: 'absolute' },
  fanned: { position: 'absolute', boxShadow: PidroGameOver.sideCardShadow },
  sheen: { position: 'absolute', top: '-20%', bottom: '-20%', left: 0 },
});
