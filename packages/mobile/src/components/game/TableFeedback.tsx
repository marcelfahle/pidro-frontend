import { useCallback, useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { useSeatDecisions } from '@pidro/shared';
import { HUD_RESERVE } from '@/game/canvas/TableChrome';
import { enqueueTableNotice, type QueuedTableNotice, type TableNotice } from '@/game/tableNotices';

export function useTableNotices(roomCode: string) {
  const [notices, setNotices] = useState<QueuedTableNotice[]>([]);
  const addNotice = useCallback(
    (notice: TableNotice) => {
      setNotices((current) => enqueueTableNotice(current, notice, roomCode));
    },
    [roomCode]
  );
  const dismissNotice = useCallback(() => setNotices((current) => current.slice(1)), []);
  const notice = notices[0]?.roomCode === roomCode ? notices[0] : null;
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(dismissNotice, 4500);
    return () => clearTimeout(timer);
  }, [notice, dismissNotice]);
  return { notice, addNotice, dismissNotice };
}

/** Explicit review, not a blocking alert. Deferring never resolves a server decision. */
export function TableSeatDecision({
  decisions,
}: {
  decisions: ReturnType<typeof useSeatDecisions>;
}) {
  const [expanded, setExpanded] = useState(false);
  const decision = decisions.decision;
  // Losing eligibility or starting your turn closes review without resolving it.
  if (expanded && !decision) setExpanded(false);
  if (!decisions.pendingCount) return null;
  return (
    <SafeAreaView pointerEvents="box-none" className="absolute inset-0 z-[150]">
      <View pointerEvents="box-none" className="flex-1 justify-center px-6 py-5">
        {expanded && decision ? (
          <ScrollView
            testID="seat-decision-card"
            className="max-h-full w-full max-w-md flex-grow-0 self-center rounded-2xl border border-amber-400/40 bg-amber-950"
            contentContainerClassName="p-6">
            <View className="flex-row items-center justify-between gap-3">
              <Text className="flex-1 text-sm font-semibold text-amber-200">
                {decisions.pendingCount} pending
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Review seats later"
                accessibilityHint="Leaves these decisions waiting while you play."
                onPress={() => setExpanded(false)}
                className="min-h-11 justify-center px-3">
                <Text className="font-semibold text-amber-100">Later</Text>
              </Pressable>
            </View>
            <Text className="mt-3 text-lg font-bold text-amber-100">
              {decision.playerName} left
            </Text>
            <Text className="mt-1 text-sm text-amber-200 capitalize">{decision.position} seat</Text>
            {decisions.error && (
              <Text accessibilityLiveRegion="polite" className="mt-4 text-sm text-red-200">
                {decisions.error}
              </Text>
            )}
            <View className="mt-6 gap-3">
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: decisions.busy, busy: decisions.busy }}
                disabled={decisions.busy}
                onPress={decisions.openSeat}
                className="min-h-12 items-center justify-center rounded-lg bg-amber-400 px-3 py-2 disabled:opacity-50">
                <Text className="text-center font-bold text-amber-950">
                  {decisions.busy ? 'Updating seat…' : 'Open seat for a player'}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: decisions.busy }}
                disabled={decisions.busy}
                onPress={decisions.keepBot}
                className="min-h-12 items-center justify-center rounded-lg border border-amber-400/40 px-3 py-2 disabled:opacity-50">
                <Text className="text-center font-bold text-amber-100">Keep bot</Text>
              </Pressable>
            </View>
          </ScrollView>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !decision, expanded: false }}
            disabled={!decision}
            onPress={() => setExpanded(true)}
            className="min-h-11 self-end rounded-xl border border-amber-400/40 bg-amber-950 px-3 py-3">
            <Text className="text-sm font-semibold text-amber-100">
              Review seats ({decisions.pendingCount})
            </Text>
            {!decision && <Text className="text-xs text-amber-200">After your turn</Text>}
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

export function TableFeedback({ notice }: { notice: TableNotice | null }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const landscape = width > height;

  useEffect(() => {
    if (!notice || Platform.OS !== 'ios') return;
    AccessibilityInfo.announceForAccessibilityWithOptions(notice.message, { queue: true });
  }, [notice]);

  const noticeWidth = Math.min(360, width - insets.left - insets.right - 24);
  return (
    <View pointerEvents="none" style={styles.noticeOverlay}>
      {notice ? (
        <View
          testID="table-feedback"
          accessible={Platform.OS !== 'ios'}
          accessibilityLabel={notice.message}
          accessibilityLiveRegion="polite"
          aria-live="polite"
          aria-atomic
          className="absolute flex-row items-center gap-2 rounded-xl border border-white/20 bg-slate-950 px-3 shadow-lg"
          style={[
            styles.notice,
            {
              top: landscape ? insets.top + 28 : insets.top + HUD_RESERVE + 104,
              width: noticeWidth,
              height: landscape ? 36 : 52,
            },
          ]}>
          <View
            className={
              notice.variant === 'error'
                ? 'h-2 w-2 rounded-full bg-red-300'
                : notice.variant === 'success'
                  ? 'h-2 w-2 rounded-full bg-emerald-300'
                  : 'h-2 w-2 rounded-full bg-amber-300'
            }
          />
          <Text
            numberOfLines={landscape ? 1 : 2}
            ellipsizeMode="tail"
            className={
              notice.variant === 'error'
                ? 'flex-1 text-sm text-red-100'
                : 'flex-1 text-sm text-white'
            }>
            {notice.message}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  noticeOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 140,
    elevation: 140,
  },
  notice: {
    alignSelf: 'center',
  },
});
