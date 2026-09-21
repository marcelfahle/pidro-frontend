import { useEffect, useState, type KeyboardEvent } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  PidroColors,
  PidroLayout,
  PidroRadii,
  PidroSpacing,
  PidroSwitchTokens,
} from '@/design/tokens';
import { gradientBg } from './Bevel';
import { PidroText } from './PidroText';

interface PidroSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
}

const travel = PidroSwitchTokens.width - PidroSwitchTokens.thumbSize - 2 * PidroSwitchTokens.inset;

/** A controlled switch: carved track, raised glass thumb, one accessible hit target. */
export function PidroSwitch({
  value,
  onValueChange,
  accessibilityLabel,
  disabled = false,
}: PidroSwitchProps) {
  const [focused, setFocused] = useState(false);
  const position = useSharedValue(value ? travel : 0);
  useEffect(() => {
    position.set(
      withTiming(value ? travel : 0, { duration: 140, reduceMotion: ReduceMotion.System })
    );
  }, [position, value]);
  const thumbPosition = useAnimatedStyle(() => ({ transform: [{ translateX: position.value }] }));

  // RN Web's Pressable does not activate switch roles with Space. Own both
  // activation keys in capture so its Enter handler cannot toggle a second time.
  const keyboardProps =
    Platform.OS === 'web'
      ? {
          onKeyDownCapture: (event: KeyboardEvent) => {
            if (event.key !== ' ' && event.key !== 'Enter') return;
            event.preventDefault();
            event.stopPropagation();
            if (!disabled && !event.repeat) onValueChange(!value);
          },
        }
      : {};

  return (
    <Pressable
      {...keyboardProps}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      aria-checked={value}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[styles.target, disabled && styles.disabled]}>
      <View pointerEvents="none" style={[styles.rim, focused && !disabled && styles.focused]}>
        <View style={[styles.track, value ? styles.on : styles.off]}>
          <Animated.View style={[styles.thumb, thumbPosition]} />
        </View>
      </View>
      <PidroText role="metadata" tone={value ? 'cyan' : 'soft'} accessible={false}>
        {value ? 'On' : 'Off'}
      </PidroText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  target: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: PidroLayout.touchTarget,
    minHeight: PidroLayout.touchTarget,
    padding: PidroSpacing.xxs,
    gap: PidroSpacing.xxs,
    borderRadius: PidroRadii.surface,
  },
  rim: {
    padding: 1,
    borderRadius: PidroRadii.full,
    ...gradientBg(PidroSwitchTokens.offGradient),
    backgroundColor: PidroColors.borderStrong,
  },
  track: {
    width: PidroSwitchTokens.width,
    height: PidroSwitchTokens.height,
    borderRadius: PidroRadii.full,
    boxShadow: PidroSwitchTokens.trackShadow,
  },
  on: gradientBg(PidroSwitchTokens.onGradient),
  off: gradientBg(PidroSwitchTokens.offGradient),
  thumb: {
    position: 'absolute',
    top: PidroSwitchTokens.inset,
    left: PidroSwitchTokens.inset,
    width: PidroSwitchTokens.thumbSize,
    height: PidroSwitchTokens.thumbSize,
    borderRadius: PidroRadii.full,
    ...gradientBg(PidroSwitchTokens.thumbGradient),
    boxShadow: PidroSwitchTokens.thumbShadow,
  },
  focused: { boxShadow: PidroSwitchTokens.focusShadow },
  disabled: { opacity: PidroSwitchTokens.disabledOpacity },
});
