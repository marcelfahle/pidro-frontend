import { useCallback, useRef, useState } from 'react';
import { Keyboard, StyleSheet, TextInput, View } from 'react-native';
import { Link } from 'expo-router';
import { AuthScreenFrame } from '@/components/ui/AuthScreenFrame';
import { BevelButton } from '@/components/ui/BevelButton';
import { Input } from '@/components/ui/Input';
import { PidroText } from '@/components/ui/PidroText';
import { PidroColors, PidroLayout, PidroType } from '@/design/tokens';
import { useAuth } from '@/hooks/useAuth';

export default function ForgotPasswordScreen() {
  const [identifier, setIdentifier] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const { requestPasswordReset, isLoading, error, clearError } = useAuth();

  const submit = useCallback(async () => {
    const value = identifier.trim();
    if (!value) {
      setValidationError('Enter your username or email address.');
      inputRef.current?.focus();
      return;
    }
    Keyboard.dismiss();
    if (await requestPasswordReset(value)) setSent(true);
  }, [identifier, requestPasswordReset]);

  return (
    <AuthScreenFrame
      title="Reset your password"
      subtitle="We’ll send recovery instructions if an account matches."
      error={error}
      footer={
        <>
          <Link href="/(auth)/login" style={styles.link}>
            Back to sign in
          </Link>
          <Link href="/welcome" style={styles.link}>
            Play as guest
          </Link>
        </>
      }>
      <View style={styles.formContent}>
        {sent ? (
          <PidroText role="body" tone="soft" align="center" accessibilityLiveRegion="polite">
            Check your email for the reset link. You can safely close this screen.
          </PidroText>
        ) : (
          <>
            <Input
              ref={inputRef}
              label="Username or email"
              placeholder="Your username or email"
              value={identifier}
              onChangeText={(value) => {
                setIdentifier(value);
                setValidationError(null);
                clearError();
              }}
              error={validationError ?? undefined}
              editable={!isLoading}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              returnKeyType="send"
              onSubmitEditing={submit}
            />
            <BevelButton
              label="Send reset link"
              material="wood"
              size="md"
              fullWidth
              loading={isLoading}
              onPress={submit}
            />
          </>
        )}
      </View>
    </AuthScreenFrame>
  );
}

const styles = StyleSheet.create({
  formContent: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    gap: 8,
  },
  link: {
    minWidth: PidroLayout.touchTarget,
    minHeight: PidroLayout.touchTarget,
    color: PidroColors.cyanText,
    ...PidroType.metadata,
    paddingVertical: 14,
  },
});
