import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Modal, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { RuleSet } from '@pidro/shared';
import { useSettingsStore } from '@/stores/settings';
import type { CreateRoomRequest } from '@/types/lobby';
import { OpenChair } from '@/components/lobby/OpenChair';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SeatRequirementBadge } from '@/components/lobby/SeatRequirementBadge';
import { SeatFold, SeatRequirementPicker } from '@/components/lobby/SeatRequirementPicker';
import { playSelectionHaptic } from '@/game/useGameHaptics';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { BackButton } from '@/components/ui/BackButton';
import { BevelPressable } from '@/components/ui/Bevel';
import { PidroText } from '@/components/ui/PidroText';
import { PressableFX } from '@/components/ui/PressableFX';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Surface } from '@/components/ui/Surface';
import { PidroBevel, PidroColors, PidroFonts, PidroRadii } from '@/design/tokens';
import {
  chooseRequirement,
  chooseSeat,
  defaultSeats,
  newTableRequest,
  tableFooter,
  type SeatChoice,
  type SeatKey,
  type TableDraft,
} from '@/features/lobby/newTable';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Friend uses the existing share-link sheet once the table exists. */
  onSubmit: (data: CreateRoomRequest, invite: boolean) => void;
  isLoading?: boolean;
  username?: string;
  avatarUrl?: string | null;
  error?: string | null;
  initialDraft?: TableDraft;
  initialRuleSet?: RuleSet;
}

const SEATS: { key: SeatKey; label: string; spoken: string }[] = [
  { key: 'seat_3', label: 'Partner', spoken: 'Partner seat' },
  { key: 'seat_2', label: 'Opponent', spoken: 'Left opponent seat' },
  { key: 'seat_4', label: 'Opponent', spoken: 'Right opponent seat' },
];
const CHOICES: { value: SeatChoice; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'ai', label: 'Bot' },
  { value: 'invite', label: 'Friend' },
];
/** Chair, gap: where the seat's label column starts. */
const LABEL_INDENT = 40 + 10;
const RULES: { value: RuleSet; label: string; detail: string }[] = [
  { value: 'finnish', label: 'Finnish', detail: 'Trumps only · bids from 6' },
  { value: 'louisiana', label: 'Louisiana', detail: 'Off-suit plays · bids from 7' },
];

export function CreateRoomModal(props: CreateRoomModalProps) {
  if (!props.isOpen) return null;
  return (
    <Modal
      visible
      supportedOrientations={['portrait', 'landscape']}
      animationType="none"
      onRequestClose={() => {
        if (!props.isLoading) props.onClose();
      }}>
      {/* A native modal is a separate native root. */}
      <SafeAreaProvider>
        <CreateRoomForm {...props} />
      </SafeAreaProvider>
    </Modal>
  );
}

export function CreateRoomForm({
  onClose,
  onSubmit,
  isLoading = false,
  avatarUrl,
  error,
  initialDraft,
  initialRuleSet,
}: CreateRoomModalProps) {
  const preferredRuleSet = useSettingsStore((state) => state.preferredRuleSet);
  const [ruleSet, setRuleSet] = useState<RuleSet>(initialRuleSet ?? preferredRuleSet);
  const [draft, setDraft] = useState<TableDraft>(
    initialDraft ?? { seats: { ...defaultSeats }, requirements: {} }
  );
  const submit = () => {
    if (isLoading) return;
    const { request, invite } = newTableRequest(ruleSet, draft.seats, draft.requirements);
    onSubmit(request, invite);
  };

  return (
    <ScreenShell scroll testID="create-room-window" contentStyle={styles.shell}>
      <View style={styles.header}>
        <BackButton accessibilityLabel="Cancel creation" disabled={isLoading} onPress={onClose} />
      </View>
      <View
        testID="create-rule-set"
        accessibilityRole="radiogroup"
        accessibilityLabel="Rules"
        style={styles.rules}>
        {RULES.map((rule) => (
          <PressableFX
            key={rule.value}
            accessibilityRole="radio"
            accessibilityLabel={rule.label}
            accessibilityHint={rule.detail}
            accessibilityState={{ checked: ruleSet === rule.value, disabled: isLoading }}
            aria-checked={ruleSet === rule.value}
            disabled={isLoading}
            onPress={() => setRuleSet(rule.value)}
            style={[styles.choice, styles.ruleChoice, ruleSet === rule.value && styles.selected]}>
            <PidroText
              role="label"
              style={[styles.ruleLabel, ruleSet === rule.value && styles.gold]}>
              {rule.label}
            </PidroText>
            <PidroText role="metadata" tone="soft" style={styles.ruleDetail}>
              {rule.detail}
            </PidroText>
          </PressableFX>
        ))}
      </View>
      <Surface variant="window" style={styles.window}>
        <View style={styles.seat}>
          <PlayerAvatar uri={avatarUrl} size={40} accessibilityLabel="You, the host" />
          <View style={styles.label}>
            <PidroText role="label">You</PidroText>
            <PidroText role="metadata" tone="gold">
              Host
            </PidroText>
          </View>
        </View>
        {SEATS.map(({ key, label, spoken }, index) => {
          const choice = draft.seats[key];
          const requirement = draft.requirements[key] ?? 0;
          return (
            <Fragment key={key}>
              {index === 1 ? (
                <View style={styles.divider}>
                  <View style={styles.line} />
                  <PidroText role="label" style={styles.vs}>
                    vs
                  </PidroText>
                  <View style={styles.line} />
                </View>
              ) : null}
              <View testID={`create-${key}`}>
                <View style={styles.seat}>
                  <View style={styles.chair}>
                    {choice === 'ai' ? (
                      <PlayerAvatar kind="bot" size={40} />
                    ) : (
                      <OpenChair size={40} invite={choice === 'invite'} />
                    )}
                    {choice === 'open' && requirement > 0 ? (
                      <BadgePop key={requirement}>
                        <SeatRequirementBadge games={requirement} />
                      </BadgePop>
                    ) : null}
                  </View>
                  <View style={styles.label}>
                    <PidroText role="label" style={styles.seatLabel}>
                      {label}
                    </PidroText>
                  </View>
                  <View
                    accessibilityRole="radiogroup"
                    accessibilityLabel={spoken}
                    style={styles.choices}>
                    {CHOICES.map((option) => {
                      const checked = option.value === choice;
                      return (
                        <PressableFX
                          key={option.value}
                          accessibilityRole="radio"
                          accessibilityLabel={option.label}
                          accessibilityHint={
                            option.value === 'invite'
                              ? 'Share a link after opening the table. This seat stays open.'
                              : undefined
                          }
                          accessibilityState={{ checked, disabled: isLoading }}
                          aria-checked={checked}
                          disabled={isLoading}
                          onPress={() =>
                            setDraft((current) => chooseSeat(current, key, option.value))
                          }
                          style={[styles.choice, checked && styles.selected]}>
                          <PidroText
                            role="label"
                            style={[styles.choiceLabel, checked && styles.gold]}>
                            {option.label}
                          </PidroText>
                        </PressableFX>
                      );
                    })}
                  </View>
                </View>
                <SeatFold open={choice === 'open'}>
                  <SeatRequirementPicker
                    value={requirement}
                    seatLabel={spoken}
                    disabled={isLoading}
                    indent={LABEL_INDENT}
                    onChange={(games) => {
                      if (games !== requirement) playSelectionHaptic();
                      setDraft((current) => chooseRequirement(current, key, games));
                    }}
                  />
                </SeatFold>
              </View>
            </Fragment>
          );
        })}
      </Surface>
      <View style={styles.spacer} />
      <View style={styles.footer}>
        {error ? (
          <PidroText role="body" tone="danger" align="center" accessibilityRole="alert">
            {error}
          </PidroText>
        ) : null}
        <BevelPressable
          material="wood"
          fill
          accessibilityRole="button"
          accessibilityLabel="Open the table"
          accessibilityState={{ disabled: isLoading, busy: isLoading }}
          disabled={isLoading}
          onPress={submit}
          style={styles.submit}
          contentStyle={styles.submitFace}>
          {isLoading ? (
            <ActivityIndicator color={PidroBevel.textGold} />
          ) : (
            <PidroText style={styles.submitLabel}>Open the table</PidroText>
          )}
        </BevelPressable>
        <PidroText testID="create-footer" role="metadata" tone="soft" align="center">
          {tableFooter(draft.seats)}
        </PidroText>
      </View>
    </ScreenShell>
  );
}

/** A requirement badge lands on the chair with a small pop. */
function BadgePop({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const appear = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) return;
    appear.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.back(2)) });
  }, [appear, reduceMotion]);
  const pop = useAnimatedStyle(() => ({
    opacity: Math.min(1, appear.value * 2),
    transform: [{ scale: 0.85 + 0.15 * appear.value }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.badgePop, pop]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badgePop: { alignItems: 'center' },
  shell: { maxWidth: 480, paddingHorizontal: 20, gap: 14 },
  header: { alignItems: 'flex-start' },
  rules: { flexDirection: 'row', gap: 8 },
  ruleChoice: { height: 56, gap: 1 },
  ruleLabel: { fontSize: 15 },
  ruleDetail: { fontSize: 11, lineHeight: 14, textAlign: 'center' },
  window: { padding: 12, gap: 10 },
  seat: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 10 },
  chair: { width: 40, height: 40 },
  label: { width: 76, flexShrink: 1, gap: 1 },
  seatLabel: { fontSize: 14 },
  choices: { flex: 1, flexDirection: 'row', gap: 4, minWidth: 140 },
  choice: {
    flex: 1,
    height: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: PidroColors.border,
    borderRadius: PidroRadii.panel,
    backgroundColor: PidroColors.panel,
  },
  selected: { borderWidth: 2, borderColor: PidroBevel.rim, backgroundColor: PidroColors.choiceOn },
  choiceLabel: { fontSize: 13, lineHeight: 16 },
  gold: { color: PidroBevel.textGold },
  divider: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  line: { height: 1, flex: 1, backgroundColor: PidroColors.border },
  vs: { fontFamily: PidroFonts.display, fontSize: 18, lineHeight: 22 },
  spacer: { flexGrow: 1 },
  footer: { alignItems: 'center', gap: 8 },
  submit: { width: '100%', maxWidth: 380, height: 62 },
  submitFace: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  submitLabel: {
    fontFamily: PidroFonts.display,
    fontWeight: '400',
    fontSize: 23,
    lineHeight: 30,
    letterSpacing: 0.5,
    color: PidroBevel.textGold,
    transform: [{ translateY: -1 }],
    ...PidroBevel.labelShadow,
  },
});
