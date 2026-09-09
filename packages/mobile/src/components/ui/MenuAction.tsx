import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { PidroBevel, PidroColors, PidroFonts, PidroLayout, PidroSpacing } from '@/design/tokens';
import { PidroText } from './PidroText';
import { BevelPressable } from './Bevel';

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
    <BevelPressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}`}
      accessibilityState={{ disabled: loading, busy: loading }}
      disabled={loading}
      onPress={onPress}
      material={primary ? 'wood' : 'glass'}
      style={style}
      contentStyle={styles.face}>
      <View style={[styles.icon, primary ? styles.primaryIcon : styles.secondaryIcon]}>
        {loading ? (
          <ActivityIndicator color={primary ? PidroBevel.textGold : PidroColors.cyanText} />
        ) : (
          <Feather
            name={icon}
            size={22}
            color={primary ? PidroBevel.textGold : PidroColors.cyanText}
          />
        )}
      </View>

      <View style={styles.copy}>
        <PidroText
          role="label"
          style={primary ? styles.primaryTitle : styles.secondaryTitle}
          numberOfLines={1}>
          {title}
        </PidroText>
        <PidroText
          role="metadata"
          tone="soft"
          style={primary && styles.primaryDescription}
          numberOfLines={2}>
          {description}
        </PidroText>
      </View>

      <Feather
        name="chevron-right"
        size={22}
        color={primary ? PidroBevel.textGold : PidroColors.textMuted}
      />
    </BevelPressable>
  );
}

const styles = StyleSheet.create({
  face: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.sm,
    paddingHorizontal: PidroSpacing.sm,
    paddingVertical: PidroSpacing.xs + 2,
  },
  icon: {
    width: PidroLayout.touchTarget,
    height: PidroLayout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  primaryIcon: {
    borderColor: 'rgba(246, 222, 154, 0.28)',
    backgroundColor: 'rgba(20, 9, 2, 0.35)',
  },
  secondaryIcon: {
    borderColor: PidroColors.cyanBorder,
    backgroundColor: 'rgba(7, 38, 66, 0.45)',
  },
  copy: {
    minWidth: 0,
    flex: 1,
    gap: PidroSpacing.xxs,
  },
  primaryTitle: {
    fontFamily: PidroFonts.display,
    fontWeight: '400',
    fontSize: 18,
    lineHeight: 22,
    color: PidroBevel.textGold,
    letterSpacing: 0.3,
    ...PidroBevel.labelShadow,
    transform: [{ translateY: -1 }],
  },
  secondaryTitle: {
    ...PidroBevel.glassLabelShadow,
  },
  primaryDescription: {
    color: 'rgba(244, 231, 205, 0.78)',
  },
});
