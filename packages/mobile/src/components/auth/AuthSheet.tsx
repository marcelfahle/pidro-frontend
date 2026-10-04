import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useReducedMotion } from 'react-native-reanimated';
import { publicPlayerName } from '@pidro/shared';
import { BevelButton } from '@/components/ui/BevelButton';
import { Input } from '@/components/ui/Input';
import { PidroText } from '@/components/ui/PidroText';
import { PressableFX } from '@/components/ui/PressableFX';
import { Surface } from '@/components/ui/Surface';
import {
  PidroBevel,
  PidroColors,
  PidroFonts,
  PidroLayout,
  PidroRadii,
  PidroSpacing,
} from '@/design/tokens';
import { useAuth, type GuestSaveField } from '@/hooks/useAuth';

export type AuthSheetReason = 'save' | 'multiplayer' | 'postGame';

const COPY: Record<AuthSheetReason, { title: string; description: string }> = {
  save: {
    title: 'Save your player',
    description: 'Keep your name, games and progress on every device.',
  },
  multiplayer: {
    title: 'Save to play people',
    description: 'Create an account without losing this player or your progress.',
  },
  postGame: {
    title: 'Keep your progress',
    description: 'Save this player, then carry on from any device.',
  },
};

export interface AuthSheetProps {
  isOpen: boolean;
  reason?: AuthSheetReason;
  onClose: () => void;
  onSaved?: () => void;
  onClaimClassic: (name: string) => void;
  /** Hide the claim links, e.g. once a Classic account is linked. */
  showClaimClassic?: boolean;
  providerActions?: ReactNode;
}

export function AuthSheet({
  isOpen,
  reason = 'save',
  onClose,
  onSaved,
  onClaimClassic,
  showClaimClassic = true,
  providerActions,
}: AuthSheetProps) {
  const reduceMotion = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const compactLandscape = width > height && height < 500;
  const { user, saveGuest, isLoading } = useAuth();
  const initialName = publicPlayerName(user?.username, 'Player', user?.display_name);
  const [displayName, setDisplayName] = useState(initialName);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fields, setFields] = useState<Partial<Record<GuestSaveField, string>>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [classicNameReserved, setClassicNameReserved] = useState(false);
  // A screen pushed while this Modal is still on screen opens hidden behind
  // it on iOS. So a claim tap hides the sheet first and hands the action to
  // the caller once the Modal is gone (onDismiss on iOS, next render elsewhere).
  const [handingOff, setHandingOff] = useState(false);
  const pendingClaim = useRef<string | null>(null);
  const pendingSave = useRef(false);

  const finishHandOff = () => {
    if (pendingSave.current) {
      pendingSave.current = false;
      if (onSaved) onSaved();
      else onClose();
      return;
    }
    const name = pendingClaim.current;
    if (name === null) return;
    pendingClaim.current = null;
    onClaimClassic(name);
  };

  const claimClassic = (name: string) => {
    pendingClaim.current = name;
    setHandingOff(true);
  };

  // Reopening the sheet after a hand-off shows it again.
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (wasOpen !== isOpen) {
    setWasOpen(isOpen);
    if (!isOpen) setHandingOff(false);
  }

  useEffect(() => {
    if (handingOff && Platform.OS !== 'ios') finishHandOff();
  });

  const resetForm = () => {
    setDisplayName(initialName);
    setEmail('');
    setPassword('');
    setFields({});
    setMessage(null);
    setClassicNameReserved(false);
  };

  const clearField = (field: GuestSaveField) => {
    setFields((current) => ({ ...current, [field]: undefined }));
    setMessage(null);
    if (field === 'displayName') setClassicNameReserved(false);
  };

  const submit = async () => {
    const nextFields: Partial<Record<GuestSaveField, string>> = {};
    if (!displayName.trim()) nextFields.displayName = 'Enter your public name.';
    if (!email.trim()) nextFields.email = 'Enter an email address.';
    if (password.length < 8) nextFields.password = 'Use at least 8 characters.';
    if (Object.keys(nextFields).length) {
      setFields(nextFields);
      return;
    }

    const result = await saveGuest(displayName.trim(), email.trim(), password);
    if (result.ok) {
      pendingSave.current = true;
      setHandingOff(true);
      return;
    }
    setFields(result.error.fields ?? {});
    setClassicNameReserved(Boolean(result.error.classicNameReserved));
    setMessage(result.error.fields ? null : result.error.message);
  };

  const copy = COPY[reason];
  return (
    <Modal
      visible={isOpen && !handingOff}
      onDismiss={finishHandOff}
      transparent
      animationType={reduceMotion ? 'none' : 'slide'}
      onShow={resetForm}
      onRequestClose={onClose}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityLabel="Dismiss account saving"
            onPress={onClose}
          />
          <KeyboardAvoidingView
            style={styles.keyboard}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.sheet} testID="auth-sheet">
              <View style={styles.grabber} />
              <PidroText style={styles.title}>{copy.title}</PidroText>
              {!compactLandscape ? (
                <PidroText role="body" tone="soft" align="center" style={styles.description}>
                  {copy.description}
                </PidroText>
              ) : null}
              <ScrollView
                style={styles.scroll}
                contentContainerStyle={[styles.form, compactLandscape && styles.formLandscape]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}>
                {providerActions}
                {showClaimClassic && !classicNameReserved ? (
                  <PressableFX
                    accessibilityRole="button"
                    accessibilityLabel="Claim Pidro Classic"
                    onPress={() => claimClassic(displayName.trim())}
                    style={styles.classicLink}>
                    <PidroText role="label" tone="cyan">
                      Played Classic? Claim it instead
                    </PidroText>
                  </PressableFX>
                ) : null}
                <Input
                  containerClassName={compactLandscape ? 'w-[32%] flex-grow' : undefined}
                  label="Public name"
                  value={displayName}
                  onChangeText={(value) => {
                    setDisplayName(value);
                    clearField('displayName');
                  }}
                  error={fields.displayName}
                  maxLength={20}
                  editable={!isLoading}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                />
                {showClaimClassic && classicNameReserved ? (
                  <PressableFX
                    accessibilityRole="button"
                    accessibilityLabel={`Played Classic as ${displayName}? Claim it and keep your games.`}
                    onPress={() => claimClassic(displayName.trim())}>
                    <Surface variant="plaque" padded style={styles.claimPlaque}>
                      <PidroText role="label">Played Classic as {displayName.trim()}?</PidroText>
                      <PidroText role="metadata" tone="cyan">
                        Claim it and keep your games.
                      </PidroText>
                    </Surface>
                  </PressableFX>
                ) : null}
                <Input
                  containerClassName={compactLandscape ? 'w-[32%] flex-grow' : undefined}
                  label="Email"
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    clearField('email');
                  }}
                  error={fields.email}
                  editable={!isLoading}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  keyboardType="email-address"
                  returnKeyType="next"
                />
                <Input
                  containerClassName={compactLandscape ? 'w-[32%] flex-grow' : undefined}
                  label="Password"
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    clearField('password');
                  }}
                  error={fields.password}
                  editable={!isLoading}
                  autoCapitalize="none"
                  autoComplete="new-password"
                  secureTextEntry
                  revealPassword
                  returnKeyType="go"
                  onSubmitEditing={submit}
                />
                {message ? (
                  <PidroText role="metadata" tone="danger" align="center" accessibilityRole="alert">
                    {message}
                  </PidroText>
                ) : null}
              </ScrollView>
              <BevelButton
                label="Save account"
                material="wood"
                size="md"
                fullWidth
                loading={isLoading}
                onPress={submit}
              />
              <PressableFX accessibilityRole="button" onPress={onClose} style={styles.notNow}>
                <PidroText role="label" tone="muted">
                  Not now
                </PidroText>
              </PressableFX>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, justifyContent: 'flex-end', backgroundColor: PidroColors.backdrop },
  keyboard: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '100%',
    flexShrink: 1,
    alignItems: 'center',
    gap: PidroSpacing.xs,
    borderTopLeftRadius: PidroRadii.lg,
    borderTopRightRadius: PidroRadii.lg,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: PidroColors.cyanBorderStrong,
    backgroundColor: PidroColors.panelStrong,
    paddingHorizontal: PidroSpacing.lg,
    paddingTop: PidroSpacing.sm,
    paddingBottom: PidroSpacing.sm,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: PidroColors.borderStrong,
  },
  title: {
    fontFamily: PidroFonts.display,
    fontWeight: '400',
    fontSize: 24,
    lineHeight: 31,
    color: PidroBevel.textGold,
  },
  description: { maxWidth: 340 },
  scroll: { width: '100%', flexShrink: 1, overflow: 'hidden' },
  form: { width: '100%', maxWidth: 420, alignSelf: 'center', gap: PidroSpacing.sm },
  formLandscape: { maxWidth: 800, flexDirection: 'row', gap: PidroSpacing.xs },
  claimPlaque: { width: '100%', gap: PidroSpacing.xxs },
  classicLink: {
    minHeight: PidroLayout.touchTarget,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notNow: {
    minHeight: PidroLayout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
});
