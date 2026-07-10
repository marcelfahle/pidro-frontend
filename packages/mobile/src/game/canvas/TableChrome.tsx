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

export interface TableReserves {
  landscape: boolean;
  topReserve: number;
  bottomReserve: number;
}

export function useTableReserves(): TableReserves {
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  return {
    landscape,
    topReserve: landscape ? 0 : HUD_RESERVE,
    bottomReserve: 0,
  };
}

/** Portrait-only header band. Renders nothing in landscape. */
export function TableChromeBars({ reserves }: { reserves: TableReserves }) {
  const insets = useSafeAreaInsets();
  if (reserves.landscape) return null;

  return (
    <View pointerEvents="none" style={[styles.hudBar, { height: insets.top + HUD_RESERVE }]} />
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
});
