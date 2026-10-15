import { StyleSheet, View } from 'react-native';
import { PidroBevel, PidroColors, PidroRadii } from '@/design/tokens';
import { PidroText } from '@/components/ui/PidroText';

/** Numeric seat requirement; the seat's accessible label supplies its meaning. */
export function SeatRequirementBadge({ games }: { games: number }) {
  return (
    <View pointerEvents="none" aria-hidden testID="seat-requirement" style={styles.badge}>
      <PidroText role="metadata" style={styles.label} numberOfLines={1}>
        {games}+
      </PidroText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    bottom: -7,
    alignSelf: 'center',
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
  label: { fontSize: 9, lineHeight: 12, fontWeight: '900' },
});
