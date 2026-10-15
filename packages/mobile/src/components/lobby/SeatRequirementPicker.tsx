/**
 * The second line under an open seat on Start a table: who may sit there,
 * by games played. It is always in view while the seat is open, and folds in
 * and out with the seat's Open choice, so the choice never hides behind a
 * second tap.
 */
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { PidroText } from '@/components/ui/PidroText';
import { PressableFX } from '@/components/ui/PressableFX';
import { PidroBevel, PidroColors, PidroRadii } from '@/design/tokens';
import type { SeatRequirement } from '@/features/lobby/newTable';

const OPTIONS: { value: SeatRequirement; label: string }[] = [
  { value: 0, label: 'Anyone' },
  { value: 100, label: '100+' },
  { value: 1000, label: '1000+' },
];

/** The folded line: a 4 pt gap above a 44 pt track of full touch targets. */
const LINE_HEIGHT = 48;
const FOLD_MS = 220;
const EASE_OUT = Easing.out(Easing.cubic);

/** Height and opacity follow `open`; first render starts where it already is. */
export function SeatFold({ open, children }: { open: boolean; children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(open ? 1 : 0);
  useEffect(() => {
    progress.value = reduceMotion
      ? open
        ? 1
        : 0
      : withTiming(open ? 1 : 0, { duration: FOLD_MS, easing: EASE_OUT });
  }, [open, progress, reduceMotion]);
  const fold = useAnimatedStyle(() => ({
    height: LINE_HEIGHT * progress.value,
    opacity: progress.value,
  }));
  return (
    <Animated.View
      style={[styles.fold, fold]}
      pointerEvents={open ? 'box-none' : 'none'}
      aria-hidden={!open}
      importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}>
      {children}
    </Animated.View>
  );
}

export function SeatRequirementPicker({
  value,
  onChange,
  seatLabel,
  disabled = false,
  indent,
}: {
  value: SeatRequirement;
  onChange: (games: SeatRequirement) => void;
  seatLabel: string;
  disabled?: boolean;
  /** Lines the track up under the seat's choices. */
  indent: number;
}) {
  return (
    <View style={styles.line}>
      <View style={{ width: indent }} />
      <PidroText role="metadata" tone="soft" style={styles.caption} numberOfLines={2}>
        games played
      </PidroText>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={`${seatLabel}, games played`}
        style={styles.track}>
        {OPTIONS.map((option) => {
          const checked = option.value === value;
          return (
            <PressableFX
              key={option.value}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ checked, disabled }}
              aria-checked={checked}
              disabled={disabled}
              onPress={() => onChange(option.value)}
              style={styles.segment}>
              {/* The selection sits inset in the track; the whole segment stays a 44 pt target. */}
              {checked ? <View style={styles.segmentOn} /> : null}
              <PidroText
                role="label"
                style={[styles.segmentLabel, checked && styles.segmentLabelOn]}>
                {option.label}
              </PidroText>
            </PressableFX>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fold: { overflow: 'hidden' },
  line: {
    height: LINE_HEIGHT,
    paddingTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  caption: { width: 76, flexShrink: 1, fontSize: 11, lineHeight: 14, textAlign: 'right' },
  track: {
    flex: 1,
    minWidth: 132,
    height: 44,
    flexDirection: 'row',
    borderRadius: PidroRadii.panel,
    backgroundColor: PidroBevel.panelDeep,
    borderWidth: 1,
    borderColor: PidroColors.border,
  },
  segment: {
    flex: 1,
    height: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentOn: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    right: 3,
    borderRadius: PidroRadii.panel - 3,
    backgroundColor: PidroColors.choiceOn,
    borderWidth: 1.5,
    borderColor: PidroBevel.rim,
  },
  segmentLabel: { fontSize: 12, lineHeight: 15, color: PidroColors.textSoft },
  segmentLabelOn: { color: PidroBevel.textGold },
});
