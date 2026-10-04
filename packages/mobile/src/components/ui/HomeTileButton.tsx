import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BevelPressable, type BevelMaterial } from '@/components/ui/Bevel';
import { PidroText } from '@/components/ui/PidroText';
import { PidroBevel, PidroColors, PidroFonts } from '@/design/tokens';

export type HomeTileSize = 'phone' | 'landscape' | 'tablet';

export interface HomeTileButtonProps {
  material: BevelMaterial;
  icon: ReactNode;
  title: string;
  subtitle: string;
  status?: string;
  size?: HomeTileSize;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

export function HomeTileButton({
  material,
  icon,
  title,
  subtitle,
  status,
  size = 'phone',
  loading = false,
  disabled = false,
  onPress,
  testID,
  style,
}: HomeTileButtonProps) {
  const wood = material === 'wood';
  const accessibilityLabel = [title, subtitle, status].filter(Boolean).join('. ') + '.';

  return (
    <BevelPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      material={material}
      weight={wood ? 'hero' : 'lite'}
      radius={size === 'tablet' ? 18 : wood ? 18 : 13}
      disabled={disabled || loading}
      onPress={onPress}
      testID={testID}
      style={[styles.rim, styles[`${size}Rim`], style]}
      contentStyle={[styles.face, styles[`${size}Face`]]}>
      {loading ? (
        <ActivityIndicator color={wood ? PidroBevel.textGold : PidroColors.text} />
      ) : (
        <>
          {icon}
          <View style={styles.copy}>
            <PidroText
              align="center"
              style={[
                wood ? styles.woodTitle : styles.glassTitle,
                size === 'tablet' && styles.tabletTitle,
              ]}>
              {title}
            </PidroText>
            <PidroText
              align="center"
              style={[
                styles.subtitle,
                wood && styles.woodSubtitle,
                size === 'tablet' && styles.tabletSubtitle,
              ]}>
              {subtitle}
            </PidroText>
            {status ? (
              <PidroText
                align="center"
                style={[
                  styles.status,
                  wood ? styles.woodStatus : styles.glassStatus,
                  size === 'tablet' && styles.tabletStatus,
                ]}>
                {status}
              </PidroText>
            ) : null}
          </View>
        </>
      )}
    </BevelPressable>
  );
}

const styles = StyleSheet.create({
  rim: {
    flex: 1,
    minWidth: 0,
  },
  phoneRim: { minHeight: 164 },
  landscapeRim: { minHeight: 150 },
  tabletRim: { minHeight: 210 },
  face: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  phoneFace: { gap: 8, paddingVertical: 16 },
  landscapeFace: { gap: 6, paddingVertical: 12 },
  tabletFace: { gap: 10, paddingVertical: 20, paddingHorizontal: 12 },
  copy: { alignItems: 'center', gap: 2 },
  woodTitle: {
    fontFamily: PidroFonts.display,
    fontWeight: '400',
    fontSize: 22,
    lineHeight: 29,
    color: PidroBevel.textGold,
    ...PidroBevel.labelShadow,
    transform: [{ translateY: -1 }],
  },
  glassTitle: {
    fontFamily: PidroFonts.ui,
    fontWeight: '900',
    fontSize: 20,
    lineHeight: 26,
    color: PidroColors.text,
    ...PidroBevel.glassLabelShadow,
    transform: [{ translateY: -0.5 }],
  },
  tabletTitle: { fontSize: 28, lineHeight: 36 },
  subtitle: {
    fontFamily: PidroFonts.ui,
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 17,
    color: PidroColors.text,
  },
  woodSubtitle: { color: PidroColors.textOnWood },
  tabletSubtitle: { fontSize: 16, lineHeight: 21 },
  status: {
    fontFamily: PidroFonts.ui,
    fontWeight: '800',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
  woodStatus: { color: PidroBevel.textGold },
  glassStatus: { color: PidroColors.cyanStatus },
  tabletStatus: { fontSize: 14, lineHeight: 18 },
});
