import { useCallback, useRef, useState } from 'react';
import { Link, useRouter, type Href } from 'expo-router';
import { Keyboard, Platform, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { AuthScreenFrame } from '@/components/ui/AuthScreenFrame';
import { BevelButton } from '@/components/ui/BevelButton';
import { Input } from '@/components/ui/Input';
import { PidroText } from '@/components/ui/PidroText';
import { PidroColors, PidroLayout, PidroSpacing, PidroType } from '@/design/tokens';
import { useAuth } from '@/hooks/useAuth';
import { authenticatedDestination } from '@/navigation/initialRoute';
import { usePendingInviteStore } from '@/stores/pendingInvite';

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
  const { user, signUp, isLoading, error: authError, clearError } = useAuth();
  const router = useRouter();
  const pendingInvite = usePendingInviteStore((state) => state.pendingInvite);
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const compactLandscape = landscape && height < 500;

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
    if (success) router.replace(authenticatedDestination(pendingInvite) as Href);
  }, [email, isLoading, password, pendingInvite, router, signUp, username]);

  return (
    <AuthScreenFrame
      title={user?.guest ? 'Save your player' : 'Create your account'}
      subtitle={
        compactLandscape
          ? undefined
          : user?.guest
            ? 'Keep your name and progress on every device.'
            : 'Choose your name and claim a seat at the table.'
      }
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
      <View style={[styles.fields, compactLandscape && styles.fieldsLandscape]}>
        <View style={compactLandscape && styles.fieldLandscape}>
          <Input
            ref={usernameRef}
            label="Username"
            placeholder="Your name"
            value={username}
            onChangeText={handleUsernameChange}
            error={validationErrors.username}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete={Platform.OS === 'android' ? 'username-new' : 'username'}
            textContentType="username"
            importantForAutofill="yes"
            clearButtonMode="while-editing"
            editable={!isLoading}
            keyboardAppearance="dark"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={focusEmail}
          />
        </View>
        <View style={compactLandscape && styles.fieldLandscape}>
          <Input
            ref={emailRef}
            label="Email"
            placeholder="you@email.com"
            value={email}
            onChangeText={handleEmailChange}
            error={validationErrors.email}
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            importantForAutofill="yes"
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
        <View style={compactLandscape && styles.fieldLandscape}>
          <Input
            ref={passwordRef}
            label="Password"
            placeholder="Your password"
            value={password}
            onChangeText={handlePasswordChange}
            error={validationErrors.password}
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            importantForAutofill="yes"
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
      <BevelButton
        label={user?.guest ? 'Save account' : 'Create account'}
        material="wood"
        size="md"
        fullWidth
        onPress={handleRegister}
        loading={isLoading}
      />
    </AuthScreenFrame>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: PidroSpacing.md,
  },
  fieldsLandscape: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fieldLandscape: {
    width: '32%',
    flexGrow: 1,
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
