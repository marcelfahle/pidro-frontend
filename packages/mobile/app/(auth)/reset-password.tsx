import { useCallback, useRef, useState } from 'react';
import { Keyboard, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import {
  AuthFlowButton,
  AuthFlowNotice,
  AuthFlowScreen,
  AuthFlowWindow,
  useAuthFlow,
} from '@/components/auth/AuthFlow';
import { useSwitchPlayersGuard } from '@/components/auth/SwitchPlayersGuard';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { authenticatedEntryDestination } from '@/navigation/initialRoute';
import { useAgeGateStore } from '@/stores/ageGate';
import { useAuthStore } from '@/stores/auth';
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
  const { guard, modal } = useSwitchPlayersGuard(
    'Resetting this account’s password signs in as that player. Guest results do not merge.'
  );
  const { inputStyle } = useAuthFlow();
  // A reset link opens this screen cold, so "back" means the sign-in screen.
  const toSignIn = useCallback(() => router.replace('/(auth)/login'), [router]);

  const performReset = useCallback(async () => {
    if (!token) return;
    if (await resetPassword(token, password)) {
      const signedInUser = useAuthStore.getState().user;
      if (!signedInUser) return;
      router.replace(
        authenticatedEntryDestination(
          pendingInvite,
          useAgeGateStore.getState().ageBand,
          signedInUser
        ) as Href
      );
    }
  }, [password, pendingInvite, resetPassword, router, token]);

  const submit = useCallback(() => {
    if (!token) return;
    if (password.length < 8) {
      setValidationError('Use 8 characters or more.');
      inputRef.current?.focus();
      return;
    }
    Keyboard.dismiss();
    guard(() => void performReset());
  }, [guard, password, performReset, token]);

  return (
    <AuthFlowScreen
      testID="reset-password-screen"
      headerTitle="Sign in"
      onBack={toSignIn}
      title="Choose a new password"
      body={token ? 'Use 8 characters or more.' : undefined}>
      <AuthFlowWindow testID="auth-window">
        {token ? (
          <>
            {error ? <AuthFlowNotice>{error}</AuthFlowNotice> : null}
            <Input
              ref={inputRef}
              label="New password"
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                setValidationError(null);
                clearError();
              }}
              error={validationError ?? undefined}
              style={inputStyle}
              editable={!isLoading}
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              keyboardAppearance="dark"
              revealPassword
              secureTextEntry
              returnKeyType="go"
              submitBehavior="blurAndSubmit"
              onSubmitEditing={submit}
            />
            <AuthFlowButton label="Set new password" loading={isLoading} onPress={submit} />
          </>
        ) : (
          <>
            <AuthFlowNotice>This reset link is missing or no longer valid.</AuthFlowNotice>
            <AuthFlowButton
              label="Send a new link"
              onPress={() => router.replace('/(auth)/forgot-password')}
            />
          </>
        )}
      </AuthFlowWindow>
      {modal}
    </AuthFlowScreen>
  );
}
