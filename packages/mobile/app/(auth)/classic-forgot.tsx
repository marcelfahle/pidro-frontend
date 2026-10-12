import { useCallback, useRef, useState } from 'react';
import { Keyboard, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { classicApi } from '@/api/classic';
import {
  AuthFlowButton,
  AuthFlowHeading,
  AuthFlowIconTile,
  AuthFlowNotice,
  AuthFlowScreen,
  AuthFlowWindow,
  deviceNoun,
  useAuthFlow,
} from '@/components/auth/AuthFlow';
import { Input } from '@/components/ui/Input';
import { PidroText } from '@/components/ui/PidroText';
import { TextLink } from '@/components/ui/TextLink';
import { PidroSpacing } from '@/design/tokens';
import { isEmailAddress } from '@/features/auth/accountEmail';
import { requestClassicSignInLink } from '@/features/auth/classicRecovery';
import { getInstallId } from '@/features/invites/installId';
import { useFlowBack, useHardwareBack } from '@/hooks/useFlowBack';
import { useAuthStore } from '@/stores/auth';

type Fixture = 'sent' | 'unavailable' | 'not-found';

const PROBLEMS = {
  not_found: 'We can’t find a Classic account with that name or email.',
  no_email: 'That account has no email address on it. Get help and we’ll find another way in.',
  rate_limited: 'Too many tries. Wait a minute, then try again.',
  unavailable: 'We can’t send sign-in links right now. Get help and we’ll find your account.',
} as const;

type Problem = keyof typeof PROBLEMS;

export default function ClassicForgotScreen() {
  const router = useRouter();
  const goBack = useFlowBack();
  const params = useLocalSearchParams<{ login?: string; fixture?: string }>();
  const fixture = (__DEV__ ? params.fixture : undefined) as Fixture | undefined;
  const { layout, metrics, inputStyle } = useAuthFlow();
  const signedIn = useAuthStore((state) => state.user != null);
  const [login, setLogin] = useState(params.login ?? (fixture ? 'Bengt' : ''));
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [problem, setProblem] = useState<Problem | null>(
    fixture === 'unavailable' ? 'unavailable' : fixture === 'not-found' ? 'not_found' : null
  );
  const [emailHint, setEmailHint] = useState<string | null>(
    fixture === 'sent' ? 'be•••••@gmail.com' : null
  );
  const [busy, setBusy] = useState(false);
  const [resent, setResent] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const openHelp = useCallback(() => {
    const value = login.trim();
    router.push({
      pathname: '/(auth)/classic-help',
      params: value ? (isEmailAddress(value) ? { email: value } : { name: value }) : {},
    });
  }, [login, router]);

  const send = useCallback(async () => {
    if (busy) return;
    const value = login.trim();
    if (!value) {
      setFieldError('Enter your Classic username or email.');
      inputRef.current?.focus();
      return;
    }
    Keyboard.dismiss();
    if (fixture) {
      setResent(emailHint !== null);
      return;
    }
    setBusy(true);
    setProblem(null);
    const installId = signedIn ? undefined : await getInstallId().catch(() => undefined);
    const result = await requestClassicSignInLink(value, (requested) =>
      classicApi.requestSignInLink({ login: requested, install_id: installId })
    );
    setBusy(false);
    if (result.status === 'sent') {
      setResent(emailHint !== null);
      setEmailHint(result.emailHint);
    } else {
      setResent(false);
      setProblem(result.status);
    }
  }, [busy, emailHint, fixture, login, signedIn]);

  const backToForm = useCallback(() => {
    setEmailHint(null);
    setResent(false);
    setProblem(null);
  }, []);
  useHardwareBack(emailHint !== null, backToForm);

  if (emailHint !== null) {
    const device = deviceNoun(layout);
    const landscape = layout === 'landscape';
    const sentTo = (
      <>
        <PidroText
          role="body"
          tone="soft"
          align={landscape ? 'left' : 'center'}
          style={metrics.body}>
          We sent a sign-in link to
        </PidroText>
        <PidroText
          align={landscape ? 'left' : 'center'}
          style={[styles.hint, metrics.emphasis]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}>
          {emailHint}
        </PidroText>
      </>
    );
    const status = problem ? (
      <AuthFlowNotice>{PROBLEMS[problem]}</AuthFlowNotice>
    ) : resent ? (
      <PidroText
        role="metadata"
        tone="cyan"
        align="center"
        accessibilityLiveRegion="polite"
        style={metrics.note}>
        Sent again. Check your spam folder too.
      </PidroText>
    ) : null;
    const actions = (
      <>
        {status}
        <AuthFlowButton label="Send it again" material="glass" loading={busy} onPress={send} />
      </>
    );
    const help = (
      <TextLink
        label="No longer use that email? Get help"
        size={metrics.link}
        style={styles.centerLink}
        onPress={openHelp}
      />
    );

    return (
      <AuthFlowScreen
        testID="classic-forgot-screen"
        headerTitle="Pidro Classic"
        onBack={backToForm}
        title="Check your email"
        body={`Open the link on this ${device} and you’re in.`}
        inlineIntro
        fill>
        {landscape ? (
          <>
            <AuthFlowWindow testID="classic-link-sent">
              <View style={styles.sentRow}>
                <AuthFlowIconTile icon="mail" quiet />
                <View style={styles.sentRowCopy}>{sentTo}</View>
              </View>
              {actions}
            </AuthFlowWindow>
            {help}
          </>
        ) : (
          <>
            <View
              testID="classic-link-sent"
              style={[styles.sentHero, layout === 'phone' && styles.sentHeroFill]}>
              <AuthFlowIconTile icon="mail" />
              <View style={styles.sentCopy}>
                <AuthFlowHeading align="center" hero>
                  Check your email
                </AuthFlowHeading>
                {sentTo}
                <PidroText role="body" tone="soft" align="center" style={metrics.body}>
                  Open it on this {device} and you’re in.
                </PidroText>
              </View>
            </View>
            <View style={styles.sentActions}>
              {actions}
              {help}
            </View>
          </>
        )}
      </AuthFlowScreen>
    );
  }

  return (
    <AuthFlowScreen
      testID="classic-forgot-screen"
      headerTitle="Pidro Classic"
      onBack={goBack}
      title="Forgot your password?"
      body={
        'No new password needed. We email a sign\u2060-\u2060in link to the address on your Classic\u00a0account.'
      }>
      <AuthFlowWindow testID="classic-forgot-window">
        {problem ? <AuthFlowNotice>{PROBLEMS[problem]}</AuthFlowNotice> : null}
        <Input
          ref={inputRef}
          label="Classic username or email"
          value={login}
          onChangeText={(next) => {
            setLogin(next);
            setFieldError(null);
            setProblem(null);
          }}
          error={fieldError ?? undefined}
          style={inputStyle}
          editable={!busy}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          textContentType="username"
          keyboardAppearance="dark"
          returnKeyType="send"
          submitBehavior="blurAndSubmit"
          onSubmitEditing={send}
        />
        <AuthFlowButton label="Email me a link" loading={busy} onPress={send} />
      </AuthFlowWindow>
      <TextLink
        label="Don’t remember either? Get help"
        size={metrics.link}
        style={styles.centerLink}
        onPress={openHelp}
      />
    </AuthFlowScreen>
  );
}

const styles = StyleSheet.create({
  centerLink: {
    alignSelf: 'center',
  },
  hint: {
    fontWeight: '800',
  },
  sentHero: {
    alignItems: 'center',
    gap: 20,
  },
  // On a phone the confirmation centres in the space above the actions.
  sentHeroFill: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: PidroSpacing.lg,
  },
  sentCopy: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: PidroSpacing.xs,
  },
  sentActions: {
    gap: 6,
  },
  sentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  sentRowCopy: {
    minWidth: 0,
    flex: 1,
    gap: 2,
  },
});
