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
import { useTranslation } from '@/i18n';

type Fixture = 'sent' | 'unavailable' | 'not-found';

const PROBLEMS = {
  not_found: 'auth.classic_not_found',
  no_email: 'auth.classic_no_email',
  rate_limited: 'auth.rate_limited',
  unavailable: 'auth.links_unavailable',
} as const;

type Problem = keyof typeof PROBLEMS;

export default function ClassicForgotScreen() {
  const { t } = useTranslation();
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
      setFieldError('auth.enter_classic_identifier');
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
    const landscape = layout === 'landscape';
    const sentTo = (
      <>
        {t('auth.link_sent_to', { email: '\uFFF0' })
          .split(/(\uFFF0)/)
          .filter(Boolean)
          .map((part, index) =>
            part === '\uFFF0' ? (
              <PidroText
                key={index}
                align={landscape ? 'left' : 'center'}
                style={[styles.hint, metrics.emphasis]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}>
                {emailHint}
              </PidroText>
            ) : (
              <PidroText
                key={index}
                role="body"
                tone="soft"
                align={landscape ? 'left' : 'center'}
                style={metrics.body}>
                {part.trim()}
              </PidroText>
            )
          )}
      </>
    );
    const status = problem ? (
      <AuthFlowNotice>{t(PROBLEMS[problem])}</AuthFlowNotice>
    ) : resent ? (
      <PidroText
        role="metadata"
        tone="cyan"
        align="center"
        accessibilityLiveRegion="polite"
        style={metrics.note}>
        {t('auth.resent')}
      </PidroText>
    ) : null;
    const actions = (
      <>
        {status}
        <AuthFlowButton label={t('auth.resend')} material="glass" loading={busy} onPress={send} />
      </>
    );
    const help = (
      <TextLink
        label={t('auth.email_help')}
        size={metrics.link}
        style={styles.centerLink}
        onPress={openHelp}
      />
    );

    return (
      <AuthFlowScreen
        testID="classic-forgot-screen"
        headerTitle={t('auth.classic')}
        onBack={backToForm}
        title={t('auth.check_inbox')}
        body={t('auth.open_link_device', { device: deviceNoun(layout) })}
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
                  {t('auth.check_inbox')}
                </AuthFlowHeading>
                {sentTo}
                <PidroText role="body" tone="soft" align="center" style={metrics.body}>
                  {t('auth.open_it_device', { device: deviceNoun(layout) })}
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
      headerTitle={t('auth.classic')}
      onBack={goBack}
      title={t('auth.forgot_title')}
      body={t('auth.classic_forgot_intro')}>
      <AuthFlowWindow testID="classic-forgot-window">
        {problem ? <AuthFlowNotice>{t(PROBLEMS[problem])}</AuthFlowNotice> : null}
        <Input
          ref={inputRef}
          label={t('auth.classic_identifier')}
          value={login}
          onChangeText={(next) => {
            setLogin(next);
            setFieldError(null);
            setProblem(null);
          }}
          error={fieldError ? t('auth.enter_classic_identifier') : undefined}
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
        <AuthFlowButton label={t('auth.email_link')} loading={busy} onPress={send} />
      </AuthFlowWindow>
      <TextLink
        label={t('auth.forgot_help')}
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
