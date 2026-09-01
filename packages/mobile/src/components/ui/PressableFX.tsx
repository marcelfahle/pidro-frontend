/**
 * Pressable with pressed-state styling via static style arrays.
 *
 * RN 0.85 (New Architecture) silently drops ALL styles from Pressable's
 * style-function form (`style={({pressed}) => [...]}`) on native — buttons
 * render unstyled. This wrapper tracks pressed state itself so callers can
 * pass plain styles: `<PressableFX style={s.btn} pressedStyle={s.btnDown}>`.
 */
import { useCallback, useState } from 'react';
import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const PRESS_IN = {
  duration: 110,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
} as const;

const PRESS_OUT = {
  duration: 140,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
} as const;

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  pressedStyle?: StyleProp<ViewStyle>;
};

export function PressableFX({
  style,
  pressedStyle,
  onPressIn,
  onPressOut,
  children,
  ...rest
}: Props) {
  const [pressed, setPressed] = useState(false);
  const pressProgress = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pressProgress.value, [0, 1], [1, 0.97]) }],
  }));

  const handlePressIn = useCallback(
    (event: GestureResponderEvent) => {
      if (pressedStyle) setPressed(true);
      pressProgress.set(withTiming(1, PRESS_IN));
      onPressIn?.(event);
    },
    [onPressIn, pressProgress, pressedStyle]
  );
  const handlePressOut = useCallback(
    (event: GestureResponderEvent) => {
      if (pressedStyle) setPressed(false);
      pressProgress.set(withTiming(0, PRESS_OUT));
      onPressOut?.(event);
    },
    [onPressOut, pressProgress, pressedStyle]
  );

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, pressed && pressedStyle, animatedStyle]}>
      {children}
    </AnimatedPressable>
  );
}
