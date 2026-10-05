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

type Fixture = 'filled' | 'sent' | 'mail';
type Field = 'name' | 'email';
type Outcome = 'sent' | 'mail';

export default function ClassicHelpScreen() {
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
    user && !user.guest
      ? 'You can keep playing while we\u00a0look.'
      : 'You can keep playing as a guest while we\u00a0look.';

  const clear = (field: Field) => {
    setFields((current) => ({ ...current, [field]: undefined }));
    setFailure(null);
  };

  const submit = useCallback(async () => {
    if (busy) return;
    const nextFields: Partial<Record<Field, string>> = {};
    if (!name.trim()) nextFields.name = 'Enter the name you played as.';
    if (!isEmailAddress(email)) {
      nextFields.email = email.trim()
        ? 'Check that email address.'
        : 'Enter an email we can reply to.';
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
    else if (result.status === 'rejected') setFailure(result.message);
    else setFailure(`We couldn’t send that. Email us at ${SUPPORT_EMAIL} and we’ll find it.`);
  }, [busy, details, email, fixture, name]);

  if (outcome) {
    const title = outcome === 'sent' ? 'Message sent' : 'Almost there';
    const body =
      outcome === 'sent'
        ? `A person reads it and replies to ${email.trim()}.`
        : `We opened a message to ${SUPPORT_EMAIL} in your mail app. Send it and a person replies by email.`;
    const done = (
      <AuthFlowButton
        label="Keep playing"
        onPress={() => router.replace(user ? '/home' : '/welcome')}
      />
    );
    return (
      <AuthFlowScreen
        testID="classic-help-screen"
        headerTitle="Pidro Classic"
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
                {outcome === 'sent'
                  ? 'We have your message. Watch your inbox for a reply.'
                  : 'Your message is waiting in your mail app.'}
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
      label="Name you played as"
      value={name}
      onChangeText={(next) => {
        setName(next);
        clear('name');
      }}
      error={fields.name}
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
      label="Email to reach you"
      placeholder="you@example.com"
      value={email}
      onChangeText={(next) => {
        setEmail(next);
        clear('email');
      }}
      error={fields.email}
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
      headerTitle="Pidro Classic"
      onBack={goBack}
      title="We’ll find it for you"
      body="Tell us what you remember. A person reads this and replies by email."
      note={keepPlaying}>
      <AuthFlowWindow testID="classic-help-window">
        {failure ? <AuthFlowNotice>{failure}</AuthFlowNotice> : null}
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
          label="Anything else that helps"
          placeholder="An old email address, when you last played"
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
        <AuthFlowButton label="Send to support" loading={busy} onPress={submit} />
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
