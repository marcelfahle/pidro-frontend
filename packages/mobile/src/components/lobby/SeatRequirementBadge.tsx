import { StyleSheet, View } from 'react-native';
import { PidroBevel, PidroColors, PidroRadii } from '@/design/tokens';
import { PidroText } from '@/components/ui/PidroText';

/** Numeric seat requirement; the seat's accessible label supplies its meaning. */
export function SeatRequirementBadge({
  games,
  locked = false,
}: {
  games: number;
  locked?: boolean;
}) {
  return (
    // A strip wider than the chair, so "1000+" never truncates to the chair's width.
    <View pointerEvents="none" aria-hidden style={styles.strip}>
      <View testID="seat-requirement" style={[styles.badge, locked && styles.locked]}>
        <PidroText
          role="metadata"
          style={[styles.label, locked && styles.lockedLabel]}
          numberOfLines={1}>
          {games}+
        </PidroText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    position: 'absolute',
    bottom: -7,
    left: -20,
    right: -20,
    alignItems: 'center',
  },
  badge: {
    minWidth: 26,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: PidroRadii.full,
    borderWidth: 1.5,
    borderColor: PidroColors.cyan,
    backgroundColor: PidroBevel.panelDeep,
    paddingHorizontal: 5,
  },
  locked: { borderColor: PidroColors.danger },
  lockedLabel: { color: PidroColors.danger },
  label: { fontSize: 9, lineHeight: 12, fontWeight: '900' },
});
