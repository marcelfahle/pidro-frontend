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
import { useTranslation, type TranslationKey } from '@/i18n';
import {
  guestSaveFieldMessage,
  guestSaveMessage,
  type GuestSaveFailure,
} from '@/features/auth/saveGuest';

export type AuthSheetReason = 'save' | 'multiplayer' | 'postGame';

const COPY: Record<AuthSheetReason, { title: TranslationKey; description: TranslationKey }> = {
  save: {
    title: 'auth.sheet_save_title',
    description: 'auth.sheet_save_body',
  },
  multiplayer: {
    title: 'auth.sheet_online_title',
    description: 'auth.sheet_online_body',
  },
  postGame: {
    title: 'auth.keep_progress',
    description: 'auth.sheet_post_body',
  },
};

export interface AuthSheetProps {
  isOpen: boolean;
  reason?: AuthSheetReason;
  onClose: () => void;
  onSaved?: () => void;
  onClaimClassic: (name: string) => void;
  onJoinCode?: () => void;
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
  onJoinCode,
  showClaimClassic = true,
  providerActions,
}: AuthSheetProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const compactLandscape = width > height && height < 500;
  const { user, saveGuest, isLoading } = useAuth();
  const initialName = publicPlayerName(user?.username, 'Player', user?.display_name);
  const [displayName, setDisplayName] = useState(initialName);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fields, setFields] = useState<
    Partial<Record<GuestSaveField, TranslationKey | GuestSaveFailure>>
  >({});
  const fieldMessage = (field: GuestSaveField) => {
    const failure = fields[field];
    return typeof failure === 'string'
      ? t(failure, { count: 8 })
      : failure
        ? guestSaveFieldMessage(failure, field)
        : undefined;
  };
  const [message, setMessage] = useState<GuestSaveFailure | null>(null);
  const [classicNameReserved, setClassicNameReserved] = useState(false);
  // A screen pushed while this Modal is still on screen opens hidden behind
  // it on iOS. So a claim tap hides the sheet first and hands the action to
  // the caller once the Modal is gone (onDismiss on iOS, next render elsewhere).
  const [handingOff, setHandingOff] = useState(false);
  const pendingHandOff = useRef<
    { type: 'save' } | { type: 'claim'; name: string } | { type: 'joinCode' } | null
  >(null);

  const finishHandOff = () => {
    const pending = pendingHandOff.current;
    if (pending === null) return;
    pendingHandOff.current = null;
    if (pending.type === 'save') {
      if (onSaved) onSaved();
      else onClose();
      return;
    }
    if (pending.type === 'claim') onClaimClassic(pending.name);
    else onJoinCode?.();
  };

  const claimClassic = (name: string) => {
    pendingHandOff.current = { type: 'claim', name };
    setHandingOff(true);
  };

  const joinCode = () => {
    pendingHandOff.current = { type: 'joinCode' };
    setHandingOff(true);
  };

  const resetForm = () => {
    setDisplayName(initialName);
    setEmail('');
    setPassword('');
    setFields({});
    setMessage(null);
    setClassicNameReserved(false);
  };

  // Opening or closing starts a clean form (not onShow, which fires after the
  // slide-in and would wipe what was typed meanwhile). Closing also lets a
  // hand-off's reopened sheet show again.
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (wasOpen !== isOpen) {
    setWasOpen(isOpen);
    if (!isOpen) setHandingOff(false);
    resetForm();
  }

  useEffect(() => {
    if (handingOff && Platform.OS !== 'ios') finishHandOff();
  });

  const clearField = (field: GuestSaveField) => {
    setFields((current) => ({ ...current, [field]: undefined }));
    setMessage(null);
    if (field === 'displayName') setClassicNameReserved(false);
  };

  const submit = async () => {
    const nextFields: Partial<Record<GuestSaveField, TranslationKey>> = {};
    if (!displayName.trim()) nextFields.displayName = 'auth.enter_public_name';
    if (!email.trim()) nextFields.email = 'auth.enter_an_email';
    if (password.length < 8) nextFields.password = 'auth.password_min';
    if (Object.keys(nextFields).length) {
      setFields(nextFields);
      return;
    }

    const result = await saveGuest(displayName.trim(), email.trim(), password);
    if (result.ok) {
      pendingHandOff.current = { type: 'save' };
      setHandingOff(true);
      return;
    }
    setFields(
      Object.fromEntries(
        Object.keys(result.error.fields ?? {}).map((field) => [field, result.error])
      )
    );
    setClassicNameReserved(Boolean(result.error.classicNameReserved));
    setMessage(result.error.fields ? null : result.error);
  };

  const copy = COPY[reason];
  return (
    <Modal
      visible={isOpen && !handingOff}
      onDismiss={finishHandOff}
      transparent
      animationType={reduceMotion ? 'none' : 'slide'}
      onRequestClose={onClose}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityLabel={t('auth.dismiss_save')}
            onPress={onClose}
          />
          <KeyboardAvoidingView
            style={styles.keyboard}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.sheet} testID="auth-sheet">
              <View style={styles.grabber} />
              <PidroText style={styles.title}>{t(copy.title)}</PidroText>
              {!compactLandscape ? (
                <PidroText role="body" tone="soft" align="center" style={styles.description}>
                  {t(copy.description)}
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
                    accessibilityLabel={t('auth.claim')}
                    onPress={() => claimClassic(displayName.trim())}
                    style={[styles.classicLink, compactLandscape && styles.fullRow]}>
                    <PidroText role="label" tone="cyan">
                      {t('auth.claim_instead')}
                    </PidroText>
                  </PressableFX>
                ) : null}
                <Input
                  containerClassName={compactLandscape ? 'w-[32%] flex-grow' : undefined}
                  label={t('auth.public_name')}
                  value={displayName}
                  onChangeText={(value) => {
                    setDisplayName(value);
                    clearField('displayName');
                  }}
                  error={fieldMessage('displayName')}
                  maxLength={20}
                  editable={!isLoading}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                />
                {showClaimClassic && classicNameReserved ? (
                  <PressableFX
                    accessibilityRole="button"
                    accessibilityLabel={t('auth.claim_accessibility', { name: displayName })}
                    onPress={() => claimClassic(displayName.trim())}>
                    <Surface variant="plaque" padded style={styles.claimPlaque}>
                      <PidroText role="label">
                        {t('auth.played_as', { name: displayName.trim() })}
                      </PidroText>
                      <PidroText role="metadata" tone="cyan">
                        {t('auth.claim_hint')}
                      </PidroText>
                    </Surface>
                  </PressableFX>
                ) : null}
                <Input
                  containerClassName={compactLandscape ? 'w-[32%] flex-grow' : undefined}
                  label={t('auth.email')}
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    clearField('email');
                  }}
                  error={fieldMessage('email')}
                  editable={!isLoading}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  keyboardType="email-address"
                  returnKeyType="next"
                />
                <Input
                  containerClassName={compactLandscape ? 'w-[32%] flex-grow' : undefined}
                  label={t('auth.password')}
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    clearField('password');
                  }}
                  error={fieldMessage('password')}
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
                    {guestSaveMessage(message)}
                  </PidroText>
                ) : null}
              </ScrollView>
              <BevelButton
                label={t('auth.save')}
                material="wood"
                size="md"
                fullWidth
                loading={isLoading}
                onPress={submit}
              />
              {reason === 'multiplayer' && onJoinCode ? (
                <PressableFX accessibilityRole="link" onPress={joinCode} style={styles.joinCode}>
                  <PidroText role="metadata" tone="cyan">
                    {t('auth.table_code')}
                  </PidroText>
                </PressableFX>
              ) : null}
              <PressableFX accessibilityRole="button" onPress={onClose} style={styles.notNow}>
                <PidroText role="label" tone="muted">
                  {t('auth.not_now')}
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
  formLandscape: { maxWidth: 800, flexDirection: 'row', flexWrap: 'wrap', gap: PidroSpacing.xs },
  fullRow: { width: '100%' },
  claimPlaque: { width: '100%', gap: PidroSpacing.xxs },
  classicLink: {
    minHeight: PidroLayout.touchTarget,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinCode: {
    minHeight: PidroLayout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  notNow: {
    minHeight: PidroLayout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
});
