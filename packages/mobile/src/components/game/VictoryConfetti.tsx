import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { PidroColors } from '@/design/tokens';

const COLORS = [PidroColors.gold, PidroColors.cyan, PidroColors.iconOnGlass];
// Fixed trajectories keep renders stable. One short burst, never an ambient loop.
const PIECES = Array.from({ length: 28 }, (_, index) => ({
  x: (index * 37) % 100,
  drift: ((index * 19) % 70) - 35,
  delay: (index % 7) * 0.025,
  turn: index % 2 === 0 ? 260 : -220,
  color: COLORS[index % COLORS.length],
}));

export function VictoryConfetti() {
  const reducedMotion = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(0));
  const [finished, setFinished] = useState(false);
  const { height } = useWindowDimensions();

  useEffect(() => {
    if (reducedMotion) return;
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 2800,
      easing: Easing.out(Easing.quad),
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start(({ finished: completed }) => {
      if (completed) setFinished(true);
    });
    return () => animation.stop();
  }, [progress, reducedMotion]);

  if (reducedMotion || finished) return null;
  return (
    <View
      testID="victory-confetti"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.layer}>
      {PIECES.map((piece, index) => (
        <Animated.View
          key={index}
          style={[
            styles.piece,
            {
              left: `${piece.x}%`,
              backgroundColor: piece.color,
              opacity: progress.interpolate({
                inputRange: [0, piece.delay + 0.01, 0.65, 1],
                outputRange: [0, 0.9, 0.9, 0],
              }),
              transform: [
                {
                  translateY: progress.interpolate({
                    inputRange: [piece.delay, 1],
                    outputRange: [-24, height * 0.7],
                    extrapolate: 'clamp',
                  }),
                },
                { translateX: Animated.multiply(progress, piece.drift) },
                {
                  rotate: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', `${piece.turn}deg`],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  piece: { position: 'absolute', top: 0, width: 6, height: 12 },
});
