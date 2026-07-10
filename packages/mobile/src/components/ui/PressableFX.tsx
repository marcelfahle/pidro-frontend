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

  const handlePressIn = useCallback(
    (event: GestureResponderEvent) => {
      setPressed(true);
      onPressIn?.(event);
    },
    [onPressIn]
  );
  const handlePressOut = useCallback(
    (event: GestureResponderEvent) => {
      setPressed(false);
      onPressOut?.(event);
    },
    [onPressOut]
  );

  return (
    <Pressable
      {...rest}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, pressed && pressedStyle]}>
      {children}
    </Pressable>
  );
}
