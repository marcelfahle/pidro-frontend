import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '@/stores/settings';
import type { TableModel } from './canvas/tableModel';

function runHaptic(effect: () => Promise<void>) {
  if (Platform.OS === 'web' || !useSettingsStore.getState().hapticEnabled) return;
  // Haptics are polish, never part of whether a game action succeeds.
  void effect().catch(() => {});
}

export function playActionHaptic() {
  runHaptic(() =>
    Platform.OS === 'android'
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Segment_Tick)
      : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  );
}

function playDealPacketHaptic() {
  runHaptic(() =>
    Platform.OS === 'android'
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Segment_Frequent_Tick)
      : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)
  );
}

/** Gently marks only the three packets that land in this player's hand. */
export function useDealHaptics(model: TableModel) {
  const previousHandCount = useRef(model.yourHand.length);

  useEffect(() => {
    if (model.dealStage === 'dealing' && model.yourHand.length > previousHandCount.current) {
      playDealPacketHaptic();
    }
    previousHandCount.current = model.yourHand.length;
  }, [model.dealStage, model.yourHand.length]);
}
