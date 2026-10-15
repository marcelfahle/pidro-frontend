import { useCallback, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Keyboard, StyleSheet, TextInput, View } from 'react-native';
import {
  AuthFlowButton,
  AuthFlowNotice,
  AuthFlowScreen,
  AuthFlowWindow,
  useAuthFlow,
} from '@/components/auth/AuthFlow';
import { AuthProviderButtons } from '@/components/auth/AuthProviderButtons';
import { useSwitchPlayersGuard } from '@/components/auth/SwitchPlayersGuard';
import { useProviderSignIn } from '@/components/auth/useProviderSignIn';
import { Input } from '@/components/ui/Input';
import { PidroText } from '@/components/ui/PidroText';
import { TextLink } from '@/components/ui/TextLink';
import { PidroSpacing } from '@/design/tokens';
import { useAuth } from '@/hooks/useAuth';
import { useFlowBack } from '@/hooks/useFlowBack';
import { useTranslation, type TranslationKey } from '@/i18n';
import { authenticatedEntryDestination } from '@/navigation/initialRoute';
import { useAgeGateStore } from '@/stores/ageGate';
import { useAuthStore } from '@/stores/auth';
import { usePendingInviteStore } from '@/stores/pendingInvite';
import type { AuthProvider } from '@/api/auth';

type LoginField = 'identifier' | 'password';

export default function LoginScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ email?: string; known?: string; fixture?: string }>();
  const fixture = __DEV__ ? params.fixture : undefined;
  const [identifier, setIdentifier] = useState(params.email ?? '');
  const [password, setPassword] = useState('');
  const [validationErrors, setValidationErrors] = useState<
    Partial<Record<LoginField, TranslationKey>>
  >({});
  const identifierRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const { signIn, signInWithProvider, isLoading, error, clearError } = useAuth();
  const { guard, modal } = useSwitchPlayersGuard();
  const providerSignIn = useProviderSignIn(signInWithProvider);
  const router = useRouter();
  const goBack = useFlowBack();
  const pendingInvite = usePendingInviteStore((state) => state.pendingInvite);
  const { layout, metrics, inputStyle } = useAuthFlow();
  const landscape = layout === 'landscape';
  // Sent here from Create account: the address already has an account.
  const knownAccount = params.known === '1' && !error;

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
  const focusPassword = useCallback(() => passwordRef.current?.focus(), []);

  const performLogin = useCallback(async () => {
    Keyboard.dismiss();
    const success = await signIn(identifier.trim(), password);
    const signedInUser = useAuthStore.getState().user;
    if (success && signedInUser) {
      router.replace(
        authenticatedEntryDestination(
          pendingInvite,
          useAgeGateStore.getState().ageBand,
          signedInUser
        ) as Href
      );
    }
  }, [identifier, password, pendingInvite, router, signIn]);

  const handleLogin = useCallback(() => {
    if (isLoading) return;

    const nextErrors: Partial<Record<LoginField, TranslationKey>> = {};
    if (!identifier.trim()) nextErrors.identifier = 'auth.enter_identifier';
    if (!password) nextErrors.password = 'auth.enter_password';
    setValidationErrors(nextErrors);

    if (nextErrors.identifier) {
      identifierRef.current?.focus();
      return;
    }
    if (nextErrors.password) {
      passwordRef.current?.focus();
      return;
    }

    Keyboard.dismiss();
    guard(() => void performLogin());
  }, [guard, identifier, isLoading, password, performLogin]);

  const handleProviderLogin = useCallback(
    (provider: AuthProvider) => {
      if (isLoading) return;
      guard(() => void providerSignIn.start(provider));
    },
    [guard, isLoading, providerSignIn]
  );

  const createAccount = (
    <View style={[styles.newHere, landscape && styles.newHereLandscape]}>
      <PidroText role="body" tone="soft" style={metrics.body}>
        {t('auth.new_here')}
      </PidroText>
      <TextLink
        label={t('auth.create')}
        size={metrics.link}
        style={styles.newHereLink}
        onPress={() => router.push('/(auth)/register')}
      />
    </View>
  );

  return (
    <AuthFlowScreen
      testID="login-screen"
      headerTitle={t('auth.sign_in')}
      onBack={goBack}
      aside={
        <View style={[styles.aside, landscape && styles.asideLandscape]}>
          {createAccount}
          <TextLink
            label={t('invite.manual.entry')}
            size={14}
            style={landscape ? styles.codeLinkLandscape : undefined}
            onPress={() => router.push('/join-code' as Href)}
          />
        </View>
      }>
      <AuthFlowWindow testID="auth-window">
        {error ? <AuthFlowNotice>{error}</AuthFlowNotice> : null}
        {knownAccount ? <AuthFlowNotice tone="info">{t('auth.email_known')}</AuthFlowNotice> : null}
        <AuthProviderButtons
          showEmail={false}
          showEmailDivider
          direction={landscape ? 'row' : 'column'}
          availability={fixture === 'providers' ? { apple: true, facebook: true } : undefined}
          onApple={() => handleProviderLogin('apple')}
          onFacebook={() => handleProviderLogin('facebook')}
        />
        {providerSignIn.notice ? <AuthFlowNotice>{providerSignIn.notice}</AuthFlowNotice> : null}
        <View style={[styles.fields, landscape && styles.fieldsLandscape]}>
          <View style={landscape && styles.fieldLandscape}>
            <Input
              ref={identifierRef}
              label={t('auth.identifier')}
              placeholder={t('auth.email_placeholder')}
              value={identifier}
              onChangeText={(next) => {
                setIdentifier(next);
                clearValidationError('identifier');
              }}
              error={validationErrors.identifier ? t(validationErrors.identifier) : undefined}
              style={inputStyle}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              importantForAutofill="yes"
              keyboardType="email-address"
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
              label={t('auth.password')}
              value={password}
              onChangeText={(next) => {
                setPassword(next);
                clearValidationError('password');
              }}
              error={validationErrors.password ? t(validationErrors.password) : undefined}
              style={inputStyle}
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
        <TextLink
          label={t('auth.forgot')}
          size={layout === 'tablet' ? 15 : 14}
          style={styles.forgot}
          onPress={() =>
            router.push({
              pathname: '/(auth)/forgot-password',
              params: identifier.trim() ? { identifier: identifier.trim() } : {},
            })
          }
        />
        <AuthFlowButton label={t('auth.sign_in')} loading={isLoading} onPress={handleLogin} />
      </AuthFlowWindow>
      {modal}
    </AuthFlowScreen>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: PidroSpacing.sm,
  },
  fieldsLandscape: {
    flexDirection: 'row',
  },
  fieldLandscape: {
    minWidth: 0,
    flex: 1,
  },
  // The 44px target would open a hole between the fields and the button;
  // pull it in so the link sits as close as the design draws it.
  forgot: {
    alignSelf: 'flex-end',
    paddingHorizontal: 2,
    marginVertical: -8,
  },
  aside: {
    alignItems: 'center',
  },
  asideLandscape: {
    alignItems: 'flex-start',
  },
  newHere: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newHereLandscape: {
    justifyContent: 'flex-start',
    marginLeft: 12,
  },
  newHereLink: {
    paddingHorizontal: 6,
  },
  codeLinkLandscape: {
    marginTop: -8,
  },
});
