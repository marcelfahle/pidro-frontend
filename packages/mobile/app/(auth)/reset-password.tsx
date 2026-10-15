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
import { resetLinkRefused } from '@/features/auth/resetLink';
import { useAuth } from '@/hooks/useAuth';
import { authenticatedEntryDestination } from '@/navigation/initialRoute';
import { useAgeGateStore } from '@/stores/ageGate';
import { useAuthStore } from '@/stores/auth';
import { usePendingInviteStore } from '@/stores/pendingInvite';
import { useTranslation, type TranslationKey } from '@/i18n';

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const { token: rawToken, fixture: fixtureParam } = useLocalSearchParams<{
    token?: string | string[];
    fixture?: string;
  }>();
  const fixture = __DEV__ ? fixtureParam : undefined;
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);
  const router = useRouter();
  const pendingInvite = usePendingInviteStore((state) => state.pendingInvite);
  const { resetPassword, isLoading, error, errorCode, clearError } = useAuth();
  const refused = fixture === 'refused' || resetLinkRefused(errorCode);
  const { guard, modal } = useSwitchPlayersGuard('auth.reset_switch');
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
      setValidationError('auth.password_min');
      inputRef.current?.focus();
      return;
    }
    Keyboard.dismiss();
    guard(() => void performReset());
  }, [guard, password, performReset, token]);

  return (
    <AuthFlowScreen
      testID="reset-password-screen"
      headerTitle={t('auth.sign_in')}
      onBack={toSignIn}
      title={t('auth.choose_password')}
      body={token && !refused ? t('auth.password_min', { count: 8 }) : undefined}>
      <AuthFlowWindow testID="auth-window">
        {token && !refused ? (
          <>
            {error ? <AuthFlowNotice>{error}</AuthFlowNotice> : null}
            <Input
              ref={inputRef}
              label={t('auth.new_password')}
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                setValidationError(null);
                clearError();
              }}
              error={
                validationError ? t(validationError as TranslationKey, { count: 8 }) : undefined
              }
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
            <AuthFlowButton label={t('auth.set_password')} loading={isLoading} onPress={submit} />
          </>
        ) : (
          <>
            <AuthFlowNotice>{refused && error ? error : t('auth.reset_invalid')}</AuthFlowNotice>
            <AuthFlowButton
              label={t('auth.new_link')}
              onPress={() => router.replace('/(auth)/forgot-password')}
            />
          </>
        )}
      </AuthFlowWindow>
      {modal}
    </AuthFlowScreen>
  );
}
