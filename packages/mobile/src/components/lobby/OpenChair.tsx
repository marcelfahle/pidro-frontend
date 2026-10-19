import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { PidroBevel, PidroColors, PidroRadii } from '@/design/tokens';

/** Open, substitute and friend chairs share the same dashed seat. */
export function OpenChair({
  size,
  invite = false,
  substitute = false,
  style,
}: {
  size: number;
  invite?: boolean;
  substitute?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.chair,
        { width: size, height: size, borderRadius: size / 2 },
        substitute && { borderColor: PidroColors.chairSubBorder },
        invite && { borderColor: PidroBevel.rim },
        style,
      ]}>
      <Icon
        name={invite ? 'user' : 'plus'}
        size={Math.round(size * 0.4)}
        color={
          invite
            ? PidroBevel.textGold
            : substitute
              ? PidroColors.rulesLouisianaText
              : PidroColors.cyanText
        }
        strokeWidth={2.4}
      />
    </View>
  );
}

/** The gold lock at a password chair's lower right: the same token on New table and Tables. */
export function ChairLock({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View pointerEvents="none" style={[styles.lock, style]}>
      <Icon name="lock" size={11} color={PidroBevel.textGold} strokeWidth={2.8} />
    </View>
  );
}

const styles = StyleSheet.create({
  chair: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: PidroColors.chairOpenBorder,
    backgroundColor: PidroColors.panel,
  },
  lock: {
    position: 'absolute',
    right: -5,
    bottom: -4,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: PidroRadii.full,
    borderWidth: 1.5,
    borderColor: PidroBevel.rim,
    backgroundColor: PidroBevel.panelDeep,
  },
});
