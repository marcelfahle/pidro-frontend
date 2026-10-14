import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { gradientBg } from '@/components/ui/Bevel';
import { Icon } from '@/components/ui/Icon';
import { PidroBevel, PidroColors } from '@/design/tokens';

/** The felt of a table seen from above, as Tables and New table draw it. */
export function TableTop({ mark, style }: { mark: number; style: StyleProp<ViewStyle> }) {
  return (
    <View pointerEvents="none" style={[styles.top, gradientBg(PidroBevel.tabletopGradient), style]}>
      <Icon name="spade" size={mark} color={PidroColors.tabletopMark} />
    </View>
  );
}

/** An empty chair at that table. One marked for an invite shows a gold link. */
export function OpenChair({
  size,
  invite = false,
  style,
}: {
  size: number;
  invite?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      pointerEvents="none"
      style={[styles.chair, { width: size, height: size, borderRadius: size / 2 }, style]}>
      <Icon
        name={invite ? 'link' : 'plus'}
        size={Math.round(size * 0.4)}
        color={invite ? PidroBevel.textGold : PidroColors.cyanText}
        strokeWidth={2.4}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  top: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 6,
    borderColor: PidroBevel.woodLo,
    boxShadow: PidroBevel.tabletopShadow,
  },
  chair: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: PidroColors.chairOpenBorder,
    backgroundColor: PidroColors.panel,
  },
});
