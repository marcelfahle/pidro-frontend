/**
 * Shared table chrome: a compact portrait HUD band plus reserve math used by
 * both the live table and the dev harness.
 * Landscape renders no chrome — the felt owns the whole screen and the
 * scoreboard/Leave float instead (see DESIGN.md).
 */
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PidroColors } from '@/design/tokens';

// Header band height: score + leave live above it, north card-backs tuck under.
export const HUD_RESERVE = 56;
// One shared portrait slot below the hand. It can host chat, an adaptive ad,
// or compact table details, but those modes should never stack vertically.
export const UTILITY_DOCK_RESERVE = 72;

export interface TableReserves {
  landscape: boolean;
  topReserve: number;
  bottomReserve: number;
}

export interface TableDockHeights {
  top?: number;
  bottom?: number;
}

export function useTableReserves({
  top = HUD_RESERVE,
  bottom = UTILITY_DOCK_RESERVE,
}: TableDockHeights = {}): TableReserves {
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  return {
    landscape,
    topReserve: landscape ? 0 : top,
    bottomReserve: landscape ? 0 : bottom,
  };
}

/** Portrait-only dock frames. Their contents can own the heights passed above. */
export function TableChromeBars({ reserves }: { reserves: TableReserves }) {
  const insets = useSafeAreaInsets();
  if (reserves.landscape) return null;

  return (
    <>
      <View
        pointerEvents="none"
        style={[styles.hudBar, { height: insets.top + reserves.topReserve }]}
      />
      <View
        testID="table-utility-dock"
        pointerEvents="none"
        style={[styles.utilityDock, { height: insets.bottom + reserves.bottomReserve }]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  hudBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 38,
    elevation: 38,
    backgroundColor: PidroColors.panel,
    borderBottomWidth: 1,
    borderBottomColor: PidroColors.border,
  },
  utilityDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 38,
    elevation: 38,
    backgroundColor: PidroColors.panel,
    borderTopWidth: 1,
    borderTopColor: PidroColors.border,
  },
});
