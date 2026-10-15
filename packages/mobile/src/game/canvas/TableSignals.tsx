/**
 * What just happened at the table, in the server's words: what the trick in
 * progress holds, a "+N" where a trick was taken (a trick holding a five is a
 * "Pidro!"), and how the last hand scored, before the next deal. The server
 * decides who wins and what anything is worth; this only shows it. Only what
 * matters gets fanfare: a trick worth nothing passes quietly.
 */
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PidroText } from '@/components/ui/PidroText';
import { PidroBevel, PidroColors, PidroRadii, PidroSpacing } from '@/design/tokens';
import { playBigTrickHaptic } from '@/game/useGameHaptics';
import type { ServerLastHand, TeamKey } from '@/types/game';
import { isStillCapture } from '@/utils/stillCapture';
import { computeLayout, playedCardTarget, type TableLayout } from './layout';
import type { TableModel, TrickResult } from './tableModel';

/** A trick worth this much holds a five: the big moment. */
const PIDRO_POINTS = 5;
const POP_MS = 1500;
/** How long a hand's result stays unless tapped away. */
const HAND_RESULT_MS = 4500;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const easeOutCubic = (t: number) => {
  'worklet';
  return 1 - Math.pow(1 - t, 3);
};

type Props = {
  model: TableModel;
  topReserve?: number;
  bottomReserve?: number;
};

export function TableSignals({ model, topReserve = 0, bottomReserve = 0 }: Props) {
  const { width, height } = useWindowDimensions();
  const { top, bottom, left, right } = useSafeAreaInsets();
  const L = useMemo(
    () => computeLayout(width, height, { top, bottom, left, right }, topReserve, bottomReserve),
    [width, height, top, bottom, left, right, topReserve, bottomReserve]
  );
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <OnTheTable points={model.trickPoints} L={L} />
      <TrickPop trick={model.lastTrick} L={L} />
      <HandResult hand={model.lastHand} yourTeam={model.yourTeam} L={L} />
    </View>
  );
}

/** "6 on the table": what the trick in progress holds for whoever takes it. */
function OnTheTable({ points, L }: { points: number | null; L: TableLayout }) {
  if (!points) return null;
  return (
    <View
      pointerEvents="none"
      testID="trick-points"
      style={[styles.onTable, { top: L.trick.cy - L.cardW * 0.82, left: 0, right: 0 }]}>
      <View style={styles.onTablePill}>
        <PidroText role="metadata" tone="gold" style={styles.onTableText}>
          {points} on the table
        </PidroText>
      </View>
    </View>
  );
}

/**
 * "+N" rising where the trick was taken; "Pidro!" when it held a five. The 2
 * of trump's point rises where it was played, since it stays with that team.
 * Plays only for a trick taken while watching, never for one already done.
 */
function TrickPop({ trick, L }: { trick: TrickResult | null; L: TableLayout }) {
  // A trick taken while watching pops; one already done when the table opened does not.
  const number = trick?.number ?? null;
  const [seen, setSeen] = useState(number);
  const [pop, setPop] = useState<TrickResult | null>(null);
  if (number !== seen) {
    setSeen(number);
    // No finished trick yet counts as zero, so a hand's first trick pops too.
    const taken = number != null && number > (seen ?? 0) ? trick : null;
    setPop(taken && (taken.points > 0 || taken.twoOfTrump) ? taken : null);
  }

  useEffect(() => {
    if (pop && pop.points >= PIDRO_POINTS) playBigTrickHaptic();
  }, [pop]);

  if (!pop) return null;
  // A small "+N" sits just above the card it rose from; a "Pidro!" takes the
  // middle of the table, where nothing else competes with it.
  const above = (rel: TrickResult['winner']) => {
    const card = playedCardTarget(L, rel, 0, 1);
    return { x: card.x, y: card.y - L.cardH * 0.42 };
  };
  const big = pop.points >= PIDRO_POINTS;
  const at = big ? { x: L.trick.cx, y: L.trick.cy } : above(pop.winner);
  const twoAt = pop.twoOfTrump ? above(pop.twoOfTrump.holder) : null;
  return (
    <>
      {pop.points > 0 ? (
        <Pop key={`win-${pop.number}`} x={at.x} y={at.y} big={big} label={`+${pop.points}`} />
      ) : null}
      {twoAt && pop.twoOfTrump ? (
        <Pop
          key={`two-${pop.number}`}
          x={twoAt.x}
          y={twoAt.y + (!big && pop.twoOfTrump.holder === pop.winner ? -26 : 0)}
          big={false}
          label={`+${pop.twoOfTrump.points}`}
        />
      ) : null}
    </>
  );
}

function Pop({ x, y, big, label }: { x: number; y: number; big: boolean; label: string }) {
  const reduceMotion = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    // UI grammar captures the pop at its peak instead of mid-flight.
    t.value = isStillCapture() ? 0.35 : withTiming(1, { duration: POP_MS, easing: Easing.linear });
  }, [t]);
  const motion = useAnimatedStyle(() => {
    const appear = Math.min(1, t.value / 0.12);
    const fade = t.value < 0.7 ? 1 : Math.max(0, 1 - (t.value - 0.7) / 0.3);
    const rise = reduceMotion ? 0 : -(big ? 24 : 18) * easeOutCubic(t.value);
    // A quick swell past full size, then settle: the "pop".
    const swell = appear < 1 ? 0.8 + 0.3 * appear : 1.1 - 0.1 * Math.min(1, (t.value - 0.12) / 0.1);
    return {
      opacity: appear * fade,
      transform: [{ translateY: rise }, { scale: reduceMotion ? 1 : swell }],
    };
  });
  const box = big ? 160 : 64;
  const height = big ? 44 : 28;
  return (
    <Animated.View
      pointerEvents="none"
      testID={big ? 'trick-pop-pidro' : 'trick-pop'}
      style={[styles.pop, { left: x - box / 2, top: y - height / 2, width: box }, motion]}>
      <View style={[styles.popChip, big ? styles.popChipBig : null]}>
        {big ? (
          <PidroText role="title" style={[styles.popText, styles.pidro]}>
            Pidro!
          </PidroText>
        ) : null}
        <PidroText role={big ? 'title' : 'label'} tone="gold" style={styles.popText}>
          {label}
        </PidroText>
      </View>
    </Animated.View>
  );
}

/**
 * The hand's result, before the next deal: "We made it!" or "They were set",
 * the bid and what the bidders took, and what each side's score moved by.
 * Stays until tapped or HAND_RESULT_MS. A made bid glows gold; a set shakes
 * once in muted red, with no fanfare.
 */
function HandResult({
  hand,
  yourTeam,
  L,
}: {
  hand: ServerLastHand | null;
  yourTeam: TeamKey | null;
  L: TableLayout;
}) {
  const reduceMotion = useReducedMotion();
  const { width } = useWindowDimensions();
  const handNumber = hand?.hand_number ?? null;
  // A new hand number is a new result; it shows until tapped or HAND_RESULT_MS.
  const [seen, setSeen] = useState(handNumber);
  const [shown, setShown] = useState(handNumber);
  if (handNumber !== seen) {
    setSeen(handNumber);
    setShown(handNumber);
  }
  const appear = useSharedValue(0);
  const shake = useSharedValue(0);
  const set = hand ? !hand.made : false;

  useEffect(() => {
    if (shown == null) return;
    appear.value = 0;
    appear.value = withTiming(1, { duration: 240, easing: EASE_OUT });
    if (set && !reduceMotion) {
      shake.value = withDelay(
        240,
        withSequence(
          withTiming(-6, { duration: 60 }),
          withTiming(6, { duration: 80 }),
          withTiming(-3, { duration: 70 }),
          withTiming(0, { duration: 60 })
        )
      );
    }
    if (isStillCapture()) return;
    const timer = setTimeout(() => setShown(null), HAND_RESULT_MS);
    return () => clearTimeout(timer);
  }, [shown, set, reduceMotion, appear, shake]);

  const motion = useAnimatedStyle(() => ({
    opacity: appear.value,
    transform: [
      { translateX: shake.value },
      { scale: reduceMotion ? 1 : 0.94 + 0.06 * appear.value },
    ],
  }));

  if (!hand || shown !== handNumber) return null;
  const them: TeamKey = yourTeam === 'east_west' ? 'north_south' : 'east_west';
  const us: TeamKey = yourTeam ?? 'north_south';
  const ours = hand.bidding_team === us;
  const headline = hand.made
    ? ours
      ? 'We made it!'
      : 'They made it'
    : ours
      ? 'We were set'
      : 'They were set';
  const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);
  const cardWidth = Math.min(300, width - PidroSpacing.xl * 2);

  return (
    <Animated.View
      testID="hand-result"
      style={[
        styles.result,
        {
          width: cardWidth,
          left: L.trick.cx - cardWidth / 2,
          top: L.trick.cy - 68,
          borderColor: hand.made ? PidroColors.gold : PidroColors.dangerBorder,
          boxShadow: hand.made
            ? `0px 0px 24px ${PidroColors.goldSoft}, 0px 8px 20px rgba(0,0,0,0.45)`
            : '0px 8px 20px rgba(0,0,0,0.45)',
        },
        motion,
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${headline}. Bid ${hand.bid}, took ${hand.captured[hand.bidding_team]}. Us ${signed(hand.delta[us])}, them ${signed(hand.delta[them])}. Tap to close.`}
        onPress={() => setShown(null)}
        style={styles.resultBody}>
        <PidroText role="title" tone={hand.made ? 'gold' : 'danger'} align="center">
          {headline}
        </PidroText>
        <PidroText role="metadata" tone="soft" align="center">
          Bid {hand.bid} · took {hand.captured[hand.bidding_team]}
        </PidroText>
        <View style={styles.deltas}>
          <Delta label="Us" value={signed(hand.delta[us])} good={hand.delta[us] >= 0} />
          <Delta label="Them" value={signed(hand.delta[them])} good={hand.delta[them] >= 0} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

function Delta({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <View style={styles.delta}>
      <PidroText role="metadata" tone="muted" align="center">
        {label}
      </PidroText>
      <PidroText role="title" tone={good ? 'default' : 'danger'} align="center">
        {value}
      </PidroText>
    </View>
  );
}

const styles = StyleSheet.create({
  onTable: {
    position: 'absolute',
    alignItems: 'center',
  },
  onTablePill: {
    paddingHorizontal: PidroSpacing.sm,
    paddingVertical: 2,
    borderRadius: PidroRadii.full,
    backgroundColor: PidroColors.trickChipBg,
    borderWidth: 1,
    borderColor: PidroColors.goldSoft,
  },
  onTableText: {
    fontWeight: '800',
  },
  pop: {
    position: 'absolute',
    alignItems: 'center',
  },
  popChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.xs,
    paddingHorizontal: PidroSpacing.sm,
    paddingVertical: 2,
    borderRadius: PidroRadii.full,
    backgroundColor: PidroColors.trickChipBg,
    borderWidth: 1,
    borderColor: PidroColors.goldSoft,
  },
  popChipBig: {
    paddingHorizontal: PidroSpacing.md,
    paddingVertical: PidroSpacing.xxs,
    borderWidth: 2,
    borderColor: PidroColors.gold,
    boxShadow: `0px 0px 18px ${PidroColors.gold}`,
  },
  popText: {
    fontWeight: '900',
    textShadowColor: PidroColors.popShadow,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  pidro: {
    color: PidroBevel.textGold,
  },
  result: {
    position: 'absolute',
    borderRadius: PidroRadii.lg,
    borderWidth: 2,
    backgroundColor: PidroBevel.panelDeep,
  },
  resultBody: {
    paddingVertical: PidroSpacing.md,
    paddingHorizontal: PidroSpacing.lg,
    gap: PidroSpacing.xxs,
  },
  deltas: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: PidroSpacing.xl,
    marginTop: PidroSpacing.xs,
  },
  delta: {
    alignItems: 'center',
    minWidth: 64,
  },
});
