import { useCallback, useRef, useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { Keyboard, Platform, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { AuthScreenFrame } from '@/components/ui/AuthScreenFrame';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PidroText } from '@/components/ui/PidroText';
import { PidroColors, PidroLayout, PidroType } from '@/design/tokens';
import { useAuth } from '@/hooks/useAuth';

type RegisterField = 'username' | 'email' | 'password';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationErrors, setValidationErrors] = useState<Partial<Record<RegisterField, string>>>(
    {}
  );
  const usernameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const { signUp, isLoading, error: authError, clearError } = useAuth();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const clearValidationError = useCallback(
    (field: RegisterField) => {
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
  const handleEmailChange = useCallback(
    (next: string) => {
      setEmail(next);
      clearValidationError('email');
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
  const focusEmail = useCallback(() => emailRef.current?.focus(), []);
  const focusPassword = useCallback(() => passwordRef.current?.focus(), []);

  const handleRegister = useCallback(async () => {
    if (isLoading) return;

    const normalizedUsername = username.trim();
    const normalizedEmail = email.trim();
    const nextErrors: Partial<Record<RegisterField, string>> = {};
    if (!normalizedUsername) nextErrors.username = 'Enter a username.';
    if (!normalizedEmail) nextErrors.email = 'Enter an email address.';
    if (!password) nextErrors.password = 'Enter a password.';

    setValidationErrors(nextErrors);
    const firstInvalidField = (['username', 'email', 'password'] as const).find(
      (field) => nextErrors[field]
    );
    if (firstInvalidField) {
      const refs = {
        username: usernameRef,
        email: emailRef,
        password: passwordRef,
      };
      refs[firstInvalidField].current?.focus();
      return;
    }

    Keyboard.dismiss();
    const success = await signUp(normalizedUsername, normalizedEmail, password);
    if (success) router.replace('/home');
  }, [email, isLoading, password, router, signUp, username]);

  return (
    <AuthScreenFrame
      title="Create your account"
      subtitle="Choose your name and claim a seat at the table."
      error={authError}
      footer={
        <>
          <PidroText role="metadata" tone="soft">
            Already have an account?
          </PidroText>
          <Link href="/(auth)/login" style={styles.link}>
            Sign in
          </Link>
        </>
      }>
      <View style={[styles.fields, landscape && styles.fieldsLandscape]}>
        <View style={landscape && styles.fieldLandscape}>
          <Input
            ref={usernameRef}
            label="Username"
            placeholder="Choose a username"
            value={username}
            onChangeText={handleUsernameChange}
            error={validationErrors.username}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete={Platform.OS === 'android' ? 'username-new' : 'username'}
            clearButtonMode="while-editing"
            editable={!isLoading}
            keyboardAppearance="dark"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={focusEmail}
          />
        </View>
        <View style={landscape && styles.fieldLandscape}>
          <Input
            ref={emailRef}
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChangeText={handleEmailChange}
            error={validationErrors.email}
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            clearButtonMode="while-editing"
            editable={!isLoading}
            keyboardAppearance="dark"
            keyboardType="email-address"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={focusPassword}
          />
        </View>
        <View className={landscape ? 'w-full' : undefined}>
          <Input
            ref={passwordRef}
            label="Password"
            placeholder="Choose a password"
            value={password}
            onChangeText={handlePasswordChange}
            error={validationErrors.password}
            autoCapitalize="none"
            autoComplete="new-password"
            autoCorrect={false}
            editable={!isLoading}
            enablesReturnKeyAutomatically
            keyboardAppearance="dark"
            revealPassword
            secureTextEntry
            spellCheck={false}
            returnKeyType="go"
            submitBehavior="blurAndSubmit"
            onSubmitEditing={handleRegister}
          />
        </View>
      </View>
      <Button label="Create account" onPress={handleRegister} loading={isLoading} size="lg" />
    </AuthScreenFrame>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: 12,
  },
  fieldsLandscape: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
