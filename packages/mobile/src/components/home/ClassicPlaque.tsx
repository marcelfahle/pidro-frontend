import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { PidroText } from '@/components/ui/PidroText';
import { PressableFX } from '@/components/ui/PressableFX';
import { PidroColors, PidroLayout, PidroRadii, PidroSpacing } from '@/design/tokens';

export function ClassicPlaque({
  onPress,
  disabled = false,
}: {
  onPress: () => void;
  disabled?: boolean;
}) {
  const { width, height } = useWindowDimensions();
  const tablet = Math.min(width, height) >= 700;

  return (
    <PressableFX
      accessibilityRole="button"
      accessibilityLabel="Played Pidro Classic? Bring your name and games."
      disabled={disabled}
      onPress={onPress}
      style={[styles.plaque, tablet && styles.plaqueTablet, disabled && styles.disabled]}>
      <View style={[styles.icon, tablet && styles.iconTablet]}>
        <Icon name="cards" size={tablet ? 30 : 26} color={PidroColors.cyan} />
      </View>
      <View style={styles.copy}>
        <PidroText style={[styles.title, tablet && styles.titleTablet]}>
          Played Pidro Classic?
        </PidroText>
        <PidroText style={[styles.subtitle, tablet && styles.subtitleTablet]}>
          Bring your name and games.
        </PidroText>
      </View>
      <Icon name="chevron-right" size={tablet ? 24 : 22} color={PidroColors.cyanText} />
    </PressableFX>
  );
}

const styles = StyleSheet.create({
  plaque: {
    width: '100%',
    minHeight: 64,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.sm,
    borderWidth: 1,
    borderRadius: PidroRadii.lg,
    borderColor: PidroColors.cyanBorderStrong,
    backgroundColor: PidroColors.panel,
    boxShadow: PidroColors.plaqueShadow,
  },
  plaqueTablet: { minHeight: 76, padding: 12, paddingRight: 18, gap: 14 },
  icon: {
    width: PidroLayout.touchTarget,
    height: PidroLayout.touchTarget,
    flexShrink: 0,
    borderRadius: PidroRadii.panel,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PidroColors.cyanSoft,
  },
  iconTablet: { width: 52, height: 52, borderRadius: PidroRadii.lg },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: PidroColors.text },
  titleTablet: { fontSize: 18, lineHeight: 24 },
  subtitle: { fontSize: 13, lineHeight: 17, fontWeight: '700', color: PidroColors.textSoft },
  subtitleTablet: { fontSize: 15, lineHeight: 20 },
  disabled: { opacity: 0.5 },
});
