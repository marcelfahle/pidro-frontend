/**
 * The slowly turning shimmer behind the logo — the legacy game's glow,
 * recreated procedurally so it stays resolution-independent and can later
 * breathe (pulse on level-up, brighten on wins). Twelve soft rays plus a
 * radial halo, one full turn every 80 seconds. Honors reduced motion.
 */
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';

const RAY_COUNT = 12;
const RAY_HALF_ANGLE = (5 * Math.PI) / 180;

function rayPaths(radius: number): string[] {
  const paths: string[] = [];
  for (let i = 0; i < RAY_COUNT; i++) {
    const angle = (i / RAY_COUNT) * Math.PI * 2;
    const x1 = radius + Math.cos(angle - RAY_HALF_ANGLE) * radius;
    const y1 = radius + Math.sin(angle - RAY_HALF_ANGLE) * radius;
    const x2 = radius + Math.cos(angle + RAY_HALF_ANGLE) * radius;
    const y2 = radius + Math.sin(angle + RAY_HALF_ANGLE) * radius;
    paths.push(
      `M ${radius},${radius} L ${x1.toFixed(1)},${y1.toFixed(1)} L ${x2.toFixed(1)},${y2.toFixed(1)} Z`
    );
  }
  return paths;
}

export interface LogoGlowProps {
  /** Diameter of the ray disc in px. */
  size?: number;
}

export function LogoGlow({ size = 460 }: LogoGlowProps) {
  const reduceMotion = useReducedMotion();
  const turns = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    turns.set(withRepeat(withTiming(1, { duration: 80_000, easing: Easing.linear }), -1));
    return () => cancelAnimation(turns);
  }, [reduceMotion, turns]);

  const spin = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turns.value * 360}deg` }],
  }));

  const r = size / 2;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.glow,
        { width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2 },
        spin,
      ]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <RadialGradient id="glow-fade" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#8ce0ff" stopOpacity="0.16" />
            <Stop offset="45%" stopColor="#8ce0ff" stopOpacity="0.08" />
            <Stop offset="100%" stopColor="#8ce0ff" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="glow-halo" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#aee8ff" stopOpacity="0.14" />
            <Stop offset="100%" stopColor="#aee8ff" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        {rayPaths(r).map((d) => (
          <Path key={d} d={d} fill="url(#glow-fade)" />
        ))}
        <Circle cx={r} cy={r} r={r * 0.55} fill="url(#glow-halo)" />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    left: '50%',
    top: '50%',
  },
});
