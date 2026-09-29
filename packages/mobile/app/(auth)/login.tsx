import { useCallback, useRef, useState } from 'react';
import { Link, useRouter, type Href } from 'expo-router';
import { Keyboard, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { AuthScreenFrame } from '@/components/ui/AuthScreenFrame';
import { AuthProviderButtons } from '@/components/auth/AuthProviderButtons';
import { BevelButton } from '@/components/ui/BevelButton';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { PidroText } from '@/components/ui/PidroText';
import { PressableFX } from '@/components/ui/PressableFX';
import { PidroColors, PidroLayout, PidroSpacing, PidroType } from '@/design/tokens';
import { useAuth } from '@/hooks/useAuth';
import { t } from '@/i18n';
import { authenticatedDestination } from '@/navigation/initialRoute';
import { usePendingInviteStore } from '@/stores/pendingInvite';
import type { AuthProvider } from '@/api/auth';
import { handleClassicFound } from '@/features/auth/classicFound';
import { handleSocialSignInOutcome } from '@/features/auth/loginSocial';

type LoginField = 'username' | 'password';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [socialNotice, setSocialNotice] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Partial<Record<LoginField, string>>>({});
  const usernameRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const { user, signIn, signInWithProvider, isLoading, error, clearError } = useAuth();
  // A guest who signs into another account leaves their guest behind, so
  // every sign-in method asks first. Holds the method waiting for that answer.
  const [pendingSwitch, setPendingSwitch] = useState<'password' | AuthProvider | null>(null);
  const router = useRouter();
  const pendingInvite = usePendingInviteStore((state) => state.pendingInvite);
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const compactLandscape = landscape && height < 500;

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

  const performLogin = useCallback(async () => {
    Keyboard.dismiss();
    const success = await signIn(username.trim(), password);
    if (success) router.replace(authenticatedDestination(pendingInvite) as Href);
  }, [password, pendingInvite, router, signIn, username]);

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

    if (user?.guest) {
      Keyboard.dismiss();
      setPendingSwitch('password');
      return;
    }
    await performLogin();
  }, [isLoading, password, performLogin, user?.guest, username]);

  const performProviderLogin = useCallback(
    async (provider: AuthProvider) => {
      setSocialNotice(null);
      const outcome = await signInWithProvider(provider);
      handleSocialSignInOutcome(outcome, {
        onSignedIn: () => router.replace(authenticatedDestination(pendingInvite) as Href),
        onClassicFound: handleClassicFound,
        onUnknownIdentity: () =>
          setSocialNotice(
            `We couldn’t sign in with that ${provider === 'apple' ? 'Apple' : 'Facebook'} account.`
          ),
      });
    },
    [pendingInvite, router, signInWithProvider]
  );

  const handleProviderLogin = useCallback(
    async (provider: AuthProvider) => {
      if (isLoading) return;
      if (user?.guest) {
        setPendingSwitch(provider);
        return;
      }
      await performProviderLogin(provider);
    },
    [isLoading, performProviderLogin, user?.guest]
  );

  return (
    <AuthScreenFrame
      title="Welcome back"
      subtitle={compactLandscape ? undefined : 'Sign in to return to your table.'}
      error={error}
      footer={
        <View style={[styles.footerRows, compactLandscape && styles.footerRowsLandscape]}>
          <View style={styles.footerRow}>
            <PidroText role="metadata" tone="soft">
              New to Pidro?
            </PidroText>
            <Link href="/(auth)/register" style={styles.link}>
              Create an account
            </Link>
          </View>
          <Link
            href={'/join-code' as Href}
            style={[styles.link, !compactLandscape && styles.quietLink]}>
            {t('invite.manual.entry')}
          </Link>
          <Link href="/welcome" style={[styles.link, !compactLandscape && styles.quietLink]}>
            Play as guest
          </Link>
        </View>
      }>
      <AuthProviderButtons
        showEmail={false}
        showEmailDivider
        onApple={() => void handleProviderLogin('apple')}
        onFacebook={() => void handleProviderLogin('facebook')}
      />
      {socialNotice ? (
        <PidroText role="metadata" tone="soft" align="center" accessibilityLiveRegion="polite">
          {socialNotice}
        </PidroText>
      ) : null}
      <View style={[styles.fields, compactLandscape && styles.fieldsLandscape]}>
        <View style={compactLandscape && styles.fieldLandscape}>
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
            textContentType="username"
            importantForAutofill="yes"
            clearButtonMode="while-editing"
            editable={!isLoading}
            keyboardAppearance="dark"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={focusPassword}
          />
        </View>
        <View style={compactLandscape && styles.fieldLandscape}>
          <Input
            ref={passwordRef}
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={handlePasswordChange}
            error={validationErrors.password}
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
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
            onSubmitEditing={handleLogin}
          />
        </View>
      </View>
      <PressableFX
        accessibilityRole="button"
        accessibilityLabel="Forgot password"
        onPress={() => router.push('/(auth)/forgot-password')}
        style={styles.forgot}>
        <PidroText role="metadata" tone="cyan">
          Forgot password?
        </PidroText>
      </PressableFX>
      <BevelButton
        label="Sign in"
        material="wood"
        size="md"
        fullWidth
        onPress={handleLogin}
        loading={isLoading}
      />
      <Modal
        isOpen={pendingSwitch !== null}
        title="Switch players?"
        description="Guest results do not merge into a different account. Cancel to keep playing with this guest."
        onClose={() => setPendingSwitch(null)}>
        <View style={styles.switchActions}>
          <BevelButton
            label="Cancel"
            material="glass"
            size="sm"
            fullWidth
            onPress={() => setPendingSwitch(null)}
          />
          <BevelButton
            label="Switch account"
            material="wood"
            size="sm"
            fullWidth
            onPress={() => {
              const method = pendingSwitch;
              setPendingSwitch(null);
              if (method === 'password') void performLogin();
              else if (method) void performProviderLogin(method);
            }}
          />
        </View>
      </Modal>
    </AuthScreenFrame>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: PidroSpacing.md,
  },
  fieldsLandscape: {
    flexDirection: 'row',
    gap: 8,
  },
  fieldLandscape: {
    width: '49%',
  },
  forgot: {
    minHeight: PidroLayout.touchTarget,
    alignSelf: 'flex-end',
    justifyContent: 'center',
    marginTop: -6,
    marginBottom: -6,
  },
  footerRows: {
    alignItems: 'center',
    gap: 0,
  },
  footerRowsLandscape: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: PidroSpacing.xs,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.xs,
  },
  link: {
    minWidth: PidroLayout.touchTarget,
    minHeight: PidroLayout.touchTarget,
    textAlign: 'center',
    color: PidroColors.cyanText,
    ...PidroType.metadata,
    paddingVertical: 14,
  },
  quietLink: {
    paddingVertical: 8,
  },
  switchActions: {
    gap: 8,
  },
});
