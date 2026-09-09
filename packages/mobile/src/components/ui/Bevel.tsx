/**
 * DS v2 bevel primitives.
 *
 * Every beveled control is the same four-layer sandwich: gold/glass RIM
 * (gradient, light falls from above) → dark KEYLINE (wood only) → FACE
 * (material gradient + inset top glint + bottom lip) → GLOSS lens overlay.
 * Gradients ride RN 0.76+'s `experimental_backgroundImage` on native and
 * plain CSS `backgroundImage` on react-native-web; the glint/lip are inset
 * entries in a `boxShadow` string (New Architecture only).
 *
 * Press physics: the whole button travels 2px down while the drop shadow
 * tightens and the lip compresses — no scale, no opacity flicker.
 */
import { useCallback, useState, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { PidroBevel } from '@/design/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const PRESS_IN = {
  duration: 90,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
} as const;

const PRESS_OUT = {
  duration: 130,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
} as const;

export type BevelMaterial = 'wood' | 'glass';

/** 'lite' is the everyday calibration; 'hero' is the full-fat chrome
 *  reserved for one dominant CTA per screen (thicker rim, deeper lip,
 *  stronger gloss and shadow). */
export type BevelWeight = 'lite' | 'hero';

export function gradientBg(css: string): ViewStyle {
  return Platform.OS === 'web'
    ? ({ backgroundImage: css } as unknown as ViewStyle)
    : { experimental_backgroundImage: css };
}

const RIM_PAD: Record<BevelWeight, Record<BevelMaterial, number>> = {
  lite: { wood: 2, glass: 1.25 },
  hero: { wood: 2.5, glass: 1.5 },
};
const KEY_PAD: Record<BevelWeight, Record<BevelMaterial, number>> = {
  lite: { wood: 1, glass: 0 },
  hero: { wood: 1.5, glass: 0 },
};

interface BevelChrome {
  material: BevelMaterial;
  weight: BevelWeight;
  radius: number;
  pressed: boolean;
}

function chromePads({ material, weight }: BevelChrome) {
  return { rimPad: RIM_PAD[weight][material], keyPad: KEY_PAD[weight][material] };
}

function rimStyle(chrome: BevelChrome): ViewStyle[] {
  const { material, weight, radius, pressed } = chrome;
  const wood = material === 'wood';
  const hero = weight === 'hero';
  return [
    { borderRadius: radius, padding: chromePads(chrome).rimPad },
    gradientBg(wood ? PidroBevel.goldRimGradient : PidroBevel.glassRimGradient),
    {
      boxShadow: pressed
        ? hero
          ? PidroBevel.heroDropShadowPressed
          : wood
            ? PidroBevel.dropShadowPressed
            : PidroBevel.glassDropShadowPressed
        : hero
          ? PidroBevel.heroDropShadow
          : wood
            ? PidroBevel.dropShadow
            : PidroBevel.glassDropShadow,
    },
  ];
}

function faceStyle(chrome: BevelChrome): ViewStyle[] {
  const { material, weight, radius, pressed } = chrome;
  const wood = material === 'wood';
  const hero = weight === 'hero' && wood;
  const { rimPad, keyPad } = chromePads(chrome);
  return [
    styles.face,
    { borderRadius: radius - rimPad - keyPad },
    gradientBg(wood ? PidroBevel.woodFaceGradient : PidroBevel.glassFaceGradient),
    {
      boxShadow: pressed
        ? hero
          ? PidroBevel.heroFaceInsetPressed
          : wood
            ? PidroBevel.woodFaceInsetPressed
            : PidroBevel.glassFaceInsetPressed
        : hero
          ? PidroBevel.heroFaceInset
          : wood
            ? PidroBevel.woodFaceInset
            : PidroBevel.glassFaceInset,
    },
  ];
}

function BevelGloss(chrome: BevelChrome) {
  const { material, weight, radius, pressed } = chrome;
  const { rimPad, keyPad } = chromePads(chrome);
  const faceRadius = radius - rimPad - keyPad;
  const glossGradient =
    material === 'wood'
      ? weight === 'hero'
        ? PidroBevel.heroGlossGradient
        : PidroBevel.woodGlossGradient
      : PidroBevel.glassGlossGradient;
  return (
    <View
      pointerEvents="none"
      style={[
        styles.gloss,
        {
          borderTopLeftRadius: faceRadius,
          borderTopRightRadius: faceRadius,
          opacity: pressed ? 0.55 : 1,
        },
        gradientBg(glossGradient),
      ]}
    />
  );
}

interface BevelLayersProps extends BevelChrome {
  contentStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
}

/** Keyline + face + gloss — everything inside the rim. */
function BevelLayers({
  material,
  weight,
  radius,
  pressed,
  contentStyle,
  children,
}: BevelLayersProps) {
  const chrome = { material, weight, radius, pressed };
  const face = (
    <View style={[...faceStyle(chrome), contentStyle]}>
      <BevelGloss {...chrome} />
      {children}
    </View>
  );
  if (material !== 'wood') return face;
  const { rimPad, keyPad } = chromePads(chrome);
  return (
    <View
      style={{
        borderRadius: radius - rimPad,
        padding: keyPad,
        backgroundColor: PidroBevel.keyline,
      }}>
      {face}
    </View>
  );
}

export interface BevelSurfaceProps {
  material?: BevelMaterial;
  weight?: BevelWeight;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
}

/** Static (non-pressable) bevel surface. */
export function BevelSurface({
  material = 'wood',
  weight = 'lite',
  radius = 14,
  style,
  contentStyle,
  children,
}: BevelSurfaceProps) {
  return (
    <View style={[...rimStyle({ material, weight, radius, pressed: false }), style]}>
      <BevelLayers
        material={material}
        weight={weight}
        radius={radius}
        pressed={false}
        contentStyle={contentStyle}>
        {children}
      </BevelLayers>
    </View>
  );
}

export interface BevelPressableProps extends Omit<PressableProps, 'style' | 'children'> {
  material?: BevelMaterial;
  weight?: BevelWeight;
  radius?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
}

/** Pressable bevel with the DS press physics (2px travel, shadows tighten). */
export function BevelPressable({
  material = 'wood',
  weight = 'lite',
  radius = 14,
  disabled = false,
  style,
  contentStyle,
  onPressIn,
  onPressOut,
  children,
  ...rest
}: BevelPressableProps) {
  const [pressed, setPressed] = useState(false);
  const pressProgress = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(pressProgress.value, [0, 1], [0, 2]) }],
  }));

  const handlePressIn = useCallback(
    (event: GestureResponderEvent) => {
      setPressed(true);
      pressProgress.set(withTiming(1, PRESS_IN));
      onPressIn?.(event);
    },
    [onPressIn, pressProgress]
  );
  const handlePressOut = useCallback(
    (event: GestureResponderEvent) => {
      setPressed(false);
      pressProgress.set(withTiming(0, PRESS_OUT));
      onPressOut?.(event);
    },
    [onPressOut, pressProgress]
  );

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        ...rimStyle({ material, weight, radius, pressed }),
        disabled && styles.disabled,
        animatedStyle,
        style,
      ]}>
      <BevelLayers
        material={material}
        weight={weight}
        radius={radius}
        pressed={pressed}
        contentStyle={contentStyle}>
        {children}
      </BevelLayers>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  face: {
    overflow: 'hidden',
  },
  gloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '46%',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  disabled: {
    opacity: 0.55,
  },
});
