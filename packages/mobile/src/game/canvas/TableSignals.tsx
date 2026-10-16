/**
 * What just happened at the table, in the server's words: a "+N" where a
 * trick was taken (a trick holding a five is a "Pidro!", gold when ours and
 * coral when theirs) and how the last hand scored, before the next deal. The server
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
import { readingTimeMs } from '@/features/game/readingTime';
import { PIDRO_POINTS, whosePidro, type PidroSide } from '@/features/game/pidro';
import {
  playBigTrickHaptic,
  playOurPidroHaptic,
  playTheirPidroHaptic,
} from '@/game/useGameHaptics';
import type { RelativePosition, ServerLastHand, TeamKey } from '@/types/game';
import { isStillCapture } from '@/utils/stillCapture';
import { computeLayout, playedCardTarget, type TableLayout } from './layout';
import type { TableModel, TrickResult } from './tableModel';
import { useTranslation } from '@/i18n';
import { paced } from '@/features/game/tableHelp';
import type { TablePace } from '@pidro/shared';

const POP_MS = 1500;
/** The least a hand's result stays unless tapped away; longer if its words need it. */
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
  pace?: TablePace;
};

export function TableSignals({ model, topReserve = 0, bottomReserve = 0, pace = 'normal' }: Props) {
  const { width, height } = useWindowDimensions();
  const { top, bottom, left, right } = useSafeAreaInsets();
  const L = useMemo(
    () => computeLayout(width, height, { top, bottom, left, right }, topReserve, bottomReserve),
    [width, height, top, bottom, left, right, topReserve, bottomReserve]
  );
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <TrickPop trick={model.lastTrick} seats={model.seats} L={L} popMs={paced(POP_MS, pace)} />
      <HandResult hand={model.lastHand} yourTeam={model.yourTeam} L={L} pace={pace} />
    </View>
  );
}

/**
 * Whose the last trick's Pidro was, if it held a five: the side, the score
 * column it lands in, and the seat that took it.
 */
export function tablePidro(
  trick: TrickResult | null,
  seats: TableModel['seats']
): { side: PidroSide; column: 'us' | 'them'; winner: RelativePosition } | null {
  const winner = trick && trick.points >= PIDRO_POINTS ? seats[trick.winner] : null;
  if (!trick || !winner) return null;
  const viewer = Object.values(seats).find((seat) => seat?.isYou)?.absolutePosition ?? null;
  return { ...whosePidro(winner.absolutePosition, viewer), winner: trick.winner };
}

/**
 * "+N" rising where the trick was taken; "Pidro!" when it held a five. The 2
 * of trump's point rises where it was played, since it stays with that team.
 * Plays only for a trick taken while watching, never for one already done.
 */
function TrickPop({
  trick,
  seats,
  L,
  popMs,
}: {
  trick: TrickResult | null;
  seats: TableModel['seats'];
  L: TableLayout;
  popMs: number;
}) {
  const { t } = useTranslation();
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

  const pidro = tablePidro(pop, seats);
  const side = pidro?.side ?? null;
  useEffect(() => {
    if (side === 'ours') playOurPidroHaptic();
    else if (side === 'theirs') playTheirPidroHaptic();
    else if (side === 'neutral') playBigTrickHaptic();
  }, [pop, side]);

  if (!pop) return null;
  // A small "+N" sits on the table side of the card it rose from, clear of
  // the seat's name; a "Pidro!" takes the middle, where nothing competes.
  const above = (rel: TrickResult['winner']) => {
    const card = playedCardTarget(L, rel, 0, 1);
    const dx = L.trick.cx - card.x;
    const dy = L.trick.cy - card.y;
    const toward = (L.cardH * 0.42) / Math.max(1, Math.hypot(dx, dy));
    return { x: card.x + dx * toward, y: card.y + dy * toward };
  };
  const big = pidro != null;
  // Who got the points, so a five never reads as ours when it was theirs.
  const team = !pidro
    ? ''
    : pidro.side === 'neutral'
      ? t(pidro.column === 'us' ? 'game.ns_short' : 'game.ew_short')
      : t(pidro.side === 'ours' ? 'game.us' : 'game.them');
  const taker = pidro?.side === 'theirs' ? seats[pop.winner]?.username : null;
  const at = big ? { x: L.trick.cx, y: L.trick.cy } : above(pop.winner);
  const twoAt = pop.twoOfTrump ? above(pop.twoOfTrump.holder) : null;
  return (
    <>
      {pop.points > 0 ? (
        <Pop
          key={`win-${pop.number}`}
          x={at.x}
          y={at.y}
          label={`+${pop.points}`}
          pidro={
            pidro
              ? {
                  side: pidro.side,
                  chip: `${team} +${pop.points}${taker ? ` · ${taker}` : ''}`,
                }
              : null
          }
          ms={popMs}
        />
      ) : null}
      {twoAt && pop.twoOfTrump ? (
        <Pop
          key={`two-${pop.number}`}
          x={twoAt.x}
          y={twoAt.y + (!big && pop.twoOfTrump.holder === pop.winner ? -26 : 0)}
          label={`+${pop.twoOfTrump.points}`}
          ms={popMs}
        />
      ) : null}
    </>
  );
}

/** The chip under a "Pidro!": whose points they were, in their colour. */
const PIDRO_TONE = {
  ours: { text: PidroColors.goldLight, border: PidroColors.gold, glow: PidroColors.gold },
  theirs: {
    text: PidroColors.theirPidro,
    border: PidroColors.theirPidro,
    glow: PidroColors.theirPidroSoft,
  },
  neutral: {
    text: PidroColors.cyanText,
    border: PidroColors.cyanBorderStrong,
    glow: PidroColors.cyanSoft,
  },
} as const;

function Pop({
  x,
  y,
  label,
  pidro = null,
  ms,
}: {
  x: number;
  y: number;
  label: string;
  /** A trick holding a five: "Pidro!" in the middle, and whose points it was. */
  pidro?: { side: PidroSide; chip: string } | null;
  ms: number;
}) {
  const reduceMotion = useReducedMotion();
  const t = useSharedValue(0);
  const big = pidro != null;
  // Their Pidro is the same moment, a size down: it is not ours to celebrate.
  const size = pidro?.side === 'theirs' ? 0.88 : 1;
  useEffect(() => {
    // UI grammar captures the pop at its peak instead of mid-flight.
    t.value = isStillCapture() ? 0.35 : withTiming(1, { duration: ms, easing: Easing.linear });
  }, [t, ms]);
  const motion = useAnimatedStyle(() => {
    // Reduced motion: no rise, no swell, no fade; it is there, then gone.
    if (reduceMotion) return { opacity: t.value < 1 ? 1 : 0, transform: [{ scale: size }] };
    const appear = Math.min(1, t.value / 0.12);
    const fade = t.value < 0.7 ? 1 : Math.max(0, 1 - (t.value - 0.7) / 0.3);
    const rise = -(big ? 24 : 18) * easeOutCubic(t.value);
    // A quick swell past full size, then settle: the "pop".
    const swell = appear < 1 ? 0.8 + 0.3 * appear : 1.1 - 0.1 * Math.min(1, (t.value - 0.12) / 0.1);
    return {
      opacity: appear * fade,
      transform: [{ translateY: rise }, { scale: size * swell }],
    };
  });
  const box = big ? 280 : 64;
  const height = big ? 44 : 28;
  if (!pidro) {
    return (
      <Animated.View
        pointerEvents="none"
        testID="trick-pop"
        style={[styles.pop, { left: x - box / 2, top: y - height / 2, width: box }, motion]}>
        <View style={styles.popChip}>
          <PidroText role="label" tone="gold" style={styles.popText}>
            {label}
          </PidroText>
        </View>
      </Animated.View>
    );
  }
  const tone = PIDRO_TONE[pidro.side];
  return (
    <Animated.View
      pointerEvents="none"
      testID={`trick-pop-pidro-${pidro.side}`}
      style={[styles.pop, { left: x - box / 2, top: y - height / 2, width: box }, motion]}>
      <View
        style={[
          styles.popChip,
          styles.popChipBig,
          { borderColor: tone.border, boxShadow: `0px 0px 18px ${tone.glow}` },
        ]}>
        <PidroText
          role="title"
          style={[styles.popText, pidro.side === 'ours' ? styles.pidro : { color: tone.text }]}>
          Pidro!
        </PidroText>
      </View>
      <View style={[styles.popChip, styles.whoseChip, { borderColor: tone.border }]}>
        <PidroText role="label" numberOfLines={1} style={[styles.popText, { color: tone.text }]}>
          {pidro.chip}
        </PidroText>
      </View>
    </Animated.View>
  );
}

/**
 * The hand's result, before the next deal: "We made our bid" or "They missed
 * their bid", the bid and the points the bidders won, and what each side's
 * score moved by. Stays until tapped, or for its reading time and at least
 * HAND_RESULT_MS, twice that at a slow pace. A made bid glows gold; a missed one shakes once in muted
 * red, with no fanfare.
 */
function HandResult({
  hand,
  yourTeam,
  L,
  pace,
}: {
  hand: ServerLastHand | null;
  yourTeam: TeamKey | null;
  L: TableLayout;
  pace: TablePace;
}) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const { width } = useWindowDimensions();
  const handNumber = hand?.hand_number ?? null;
  // A new hand number is a new result; it shows until tapped or read.
  const [seen, setSeen] = useState(handNumber);
  const [shown, setShown] = useState(handNumber);
  if (handNumber !== seen) {
    setSeen(handNumber);
    setShown(handNumber);
  }
  const appear = useSharedValue(0);
  const shake = useSharedValue(0);
  const set = hand ? !hand.made : false;

  const them: TeamKey = yourTeam === 'east_west' ? 'north_south' : 'east_west';
  const us: TeamKey = yourTeam ?? 'north_south';
  const ours = hand?.bidding_team === us;
  const headline = !hand
    ? ''
    : !yourTeam
      ? t(hand.made ? 'game.team_made' : 'game.team_set', {
          team: t(hand.bidding_team === 'north_south' ? 'game.ns' : 'game.ew'),
        })
      : hand.made
        ? ours
          ? t('game.we_made')
          : t('game.they_made')
        : ours
          ? t('game.we_set')
          : t('game.they_set');
  const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);
  const captured = t('game.points', { count: hand?.captured[hand.bidding_team] ?? 0 });
  const bidLine = hand ? t('game.bid_took', { bid: hand.bid, captured }) : '';
  const usLabel = t(yourTeam ? 'game.us' : 'game.ns');
  const themLabel = t(yourTeam ? 'game.them' : 'game.ew');
  const usDelta = hand ? signed(hand.delta[us]) : '';
  const themDelta = hand ? signed(hand.delta[them]) : '';
  const holdMs = paced(
    Math.max(
      HAND_RESULT_MS,
      readingTimeMs(`${headline} ${bidLine} ${usLabel} ${usDelta} ${themLabel} ${themDelta}`)
    ),
    pace
  );

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
    const timer = setTimeout(() => setShown(null), holdMs);
    return () => clearTimeout(timer);
  }, [shown, set, reduceMotion, appear, shake, holdMs]);

  const motion = useAnimatedStyle(() => ({
    opacity: appear.value,
    transform: [
      { translateX: shake.value },
      { scale: reduceMotion ? 1 : 0.94 + 0.06 * appear.value },
    ],
  }));

  if (!hand || shown !== handNumber) return null;
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
        accessibilityLabel={t('game.result_accessibility', {
          headline,
          bid: hand.bid,
          captured,
          usLabel,
          themLabel,
          us: usDelta,
          them: themDelta,
        })}
        onPress={() => setShown(null)}
        style={styles.resultBody}>
        <PidroText role="title" tone={hand.made ? 'gold' : 'danger'} align="center">
          {headline}
        </PidroText>
        <PidroText role="metadata" tone="soft" align="center">
          {bidLine}
        </PidroText>
        <View style={styles.deltas}>
          <Delta label={usLabel} value={usDelta} good={hand.delta[us] >= 0} />
          <Delta label={themLabel} value={themDelta} good={hand.delta[them] >= 0} />
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
  },
  whoseChip: {
    marginTop: PidroSpacing.xxs,
    maxWidth: '100%',
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
