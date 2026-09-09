/**
 * DS v2 buttons on the bevel construction.
 *
 * `wood` is the primary CTA (Bree Serif gold label), `glass` the secondary.
 * Labels carry a 1px optical lift — the shadow under the glyphs otherwise
 * makes them read low in the face.
 */
import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { PidroBevel, PidroFonts, PidroLayout } from '@/design/tokens';
import { PidroText } from './PidroText';
import { BevelPressable, type BevelMaterial, type BevelPressableProps } from './Bevel';

type BevelButtonSize = 'sm' | 'md' | 'lg' | 'hero' | 'icon';

export interface BevelButtonProps extends Omit<
  BevelPressableProps,
  'children' | 'contentStyle' | 'radius'
> {
  label?: string;
  children?: ReactNode;
  material?: BevelMaterial;
  size?: BevelButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

const FACE_SIZES: Record<BevelButtonSize, ViewStyle> = {
  sm: { paddingVertical: 10, paddingHorizontal: 18 },
  md: { paddingVertical: 13, paddingHorizontal: 26 },
  lg: { paddingVertical: 17, paddingHorizontal: 40 },
  // Extra bottom padding gives the hero's 6px lip room to read.
  hero: { paddingTop: 18, paddingBottom: 24, paddingHorizontal: 40 },
  icon: { width: 42, height: 42, paddingVertical: 0, paddingHorizontal: 0 },
};

// Bree Serif descenders need ~1.3 line-height or g/p/y clip against the
// PidroText role's inherited lineHeight.
const WOOD_LABEL_SIZES: Record<
  BevelButtonSize,
  { fontSize: number; lineHeight: number; letterSpacing?: number }
> = {
  sm: { fontSize: 15, lineHeight: 20 },
  md: { fontSize: 19, lineHeight: 25 },
  lg: { fontSize: 23, lineHeight: 30 },
  hero: { fontSize: 34, lineHeight: 44, letterSpacing: 2 },
  icon: { fontSize: 0, lineHeight: 0 },
};
const GLASS_LABEL_SIZES: Record<
  BevelButtonSize,
  { fontSize: number; lineHeight: number; letterSpacing?: number }
> = {
  sm: { fontSize: 14, lineHeight: 19 },
  md: { fontSize: 16, lineHeight: 21 },
  lg: { fontSize: 18, lineHeight: 24 },
  hero: { fontSize: 20, lineHeight: 26 },
  icon: { fontSize: 0, lineHeight: 0 },
};

export function BevelButton({
  label,
  children,
  material = 'wood',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  style,
  ...rest
}: BevelButtonProps) {
  const wood = material === 'wood';
  const content =
    label != null ? (
      <PidroText
        style={[
          wood ? styles.woodLabel : styles.glassLabel,
          wood ? WOOD_LABEL_SIZES[size] : GLASS_LABEL_SIZES[size],
        ]}
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}>
        {label}
      </PidroText>
    ) : (
      children
    );

  return (
    <BevelPressable
      accessibilityRole="button"
      accessibilityLabel={rest.accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      material={material}
      weight={size === 'hero' ? 'hero' : 'lite'}
      radius={size === 'icon' ? 12 : size === 'hero' ? 20 : 14}
      disabled={disabled || loading}
      style={[styles.rim, fullWidth && styles.fullWidth, style]}
      contentStyle={[styles.face, FACE_SIZES[size]]}
      {...rest}>
      {loading ? <ActivityIndicator color={wood ? PidroBevel.textGold : '#ffffff'} /> : content}
    </BevelPressable>
  );
}

const styles = StyleSheet.create({
  rim: {
    alignSelf: 'flex-start',
    minHeight: PidroLayout.touchTarget,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  face: {
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  woodLabel: {
    fontFamily: PidroFonts.display,
    fontWeight: '400',
    color: PidroBevel.textGold,
    letterSpacing: 0.4,
    ...PidroBevel.labelShadow,
    transform: [{ translateY: -1 }],
  },
  glassLabel: {
    fontFamily: PidroFonts.ui,
    fontWeight: '800',
    color: '#ffffff',
    ...PidroBevel.glassLabelShadow,
    transform: [{ translateY: -0.5 }],
  },
});
