import { useCallback, useRef, useState } from 'react';
import { Keyboard, StyleSheet, TextInput } from 'react-native';
import { Link, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { AuthScreenFrame } from '@/components/ui/AuthScreenFrame';
import { BevelButton } from '@/components/ui/BevelButton';
import { Input } from '@/components/ui/Input';
import { PidroColors, PidroLayout, PidroType } from '@/design/tokens';
import { useAuth } from '@/hooks/useAuth';
import { authenticatedDestination } from '@/navigation/initialRoute';
import { usePendingInviteStore } from '@/stores/pendingInvite';

export default function ResetPasswordScreen() {
  const { token: rawToken } = useLocalSearchParams<{ token?: string | string[] }>();
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);
  const router = useRouter();
  const pendingInvite = usePendingInviteStore((state) => state.pendingInvite);
  const { resetPassword, isLoading, error, clearError } = useAuth();

  const submit = useCallback(async () => {
    if (!token) return;
    if (password.length < 8) {
      setValidationError('Use at least 8 characters.');
      inputRef.current?.focus();
      return;
    }
    Keyboard.dismiss();
    if (await resetPassword(token, password)) {
      router.replace(authenticatedDestination(pendingInvite) as Href);
    }
  }, [password, pendingInvite, resetPassword, router, token]);

  return (
    <AuthScreenFrame
      title="Choose a new password"
      subtitle={token ? 'Use at least 8 characters.' : undefined}
      error={token ? error : 'This reset link is missing or invalid.'}
      footer={
        <Link href="/(auth)/login" style={styles.link}>
          Back to sign in
        </Link>
      }>
      {token ? (
        <>
          <Input
            ref={inputRef}
            label="New password"
            placeholder="Your new password"
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setValidationError(null);
              clearError();
            }}
            error={validationError ?? undefined}
            editable={!isLoading}
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            revealPassword
            secureTextEntry
            returnKeyType="go"
            onSubmitEditing={submit}
          />
          <BevelButton
            label="Set new password"
            material="wood"
            size="md"
            fullWidth
            loading={isLoading}
            onPress={submit}
          />
        </>
      ) : null}
    </AuthScreenFrame>
  );
}

const styles = StyleSheet.create({
  link: {
    minWidth: PidroLayout.touchTarget,
    minHeight: PidroLayout.touchTarget,
    color: PidroColors.cyanText,
    ...PidroType.metadata,
    paddingVertical: 14,
  },
});
