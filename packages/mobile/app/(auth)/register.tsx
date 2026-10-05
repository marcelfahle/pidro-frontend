import { useCallback, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Keyboard, Platform, StyleSheet, TextInput, View } from 'react-native';
import { publicPlayerName } from '@pidro/shared';
import { lookupEmail } from '@/api/auth';
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
import { emailStanding, isEmailAddress, type EmailStanding } from '@/features/auth/accountEmail';
import { useAuth } from '@/hooks/useAuth';
import { useFlowBack, useHardwareBack } from '@/hooks/useFlowBack';
import { authenticatedEntryDestination } from '@/navigation/initialRoute';
import { useAgeGateStore } from '@/stores/ageGate';
import { useAuthStore } from '@/stores/auth';
import { usePendingInviteStore } from '@/stores/pendingInvite';

type Step = 'email' | 'password' | 'name';
type Fixture = 'providers' | 'password' | 'password-new' | 'name' | 'name-taken';

const FIXTURE_STEP: Partial<Record<Fixture, Step>> = {
  password: 'password',
  'password-new': 'password',
  name: 'name',
  'name-taken': 'name',
};

const MIN_PASSWORD = 8;

// The server words a taken name per endpoint; players read one sentence.
function nameError(detail: string): string {
  return /taken|another account/i.test(detail) ? 'That name is taken.' : detail;
}

export default function RegisterScreen() {
  const router = useRouter();
  const goBack = useFlowBack();
  const { fixture: fixtureParam } = useLocalSearchParams<{ fixture?: string }>();
  const fixture = (__DEV__ ? fixtureParam : undefined) as Fixture | undefined;
  const { layout, inputStyle } = useAuthFlow();
  const landscape = layout === 'landscape';
  const { user, createAccount, saveGuest, signInWithProvider, isLoading } = useAuth();
  const { guard, modal } = useSwitchPlayersGuard();
  const providerSignIn = useProviderSignIn(signInWithProvider);
  const pendingInvite = usePendingInviteStore((state) => state.pendingInvite);
  const guest = user?.guest === true;

  const [step, setStep] = useState<Step>((fixture && FIXTURE_STEP[fixture]) || 'email');
  const [email, setEmail] = useState(fixture && FIXTURE_STEP[fixture] ? 'you@example.com' : '');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailTaken, setEmailTaken] = useState(false);
  const [standing, setStanding] = useState<EmailStanding>(
    fixture === 'password-new' ? 'unknown' : 'unchecked'
  );
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [name, setName] = useState(
    fixture === 'name-taken'
      ? 'Bengt'
      : guest
        ? publicPlayerName(user?.username, '', user?.display_name)
        : ''
  );
  const [nameFieldError, setNameFieldError] = useState<string | null>(
    fixture === 'name-taken' ? 'That name is taken.' : null
  );
  const [classicNameReserved, setClassicNameReserved] = useState(fixture === 'name-taken');
  const [message, setMessage] = useState<string | null>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const nameRef = useRef<TextInput>(null);
  const busy = isLoading || checkingEmail;

  const stepBack = useCallback(() => {
    setMessage(null);
    if (step === 'name') setStep('password');
    else if (step === 'password') setStep('email');
    else goBack();
  }, [goBack, step]);
  useHardwareBack(step !== 'email', stepBack);

  const signInInstead = useCallback(
    (known: boolean) =>
      router.push({
        pathname: '/(auth)/login',
        params: { email: email.trim(), ...(known ? { known: '1' } : {}) },
      }),
    [email, router]
  );

  const continueWithEmail = useCallback(async () => {
    if (busy) return;
    const address = email.trim();
    if (!isEmailAddress(address)) {
      setEmailError(address ? 'Check that email address.' : 'Enter your email address.');
      emailRef.current?.focus();
      return;
    }
    Keyboard.dismiss();
    setCheckingEmail(true);
    const answer = await emailStanding(address, lookupEmail);
    setCheckingEmail(false);
    if (answer === 'known') {
      signInInstead(true);
      return;
    }
    setStanding(answer);
    setStep('password');
  }, [busy, email, signInInstead]);

  const continueWithPassword = useCallback(() => {
    if (password.length < MIN_PASSWORD) {
      setPasswordError(`Use ${MIN_PASSWORD} characters or more.`);
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
      setNameFieldError('Enter the name other players will see.');
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

    // Each answer goes back to the step that owns the field.
    const { fields, classicNameReserved: reserved, message: failure } = result.error;
    if (fields?.displayName) {
      setNameFieldError(nameError(fields.displayName));
      setClassicNameReserved(Boolean(reserved));
    } else if (fields?.email) {
      const taken = /taken|another account/i.test(fields.email);
      setEmailTaken(taken);
      setEmailError(
        taken ? 'That email already has a Pidro account.' : 'Check that email address.'
      );
      setStep('email');
    } else if (fields?.password) {
      setPasswordError(fields.password);
      setStep('password');
    } else {
      setMessage(failure);
    }
  }, [
    busy,
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
        headerTitle="Pidro account"
        onBack={stepBack}
        body={'New here or coming back, it’s the same way\u00a0in.'}
        note={'If we know you, you’re signed in. If not, this starts a free\u00a0account.'}>
        <AuthFlowWindow testID="auth-window">
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
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={(next) => {
                setEmail(next);
                setEmailError(null);
                setEmailTaken(false);
              }}
              error={emailError ?? undefined}
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
                label="Sign in instead"
                size={14}
                style={styles.inlineLink}
                onPress={() => signInInstead(false)}
              />
            ) : null}
          </View>
          <AuthFlowButton label="Continue" loading={checkingEmail} onPress={continueWithEmail} />
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
        headerTitle="Pidro account"
        onBack={stepBack}
        title="Create a password"
        body={
          standing === 'unknown'
            ? `There’s no Pidro account for ${email.trim()} yet, so this starts one.`
            : `This starts a free Pidro account for ${email.trim()}.`
        }
        note={
          guest
            ? 'Next you pick your name. Your guest games come with\u00a0you.'
            : 'Next you pick your name.'
        }>
        <AuthFlowWindow testID="auth-window">
          <Input
            ref={passwordRef}
            label="Password"
            value={password}
            onChangeText={(next) => {
              setPassword(next);
              setPasswordError(null);
            }}
            error={passwordError ?? undefined}
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
              accessibilityLabel={`${MIN_PASSWORD} characters or more${longEnough ? ', met' : ''}`}>
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
                {MIN_PASSWORD} characters or more
              </PidroText>
            </View>
          )}
          <AuthFlowButton label="Create account" onPress={continueWithPassword} />
        </AuthFlowWindow>
      </AuthFlowScreen>
    );
  }

  const title = 'Pick your name';
  const tablet = layout === 'tablet';
  return (
    <AuthFlowScreen
      testID="register-screen"
      headerTitle={landscape ? 'Pidro account' : undefined}
      onBack={stepBack}
      title={title}
      body="This is the name other players see."
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
        {message ? <AuthFlowNotice>{message}</AuthFlowNotice> : null}
        <Input
          ref={nameRef}
          label="Public name"
          value={name}
          onChangeText={(next) => {
            setName(next);
            setNameFieldError(null);
            setClassicNameReserved(false);
            setMessage(null);
          }}
          error={nameFieldError ?? undefined}
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
            accessibilityLabel={`Played Classic as ${name.trim()}? Claim it and keep your games.`}
            onPress={() => router.push('/(auth)/claim-classic')}
            style={styles.claimPlaque}>
            <View style={styles.claimCopy}>
              <PidroText role="label" style={styles.claimTitle} numberOfLines={1}>
                Played Classic as {name.trim()}?
              </PidroText>
              <PidroText role="metadata" tone="soft" style={styles.claimSubtitle}>
                Claim it and keep your games.
              </PidroText>
            </View>
            <View style={styles.chip}>
              <PidroText style={styles.chipLabel}>CLAIM</PidroText>
            </View>
          </PressableFX>
        ) : null}
        <AuthFlowButton label="CONTINUE" hero loading={isLoading} onPress={finish} />
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
