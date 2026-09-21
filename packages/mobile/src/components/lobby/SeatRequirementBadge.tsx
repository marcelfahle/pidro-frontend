import { StyleSheet, View } from 'react-native';
import { PidroBevel, PidroRadii, PidroSpacing } from '@/design/tokens';
import { gradientBg } from '@/components/ui/Bevel';
import { PidroText } from '@/components/ui/PidroText';

/** Numeric seat requirement; the seat's accessible label supplies its meaning. */
export function SeatRequirementBadge({ games }: { games: number }) {
  return (
    <View
      pointerEvents="none"
      aria-hidden
      testID="seat-requirement"
      style={[styles.badge, gradientBg(PidroBevel.woodFaceGradient)]}>
      <PidroText role="metadata" tone="gold" numberOfLines={1}>
        {games}
      </PidroText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -PidroSpacing.xs,
    right: -PidroSpacing.xxs,
    borderRadius: PidroRadii.tight,
    borderWidth: 1,
    borderColor: PidroBevel.rim,
    paddingHorizontal: PidroSpacing.xxs,
  },
});
