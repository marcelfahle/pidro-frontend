import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useReducedMotion } from 'react-native-reanimated';
import { useSettingsStore } from '@/stores/settings';
import {
  CUT_CARD_STAGGER_MS,
  CUT_CARD_TRAVEL_MS,
  CUT_WINNER_PAUSE_MS,
} from './canvas/animationTiming';
import type { TableModel } from './canvas/tableModel';
import { getTableHapticEvents } from './hapticTransitions';

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

export function playCardHaptic() {
  runHaptic(() =>
    Platform.OS === 'android'
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Gesture_End)
      : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)
  );
}

function playDealPacketHaptic() {
  runHaptic(() =>
    Platform.OS === 'android'
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Segment_Frequent_Tick)
      : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)
  );
}

function playTrickHaptic() {
  runHaptic(() =>
    Platform.OS === 'android'
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm)
      : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  );
}

export function useTableHaptics(model: TableModel) {
  const reducedMotion = useReducedMotion();
  const previousModel = useRef<TableModel | null>(null);
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    const schedule = (effect: () => void, delay: number) => {
      const timer = setTimeout(() => {
        timers.current.delete(timer);
        effect();
      }, delay);
      timers.current.add(timer);
    };

    for (const event of getTableHapticEvents(previousModel.current, model)) {
      if (event === 'deal_packet' || event === 'card_landed') playDealPacketHaptic();
      if (event === 'trick_complete') playTrickHaptic();
      if (event === 'hand_shuffle') {
        playDealPacketHaptic();
        if (!reducedMotion) {
          schedule(playDealPacketHaptic, 80);
          schedule(playDealPacketHaptic, 170);
        }
      }
      if (event === 'dealer_cut_sequence') {
        const cutCount = Object.keys(model.dealerCuts).length;
        if (reducedMotion) {
          playActionHaptic();
        } else {
          for (let index = 0; index < cutCount; index += 1) {
            schedule(playDealPacketHaptic, index * CUT_CARD_STAGGER_MS + CUT_CARD_TRAVEL_MS);
          }
          if (model.dealerRelative && model.dealerCuts[model.dealerRelative]) {
            schedule(
              playTrickHaptic,
              Math.max(0, cutCount - 1) * CUT_CARD_STAGGER_MS +
                CUT_CARD_TRAVEL_MS +
                CUT_WINNER_PAUSE_MS
            );
          }
        }
      }
    }
    previousModel.current = model;
  }, [model, reducedMotion]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      timers.current.clear();
    },
    []
  );
}
