import { useCallback, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Keyboard, Platform, StyleSheet, TextInput, View } from 'react-native';
import { publicPlayerName } from '@pidro/shared';
import type { AuthProvider } from '@/api/auth';
import {
  AuthFlowButton,
  AuthFlowHeading,
  AuthFlowNotice,
  AuthFlowScreen,
  AuthFlowWindow,
  useAuthFlow,
} from '@/components/auth/AuthFlow';
import { AuthProviderButtons } from '@/components/auth/AuthProviderButtons';
import { useSwitchPlayersGuard } from '@/components/auth/SwitchPlayersGuard';
import { useProviderSignIn } from '@/components/auth/useProviderSignIn';
import { LogoGlow } from '@/components/home/LogoGlow';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { PidroLogo } from '@/components/ui/PidroLogo';
import { PidroText } from '@/components/ui/PidroText';
import { PressableFX } from '@/components/ui/PressableFX';
import { TextLink } from '@/components/ui/TextLink';
import { PidroColors, PidroRadii, PidroSpacing } from '@/design/tokens';
import { isEmailAddress } from '@/features/auth/accountEmail';
import {
  guestSaveFieldMessage,
  guestSaveMessage,
  type GuestSaveFailure,
  type GuestSaveField,
} from '@/features/auth/saveGuest';
import { useAuth } from '@/hooks/useAuth';
import { useFlowBack, useHardwareBack } from '@/hooks/useFlowBack';
import { useTranslation, type TranslationKey } from '@/i18n';
import { authenticatedEntryDestination } from '@/navigation/initialRoute';
import { useAgeGateStore } from '@/stores/ageGate';
import { useAuthStore } from '@/stores/auth';
import { usePendingInviteStore } from '@/stores/pendingInvite';

type Step = 'email' | 'password' | 'name';
type Fixture = 'providers' | 'password' | 'name' | 'name-taken' | 'email-taken';

const FIXTURE_STEP: Partial<Record<Fixture, Step>> = {
  password: 'password',
  name: 'name',
  'name-taken': 'name',
};

const MIN_PASSWORD = 8;

export default function RegisterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const goBack = useFlowBack();
  const { fixture: fixtureParam } = useLocalSearchParams<{ fixture?: string }>();
  const fixture = (__DEV__ ? fixtureParam : undefined) as Fixture | undefined;
  const { layout, inputStyle } = useAuthFlow();
  const landscape = layout === 'landscape';
  const { user, createAccount, saveGuest, signInWithProvider, isLoading, error, clearError } =
    useAuth();
  const { guard, modal } = useSwitchPlayersGuard();
  const providerSignIn = useProviderSignIn(signInWithProvider);
  const pendingInvite = usePendingInviteStore((state) => state.pendingInvite);
  const guest = user?.guest === true;

  const [step, setStep] = useState<Step>((fixture && FIXTURE_STEP[fixture]) || 'email');
  const [email, setEmail] = useState(
    fixture && (FIXTURE_STEP[fixture] || fixture === 'email-taken') ? 'you@example.com' : ''
  );
  const [emailError, setEmailError] = useState<TranslationKey | GuestSaveFailure | null>(
    fixture === 'email-taken' ? 'auth.email_taken' : null
  );
  const [emailTaken, setEmailTaken] = useState(fixture === 'email-taken');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<TranslationKey | GuestSaveFailure | null>(
    null
  );
  const [name, setName] = useState(
    fixture === 'name-taken'
      ? 'Bengt'
      : guest
        ? publicPlayerName(user?.username, '', user?.display_name)
        : ''
  );
  const [nameFieldError, setNameFieldError] = useState<TranslationKey | GuestSaveFailure | null>(
    fixture === 'name-taken' ? 'auth.name_taken' : null
  );
  const [classicNameReserved, setClassicNameReserved] = useState(fixture === 'name-taken');
  const [message, setMessage] = useState<GuestSaveFailure | null>(null);
  const fieldMessage = (
    failure: TranslationKey | GuestSaveFailure | null,
    field: GuestSaveField
  ) =>
    typeof failure === 'string'
      ? t(failure, { count: MIN_PASSWORD })
      : failure
        ? guestSaveFieldMessage(failure, field)
        : undefined;
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const nameRef = useRef<TextInput>(null);
  const busy = isLoading;

  const stepBack = useCallback(() => {
    setMessage(null);
    if (step === 'name') setStep('password');
    else if (step === 'password') setStep('email');
    else goBack();
  }, [goBack, step]);
  useHardwareBack(step !== 'email', stepBack);

  const signInInstead = useCallback(
    () => router.push({ pathname: '/(auth)/login', params: { email: email.trim(), known: '1' } }),
    [email, router]
  );

  // Whether the address already has an account is not asked here, so the
  // server never has to say. A taken address surfaces when the account is
  // made, and the player is sent to sign in.
  const continueWithEmail = useCallback(() => {
    if (busy) return;
    const address = email.trim();
    if (!isEmailAddress(address)) {
      setEmailError(address ? 'auth.check_email' : 'auth.enter_email');
      emailRef.current?.focus();
      return;
    }
    Keyboard.dismiss();
    setStep('password');
  }, [busy, email]);

  const continueWithPassword = useCallback(() => {
    if (password.length < MIN_PASSWORD) {
      setPasswordError('auth.password_min');
      passwordRef.current?.focus();
      return;
    }
    Keyboard.dismiss();
    setStep('name');
  }, [password]);

  const finish = useCallback(async () => {
    // A previewed step has no real email or password behind it.
    if (busy || (fixture && FIXTURE_STEP[fixture])) return;
    const publicName = name.trim();
    if (!publicName) {
      setNameFieldError('auth.enter_name');
      nameRef.current?.focus();
      return;
    }
    Keyboard.dismiss();
    setMessage(null);
    const result = guest
      ? await saveGuest(publicName, email.trim(), password)
      : await createAccount(publicName, email.trim(), password);
    if (result.ok) {
      const signedInUser = useAuthStore.getState().user;
      if (!signedInUser) return;
      router.replace(
        authenticatedEntryDestination(
          pendingInvite,
          useAgeGateStore.getState().ageBand,
          signedInUser
        ) as Href
      );
      return;
    }

    // Each answer goes back to the step that owns the field, so the hook's
    // own copy of the message would only say it twice.
    clearError();
    const { fields, classicNameReserved: reserved } = result.error;
    if (fields?.displayName) {
      setNameFieldError(result.error);
      setClassicNameReserved(Boolean(reserved));
    } else if (fields?.email) {
      const taken = result.error.emailTaken === true;
      setEmailTaken(taken);
      setEmailError(result.error);
      setStep('email');
    } else if (fields?.password) {
      setPasswordError(result.error);
      setStep('password');
    } else {
      setMessage(result.error);
    }
  }, [
    busy,
    clearError,
    createAccount,
    email,
    fixture,
    guest,
    name,
    password,
    pendingInvite,
    router,
    saveGuest,
  ]);

  const startProvider = useCallback(
    (provider: AuthProvider) => {
      if (busy) return;
      guard(() => void providerSignIn.start(provider));
    },
    [busy, guard, providerSignIn]
  );

  if (step === 'email') {
    return (
      <AuthFlowScreen
        testID="register-screen"
        headerTitle={t('auth.account')}
        onBack={stepBack}
        body={t('auth.account_intro')}
        note={emailTaken ? undefined : t('auth.account_note')}>
        <AuthFlowWindow testID="auth-window">
          {/* A provider that failed or was unavailable reports through the hook. */}
          {error ? <AuthFlowNotice>{error}</AuthFlowNotice> : null}
          <AuthProviderButtons
            showEmail={false}
            showEmailDivider
            direction={landscape ? 'row' : 'column'}
            availability={fixture === 'providers' ? { apple: true, facebook: true } : undefined}
            onApple={() => startProvider('apple')}
            onFacebook={() => startProvider('facebook')}
          />
          {providerSignIn.notice ? <AuthFlowNotice>{providerSignIn.notice}</AuthFlowNotice> : null}
          <View>
            <Input
              ref={emailRef}
              label={t('auth.email')}
              placeholder={t('auth.email_placeholder')}
              value={email}
              onChangeText={(next) => {
                setEmail(next);
                setEmailError(null);
                setEmailTaken(false);
                clearError();
              }}
              error={fieldMessage(emailError, 'email')}
              style={inputStyle}
              autoCapitalize="none"
              autoComplete="email"
              textContentType="username"
              importantForAutofill="yes"
              autoCorrect={false}
              clearButtonMode="while-editing"
              editable={!busy}
              keyboardAppearance="dark"
              keyboardType="email-address"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={continueWithEmail}
            />
            {emailTaken ? (
              <TextLink
                label={t('auth.sign_in_instead')}
                size={14}
                style={styles.inlineLink}
                onPress={signInInstead}
              />
            ) : null}
          </View>
          <AuthFlowButton label={t('auth.continue')} onPress={continueWithEmail} />
        </AuthFlowWindow>
        {modal}
      </AuthFlowScreen>
    );
  }

  if (step === 'password') {
    const longEnough = password.length >= MIN_PASSWORD;
    return (
      <AuthFlowScreen
        testID="register-screen"
        headerTitle={t('auth.account')}
        onBack={stepBack}
        title={t('auth.create_password')}
        body={t('auth.starts_account', { email: email.trim() })}
        note={guest ? t('auth.next_name_guest') : t('auth.next_name')}>
        <AuthFlowWindow testID="auth-window">
          <Input
            ref={passwordRef}
            label={t('auth.password')}
            value={password}
            onChangeText={(next) => {
              setPassword(next);
              setPasswordError(null);
            }}
            error={fieldMessage(passwordError, 'password')}
            style={inputStyle}
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            importantForAutofill="yes"
            autoCorrect={false}
            autoFocus={Platform.OS !== 'web'}
            enablesReturnKeyAutomatically
            keyboardAppearance="dark"
            revealPassword
            secureTextEntry
            spellCheck={false}
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={continueWithPassword}
          />
          {passwordError ? null : (
            <View
              style={styles.rule}
              accessible
              accessibilityLabel={t(longEnough ? 'auth.password_rule_met' : 'auth.password_rule', {
                count: MIN_PASSWORD,
              })}>
              <Icon
                name="check"
                size={18}
                strokeWidth={2.4}
                color={longEnough ? PidroColors.cyan : PidroColors.textMuted}
              />
              <PidroText
                role="metadata"
                tone={longEnough ? 'default' : 'soft'}
                style={styles.ruleText}>
                {t('auth.password_rule', { count: MIN_PASSWORD })}
              </PidroText>
            </View>
          )}
          <AuthFlowButton label={t('auth.create')} onPress={continueWithPassword} />
        </AuthFlowWindow>
      </AuthFlowScreen>
    );
  }

  const title = t('auth.pick_name');
  const tablet = layout === 'tablet';
  return (
    <AuthFlowScreen
      testID="register-screen"
      headerTitle={landscape ? t('auth.account') : undefined}
      onBack={stepBack}
      title={title}
      body={t('auth.name_description')}
      inlineIntro>
      {landscape ? null : (
        <View style={[styles.logoStage, tablet && styles.logoStageTablet]} pointerEvents="none">
          <LogoGlow size={tablet ? 340 : 260} />
          <PidroLogo width={tablet ? 200 : 150} />
        </View>
      )}
      <AuthFlowWindow testID="auth-window">
        {landscape ? null : (
          <AuthFlowHeading align="center" style={tablet ? undefined : styles.windowTitle}>
            {title}
          </AuthFlowHeading>
        )}
        {message ? <AuthFlowNotice>{guestSaveMessage(message)}</AuthFlowNotice> : null}
        <Input
          ref={nameRef}
          label={t('auth.public_name')}
          value={name}
          onChangeText={(next) => {
            setName(next);
            setNameFieldError(null);
            setClassicNameReserved(false);
            setMessage(null);
          }}
          error={fieldMessage(nameFieldError, 'displayName')}
          style={inputStyle}
          maxLength={20}
          editable={!busy}
          autoCapitalize="words"
          autoComplete="nickname"
          autoCorrect={false}
          keyboardAppearance="dark"
          returnKeyType="go"
          submitBehavior="blurAndSubmit"
          onSubmitEditing={finish}
        />
        {classicNameReserved ? (
          <PressableFX
            accessibilityRole="button"
            accessibilityLabel={t('auth.claim_accessibility', { name: name.trim() })}
            onPress={() => router.push('/(auth)/claim-classic')}
            style={styles.claimPlaque}>
            <View style={styles.claimCopy}>
              <PidroText role="label" style={styles.claimTitle} numberOfLines={1}>
                {t('auth.played_as', { name: name.trim() })}
              </PidroText>
              <PidroText role="metadata" tone="soft" style={styles.claimSubtitle}>
                {t('auth.claim_hint')}
              </PidroText>
            </View>
            <View style={styles.chip}>
              <PidroText style={styles.chipLabel}>{t('auth.claim_caps')}</PidroText>
            </View>
          </PressableFX>
        ) : null}
        <AuthFlowButton label={t('auth.continue_caps')} hero loading={isLoading} onPress={finish} />
      </AuthFlowWindow>
    </AuthFlowScreen>
  );
}

const styles = StyleSheet.create({
  inlineLink: {
    alignSelf: 'flex-start',
    paddingHorizontal: 0,
    marginBottom: -PidroSpacing.xs,
  },
  rule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.xs,
  },
  ruleText: {
    fontSize: 14,
    lineHeight: 18,
  },
  logoStage: {
    height: 110,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoStageTablet: {
    height: 150,
  },
  windowTitle: {
    fontSize: 26,
    lineHeight: 34,
  },
  claimPlaque: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.sm,
    paddingVertical: PidroSpacing.sm,
    paddingLeft: 14,
    paddingRight: PidroSpacing.sm,
    borderWidth: 1,
    borderRadius: PidroRadii.lg,
    borderColor: PidroColors.cyanBorderStrong,
    backgroundColor: PidroColors.panel,
    boxShadow: PidroColors.plaqueShadow,
  },
  claimCopy: {
    minWidth: 0,
    flex: 1,
    gap: 2,
  },
  claimTitle: {
    fontSize: 15,
    lineHeight: 20,
  },
  claimSubtitle: {
    fontSize: 13,
    lineHeight: 17,
  },
  chip: {
    height: 22,
    flexShrink: 0,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: PidroRadii.full,
    backgroundColor: PidroColors.cyan,
  },
  chipLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
    letterSpacing: 0.6,
    color: PidroColors.ink,
  },
});
