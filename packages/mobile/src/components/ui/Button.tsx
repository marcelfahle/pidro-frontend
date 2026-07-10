import { ActivityIndicator, PressableProps, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { isValidElement, type ReactNode } from 'react';
import { PidroColors, PidroLayout, PidroRadii, PidroSpacing, PidroType } from '@/design/tokens';
import { PidroText } from './PidroText';
import { PressableFX } from './PressableFX';

type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

export interface ButtonProps extends Omit<PressableProps, 'disabled' | 'children' | 'style'> {
  label?: string;
  children?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant | null;
  size?: ButtonSize | null;
  className?: string;
  textClassName?: string;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  loading,
  children,
  disabled,
  variant = 'default',
  size = 'default',
  className,
  textClassName,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const resolvedVariant = variant ?? 'default';
  const resolvedSize = size ?? 'default';
  const spinnerColor =
    resolvedVariant === 'outline' || resolvedVariant === 'secondary' || resolvedVariant === 'ghost'
      ? PidroColors.text
      : resolvedVariant === 'default'
        ? PidroColors.ink
        : PidroColors.text;
  const content = label ?? children;
  const renderedContent =
    typeof content === 'string' || typeof content === 'number' ? (
      <PidroText
        className={textClassName}
        style={[
          styles.text,
          styles[`${resolvedVariant}Text` as const],
          styles[`${resolvedSize}SizeText` as const],
        ]}
        numberOfLines={2}
        maxFontSizeMultiplier={1.5}>
        {content}
      </PidroText>
    ) : isValidElement(content) ? (
      content
    ) : null;

  return (
    <PressableFX
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      className={className}
      style={[
        styles.base,
        styles[resolvedVariant],
        styles[`${resolvedSize}Size` as const],
        isDisabled && styles.disabled,
        style,
      ]}
      pressedStyle={!isDisabled ? styles.pressed : undefined}
      {...props}>
      {loading ? <ActivityIndicator color={spinnerColor} /> : renderedContent}
    </PressableFX>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: PidroLayout.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: PidroSpacing.xs,
    overflow: 'hidden',
    borderRadius: PidroRadii.surface,
    paddingHorizontal: PidroSpacing.md,
    paddingVertical: 9,
  },
  default: {
    borderWidth: 1.5,
    borderColor: PidroColors.goldDark,
    backgroundColor: PidroColors.gold,
  },
  secondary: {
    borderWidth: 1.5,
    borderColor: PidroColors.cyanBorderStrong,
    backgroundColor: PidroColors.glass,
  },
  outline: {
    borderWidth: 1,
    borderColor: PidroColors.borderStrong,
    backgroundColor: 'rgba(0, 18, 34, 0.24)',
  },
  ghost: {
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  link: {
    minHeight: PidroLayout.touchTarget,
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: PidroSpacing.xs,
  },
  destructive: {
    borderWidth: 1.5,
    borderColor: PidroColors.dangerBorder,
    backgroundColor: PidroColors.dangerBg,
  },
  defaultSize: {},
  smSize: {
    minHeight: PidroLayout.touchTarget,
    paddingHorizontal: PidroSpacing.sm,
    paddingVertical: 8,
  },
  lgSize: {
    minHeight: 52,
    paddingHorizontal: PidroSpacing.lg,
    paddingVertical: PidroSpacing.sm,
  },
  iconSize: {
    width: PidroLayout.touchTarget,
    minHeight: PidroLayout.touchTarget,
    paddingHorizontal: 0,
  },
  text: {
    ...PidroType.label,
    textAlign: 'center',
  },
  defaultText: {
    color: PidroColors.ink,
  },
  secondaryText: {
    color: PidroColors.text,
  },
  outlineText: {
    color: PidroColors.text,
  },
  ghostText: {
    color: PidroColors.textSoft,
  },
  linkText: {
    color: PidroColors.cyan,
  },
  destructiveText: {
    color: PidroColors.dangerText,
  },
  defaultSizeText: {},
  smSizeText: {
    fontSize: 13,
    lineHeight: 17,
  },
  lgSizeText: {
    fontSize: 17,
    lineHeight: 22,
  },
  iconSizeText: {
    fontSize: 0,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.45,
  },
});
