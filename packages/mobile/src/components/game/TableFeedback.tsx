import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { useSeatDecisions } from '@pidro/shared';

type Notice = { message: string; variant: 'warning' | 'success' | 'error' };

export function useTableNotices(roomCode: string) {
  const [notices, setNotices] = useState<(Notice & { roomCode: string })[]>([]);
  const addNotice = useCallback(
    (notice: Notice) => {
      setNotices((current) => [
        ...current.filter((entry) => entry.roomCode === roomCode),
        { ...notice, roomCode },
      ]);
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

/** One passive surface, never a Modal or native Alert; the rest of the table stays interactive. */
export function TableFeedback({
  decisions,
  notice,
  dismissNotice,
}: {
  decisions: ReturnType<typeof useSeatDecisions>;
  notice: Notice | null;
  dismissNotice: () => void;
}) {
  const decision = decisions.decision;
  if (!decision && !notice) return null;
  return (
    <SafeAreaView
      pointerEvents="box-none"
      edges={['top', 'left', 'right']}
      className="items-center px-3">
      {decision ? (
        <View
          accessibilityLabel="Seat decision"
          className="w-full max-w-lg rounded-xl border border-amber-400/40 bg-amber-950 p-3">
          <Text className="text-sm font-semibold text-amber-100">
            {decision.playerName} left ({decision.position}). Open this seat for another player?
          </Text>
          {decisions.pendingCount > 1 && (
            <Text className="mt-1 text-xs text-amber-200">
              {decisions.pendingCount - 1} more waiting
            </Text>
          )}
          {decisions.error && (
            <Text accessibilityLiveRegion="polite" className="mt-1 text-sm text-red-200">
              {decisions.error}
            </Text>
          )}
          <View className="mt-2 flex-row gap-3">
            <Pressable
              accessibilityRole="button"
              disabled={decisions.busy}
              onPress={decisions.openSeat}
              className="min-h-11 flex-1 items-center justify-center rounded-lg bg-amber-400 px-3">
              <Text className="font-bold text-amber-950">
                {decisions.busy ? 'Saving…' : 'Open Seat'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={decisions.busy}
              onPress={decisions.keepBot}
              className="min-h-11 flex-1 items-center justify-center rounded-lg border border-amber-400/40 px-3">
              <Text className="font-bold text-amber-100">Keep Bot</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      {notice ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${notice.message} Dismiss notification`}
          onPress={dismissNotice}
          className="w-full max-w-lg rounded-xl border border-white/20 bg-slate-900 p-3">
          <Text
            accessibilityLiveRegion="polite"
            className={notice.variant === 'error' ? 'text-sm text-red-200' : 'text-sm text-white'}>
            {notice.message}
          </Text>
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}
