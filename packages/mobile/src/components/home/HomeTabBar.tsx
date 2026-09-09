/**
 * Home navigation: a bottom tab bar in portrait that becomes a right-hand
 * rail in landscape (under the right thumb). Five items, same order in
 * both: League · Stats · Table (gold, center — this screen) · Friends ·
 * Settings. The center Table button also means "back to your table" once
 * a game is live; for now it is the active-home anchor.
 */
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PidroBevel, PidroLayout } from '@/design/tokens';
import { PidroText } from '@/components/ui/PidroText';
import { PressableFX } from '@/components/ui/PressableFX';
import { gradientBg } from '@/components/ui/Bevel';

export interface HomeTabBarProps {
  orientation: 'bottom' | 'rail';
  onLeague: () => void;
  onStats: () => void;
  onFriends: () => void;
  onSettings: () => void;
  style?: StyleProp<ViewStyle>;
}

function SpadeIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={PidroBevel.textGold}>
      <Path d="M12 3c-2.8 3.6-7 6-7 9.6a3.5 3.5 0 0 0 6.1 2.3c-.3 2-1.2 3.6-2.6 5.1h7c-1.4-1.5-2.3-3.1-2.6-5.1a3.5 3.5 0 0 0 6.1-2.3C19 9 14.8 6.6 12 3z" />
    </Svg>
  );
}

interface TabItemProps {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
}

function TabItem({ label, icon, onPress }: TabItemProps) {
  return (
    <PressableFX
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.item}>
      <Feather name={icon} size={21} color="rgba(207, 239, 255, 0.9)" />
      <PidroText style={styles.itemLabel}>{label}</PidroText>
    </PressableFX>
  );
}

function TableAnchor() {
  return (
    <View accessibilityRole="button" accessibilityLabel="Your table" style={styles.item}>
      <View style={[styles.tableRing, gradientBg(PidroBevel.goldRimGradient)]}>
        <View
          style={[
            styles.tableFace,
            gradientBg(`linear-gradient(180deg, ${PidroBevel.woodHi}, ${PidroBevel.woodLo})`),
          ]}>
          <SpadeIcon />
        </View>
      </View>
      <PidroText style={[styles.itemLabel, styles.tableLabel]}>Table</PidroText>
    </View>
  );
}

export function HomeTabBar({
  orientation,
  onLeague,
  onStats,
  onFriends,
  onSettings,
  style,
}: HomeTabBarProps) {
  const insets = useSafeAreaInsets();
  const rail = orientation === 'rail';

  return (
    <View
      style={[
        rail
          ? [styles.rail, { paddingRight: Math.max(insets.right - 6, 0) }]
          : [styles.bottom, { paddingBottom: Math.max(insets.bottom, 10) }],
        style,
      ]}>
      <TabItem label="League" icon="award" onPress={onLeague} />
      <TabItem label="Stats" icon="bar-chart-2" onPress={onStats} />
      <TableAnchor />
      <TabItem label="Friends" icon="users" onPress={onFriends} />
      <TabItem label="Settings" icon="settings" onPress={onSettings} />
    </View>
  );
}

const styles = StyleSheet.create({
  bottom: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 4,
    paddingTop: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(4, 22, 42, 0.85)',
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(140, 215, 250, 0.25)',
  },
  rail: {
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'space-evenly',
    gap: 4,
    paddingVertical: 10,
    paddingLeft: 4,
    backgroundColor: 'rgba(4, 22, 42, 0.85)',
    borderLeftWidth: 1.5,
    borderLeftColor: 'rgba(140, 215, 250, 0.25)',
  },
  item: {
    flex: 1,
    minHeight: PidroLayout.touchTarget,
    minWidth: 62,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    opacity: 0.9,
  },
  itemLabel: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '800',
    color: 'rgba(207, 239, 255, 0.75)',
  },
  tableRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    padding: 2.5,
    marginTop: -2,
    boxShadow: '0px 3px 8px rgba(0,0,0,0.5)',
  },
  tableFace: {
    flex: 1,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableLabel: {
    color: PidroBevel.textGold,
    fontWeight: '900',
  },
});
