/**
 * Skia table scene.
 * - With `model` + `textures`: the real table. Felt, trick ring and opponent
 *   back-stacks are static; the hand + trick cards are animated, draggable sprites
 *   driven by useCardSprites (M2 play/fly + M3 deal/collect/particles). A pulsing
 *   halo follows the current seat; the trump glyph pops when trump is declared.
 * - Without: the M0 placeholder shell (kept as a safe fallback).
 * Self-contained for window/insets; web callers load CanvasKit before import.
 */
import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
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
  RoundedRect,
  Skia,
  vec,
  type SkImage,
} from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import type { Card } from '@/types/game';
import { computeLayout, type RelativePosition, type TableLayout } from './layout';
import { T } from './tokens';
import type { CardTextures } from './cardTextures';
import type { TableModel } from './tableModel';
import { useCardSprites } from './useCardSprites';

type Props = {
  model?: TableModel;
  textures?: CardTextures;
  onPlayCard?: (card: Card) => void;
  topReserve?: number;
  bottomReserve?: number;
};

export default function GameCanvas({
  model,
  textures,
  onPlayCard,
  topReserve = 0,
  bottomReserve = 0,
}: Props = {}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { top, bottom, left, right } = insets;
  const L = useMemo(
    () => computeLayout(width, height, { top, bottom, left, right }, topReserve, bottomReserve),
    [width, height, top, bottom, left, right, topReserve, bottomReserve]
  );

  const interactive = !!(model && textures);
  const { gesture, nodes, trumpPop } = useCardSprites({
    model,
    textures,
    L,
    onPlayCard,
    enabled: interactive,
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
      {!(interactive && model.trumpSuit) && (
        <Circle c={vec(L.trick.cx, L.trick.cy)} r={3} color={T.ringDot} />
      )}

      {interactive ? (
        <>
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
        </>
      ) : (
        <PlaceholderShell L={L} />
      )}
    </Canvas>
  );

  return interactive ? <GestureDetector gesture={gesture}>{canvas}</GestureDetector> : canvas;
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

// M0 fallback: placeholder slots + fan, no real data.
function PlaceholderShell({ L }: { L: TableLayout }) {
  const fan = Array.from({ length: 6 }, (_, i) => {
    const off = i - 2.5;
    return {
      x: L.hand.cx + off * (L.cardW * 0.62),
      y: L.hand.cy + Math.abs(off) * 6,
      rot: off * 0.06,
    };
  });
  const opponents: RelativePosition[] = ['north', 'east', 'west'];
  const allSeats: RelativePosition[] = ['north', 'east', 'south', 'west'];
  return (
    <>
      {opponents.map((pos) => {
        const s = L.seats[pos];
        return (
          <Slot key={pos} x={s.x} y={s.y} rot={s.rot} w={L.cardW} h={L.cardH} color={T.slot} />
        );
      })}
      {fan.map((c, i) => (
        <Slot key={`h${i}`} x={c.x} y={c.y} rot={c.rot} w={L.cardW} h={L.cardH} color={T.slotYou} />
      ))}
      {allSeats.map((pos) => {
        const s = L.seats[pos];
        return <Circle key={`d${pos}`} c={vec(s.x, s.y)} r={4} color={T.seatDot} />;
      })}
    </>
  );
}

function Slot({
  x,
  y,
  rot,
  w,
  h,
  color,
}: {
  x: number;
  y: number;
  rot: number;
  w: number;
  h: number;
  color: string;
}) {
  const r = Math.min(10, w * 0.12);
  return (
    <Group transform={[{ translateX: x }, { translateY: y }, { rotate: rot }]}>
      <RoundedRect x={-w / 2} y={-h / 2} width={w} height={h} r={r} color={color} />
      <RoundedRect
        x={-w / 2}
        y={-h / 2}
        width={w}
        height={h}
        r={r}
        color={T.slotStroke}
        style="stroke"
        strokeWidth={1}
      />
    </Group>
  );
}
