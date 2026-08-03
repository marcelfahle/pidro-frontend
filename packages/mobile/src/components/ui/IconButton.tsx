import { Feather } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import { PidroColors, PidroRadii, PidroSpacing, PidroType } from '@/design/tokens';
import { PidroText } from './PidroText';
import { PressableFX } from './PressableFX';

interface IconButtonProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  tone?: 'cyan' | 'gold';
}

export function IconButton({
  icon,
  label,
  onPress,
  disabled = false,
  tone = 'cyan',
}: IconButtonProps) {
  return (
    <PressableFX
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={[
        styles.button,
        tone === 'gold' && styles.goldButton,
        (disabled || !onPress) && styles.disabled,
      ]}>
      <Feather name={icon} size={22} color={tone === 'gold' ? PidroColors.ink : PidroColors.text} />
      <PidroText
        role="metadata"
        style={[styles.label, tone === 'gold' && styles.goldLabel]}
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}>
        {label}
      </PidroText>
    </PressableFX>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 68,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    gap: PidroSpacing.xxs,
    paddingHorizontal: PidroSpacing.xs,
    paddingVertical: PidroSpacing.xs,
    overflow: 'hidden',
    borderRadius: PidroRadii.surface,
    borderWidth: 1.5,
    borderColor: PidroColors.border,
    backgroundColor: PidroColors.glass,
  },
  goldButton: {
    borderColor: PidroColors.goldDark,
    backgroundColor: PidroColors.gold,
  },
  label: {
    ...PidroType.metadata,
    color: PidroColors.textSoft,
  },
  goldLabel: {
    color: PidroColors.ink,
  },
  disabled: {
    opacity: 0.44,
  },
});
