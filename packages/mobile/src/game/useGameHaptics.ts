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
import { getTableHapticEvents, isYourTurn } from './hapticTransitions';

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

/** A wrong answer, such as a seat password: a light buzz. */
export function playWrongHaptic() {
  runHaptic(() =>
    Platform.OS === 'android'
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Reject)
      : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
  );
}

/** A choice settled in a set of options: the lightest tick. */
export function playSelectionHaptic() {
  runHaptic(() =>
    Platform.OS === 'android'
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Segment_Tick)
      : Haptics.selectionAsync()
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

/** A trick holding a five, seen from no seat: the heaviest tap the table makes. */
export function playBigTrickHaptic() {
  runHaptic(() =>
    Platform.OS === 'android'
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Long_Press)
      : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
  );
}

/** Our side took a five: the happy one. Sounds hook in here later. */
export function playOurPidroHaptic() {
  runHaptic(() =>
    Platform.OS === 'android'
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm)
      : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  );
}

/** They took a five: the sad one. Sounds hook in here later. */
export function playTheirPidroHaptic() {
  runHaptic(() =>
    Platform.OS === 'android'
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Reject)
      : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
  );
}

/** "Your turn": a two-beat tap, unlike any card or trick, so it reads without looking. */
function playTurnHaptic() {
  runHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

/** Lets the card or trick that handed you the turn land first, so the two taps stay apart. */
const TURN_AFTER_CARD_MS = 250;
const TURN_AFTER_TRICK_MS = 450;

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

    // A delayed turn tap only lands if the turn is still yours by then.
    const turnHapticIfStillYours = () => {
      if (previousModel.current && isYourTurn(previousModel.current)) playTurnHaptic();
    };
    const events = getTableHapticEvents(previousModel.current, model);
    for (const event of events) {
      if (event === 'your_turn') {
        if (events.includes('trick_complete'))
          schedule(turnHapticIfStillYours, TURN_AFTER_TRICK_MS);
        else if (events.includes('card_landed'))
          schedule(turnHapticIfStillYours, TURN_AFTER_CARD_MS);
        else playTurnHaptic();
      }
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
