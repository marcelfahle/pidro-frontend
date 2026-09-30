import { useCallback, useMemo, useState } from 'react';
import { Keyboard, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { classicApi, type ClassicClaimMethod, type ClassicVerification } from '@/api/classic';
import { AuthProviderButtons } from '@/components/auth/AuthProviderButtons';
import { BevelButton } from '@/components/ui/BevelButton';
import { Input } from '@/components/ui/Input';
import { PidroText } from '@/components/ui/PidroText';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Surface } from '@/components/ui/Surface';
import { PidroColors, PidroLayout, PidroSpacing } from '@/design/tokens';
import { getInstallId } from '@/features/invites/installId';
import { requestNativeSocialCredential } from '@/features/auth/socialProviders';
import { takePendingClassicClaim } from '@/features/auth/classicFound';
import { useAuthStore } from '@/stores/auth';
import { apiErrorInfo } from '@/utils/apiErrors';

type Field = 'login' | 'classicPassword' | 'username' | 'email' | 'password' | 'displayName';
type Fixture = 'method' | 'preview' | 'rename' | 'already-claimed';

const FIXTURE_PREVIEW: ClassicVerification = {
  ticket: 'fixture-ticket',
  expires_at: '2099-01-01T00:00:00Z',
  classic: {
    name: 'CardShark',
    games_played: 1284,
    level: 42,
    member_since: '2012-04-03T00:00:00Z',
    name_allowed: true,
  },
};

function memberSince(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return String(date.getUTCFullYear());
}

export default function ClaimClassicScreen() {
  const router = useRouter();
  const { fixture: fixtureParam } = useLocalSearchParams<{ fixture?: string }>();
  const fixture = fixtureParam as Fixture | undefined;
  const { width, height } = useWindowDimensions();
  const compactLandscape = width > height && height < PidroLayout.compactHeight;
  const user = useAuthStore((state) => state.user);
  const setSession = useAuthStore((state) => state.setSession);
  const [providerHandoff] = useState(takePendingClassicClaim);
  const fixtureVerification = useMemo(() => {
    if (!fixture || fixture === 'method') return null;
    return {
      ...FIXTURE_PREVIEW,
      classic: {
        ...FIXTURE_PREVIEW.classic,
        ...(fixture === 'rename' ? { name: 'Old Name', name_allowed: false } : {}),
      },
    };
  }, [fixture]);
  const [method, setMethod] = useState<ClassicClaimMethod | null>(
    providerHandoff?.method ?? (fixtureVerification ? 'password' : null)
  );
  const [verification, setVerification] = useState<ClassicVerification | null>(
    providerHandoff?.verification ?? fixtureVerification
  );
  const [login, setLogin] = useState('');
  const [classicPassword, setClassicPassword] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [fields, setFields] = useState<Partial<Record<Field, string>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    fixture === 'already-claimed' ? 'This Classic account belongs to another account.' : null
  );
  const [canSignIn, setCanSignIn] = useState(fixture === 'already-claimed');

  const clearField = useCallback((field: Field) => {
    setFields((current) => ({ ...current, [field]: undefined }));
    setError(null);
    setCanSignIn(false);
  }, []);

  const finishVerification = useCallback(
    (result: ClassicVerification, nextMethod: ClassicClaimMethod) => {
      setMethod(nextMethod);
      setVerification(result);
      setDisplayName(result.classic.name_allowed ? (result.classic.name ?? '') : '');
      setError(null);
    },
    []
  );

  const reportRequestError = useCallback((requestError: unknown, fallback: string) => {
    const info = apiErrorInfo(requestError);
    setCanSignIn(info.code === 'ALREADY_CLAIMED' && info.action?.type === 'sign_in');
    if (info.code === 'PROVIDER_UNAVAILABLE') {
      setError('Classic or the sign-in provider is temporarily unavailable. Try again.');
    } else if (info.code === 'CLAIM_TICKET_EXPIRED') {
      setVerification(null);
      setError('That verification expired. Verify your Classic account again.');
    } else {
      setError(info.detail || fallback);
    }
  }, []);

  const verifyPassword = useCallback(async () => {
    const nextFields: Partial<Record<Field, string>> = {};
    if (!login.trim()) nextFields.login = 'Enter your Classic username or email.';
    if (!classicPassword) nextFields.classicPassword = 'Enter your Classic password.';
    setFields(nextFields);
    if (Object.keys(nextFields).length) return;
    Keyboard.dismiss();
    setBusy(true);
    setError(null);
    try {
      const installId = user ? undefined : await getInstallId();
      const result = await classicApi.verify({
        method: 'password',
        login: login.trim(),
        password: classicPassword,
        install_id: installId,
      });
      finishVerification(result, 'password');
    } catch (requestError) {
      reportRequestError(requestError, 'We could not verify that Classic account. Try again.');
    } finally {
      setBusy(false);
    }
  }, [classicPassword, finishVerification, login, reportRequestError, user]);

  const verifyProvider = useCallback(
    async (provider: 'apple' | 'facebook') => {
      setBusy(true);
      setError(null);
      try {
        const credential = await requestNativeSocialCredential(provider);
        if (credential.status === 'cancelled') return;
        if (credential.status === 'failure') {
          setError(credential.message);
          return;
        }
        const installId = user ? undefined : await getInstallId();
        const result = await classicApi.verify(
          provider === 'apple'
            ? { method: 'apple', identity_token: credential.token, install_id: installId }
            : { method: 'facebook', access_token: credential.token, install_id: installId }
        );
        finishVerification(result, provider);
      } catch (requestError) {
        reportRequestError(
          requestError,
          `We could not verify that ${provider} account. Try again.`
        );
      } finally {
        setBusy(false);
      }
    },
    [finishVerification, reportRequestError, user]
  );

  const confirmClaim = useCallback(async () => {
    if (!verification || !method || fixture) return;
    const nextFields: Partial<Record<Field, string>> = {};
    if (!user) {
      if (username.trim().length < 3) nextFields.username = 'Use at least 3 characters.';
      if (method === 'password') {
        if (!email.trim()) nextFields.email = 'Enter an email address.';
        if (password.length < 8) nextFields.password = 'Use at least 8 characters.';
      }
    }
    if (!verification.classic.name_allowed && displayName.trim().length < 2) {
      nextFields.displayName = 'Choose a public name with at least 2 characters.';
    }
    setFields(nextFields);
    if (Object.keys(nextFields).length) return;
    Keyboard.dismiss();
    setBusy(true);
    setError(null);
    try {
      const installId = user ? undefined : await getInstallId();
      const account = {
        ...(!user ? { username: username.trim() } : {}),
        ...(!user && method === 'password' ? { email: email.trim(), password } : {}),
        ...(!verification.classic.name_allowed ? { display_name: displayName.trim() } : {}),
      };
      const result = await classicApi.claim({
        ticket: verification.ticket,
        install_id: installId,
        ...(Object.keys(account).length ? { account } : {}),
      });
      setSession({ accessToken: result.token, user: result.user });
      router.replace({
        pathname: '/profile',
        params: { classicClaimed: result.user.guest ? 'guest' : 'yes' },
      });
    } catch (requestError) {
      reportRequestError(requestError, 'We could not claim that Classic account. Try again.');
    } finally {
      setBusy(false);
    }
  }, [
    displayName,
    email,
    fixture,
    method,
    password,
    reportRequestError,
    router,
    setSession,
    user,
    username,
    verification,
  ]);

  const resetVerification = () => {
    setVerification(null);
    setError(null);
    setCanSignIn(false);
  };

  return (
    <ScreenShell scroll compact testID="claim-classic-screen">
      <View style={styles.page}>
        <ScreenHeader
          title="Claim Pidro Classic"
          subtitle="Bring your Classic name and games into Pidro."
          onBack={() => router.back()}
        />

        {error ? (
          <Surface variant="subtle" style={styles.error} accessibilityRole="alert">
            <PidroText role="metadata" tone="danger" align="center">
              {error}
            </PidroText>
            {canSignIn ? (
              <BevelButton
                label="Sign in to that account"
                material="glass"
                size="sm"
                fullWidth
                onPress={() => router.replace('/(auth)/login')}
              />
            ) : null}
          </Surface>
        ) : null}

        {!verification ? (
          <Surface variant="window" padded style={styles.panel}>
            <View style={styles.heading}>
              <PidroText role="title" tone="gold" align="center">
                How did you use Classic?
              </PidroText>
              <PidroText role="body" tone="soft" align="center">
                Verify the account you owned. Nothing changes until you confirm the preview.
              </PidroText>
            </View>

            {fixture && Platform.OS === 'web' ? (
              <View style={styles.providerFixtures}>
                <BevelButton
                  label="Continue with Apple"
                  material="glass"
                  size="md"
                  fullWidth
                  onPress={() => undefined}
                />
                <BevelButton
                  label="Continue with Facebook"
                  material="glass"
                  size="md"
                  fullWidth
                  onPress={() => undefined}
                />
              </View>
            ) : (
              <AuthProviderButtons
                showEmail={false}
                onApple={() => void verifyProvider('apple')}
                onFacebook={() => void verifyProvider('facebook')}
              />
            )}

            <View style={styles.divider}>
              <View style={styles.rule} />
              <PidroText role="metadata" tone="muted">
                or
              </PidroText>
              <View style={styles.rule} />
            </View>

            {method === 'password' ? (
              <View style={[styles.form, compactLandscape && styles.formLandscape]}>
                <Input
                  containerClassName={compactLandscape ? 'w-[48%] flex-grow' : undefined}
                  label="Classic username or email"
                  value={login}
                  error={fields.login}
                  editable={!busy}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={(value) => {
                    setLogin(value);
                    clearField('login');
                  }}
                />
                <Input
                  containerClassName={compactLandscape ? 'w-[48%] flex-grow' : undefined}
                  label="Classic password"
                  value={classicPassword}
                  error={fields.classicPassword}
                  editable={!busy}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                  revealPassword
                  returnKeyType="go"
                  onSubmitEditing={() => void verifyPassword()}
                  onChangeText={(value) => {
                    setClassicPassword(value);
                    clearField('classicPassword');
                  }}
                />
                <BevelButton
                  label="Verify Classic account"
                  material="wood"
                  size="md"
                  fullWidth
                  loading={busy}
                  onPress={() => void verifyPassword()}
                />
              </View>
            ) : (
              <BevelButton
                label="Classic username & password"
                material="glass"
                size="md"
                fullWidth
                disabled={busy}
                onPress={() => setMethod('password')}
              />
            )}
          </Surface>
        ) : (
          <Surface variant="window" padded style={styles.panel}>
            <View style={styles.heading}>
              <PidroText role="title" tone="gold" align="center">
                Classic account found
              </PidroText>
              <PidroText role="body" tone="soft" align="center">
                Check this is yours before bringing it into your current player.
              </PidroText>
            </View>

            <Surface variant="plaque" padded style={styles.preview}>
              {verification.classic.name_allowed && verification.classic.name ? (
                <PidroText role="title" align="center">
                  {verification.classic.name}
                </PidroText>
              ) : (
                <PidroText role="label" tone="muted" align="center">
                  Classic name kept private
                </PidroText>
              )}
              <View style={styles.stats}>
                <Stat
                  label="Games played"
                  value={verification.classic.games_played.toLocaleString()}
                />
                <Stat label="Classic level" value={String(verification.classic.level)} />
                <Stat label="Member since" value={memberSince(verification.classic.member_since)} />
              </View>
            </Surface>

            {!verification.classic.name_allowed ? (
              <View style={styles.form}>
                <PidroText role="body" tone="soft">
                  That name can&apos;t be shown in the new game. Pick a new one; your Classic name
                  stays yours.
                </PidroText>
                <Input
                  label="New public name"
                  value={displayName}
                  error={fields.displayName}
                  maxLength={20}
                  editable={!busy}
                  onChangeText={(value) => {
                    setDisplayName(value);
                    clearField('displayName');
                  }}
                />
              </View>
            ) : null}

            {!user ? (
              <View style={styles.form}>
                <PidroText role="label">Create your Pidro account</PidroText>
                <Input
                  label="Username"
                  value={username}
                  error={fields.username}
                  maxLength={20}
                  editable={!busy}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={(value) => {
                    setUsername(value);
                    clearField('username');
                  }}
                />
                {method === 'password' ? (
                  <>
                    <Input
                      label="Email"
                      value={email}
                      error={fields.email}
                      editable={!busy}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      onChangeText={(value) => {
                        setEmail(value);
                        clearField('email');
                      }}
                    />
                    <Input
                      label="New Pidro password"
                      value={password}
                      error={fields.password}
                      editable={!busy}
                      secureTextEntry
                      revealPassword
                      onChangeText={(value) => {
                        setPassword(value);
                        clearField('password');
                      }}
                    />
                  </>
                ) : null}
              </View>
            ) : null}

            {!canSignIn ? (
              <View style={styles.actions}>
                <BevelButton
                  label="Back"
                  material="glass"
                  size="sm"
                  fullWidth
                  disabled={busy}
                  onPress={resetVerification}
                />
                <BevelButton
                  label={user ? 'Claim this Classic account' : 'Create account and claim'}
                  material="wood"
                  size="md"
                  fullWidth
                  loading={busy}
                  onPress={() => void confirmClaim()}
                />
              </View>
            ) : null}
          </Surface>
        )}
      </View>
    </ScreenShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <PidroText role="title" tone="gold" align="center" numberOfLines={1}>
        {value}
      </PidroText>
      <PidroText role="metadata" tone="muted" align="center">
        {label}
      </PidroText>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    justifyContent: 'center',
    gap: PidroSpacing.md,
  },
  panel: {
    width: '100%',
    gap: PidroSpacing.md,
  },
  heading: {
    gap: PidroSpacing.xxs,
  },
  form: {
    gap: PidroSpacing.md,
  },
  formLandscape: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  providerFixtures: {
    gap: PidroSpacing.sm,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.sm,
  },
  rule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: PidroColors.border,
  },
  error: {
    gap: PidroSpacing.sm,
    borderColor: PidroColors.dangerBorder,
    padding: PidroSpacing.sm,
  },
  preview: {
    gap: PidroSpacing.md,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: PidroSpacing.xs,
  },
  stat: {
    minWidth: 0,
    flex: 1,
    justifyContent: 'center',
    gap: PidroSpacing.xxs,
  },
  actions: {
    gap: PidroSpacing.sm,
  },
});
