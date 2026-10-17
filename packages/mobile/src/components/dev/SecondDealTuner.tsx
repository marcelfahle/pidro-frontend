/**
 * DEV ONLY (`/table-dev?deal=draw`): tune the second deal's beats live and
 * replay them. Each change replays at once; the link takes the same keys
 * (`startMs=`, `throwGapMs=`, …) so a setting can be shared.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PidroBevel, PidroColors, PidroFonts, PidroSpacing } from '@/design/tokens';
import {
  resetSecondDealTiming,
  secondDealDurationMs,
  secondDealTiming,
  setSecondDealTiming,
  type SecondDealTiming,
} from '@/game/canvas/animationTiming';

const ROWS: { key: keyof SecondDealTiming; label: string; step: number }[] = [
  { key: 'throwGapMs', label: 'Between throws', step: 50 },
  { key: 'holdMs', label: 'Piles to count', step: 250 },
  { key: 'packMs', label: 'Piles clear, pack', step: 50 },
  { key: 'cardMs', label: 'Each dealt card', step: 20 },
  { key: 'seatGapMs', label: 'Between players', step: 50 },
  { key: 'robMs', label: 'Dealer takes rest', step: 50 },
  { key: 'startMs', label: 'Before first throw', step: 50 },
];

/** Applies `key=ms` values from the link to the live timing. */
export function applyTimingParams(params: Record<string, string | string[] | undefined>) {
  for (const { key } of ROWS) {
    const raw = params[key];
    const value = Number(Array.isArray(raw) ? raw[0] : raw);
    if (raw != null && Number.isFinite(value) && value >= 0) setSecondDealTiming({ [key]: value });
  }
}

export function SecondDealTuner({ dealt, onReplay }: { dealt: number; onReplay: () => void }) {
  const [open, setOpen] = useState(false);
  const [, setVersion] = useState(0);
  const change = (key: keyof SecondDealTiming, delta: number) => {
    setSecondDealTiming({ [key]: Math.max(0, secondDealTiming[key] + delta) });
    setVersion((v) => v + 1);
    onReplay();
  };
  const reset = () => {
    resetSecondDealTiming();
    setVersion((v) => v + 1);
    onReplay();
  };
  const total = (secondDealDurationMs(dealt) / 1000).toFixed(1);

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      {open ? (
        <View style={styles.panel}>
          {ROWS.map(({ key, label, step }) => (
            <View key={key} style={styles.row}>
              <Text style={styles.label}>{label}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Less ${label}`}
                onPress={() => change(key, -step)}
                style={styles.step}>
                <Text style={styles.stepText}>−</Text>
              </Pressable>
              <Text style={styles.value}>{secondDealTiming[key]}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`More ${label}`}
                onPress={() => change(key, step)}
                style={styles.step}>
                <Text style={styles.stepText}>+</Text>
              </Pressable>
            </View>
          ))}
          <View style={styles.row}>
            <Text style={styles.label}>Whole second deal: {total}s</Text>
            <Pressable accessibilityRole="button" onPress={reset} style={styles.small}>
              <Text style={styles.stepText}>Reset</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      <View style={styles.buttons}>
        <Pressable accessibilityRole="button" onPress={onReplay} style={styles.small}>
          <Text style={styles.stepText}>Replay</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => setOpen((o) => !o)}
          style={styles.small}>
          <Text style={styles.stepText}>{open ? 'Done' : 'Tune'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, bottom: 96, alignItems: 'flex-start', gap: 8 },
  panel: {
    alignSelf: 'stretch',
    padding: PidroSpacing.sm,
    gap: 6,
    borderRadius: 12,
    backgroundColor: PidroBevel.panelDeep,
    borderWidth: 1,
    borderColor: PidroColors.cyanBorder,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: {
    flex: 1,
    fontFamily: PidroFonts.ui,
    fontWeight: '700',
    fontSize: 14,
    color: PidroColors.text,
  },
  value: {
    width: 56,
    textAlign: 'center',
    fontFamily: PidroFonts.ui,
    fontWeight: '900',
    fontSize: 15,
    color: PidroColors.text,
    fontVariant: ['tabular-nums'],
  },
  step: {
    width: 40,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PidroBevel.panelHi,
  },
  small: {
    minWidth: 72,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PidroBevel.panelHi,
  },
  stepText: { fontFamily: PidroFonts.ui, fontWeight: '900', fontSize: 16, color: PidroColors.text },
  buttons: { flexDirection: 'row', gap: 8 },
});
