import { useCallback, useRef, useState } from 'react';
import { Link, useRouter, type Href } from 'expo-router';
import { Keyboard, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { AuthScreenFrame } from '@/components/ui/AuthScreenFrame';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PidroText } from '@/components/ui/PidroText';
import { PidroColors, PidroLayout, PidroType } from '@/design/tokens';
import { useAuth } from '@/hooks/useAuth';
import { t } from '@/i18n';

type LoginField = 'username' | 'password';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [validationErrors, setValidationErrors] = useState<Partial<Record<LoginField, string>>>({});
  const usernameRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const { signIn, isLoading, error, clearError } = useAuth();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const clearValidationError = useCallback(
    (field: LoginField) => {
      setValidationErrors((current) => {
        if (!current[field]) return current;
        return { ...current, [field]: undefined };
      });
      clearError();
    },
    [clearError]
  );
  const handleUsernameChange = useCallback(
    (next: string) => {
      setUsername(next);
      clearValidationError('username');
    },
    [clearValidationError]
  );
  const handlePasswordChange = useCallback(
    (next: string) => {
      setPassword(next);
      clearValidationError('password');
    },
    [clearValidationError]
  );
  const focusPassword = useCallback(() => passwordRef.current?.focus(), []);

  const handleLogin = useCallback(async () => {
    const normalizedUsername = username.trim();
    if (isLoading) return;

    const nextErrors: Partial<Record<LoginField, string>> = {};
    if (!normalizedUsername) nextErrors.username = 'Enter a username.';
    if (!password) nextErrors.password = 'Enter a password.';
    setValidationErrors(nextErrors);

    if (nextErrors.username) {
      usernameRef.current?.focus();
      return;
    }
    if (nextErrors.password) {
      passwordRef.current?.focus();
      return;
    }

    Keyboard.dismiss();
    const success = await signIn(normalizedUsername, password);
    if (success) router.replace('/home');
  }, [isLoading, password, router, signIn, username]);

  return (
    <AuthScreenFrame
      title="Welcome back"
      subtitle="Sign in to return to your table."
      error={error}
      footer={
        <>
          <PidroText role="metadata" tone="soft">
            New to Pidro?
          </PidroText>
          <Link href="/(auth)/register" style={styles.link}>
            Create an account
          </Link>
          <PidroText role="metadata" tone="soft">
            {t('invite.manual.entry')}
          </PidroText>
          <Link href={'/join-code' as Href} style={styles.link}>
            {t('invite.manual.entryAction')}
          </Link>
        </>
      }>
      <View style={[styles.fields, landscape && styles.fieldsLandscape]}>
        <View style={landscape && styles.fieldLandscape}>
          <Input
            ref={usernameRef}
            label="Username"
            placeholder="Enter your username"
            value={username}
            onChangeText={handleUsernameChange}
            error={validationErrors.username}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            clearButtonMode="while-editing"
            editable={!isLoading}
            keyboardAppearance="dark"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={focusPassword}
          />
        </View>
        <View style={landscape && styles.fieldLandscape}>
          <Input
            ref={passwordRef}
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={handlePasswordChange}
            error={validationErrors.password}
            autoCapitalize="none"
            autoComplete="current-password"
            autoCorrect={false}
            editable={!isLoading}
            enablesReturnKeyAutomatically
            keyboardAppearance="dark"
            revealPassword
            secureTextEntry
            spellCheck={false}
            returnKeyType="go"
            submitBehavior="blurAndSubmit"
            onSubmitEditing={handleLogin}
          />
        </View>
      </View>
      <Button label="Sign in" onPress={handleLogin} loading={isLoading} size="lg" />
    </AuthScreenFrame>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: 12,
  },
  fieldsLandscape: {
    flexDirection: 'row',
    gap: 8,
  },
  fieldLandscape: {
    width: '49%',
  },
  link: {
    minWidth: PidroLayout.touchTarget,
    minHeight: PidroLayout.touchTarget,
    textAlign: 'center',
    color: PidroColors.cyanText,
    ...PidroType.metadata,
    paddingVertical: 14,
  },
});
