/**
 * The quiet × that removes a row: ignore a request, cancel a sent one,
 * dismiss a notice. Round, borderless, 44pt. The label must name what it
 * dismisses ("Ignore Pekka's request"), so it is required.
 */
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { PidroColors, PidroLayout, PidroRadii } from '@/design/tokens';
import { Icon } from './Icon';
import { PressableFX } from './PressableFX';

export interface DismissButtonProps {
  accessibilityLabel: string;
  onPress?: () => void;
  disabled?: boolean;
}

export function DismissButton({
  accessibilityLabel,
  onPress,
  disabled = false,
}: DismissButtonProps) {
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  return (
    <PressableFX
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[
        styles.button,
        pressed && styles.pressed,
        focused && styles.focused,
        disabled && styles.disabled,
      ]}>
      <Icon
        name="close"
        size={20}
        strokeWidth={2.6}
        color={pressed ? PidroColors.text : PidroColors.textSoft}
      />
    </PressableFX>
  );
}

const styles = StyleSheet.create({
  button: {
    width: PidroLayout.touchTarget,
    height: PidroLayout.touchTarget,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: PidroRadii.full,
  },
  pressed: { backgroundColor: PidroColors.actionPill },
  focused: { boxShadow: PidroColors.focusRing },
  disabled: { opacity: 0.55 },
});
