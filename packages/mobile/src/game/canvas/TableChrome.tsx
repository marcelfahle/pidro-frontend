/**
 * Shared table chrome: the header contract plus reserve math used by both the
 * live table and the dev harness.
 * The header is one row inset from the safe top: the score plaque on the left,
 * the menu on the right. Portrait reserves it above the north seat; landscape
 * seats North inside the row, between the two (see the Table boards).
 */
import { StyleSheet, View, useWindowDimensions, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PidroColors, PidroLayout, PidroSpacing } from '@/design/tokens';
import { SCORE_PLAQUE_HEIGHT } from './Scoreboard';

/** Gap between the safe top and the header row. */
export const HEADER_INSET = PidroSpacing.xs;
/** The header row's height from the safe top: the taller of the plaque and the menu. */
export const TABLE_HEADER = HEADER_INSET + Math.max(SCORE_PLAQUE_HEIGHT, PidroLayout.touchTarget);
// One shared portrait slot below the hand. It can host chat, an adaptive ad,
// or compact table details, but those modes should never stack vertically.
export const UTILITY_DOCK_RESERVE = 72;

export interface TableReserves {
  landscape: boolean;
  topReserve: number;
  bottomReserve: number;
  /** Where notices and the connection banner float: never over the header or a seat. */
  noticeSlot: ViewStyle;
}

export interface TableDockHeights {
  top?: number;
  bottom?: number;
}

export function useTableReserves({
  top = TABLE_HEADER,
  bottom = UTILITY_DOCK_RESERVE,
}: TableDockHeights = {}): TableReserves {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const landscape = width > height;
  return {
    landscape,
    topReserve: landscape ? 0 : top,
    bottomReserve: landscape ? 0 : bottom,
    // Portrait: the dock under the hand. Landscape: the felt below the header
    // row, between the side seats, where North no longer sits.
    noticeSlot: landscape
      ? { top: insets.top + TABLE_HEADER + PidroSpacing.xs }
      : { bottom: insets.bottom, height: bottom, justifyContent: 'center' },
  };
}

/** Portrait-only dock frames. Their contents can own the heights passed above. */
export function TableChromeBars({ reserves }: { reserves: TableReserves }) {
  const insets = useSafeAreaInsets();
  if (reserves.landscape) return null;

  return (
    <>
      <View
        testID="table-utility-dock"
        pointerEvents="none"
        style={[styles.utilityDock, { height: insets.bottom + reserves.bottomReserve }]}
      />
    </>
  );
}

const styles = StyleSheet.create({
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
