import { useCallback, useRef, useState } from 'react';
import { Keyboard, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { TextLink } from '@/components/ui/TextLink';
import { PidroSpacing } from '@/design/tokens';
import { useAuth } from '@/hooks/useAuth';
import { useFlowBack, useHardwareBack } from '@/hooks/useFlowBack';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const goBack = useFlowBack();
  const params = useLocalSearchParams<{ identifier?: string; fixture?: string }>();
  const fixture = __DEV__ ? params.fixture : undefined;
  const { layout, metrics, inputStyle } = useAuthFlow();
  const landscape = layout === 'landscape';
  const [identifier, setIdentifier] = useState(params.identifier ?? '');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [sent, setSent] = useState(fixture === 'sent');
  const inputRef = useRef<TextInput>(null);
  const { requestPasswordReset, isLoading, error, clearError } = useAuth();

  const submit = useCallback(async () => {
    const value = identifier.trim();
    if (!value) {
      setValidationError('Enter your email or username.');
      inputRef.current?.focus();
      return;
    }
    Keyboard.dismiss();
    if (await requestPasswordReset(value)) setSent(true);
  }, [identifier, requestPasswordReset]);

  const backToForm = useCallback(() => setSent(false), []);
  useHardwareBack(sent, backToForm);

  if (sent) {
    // The server answers the same whether or not an account matched, so this
    // never says a link was sent to a particular address.
    const body = 'If that matches a Pidro account, a link to choose a new password is on its way.';
    const done = <AuthFlowButton label="Back to sign in" material="glass" onPress={goBack} />;
    return (
      <AuthFlowScreen
        testID="forgot-password-screen"
        headerTitle="Sign in"
        onBack={backToForm}
        title="Check your email"
        body={body}
        inlineIntro
        fill>
        {landscape ? (
          <AuthFlowWindow testID="auth-window">
            <View style={styles.sentRow}>
              <AuthFlowIconTile icon="mail" quiet />
              <PidroText role="body" tone="soft" style={[styles.sentRowCopy, metrics.body]}>
                The link works for one hour.
              </PidroText>
            </View>
            {done}
          </AuthFlowWindow>
        ) : (
          <>
            <View
              testID="auth-window"
              accessibilityLiveRegion="polite"
              style={[styles.sentHero, layout === 'phone' && styles.sentHeroFill]}>
              <AuthFlowIconTile icon="mail" />
              <View style={styles.sentCopy}>
                <AuthFlowHeading align="center" hero>
                  Check your email
                </AuthFlowHeading>
                <PidroText role="body" tone="soft" align="center" style={metrics.body}>
                  {body}
                </PidroText>
                <PidroText role="body" tone="soft" align="center" style={metrics.body}>
                  The link works for one hour.
                </PidroText>
              </View>
            </View>
            {done}
          </>
        )}
      </AuthFlowScreen>
    );
  }

  return (
    <AuthFlowScreen
      testID="forgot-password-screen"
      headerTitle="Sign in"
      onBack={goBack}
      title="Forgot your password?"
      body="We email you a link to choose a new one.">
      <AuthFlowWindow testID="auth-window">
        {error ? <AuthFlowNotice>{error}</AuthFlowNotice> : null}
        <Input
          ref={inputRef}
          label="Email or username"
          placeholder="you@example.com"
          value={identifier}
          onChangeText={(value) => {
            setIdentifier(value);
            setValidationError(null);
            clearError();
          }}
          error={validationError ?? undefined}
          style={inputStyle}
          editable={!isLoading}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          textContentType="username"
          keyboardAppearance="dark"
          keyboardType="email-address"
          returnKeyType="send"
          submitBehavior="blurAndSubmit"
          onSubmitEditing={submit}
        />
        <AuthFlowButton label="Email me a link" loading={isLoading} onPress={submit} />
      </AuthFlowWindow>
      <TextLink
        label="Played Pidro Classic? Recover that account"
        size={metrics.link}
        style={styles.centerLink}
        onPress={() => router.push('/(auth)/classic-forgot')}
      />
    </AuthFlowScreen>
  );
}

const styles = StyleSheet.create({
  centerLink: {
    alignSelf: 'center',
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
