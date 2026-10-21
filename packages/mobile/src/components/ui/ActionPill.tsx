/**
 * The light row action: a tinted, full-round pill with an icon and a short
 * label ("Add", "Join", "Play"). Cyan by default; `gold` is for the one
 * action that answers someone ("Accept"). With `selected` it is a choice
 * chip (rules), and the chosen one turns gold.
 *
 * It is flat on purpose: rows carry several of these, so they stay lighter
 * than the beveled CTA the screen leads with. The sm pill is 38pt to look at
 * but keeps a 44pt touch target.
 */
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { PidroBevel, PidroColors, PidroLayout, PidroRadii, PidroType } from '@/design/tokens';
import { Icon, type IconName } from './Icon';
import { PidroText } from './PidroText';
import { PressableFX } from './PressableFX';
import { playSelectionHaptic } from '@/utils/haptics';

export interface ActionPillProps {
  label: string;
  icon?: IconName;
  variant?: 'default' | 'gold';
  size?: 'md' | 'sm';
  /** Makes the pill a choice chip (a radio); the chosen one is gold. */
  selected?: boolean;
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  /** Name what the pill acts on when the label alone does not ("Join Nora's table"). */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function ActionPill({
  label,
  icon,
  variant = 'default',
  size = 'md',
  selected,
  loading = false,
  disabled = false,
  onPress,
  accessibilityLabel,
  style,
}: ActionPillProps) {
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const pressIn = useCallback(() => setPressed(true), []);
  const pressOut = useCallback(() => setPressed(false), []);
  const focus = useCallback(() => setFocused(true), []);
  const blur = useCallback(() => setFocused(false), []);
  const gold = variant === 'gold' || selected === true;
  const sm = size === 'sm';
  const inert = disabled || loading;
  const ink = gold ? PidroBevel.textGold : PidroColors.iconOnGlass;
  const chip = selected !== undefined;

  return (
    <PressableFX
      accessibilityRole={chip ? 'radio' : 'button'}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={
        chip ? { checked: selected, disabled: inert } : { disabled: inert, busy: loading }
      }
      aria-checked={selected}
      disabled={inert}
      onPress={
        onPress
          ? () => {
              if (inert) return;
              playSelectionHaptic();
              onPress();
            }
          : undefined
      }
      onPressIn={pressIn}
      onPressOut={pressOut}
      onFocus={focus}
      onBlur={blur}
      style={[styles.target, inert && styles.disabled, style]}>
      <View
        style={[
          styles.pill,
          sm ? styles.sm : styles.md,
          icon || loading ? (sm ? styles.smWithIcon : styles.mdWithIcon) : null,
          gold ? styles.gold : styles.cyan,
          pressed && (gold ? styles.goldPressed : styles.cyanPressed),
          focused && styles.focused,
        ]}>
        {loading ? (
          <ActivityIndicator size="small" color={ink} />
        ) : icon ? (
          <Icon name={icon} size={sm ? 16 : 18} color={ink} strokeWidth={2.2} />
        ) : null}
        <PidroText
          role="label"
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
          style={[sm ? styles.smLabel : styles.mdLabel, { color: ink }]}>
          {label}
        </PidroText>
      </View>
    </PressableFX>
  );
}

const styles = StyleSheet.create({
  target: {
    minWidth: PidroLayout.touchTarget,
    minHeight: PidroLayout.touchTarget,
    justifyContent: 'center',
    flexShrink: 0,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: PidroRadii.full,
    borderWidth: 1.5,
  },
  md: { height: 44, paddingHorizontal: 14 },
  sm: { height: 38, paddingHorizontal: 12 },
  mdWithIcon: { paddingLeft: 11 },
  smWithIcon: { paddingLeft: 9 },
  cyan: {
    backgroundColor: PidroColors.actionPill,
    borderColor: PidroColors.actionPillBorder,
  },
  gold: {
    backgroundColor: PidroColors.actionPillGold,
    borderColor: PidroBevel.rim,
  },
  cyanPressed: { backgroundColor: PidroColors.actionPillPressed },
  goldPressed: { backgroundColor: PidroColors.actionPillGoldPressed },
  focused: { boxShadow: PidroColors.focusRing },
  mdLabel: { fontSize: 15, lineHeight: 19 },
  smLabel: PidroType.label,
  disabled: { opacity: 0.55 },
});
