import { StyleSheet, View, type FlexAlignType } from 'react-native';
import { PidroText } from '@/components/ui/PidroText';
import { PidroBevel, PidroRadii } from '@/design/tokens';

/**
 * Progress toward the next league: a carved-in track with a gold fill and a
 * quiet caption underneath. The track is a well (dark, inset), matching the
 * "inputs are carved into the surface" half of the material rule — progress is
 * something the table records, not a control the player operates.
 */
export interface LeagueProgressProps {
  /** 0–1; clamped, so a server that overshoots cannot overflow the track. */
  progress: number;
  label: string;
  width?: number;
  /** How track and caption sit against each other. Home's HUD is right-aligned. */
  align?: FlexAlignType;
}

export function LeagueProgress({
  progress,
  label,
  width = 172,
  align = 'flex-start',
}: LeagueProgressProps) {
  const clamped = Math.max(0, Math.min(1, progress));

  // Own wrapper, own gap: the caption belongs to THIS track, so it must sit
  // closer to it than the next block does. A fragment would inherit the
  // parent's block gap and make the grouping ambiguous.
  return (
    <View style={[styles.group, { alignItems: align }]}>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
        accessibilityLabel={label}
        style={[styles.track, { width }]}>
        <View style={[styles.fill, { width: `${clamped * 100}%` }]} />
      </View>
      <PidroText style={styles.label}>{label}</PidroText>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 4,
  },
  track: {
    height: 6,
    borderRadius: PidroRadii.tight,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: PidroRadii.tight,
    backgroundColor: PidroBevel.rim,
  },
  label: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: 'rgba(214, 238, 250, 0.65)',
  },
});
