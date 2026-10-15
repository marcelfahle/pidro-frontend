import { useCallback, useRef, useState } from 'react';
import { Keyboard, Linking, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { classicApi } from '@/api/classic';
import {
  AuthFlowButton,
  AuthFlowHeading,
  AuthFlowIconTile,
  AuthFlowNotice,
  AuthFlowScreen,
  AuthFlowWindow,
  useAuthFlow,
} from '@/components/auth/AuthFlow';
import { Input } from '@/components/ui/Input';
import { PidroText } from '@/components/ui/PidroText';
import { PidroSpacing } from '@/design/tokens';
import { isEmailAddress } from '@/features/auth/accountEmail';
import { sendClassicHelp, SUPPORT_EMAIL } from '@/features/auth/classicRecovery';
import { useFlowBack } from '@/hooks/useFlowBack';
import { useAuthStore } from '@/stores/auth';
import { useTranslation, type TranslationKey } from '@/i18n';

type Fixture = 'filled' | 'sent' | 'mail';
type Field = 'name' | 'email';
type Outcome = 'sent' | 'mail';

export default function ClassicHelpScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const goBack = useFlowBack();
  const params = useLocalSearchParams<{ name?: string; email?: string; fixture?: string }>();
  const fixture = (__DEV__ ? params.fixture : undefined) as Fixture | undefined;
  const { layout, metrics, inputStyle } = useAuthFlow();
  const landscape = layout === 'landscape';
  const user = useAuthStore((state) => state.user);
  const [name, setName] = useState(params.name ?? (fixture ? 'Bengt' : ''));
  const [email, setEmail] = useState(
    params.email ?? (fixture ? 'bengt@example.com' : (user?.email ?? ''))
  );
  const [details, setDetails] = useState(
    fixture ? 'My old address was bengt@telia.com. Last played around 2019.' : ''
  );
  const [fields, setFields] = useState<Partial<Record<Field, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(
    fixture === 'sent' || fixture === 'mail' ? fixture : null
  );
  const nameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const detailsRef = useRef<TextInput>(null);
  // Someone with an account is not playing as a guest while they wait.
  const keepPlaying =
    user && !user.guest ? t('auth.keep_playing_note') : t('auth.keep_playing_guest');

  const clear = (field: Field) => {
    setFields((current) => ({ ...current, [field]: undefined }));
    setFailure(null);
  };

  const submit = useCallback(async () => {
    if (busy) return;
    const nextFields: Partial<Record<Field, string>> = {};
    if (!name.trim()) nextFields.name = 'auth.support_enter_name';
    if (!isEmailAddress(email)) {
      nextFields.email = email.trim() ? 'auth.check_email' : 'auth.support_enter_email';
    }
    setFields(nextFields);
    if (nextFields.name) {
      nameRef.current?.focus();
      return;
    }
    if (nextFields.email) {
      emailRef.current?.focus();
      return;
    }
    Keyboard.dismiss();
    if (fixture) {
      setOutcome('sent');
      return;
    }
    setBusy(true);
    setFailure(null);
    const result = await sendClassicHelp(
      { name: name.trim(), email: email.trim(), details: details.trim() || undefined },
      { send: classicApi.requestHelp, openMail: (url) => Linking.openURL(url) }
    );
    setBusy(false);
    if (result.status === 'sent' || result.status === 'mail') setOutcome(result.status);
    else if (result.status === 'rejected' && result.field === 'email')
      setFields({ email: 'auth.check_email' });
    else if (result.status === 'rejected') setFailure(result.messageKey);
    else setFailure('auth.support_failed');
  }, [busy, details, email, fixture, name]);

  if (outcome) {
    const title = t(outcome === 'sent' ? 'auth.support_sent' : 'auth.support_mail');
    const body =
      outcome === 'sent'
        ? t('auth.support_reply', { email: email.trim() })
        : t('auth.support_mail_body', { email: SUPPORT_EMAIL });
    const done = (
      <AuthFlowButton
        label={t('auth.keep_playing')}
        onPress={() => router.replace(user ? '/home' : '/welcome')}
      />
    );
    return (
      <AuthFlowScreen
        testID="classic-help-screen"
        headerTitle={t('auth.classic')}
        onBack={() => router.replace(user ? '/home' : '/welcome')}
        title={title}
        body={body}
        note={landscape ? keepPlaying : undefined}
        inlineIntro
        fill>
        {landscape ? (
          <AuthFlowWindow testID="classic-help-sent">
            <View style={styles.sentRow}>
              <AuthFlowIconTile icon={outcome === 'sent' ? 'check' : 'mail'} quiet />
              <PidroText role="body" tone="soft" style={[styles.sentRowCopy, metrics.body]}>
                {outcome === 'sent' ? t('auth.support_received') : t('auth.support_waiting')}
              </PidroText>
            </View>
            {done}
          </AuthFlowWindow>
        ) : (
          <>
            <View
              testID="classic-help-sent"
              style={[styles.sentHero, layout === 'phone' && styles.sentHeroFill]}>
              <AuthFlowIconTile icon={outcome === 'sent' ? 'check' : 'mail'} />
              <View style={styles.sentCopy}>
                <AuthFlowHeading align="center" hero>
                  {title}
                </AuthFlowHeading>
                <PidroText role="body" tone="soft" align="center" style={metrics.body}>
                  {body}
                </PidroText>
                <PidroText role="body" tone="soft" align="center" style={metrics.body}>
                  {keepPlaying}
                </PidroText>
              </View>
            </View>
            {done}
          </>
        )}
      </AuthFlowScreen>
    );
  }

  const nameField = (
    <Input
      ref={nameRef}
      label={t('auth.support_name')}
      value={name}
      onChangeText={(next) => {
        setName(next);
        clear('name');
      }}
      error={fields.name ? t(fields.name as TranslationKey) : undefined}
      style={inputStyle}
      editable={!busy}
      autoCapitalize="words"
      autoComplete="nickname"
      autoCorrect={false}
      keyboardAppearance="dark"
      returnKeyType="next"
      submitBehavior="submit"
      onSubmitEditing={() => emailRef.current?.focus()}
    />
  );
  const emailField = (
    <Input
      ref={emailRef}
      label={t('auth.support_email')}
      placeholder={t('auth.email_placeholder')}
      value={email}
      onChangeText={(next) => {
        setEmail(next);
        clear('email');
      }}
      error={fields.email ? t(fields.email as TranslationKey) : undefined}
      style={inputStyle}
      editable={!busy}
      autoCapitalize="none"
      autoComplete="email"
      textContentType="emailAddress"
      autoCorrect={false}
      keyboardAppearance="dark"
      keyboardType="email-address"
      returnKeyType="next"
      submitBehavior="submit"
      onSubmitEditing={() => detailsRef.current?.focus()}
    />
  );

  return (
    <AuthFlowScreen
      testID="classic-help-screen"
      headerTitle={t('auth.classic')}
      onBack={goBack}
      title={t('auth.support_title')}
      body={t('auth.support_intro')}
      note={keepPlaying}>
      <AuthFlowWindow testID="classic-help-window">
        {failure ? (
          <AuthFlowNotice>{t(failure as TranslationKey, { email: SUPPORT_EMAIL })}</AuthFlowNotice>
        ) : null}
        {landscape ? (
          <View style={styles.pair}>
            <View style={styles.pairField}>{nameField}</View>
            <View style={[styles.pairField, styles.pairFieldWide]}>{emailField}</View>
          </View>
        ) : (
          <>
            {nameField}
            {emailField}
          </>
        )}
        <Input
          ref={detailsRef}
          label={t('auth.support_details')}
          placeholder={t('auth.support_placeholder')}
          value={details}
          onChangeText={setDetails}
          style={[
            inputStyle,
            styles.details,
            landscape && styles.detailsLandscape,
            layout === 'tablet' && styles.detailsTablet,
          ]}
          editable={!busy}
          multiline
          maxLength={600}
          textAlignVertical="top"
          keyboardAppearance="dark"
        />
        <AuthFlowButton label={t('auth.support_send')} loading={busy} onPress={submit} />
      </AuthFlowWindow>
    </AuthFlowScreen>
  );
}

const styles = StyleSheet.create({
  pair: {
    flexDirection: 'row',
    gap: PidroSpacing.sm,
  },
  pairField: {
    minWidth: 0,
    flex: 4,
  },
  // An address runs longer than a name.
  pairFieldWide: {
    flex: 5,
  },
  details: {
    height: 84,
    lineHeight: 22,
  },
  detailsLandscape: {
    height: 60,
    paddingVertical: PidroSpacing.xs,
  },
  detailsTablet: {
    height: 104,
    lineHeight: 25,
  },
  sentHero: {
    alignItems: 'center',
    gap: 20,
  },
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
  sentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  sentRowCopy: {
    minWidth: 0,
    flex: 1,
  },
});
