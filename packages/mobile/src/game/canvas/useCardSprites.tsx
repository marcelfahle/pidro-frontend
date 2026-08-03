/**
 * M2 interaction + M3 animation engine for the Skia table.
 *
 * A fixed pool of card "sprites" (stable Reanimated shared values) is reconciled
 * against the render model every change: each visible card (your hand + every
 * trick card) is assigned a slot and animated toward its target position. Because
 * a played card keeps the SAME key across the hand→trick transition, its slot
 * persists and it *flies* into the trick instead of popping.
 *
 * Gestures (canvas-level Pan+Tap, hit-tested against legal hand cards) call
 * onPlayCard. Animation is driven purely by model diffs (server-confirmed), per
 * plan §5.6 — with the cold-load rule: the first model snaps into place, only
 * later diffs animate. M3 adds, all diff-triggered:
 *   • deal-in   — hand grows from empty → stagger from a deck origin w/ overshoot
 *   • collect   — trick clears after ≥2 plays → sweep cards to winner + particle pop
 *   • trump     — null→suit pops the trump glyph (exposed via `trumpPop`)
 *   • reflow    — layout change tweens sprites to new slots (falls out of the effect)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  BlurMask,
  Circle,
  Group,
  Image,
  RoundedRect,
  vec,
  type SkImage,
} from '@shopify/react-native-skia';
import {
  Easing,
  cancelAnimation,
  runOnJS,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import type { Card } from '@/types/game';
import type { RelativePosition, TableLayout } from './layout';
import type { TableModel } from './tableModel';
import type { CardKey, CardTextures } from './cardTextures';
import { T } from './tokens';

const MAX = 36;
const PARTICLES = 16;
const REL: RelativePosition[] = ['north', 'east', 'south', 'west'];

function playedCardTarget(L: TableLayout, rel: RelativePosition, index: number, count: number) {
  const portrait = L.profile.endsWith('portrait');
  const pileScale = portrait ? 0.82 : 0.8;
  const spacing = Math.min(L.cardW * 0.38, portrait ? 24 : 32);
  const off = index - (count - 1) / 2;
  // Side cards face their owner: the card's top edge points at the table
  // center (east top→left, west top→right), matching the seat rot in layout.ts.
  const rot = rel === 'east' ? -Math.PI / 2 : rel === 'west' ? Math.PI / 2 : 0;

  // Each pile center lands on a cardinal point of the trick circle. Multiple
  // cards spread along the tangent so the ring remains the visual ruler.
  const x =
    rel === 'west'
      ? L.trick.cx - L.trick.r
      : rel === 'east'
        ? L.trick.cx + L.trick.r
        : L.trick.cx + off * spacing;
  const y =
    rel === 'north'
      ? L.trick.cy - L.trick.r
      : rel === 'south'
        ? L.trick.cy + L.trick.r
        : L.trick.cy + off * spacing;
  return { x, y, rot, scale: pileScale };
}

function playedCardCount(model: TableModel | null | undefined): number {
  if (!model) return 0;
  return REL.reduce((total, rel) => total + (model.playedCards[rel]?.length ?? 0), 0);
}

function handSlotFn(L: TableLayout, n: number) {
  const step = n > 1 ? Math.min(L.cardW * 0.72, (L.hand.maxWidth - L.cardW) / (n - 1)) : 0;
  return (i: number) => {
    const off = i - (n - 1) / 2;
    // Straight row — no arc dip, no fan rotation (user preference).
    return { x: L.hand.cx + off * step, y: L.hand.cy, rot: 0 };
  };
}

type HandTarget = {
  slot: number;
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
  scale: number;
};
type SlotInfo = {
  key: string;
  textureKey: CardKey;
  kind: 'hand' | 'played';
  z: number;
  legal: boolean;
  blocked: boolean;
} | null;

type Opts = {
  model?: TableModel;
  textures?: CardTextures;
  L: TableLayout;
  onPlayCard?: (card: Card) => void;
  enabled: boolean;
};

export function useCardSprites({ model, textures, L, onPlayCard, enabled }: Opts) {
  /* eslint-disable react-hooks/rules-of-hooks -- fixed-length pools → stable hook order */
  const sx = Array.from({ length: MAX }, () => useSharedValue(0));
  const sy = Array.from({ length: MAX }, () => useSharedValue(0));
  const sscale = Array.from({ length: MAX }, () => useSharedValue(1));
  const srot = Array.from({ length: MAX }, () => useSharedValue(0));
  const sop = Array.from({ length: MAX }, () => useSharedValue(0));
  /* eslint-enable react-hooks/rules-of-hooks */

  const [slots, setSlots] = useState<SlotInfo[]>(() => Array(MAX).fill(null));

  const keyToSlot = useRef<Map<string, number>>(new Map());
  const retirementTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const prevModel = useRef<TableModel | null>(null);
  const modelRef = useRef<TableModel | undefined>(model);
  const onPlayRef = useRef(onPlayCard);
  modelRef.current = model;
  onPlayRef.current = onPlayCard;

  const handTargets = useSharedValue<HandTarget[]>([]);
  const dragSlot = useSharedValue(-1);
  const dragKey = useSharedValue('');
  const dragStartX = useSharedValue(0);
  const dragStartY = useSharedValue(0);

  useEffect(
    () => () => {
      retirementTimers.current.forEach(clearTimeout);
      retirementTimers.current.clear();
    },
    []
  );

  // ── M3 shared values ──────────────────────────────────────────────
  const trumpPop = useSharedValue(0); // 0..1 flourish on trump declare
  const burst = useSharedValue(0); // 0..1 particle pop progress
  const burstX = useSharedValue(0);
  const burstY = useSharedValue(0);
  const dirs = useMemo(
    () =>
      Array.from({ length: PARTICLES }, (_, i) => ({
        a: (i / PARTICLES) * Math.PI * 2 + Math.random() * 0.4,
        reach: 70 + Math.random() * 70,
        color: i % 2 ? T.cyan : T.gold,
      })),
    []
  );

  const firePop = useCallback(
    (x: number, y: number) => {
      burstX.value = x;
      burstY.value = y;
      burst.value = 0;
      burst.value = withTiming(1, { duration: 680, easing: Easing.out(Easing.cubic) });
    },
    [burst, burstX, burstY]
  );

  const cardW = L.cardW;
  const cardH = L.cardH;
  const handScale = L.profile.endsWith('landscape') ? 0.9 : 1;

  useEffect(() => {
    if (!enabled || !model) return;
    const prev = prevModel.current;
    const firstLoad = prev === null;
    const n = model.yourHand.length;
    const handSlot = handSlotFn(L, n);

    // ── M3 diff triggers ────────────────────────────────────────────
    const prevHandLen = prev?.yourHand.length ?? 0;
    const isDeal = !firstLoad && prevHandLen === 0 && n > 0;

    const prevPlayedCount = playedCardCount(prev);
    const curPlayedCount = playedCardCount(model);
    const roundCollected = !firstLoad && prevPlayedCount >= 2 && curPlayedCount === 0;
    const winSeat = model.currentTurnRelative ? L.seats[model.currentTurnRelative] : null;
    const sweepX = winSeat ? winSeat.x : L.trick.cx;
    const sweepY = winSeat ? winSeat.y : L.trick.cy;

    if (!firstLoad && !prev?.trumpSuit && model.trumpSuit) {
      trumpPop.value = 0;
      trumpPop.value = withSequence(
        withTiming(1, { duration: 170, easing: Easing.out(Easing.back(2)) }),
        withTiming(0, { duration: 460, easing: Easing.in(Easing.quad) })
      );
    }

    const deckX = L.felt.cx;
    const deckY = L.trick.cy;

    type Desired = {
      key: string;
      textureKey: CardKey;
      kind: 'hand' | 'played';
      z: number;
      delayOrder: number;
      tx: number;
      ty: number;
      trot: number;
      tscale: number;
      ox: number;
      oy: number;
      legal: boolean;
      blocked: boolean;
      topacity: number;
    };
    const desired: Desired[] = [];

    model.yourHand.forEach((tc, i) => {
      const s = handSlot(i);
      const legal = model.canPlay && tc.isLegalPlay;
      const blocked = model.canPlay && !tc.isLegalPlay;
      desired.push({
        key: tc.key,
        textureKey: tc.textureKey,
        kind: 'hand',
        z: i + (legal ? 30 : 0),
        delayOrder: i,
        tx: s.x,
        ty: legal ? s.y - Math.min(16, cardH * 0.14) : s.y,
        trot: s.rot,
        tscale: handScale * (legal ? 1.03 : blocked ? 0.98 : 1),
        ox: s.x,
        oy: s.y,
        legal,
        blocked,
        topacity: 1,
      });
    });
    REL.forEach((rel) => {
      const cards = model.playedCards[rel] ?? [];
      cards.forEach((tc, i) => {
        const target = playedCardTarget(L, rel, i, cards.length);
        const seat = L.seats[rel];
        desired.push({
          key: tc.key,
          textureKey: tc.textureKey,
          kind: 'played',
          z: 100 + i,
          delayOrder: i,
          tx: target.x,
          ty: target.y,
          trot: target.rot,
          tscale: target.scale,
          ox: seat.x,
          oy: seat.y,
          legal: false,
          blocked: false,
          topacity: 1,
        });
      });
    });

    const desiredKeys = new Set(desired.map((d) => d.key));
    const nextSlots: SlotInfo[] = Array(MAX).fill(null);

    // Retire slots whose card is gone — sweep played piles away when the round clears.
    for (const [key, sl] of Array.from(keyToSlot.current.entries())) {
      if (!desiredKeys.has(key)) {
        nextSlots[sl] = slots[sl];
        if (retirementTimers.current.has(key)) continue;

        const wasPlayed = slots[sl]?.kind === 'played';
        const duration = roundCollected && wasPlayed ? 420 : 180;
        if (roundCollected && wasPlayed) {
          cancelAnimation(sx[sl]);
          cancelAnimation(sy[sl]);
          const sweepCfg = { duration: 360, easing: Easing.in(Easing.cubic) };
          sx[sl].value = withTiming(sweepX, sweepCfg);
          sy[sl].value = withTiming(sweepY, sweepCfg);
          srot[sl].value = withTiming(0, sweepCfg);
          sscale[sl].value = withTiming(0.45, sweepCfg);
          sop[sl].value = withDelay(240, withTiming(0, { duration: 160 }));
        } else {
          sop[sl].value = withTiming(0, { duration: 180 });
        }

        retirementTimers.current.set(
          key,
          setTimeout(() => {
            retirementTimers.current.delete(key);
            if (keyToSlot.current.get(key) !== sl) return;
            keyToSlot.current.delete(key);
            setSlots((current) => {
              if (current[sl]?.key !== key) return current;
              const released = [...current];
              released[sl] = null;
              return released;
            });
          }, duration)
        );
      }
    }
    if (roundCollected) firePop(L.trick.cx, L.trick.cy);

    const used = new Set(keyToSlot.current.values());
    const allocate = () => {
      for (let i = 0; i < MAX; i++)
        if (!used.has(i)) {
          used.add(i);
          return i;
        }
      return -1;
    };

    const ht: HandTarget[] = [];
    const cfg = { duration: 320, easing: Easing.out(Easing.cubic) };
    const dealCfg = { duration: 460, easing: Easing.out(Easing.back(1.5)) };

    for (const d of desired) {
      const retirementTimer = retirementTimers.current.get(d.key);
      if (retirementTimer) {
        clearTimeout(retirementTimer);
        retirementTimers.current.delete(d.key);
      }
      let sl = keyToSlot.current.get(d.key);
      const isNew = sl === undefined;
      const dealCard = isDeal && d.kind === 'hand';
      if (sl === undefined) {
        sl = allocate();
        if (sl < 0) continue;
        keyToSlot.current.set(d.key, sl);
        const startX = firstLoad ? d.tx : dealCard ? deckX : d.kind === 'played' ? d.ox : d.tx;
        const startY = firstLoad ? d.ty : dealCard ? deckY : d.kind === 'played' ? d.oy : d.ty;
        cancelAnimation(sx[sl]);
        cancelAnimation(sy[sl]);
        cancelAnimation(srot[sl]);
        cancelAnimation(sscale[sl]);
        sx[sl].value = startX;
        sy[sl].value = startY;
        srot[sl].value = dealCard ? 0 : d.trot;
        sscale[sl].value = dealCard ? 0.6 : !firstLoad && d.kind === 'played' ? 1 : d.tscale;
        sop[sl].value = dealCard ? 0 : d.topacity;
      }
      nextSlots[sl] = {
        key: d.key,
        textureKey: d.textureKey,
        kind: d.kind,
        z: d.z,
        legal: d.legal,
        blocked: d.blocked,
      };

      const dragging = dragSlot.value === sl;
      if (firstLoad) {
        sx[sl].value = d.tx;
        sy[sl].value = d.ty;
        srot[sl].value = d.trot;
        sscale[sl].value = d.tscale;
        sop[sl].value = d.topacity;
      } else if (isNew && dealCard) {
        const delay = d.delayOrder * 70;
        sx[sl].value = withDelay(delay, withTiming(d.tx, dealCfg));
        sy[sl].value = withDelay(delay, withTiming(d.ty, dealCfg));
        srot[sl].value = withDelay(delay, withTiming(d.trot, dealCfg));
        sscale[sl].value = withDelay(delay, withTiming(d.tscale, dealCfg));
        sop[sl].value = withDelay(delay, withTiming(d.topacity, { duration: 140 }));
      } else if (!dragging) {
        sx[sl].value = withTiming(d.tx, cfg);
        sy[sl].value = withTiming(d.ty, cfg);
        srot[sl].value = withTiming(d.trot, cfg);
        sscale[sl].value = withTiming(d.tscale, cfg);
        sop[sl].value = withTiming(d.topacity, { duration: 150 });
      }

      if (d.kind === 'hand' && d.legal)
        ht.push({
          slot: sl,
          key: d.key,
          x: d.tx,
          y: d.ty,
          w: cardW * handScale,
          h: cardH * handScale,
          scale: d.tscale,
        });
    }

    handTargets.value = ht;
    setSlots(nextSlots);
    prevModel.current = model;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, L, enabled]);

  const playByKey = useCallback((key: string) => {
    const card = modelRef.current?.yourHand.find((c) => c.key === key)?.card;
    if (card) onPlayRef.current?.(card);
  }, []);

  const gesture = useMemo(() => {
    const ringCx = L.trick.cx;
    const ringCy = L.trick.cy;
    const ringR = L.trick.r;

    const hit = (px: number, py: number): HandTarget | null => {
      'worklet';
      const ts = handTargets.value;
      for (let i = ts.length - 1; i >= 0; i--) {
        const t = ts[i];
        if (Math.abs(px - t.x) < t.w / 2 + 6 && Math.abs(py - t.y) < t.h / 2 + 6) return t;
      }
      return null;
    };

    const pan = Gesture.Pan()
      .onBegin((e) => {
        'worklet';
        const t = hit(e.x, e.y);
        if (!t) return;
        dragSlot.value = t.slot;
        dragKey.value = t.key;
        dragStartX.value = sx[t.slot].value;
        dragStartY.value = sy[t.slot].value;
        sscale[t.slot].value = withTiming(t.scale * 1.1, { duration: 120 });
      })
      .onUpdate((e) => {
        'worklet';
        const sl = dragSlot.value;
        if (sl < 0) return;
        sx[sl].value = dragStartX.value + e.translationX;
        sy[sl].value = dragStartY.value + e.translationY;
      })
      .onEnd(() => {
        'worklet';
        const sl = dragSlot.value;
        if (sl < 0) return;
        const dx = sx[sl].value - ringCx;
        const dy = sy[sl].value - ringCy;
        if (Math.sqrt(dx * dx + dy * dy) < ringR) {
          runOnJS(playByKey)(dragKey.value);
        } else {
          const ts = handTargets.value;
          let tgt: HandTarget | null = null;
          for (let i = 0; i < ts.length; i++)
            if (ts[i].slot === sl) {
              tgt = ts[i];
              break;
            }
          if (tgt) {
            sx[sl].value = withSpring(tgt.x, { damping: 16, stiffness: 180 });
            sy[sl].value = withSpring(tgt.y, { damping: 16, stiffness: 180 });
            sscale[sl].value = withSpring(tgt.scale);
          }
        }
        dragSlot.value = -1;
      })
      .onFinalize(() => {
        'worklet';
        // If the pan was cancelled (e.g. a tap won the race), clear drag state so
        // the reconciler doesn't skip animating this slot (which would kill the fly).
        const sl = dragSlot.value;
        if (sl >= 0) {
          const ts = handTargets.value;
          for (let i = 0; i < ts.length; i++)
            if (ts[i].slot === sl) {
              sscale[sl].value = withSpring(ts[i].scale);
              break;
            }
          dragSlot.value = -1;
        }
      });

    const tap = Gesture.Tap().onEnd((e, ok) => {
      'worklet';
      if (!ok) return;
      const t = hit(e.x, e.y);
      if (t) runOnJS(playByKey)(t.key);
    });

    return Gesture.Race(pan, tap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L.trick.cx, L.trick.cy, L.trick.r, playByKey]);

  const nodes = useMemo(() => {
    const ordered = slots
      .map((s, i) => ({ s, i }))
      .filter((x): x is { s: NonNullable<SlotInfo>; i: number } => x.s !== null)
      .sort((a, b) => a.s.z - b.s.z);
    return (
      <>
        {ordered.map(({ s, i }) => (
          <CardSprite
            key={i}
            img={textures?.get(s.textureKey) ?? null}
            x={sx[i]}
            y={sy[i]}
            scale={sscale[i]}
            rot={srot[i]}
            opacity={sop[i]}
            w={cardW}
            h={cardH}
            dimmed={s.blocked}
          />
        ))}
        {dirs.map((d, i) => (
          <Particle
            key={`p${i}`}
            burst={burst}
            bx={burstX}
            by={burstY}
            a={d.a}
            reach={d.reach}
            color={d.color}
          />
        ))}
      </>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots, textures, cardW, cardH]);

  return { gesture, nodes, trumpPop };
}

function CardSprite({
  img,
  x,
  y,
  scale,
  rot,
  opacity,
  w,
  h,
  dimmed,
}: {
  img: SkImage | null;
  x: SharedValue<number>;
  y: SharedValue<number>;
  scale: SharedValue<number>;
  rot: SharedValue<number>;
  opacity: SharedValue<number>;
  w: number;
  h: number;
  dimmed: boolean;
}) {
  const transform = useDerivedValue(() => [
    { translateX: x.value },
    { translateY: y.value },
    { rotate: rot.value },
    { scale: scale.value },
  ]);
  const r = Math.min(10, w * 0.12);
  return (
    <Group transform={transform} opacity={opacity}>
      {/* Soft drop shadow grounds the card on the felt. */}
      <RoundedRect
        x={-w / 2 + 1}
        y={-h / 2 + 4}
        width={w}
        height={h}
        r={r}
        color="rgba(2, 14, 28, 0.38)">
        <BlurMask blur={5} style="normal" />
      </RoundedRect>
      {img ? (
        <Image image={img} x={-w / 2} y={-h / 2} width={w} height={h} fit="cover" />
      ) : (
        <RoundedRect x={-w / 2} y={-h / 2} width={w} height={h} r={r} color={T.cardFrame} />
      )}
      {/* Unplayable cards darken; playable ones stay bright and lifted. */}
      {dimmed && (
        <RoundedRect
          x={-w / 2}
          y={-h / 2}
          width={w}
          height={h}
          r={r}
          color="rgba(6, 22, 38, 0.52)"
        />
      )}
    </Group>
  );
}

function Particle({
  burst,
  bx,
  by,
  a,
  reach,
  color,
}: {
  burst: SharedValue<number>;
  bx: SharedValue<number>;
  by: SharedValue<number>;
  a: number;
  reach: number;
  color: string;
}) {
  const c = useDerivedValue(() =>
    vec(bx.value + Math.cos(a) * reach * burst.value, by.value + Math.sin(a) * reach * burst.value)
  );
  const r = useDerivedValue(() => (burst.value > 0 && burst.value < 1 ? 4 * (1 - burst.value) : 0));
  const opacity = useDerivedValue(() => (burst.value > 0 && burst.value < 1 ? 1 - burst.value : 0));
  return <Circle c={c} r={r} color={color} opacity={opacity} />;
}
