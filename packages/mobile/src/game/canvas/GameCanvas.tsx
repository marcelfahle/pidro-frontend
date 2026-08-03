/**
 * Skia table scene.
 * Felt, trick ring and opponent back-stacks are static; the hand + trick cards
 * are animated, draggable sprites driven by useCardSprites.
 * Self-contained for window/insets; web callers load CanvasKit before import.
 */
import { useMemo } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureDetector } from 'react-native-gesture-handler';
import {
  BlurMask,
  Canvas,
  Circle,
  Fill,
  Group,
  Image,
  Path,
  RadialGradient,
  Skia,
  vec,
  type SkImage,
} from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import type { Card } from '@/types/game';
import { computeLayout } from './layout';
import { T } from './tokens';
import type { CardTextures } from './cardTextures';
import type { TableModel } from './tableModel';
import { useCardSprites } from './useCardSprites';

type Props = {
  model: TableModel;
  textures: CardTextures;
  onPlayCard: (card: Card) => void;
  topReserve?: number;
  bottomReserve?: number;
};

export default function GameCanvas({
  model,
  textures,
  onPlayCard,
  topReserve = 0,
  bottomReserve = 0,
}: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { top, bottom, left, right } = insets;
  const L = useMemo(
    () => computeLayout(width, height, { top, bottom, left, right }, topReserve, bottomReserve),
    [width, height, top, bottom, left, right, topReserve, bottomReserve]
  );

  const {
    gesture,
    nodes,
    trumpPop,
    renderedCutCardCount,
    renderedPlayedCardCount,
    renderedHandCardCount,
  } = useCardSprites({
    model,
    textures,
    L,
    onPlayCard,
    enabled: true,
  });

  const canvas = (
    <Canvas style={{ flex: 1 }}>
      {/* Felt: lit from the center, falling into shadow at the rim. */}
      <Fill>
        <RadialGradient
          c={vec(L.felt.cx, L.felt.cy)}
          r={Math.max(width, height) * 0.78}
          colors={[T.feltCenter, T.feltMid, T.feltEdge, T.bgDeep]}
          positions={[0, 0.42, 0.82, 1]}
        />
      </Fill>

      <FeltWeave width={width} height={height} />

      {/* Soft light pool anchoring the trick zone. */}
      <Circle c={vec(L.trick.cx, L.trick.cy)} r={L.trick.r * 2.1}>
        <RadialGradient
          c={vec(L.trick.cx, L.trick.cy)}
          r={L.trick.r * 2.1}
          colors={['rgba(120, 195, 250, 0.14)', 'rgba(120, 195, 250, 0)']}
        />
      </Circle>
      <Circle
        c={vec(L.trick.cx, L.trick.cy)}
        r={L.trick.r}
        style="stroke"
        strokeWidth={1.4}
        color={T.ring}
      />
      {!model.trumpSuit && <Circle c={vec(L.trick.cx, L.trick.cy)} r={3} color={T.ringDot} />}

      {model.trumpSuit && (
        <SuitGlyph
          img={textures.suit(model.trumpSuit)}
          x={L.trick.cx}
          y={L.trick.cy}
          size={L.cardW * 0.7}
          pop={trumpPop}
        />
      )}
      {nodes}
    </Canvas>
  );

  const renderedHandHeight = L.cardH * (L.profile.endsWith('landscape') ? 0.9 : 1);

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ flex: 1 }}>
        {canvas}
        <View
          testID="player-hand-top"
          pointerEvents="none"
          accessible={false}
          style={{
            position: 'absolute',
            top: L.hand.cy - renderedHandHeight / 2,
            left: 0,
            width: 1,
            height: 1,
          }}
        />
        {__DEV__ ? (
          <>
            <View
              testID={`rendered-hand-card-count-${renderedHandCardCount}`}
              pointerEvents="none"
              accessible={false}
              className="absolute h-px w-px opacity-0"
            />
            <View
              testID={`rendered-cut-card-count-${renderedCutCardCount}`}
              pointerEvents="none"
              accessible={false}
              className="absolute h-px w-px opacity-0"
            />
            <View
              testID={`rendered-played-card-count-${renderedPlayedCardCount}`}
              pointerEvents="none"
              accessible={false}
              className="absolute h-px w-px opacity-0"
            />
          </>
        ) : null}
      </View>
    </GestureDetector>
  );
}

// Subtle diamond weave over the felt, like the original's patterned cloth.
// One static path, stroked at whisper opacity — visible on the lit center,
// fading into the vignette.
function FeltWeave({ width, height }: { width: number; height: number }) {
  const path = useMemo(() => {
    const p = Skia.Path.Make();
    const cell = 46;
    const cols = Math.ceil(width / cell) + 1;
    const rows = Math.ceil(height / cell) + 1;
    for (let row = 0; row <= rows; row++) {
      for (let col = 0; col <= cols; col++) {
        const cx = col * cell + (row % 2 ? cell / 2 : 0);
        const cy = row * cell;
        p.moveTo(cx, cy - cell / 2);
        p.lineTo(cx + cell / 2, cy);
        p.lineTo(cx, cy + cell / 2);
        p.lineTo(cx - cell / 2, cy);
        p.close();
      }
    }
    return p;
  }, [width, height]);
  return <Path path={path} style="stroke" strokeWidth={1} color="rgba(180, 225, 255, 0.045)" />;
}

function SuitGlyph({
  img,
  x,
  y,
  size,
  pop,
}: {
  img: SkImage | null;
  x: number;
  y: number;
  size: number;
  pop: SharedValue<number>;
}) {
  const transform = useDerivedValue(() => [
    { translateX: x },
    { translateY: y },
    { scale: 1 + 0.35 * pop.value },
  ]);
  const opacity = useDerivedValue(() => 0.85 + 0.15 * pop.value);
  if (!img) return null;
  return (
    <Group transform={transform} opacity={opacity}>
      {/* Dark halo lifts the glyph off the lit felt. */}
      <Circle c={vec(0, 0)} r={size * 0.68} color="rgba(4, 22, 42, 0.42)">
        <BlurMask blur={10} style="normal" />
      </Circle>
      <Image image={img} x={-size / 2} y={-size / 2} width={size} height={size} fit="contain" />
    </Group>
  );
}
