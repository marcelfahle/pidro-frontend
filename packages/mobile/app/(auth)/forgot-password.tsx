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
import { useTranslation } from '@/i18n';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
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
      setValidationError('auth.enter_identifier');
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
    const body = t('auth.reset_sent');
    const done = (
      <AuthFlowButton label={t('auth.back_sign_in')} material="glass" onPress={goBack} />
    );
    return (
      <AuthFlowScreen
        testID="forgot-password-screen"
        headerTitle={t('auth.sign_in')}
        onBack={backToForm}
        title={t('auth.check_inbox')}
        body={body}
        inlineIntro
        fill>
        {landscape ? (
          <AuthFlowWindow testID="auth-window">
            <View style={styles.sentRow}>
              <AuthFlowIconTile icon="mail" quiet />
              <PidroText role="body" tone="soft" style={[styles.sentRowCopy, metrics.body]}>
                {t('auth.reset_lifetime')}
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
                  {t('auth.check_inbox')}
                </AuthFlowHeading>
                <PidroText role="body" tone="soft" align="center" style={metrics.body}>
                  {body}
                </PidroText>
                <PidroText role="body" tone="soft" align="center" style={metrics.body}>
                  {t('auth.reset_lifetime')}
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
      headerTitle={t('auth.sign_in')}
      onBack={goBack}
      title={t('auth.forgot_title')}
      body={t('auth.reset_intro')}>
      <AuthFlowWindow testID="auth-window">
        {error ? <AuthFlowNotice>{error}</AuthFlowNotice> : null}
        <Input
          ref={inputRef}
          label={t('auth.identifier')}
          placeholder={t('auth.email_placeholder')}
          value={identifier}
          onChangeText={(value) => {
            setIdentifier(value);
            setValidationError(null);
            clearError();
          }}
          error={validationError ? t('auth.enter_identifier') : undefined}
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
        <AuthFlowButton label={t('auth.email_link')} loading={isLoading} onPress={submit} />
      </AuthFlowWindow>
      <TextLink
        label={t('auth.recover_classic')}
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
