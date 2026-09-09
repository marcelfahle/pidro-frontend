/**
 * The app shell's floating tab pill — Liquid-Glass style: a detached glass
 * bevel object inset from the screen edge, not chrome glued to it.
 * Portrait: horizontal pill, bottom-center. Landscape: vertical pill on the
 * right edge, under the right thumb. The gold Table anchor is the center
 * tab (home / your table); it wears a badge when a game is waiting.
 */
import {
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PidroBevel, PidroColors } from '@/design/tokens';
import { PidroText } from '@/components/ui/PidroText';
import { PressableFX } from '@/components/ui/PressableFX';
import { gradientBg } from '@/components/ui/Bevel';

export type ShellTab = 'league' | 'stats' | 'table' | 'friends' | 'settings';

// Pill geometry, single source of truth for clearance math.
const PILL_THICKNESS = 65; // item 50 + face padding 12 + rim 2.5
const PILL_EDGE_GAP = 6; // pill inset beyond the safe area
const CONTENT_GAP = 14; // breathing room between content and pill (portrait)
const CONTENT_GAP_RAIL = 22; // the rail deserves more air beside content

/**
 * How much space screens inside the shell must leave for the floating
 * pill. Derived from safe-area insets + pill geometry — never hardcode
 * clearances in screens (web has zero insets; devices do not).
 */
export function usePillClearance() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  if (landscape) {
    return {
      bottom: 0,
      right: Math.max(insets.right, 8) + PILL_EDGE_GAP + 2 + PILL_THICKNESS + CONTENT_GAP_RAIL,
    };
  }
  return {
    bottom: Math.max(insets.bottom, 10) + PILL_EDGE_GAP + PILL_THICKNESS + CONTENT_GAP,
    right: 0,
  };
}

export interface TabPillProps {
  orientation: 'bottom' | 'rail';
  active: ShellTab;
  tableBadge?: boolean;
  onSelect: (tab: ShellTab) => void;
  style?: StyleProp<ViewStyle>;
}

function SpadeIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={PidroBevel.textGold}>
      <Path d="M12 3c-2.8 3.6-7 6-7 9.6a3.5 3.5 0 0 0 6.1 2.3c-.3 2-1.2 3.6-2.6 5.1h7c-1.4-1.5-2.3-3.1-2.6-5.1a3.5 3.5 0 0 0 6.1-2.3C19 9 14.8 6.6 12 3z" />
    </Svg>
  );
}

const TAB_ICONS: Record<Exclude<ShellTab, 'table'>, keyof typeof Feather.glyphMap> = {
  league: 'award',
  stats: 'bar-chart-2',
  friends: 'users',
  settings: 'settings',
};

const TAB_LABELS: Record<ShellTab, string> = {
  league: 'League',
  stats: 'Stats',
  table: 'Home',
  friends: 'Friends',
  settings: 'Settings',
};

function TabItem({
  tab,
  active,
  onSelect,
}: {
  tab: Exclude<ShellTab, 'table'>;
  active: boolean;
  onSelect: (tab: ShellTab) => void;
}) {
  return (
    <PressableFX
      accessibilityRole="button"
      accessibilityLabel={TAB_LABELS[tab]}
      accessibilityState={{ selected: active }}
      onPress={() => onSelect(tab)}
      style={[styles.item, active && styles.itemActive]}>
      <Feather
        name={TAB_ICONS[tab]}
        size={20}
        color={active ? '#ffffff' : 'rgba(207, 239, 255, 0.78)'}
      />
      <PidroText style={[styles.itemLabel, active && styles.itemLabelActive]}>
        {TAB_LABELS[tab]}
      </PidroText>
    </PressableFX>
  );
}

export function TabPill({ orientation, active, tableBadge, onSelect, style }: TabPillProps) {
  const insets = useSafeAreaInsets();
  const rail = orientation === 'rail';

  return (
    <View
      pointerEvents="box-none"
      style={[
        rail
          ? [styles.railAnchor, { right: Math.max(insets.right, 8) + PILL_EDGE_GAP + 2 }]
          : [styles.bottomAnchor, { bottom: Math.max(insets.bottom, 10) + PILL_EDGE_GAP }],
        style,
      ]}>
      <View style={[styles.pillRim, gradientBg(PidroBevel.glassRimGradient)]}>
        <View
          style={[
            styles.pillFace,
            rail ? styles.pillFaceRail : styles.pillFaceBottom,
            gradientBg('linear-gradient(180deg, rgba(16,54,93,0.9) 0%, rgba(8,34,62,0.92) 100%)'),
          ]}>
          <TabItem tab="league" active={active === 'league'} onSelect={onSelect} />
          <TabItem tab="stats" active={active === 'stats'} onSelect={onSelect} />

          <PressableFX
            accessibilityRole="button"
            accessibilityLabel={tableBadge ? 'Rejoin your game' : 'Home'}
            accessibilityState={{ selected: active === 'table' }}
            onPress={() => onSelect('table')}
            style={styles.item}>
            <View style={[styles.tableRing, gradientBg(PidroBevel.goldRimGradient)]}>
              <View
                style={[
                  styles.tableFace,
                  gradientBg(`linear-gradient(180deg, ${PidroBevel.woodHi}, ${PidroBevel.woodLo})`),
                ]}>
                <SpadeIcon />
              </View>
              {tableBadge ? <View style={styles.badge} /> : null}
            </View>
            {tableBadge ? (
              <PidroText style={[styles.itemLabel, styles.tableLabel]}>Rejoin</PidroText>
            ) : null}
          </PressableFX>

          <TabItem tab="friends" active={active === 'friends'} onSelect={onSelect} />
          <TabItem tab="settings" active={active === 'settings'} onSelect={onSelect} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomAnchor: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  railAnchor: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  pillRim: {
    borderRadius: 33,
    padding: 1.25,
    boxShadow: '0px 8px 20px rgba(0,0,0,0.45), 0px 2px 6px rgba(0,0,0,0.3)',
  },
  pillFace: {
    borderRadius: 31.75,
    boxShadow: 'inset 0px 1px 0px rgba(255,255,255,0.22), inset 0px -2px 0px rgba(2,24,44,0.4)',
  },
  pillFaceBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 2,
  },
  pillFaceRail: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 10,
    gap: 2,
  },
  item: {
    minWidth: 58,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: 24,
    paddingHorizontal: 6,
  },
  itemActive: {
    backgroundColor: 'rgba(140, 220, 255, 0.14)',
  },
  itemLabel: {
    fontSize: 9.5,
    lineHeight: 12,
    fontWeight: '800',
    color: 'rgba(207, 239, 255, 0.65)',
  },
  itemLabelActive: {
    color: '#ffffff',
  },
  tableRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    padding: 2,
    boxShadow: '0px 3px 8px rgba(0,0,0,0.5)',
  },
  tableFace: {
    flex: 1,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: PidroColors.success,
    borderWidth: 2,
    borderColor: 'rgba(8, 34, 62, 0.95)',
  },
  tableLabel: {
    color: PidroBevel.textGold,
    fontWeight: '900',
  },
});
