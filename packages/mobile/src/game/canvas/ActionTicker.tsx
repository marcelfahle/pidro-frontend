/**
 * The plaque's ticker: the latest table actions, paced so each can be read
 * (actionTickerSchedule), settling on a resting line when nothing is new: who
 * holds the bid during a hand, how the last hand ended between hands. Tap to
 * open the hand's log. Lines come from the hand log, so they are the server's
 * facts in plain words.
 */
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Icon } from '@/components/ui/Icon';
import { PidroText } from '@/components/ui/PidroText';
import { PressableFX } from '@/components/ui/PressableFX';
import { PidroColors, PidroLayout, PidroRadii, PidroSpacing } from '@/design/tokens';
import {
  FADE_MS,
  initialTickerState,
  isTickerIdle,
  nextTickerChange,
  stepTicker,
  visibleLines,
  type TickerState,
} from '@/game/actionTickerSchedule';
import type { HandLogEntry } from '@/game/handLog';
import { isStillCapture } from '@/utils/stillCapture';

/** A line that holds when nothing new is showing. */
export type TickerRestingLine = { who: string | null; what: string; ours: boolean | null };

type Props = {
  entries: HandLogEntry[];
  resting: TickerRestingLine | null;
  onOpenLog: () => void;
  /** Where the lines must stop short of North's fan (layout's tickerLineMaxWidth). */
  lineMaxWidth?: number;
};

/** The ticker's text grows with large text, as the bid line did; the plaque's does not. */
const MAX_FONT_SCALE = 1.3;

function useScreenReader(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isScreenReaderEnabled().then((value) => live && setEnabled(value));
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setEnabled);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  return enabled;
}

type Schedule = {
  state: TickerState;
  now: number;
  /** A line keeps its words after the hand moves on and its entry is gone. */
  known: ReadonlyMap<string, HandLogEntry>;
};

export function ActionTicker({ entries, resting, onOpenLog, lineMaxWidth = 168 }: Props) {
  const [schedule, setSchedule] = useState<Schedule>(() => ({
    state: initialTickerState(),
    now: Date.now(),
    known: new Map(),
  }));

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- paces new entries against wall-clock time
    setSchedule((prev) => {
      const now = Date.now();
      const known = new Map(prev.known);
      for (const entry of entries) known.set(entry.id, entry);
      const ids = entries.map((entry) => entry.id);
      return { state: stepTicker(prev.state, ids, now), now, known };
    });
  }, [entries]);

  useEffect(() => {
    // UI grammar holds the lines it caught instead of letting them fade.
    if (isStillCapture()) return;
    const wait = nextTickerChange(schedule.state, schedule.now);
    if (wait == null) return;
    const timer = setTimeout(() => {
      setSchedule((prev) => {
        const now = Date.now();
        return { ...prev, state: stepTicker(prev.state, [], now), now };
      });
    }, wait + 16);
    return () => clearTimeout(timer);
  }, [schedule]);

  const lines = visibleLines(schedule.state, schedule.now).flatMap((line) => {
    const entry = schedule.known.get(line.id);
    return entry ? [{ entry, fading: line.fading }] : [];
  });

  const screenReader = useScreenReader();
  const announced = useRef(new Set<string>());
  useEffect(() => {
    if (!screenReader) return;
    for (const { entry } of lines) {
      if (announced.current.has(entry.id)) continue;
      announced.current.add(entry.id);
      AccessibilityInfo.announceForAccessibility(entry.text);
    }
  });

  const idle = isTickerIdle(schedule.state, schedule.now);
  if (lines.length === 0 && !(idle && resting)) return null;

  return (
    <PressableFX
      testID="action-ticker"
      accessibilityRole="button"
      accessibilityLabel="Recent table actions. Opens this hand's log."
      onPress={onOpenLog}
      style={styles.stack}>
      <View style={styles.lines}>
        {lines.length > 0
          ? lines.map(({ entry, fading }) => (
              <TickerLine
                key={entry.id}
                testID={`ticker-line-${entry.id}`}
                who={entry.who}
                what={entry.what}
                ours={entry.ours}
                fading={fading}
                maxWidth={lineMaxWidth}
              />
            ))
          : resting && (
              <TickerLine
                testID="bid-line"
                who={resting.who}
                what={resting.what}
                ours={resting.ours}
                fading={false}
                maxWidth={lineMaxWidth}
              />
            )}
      </View>
      <Icon name="chevron-right" size={12} color={PidroColors.goldLight} />
    </PressableFX>
  );
}

function TickerLine({
  who,
  what,
  ours,
  fading,
  maxWidth,
  testID,
}: {
  who: string | null;
  what: string;
  ours: boolean | null;
  fading: boolean;
  maxWidth: number;
  testID?: string;
}) {
  const still = isStillCapture();
  const opacity = useSharedValue(still ? 1 : 0);
  useEffect(() => {
    if (still) return;
    opacity.value = withTiming(fading ? 0 : 1, { duration: fading ? FADE_MS : 160 });
  }, [fading, opacity, still]);
  const motion = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const tone = ours ? 'gold' : 'soft';
  return (
    <Animated.View
      testID={testID}
      style={[styles.pill, { maxWidth }, ours ? styles.pillOurs : null, motion]}>
      {who ? (
        <PidroText
          role="metadata"
          tone={tone}
          style={[styles.text, styles.who]}
          numberOfLines={1}
          maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {who}
        </PidroText>
      ) : null}
      <PidroText
        role="metadata"
        tone={tone}
        style={[styles.text, who ? styles.what : null]}
        numberOfLines={1}
        maxFontSizeMultiplier={MAX_FONT_SCALE}>
        {what}
      </PidroText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // A full touch target of its own, below or beside the plaque, never over it.
  stack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.xxs,
    minHeight: PidroLayout.touchTarget,
    minWidth: PidroLayout.touchTarget,
  },
  lines: { alignItems: 'flex-start', gap: 1 },
  pill: {
    flexDirection: 'row',
    paddingHorizontal: PidroSpacing.xs,
    paddingVertical: 1,
    borderRadius: PidroRadii.full,
    backgroundColor: PidroColors.trickChipBg,
    borderWidth: 1,
    borderColor: PidroColors.border,
  },
  pillOurs: { borderColor: PidroColors.goldSoft },
  text: { fontWeight: '800' },
  // The name gives way first; the card, amount or points always show.
  who: { flexShrink: 1 },
  what: { marginLeft: 4, flexShrink: 0 },
});
