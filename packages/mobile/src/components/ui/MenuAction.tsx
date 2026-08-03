import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { PidroColors, PidroLayout, PidroRadii, PidroSpacing } from '@/design/tokens';
import { PidroText } from './PidroText';
import { PressableFX } from './PressableFX';

interface MenuActionProps {
  title: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
  style?: StyleProp<ViewStyle>;
}

export function MenuAction({
  title,
  description,
  icon,
  onPress,
  loading = false,
  variant = 'secondary',
  style,
}: MenuActionProps) {
  const primary = variant === 'primary';

  return (
    <PressableFX
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}`}
      accessibilityState={{ disabled: loading, busy: loading }}
      disabled={loading}
      onPress={onPress}
      style={[styles.action, primary ? styles.primary : styles.secondary, style]}
      pressedStyle={primary ? styles.primaryPressed : styles.secondaryPressed}>
      <View style={[styles.icon, primary ? styles.primaryIcon : styles.secondaryIcon]}>
        {loading ? (
          <ActivityIndicator color={primary ? PidroColors.goldLight : PidroColors.cyanText} />
        ) : (
          <Feather
            name={icon}
            size={22}
            color={primary ? PidroColors.goldLight : PidroColors.cyanText}
          />
        )}
      </View>

      <View style={styles.copy}>
        <PidroText role="label" style={primary && styles.primaryTitle} numberOfLines={1}>
          {title}
        </PidroText>
        <PidroText
          role="metadata"
          tone={primary ? 'soft' : 'muted'}
          style={primary && styles.primaryDescription}
          numberOfLines={2}>
          {description}
        </PidroText>
      </View>

      <Feather
        name="chevron-right"
        size={22}
        color={primary ? PidroColors.goldLight : PidroColors.textMuted}
      />
    </PressableFX>
  );
}

const styles = StyleSheet.create({
  action: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.sm,
    overflow: 'hidden',
    borderRadius: PidroRadii.lg,
    borderWidth: 1.5,
    paddingHorizontal: PidroSpacing.sm,
    paddingVertical: PidroSpacing.sm,
  },
  primary: {
    borderColor: PidroColors.actionPrimaryBorder,
    backgroundColor: PidroColors.actionPrimary,
  },
  primaryPressed: {
    backgroundColor: PidroColors.actionPrimaryPressed,
  },
  secondary: {
    borderColor: PidroColors.cyanBorder,
    backgroundColor: PidroColors.panelStrong,
  },
  secondaryPressed: {
    backgroundColor: PidroColors.glassHover,
  },
  icon: {
    width: PidroLayout.touchTarget,
    height: PidroLayout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: PidroRadii.surface,
    borderWidth: 1,
  },
  primaryIcon: {
    borderColor: PidroColors.actionPrimaryBorder,
    backgroundColor: 'rgba(29, 13, 3, 0.28)',
  },
  secondaryIcon: {
    borderColor: PidroColors.cyanBorder,
    backgroundColor: PidroColors.glass,
  },
  copy: {
    minWidth: 0,
    flex: 1,
    gap: PidroSpacing.xxs,
  },
  primaryTitle: {
    color: PidroColors.goldLight,
  },
  primaryDescription: {
    color: PidroColors.textSoft,
  },
});
