import { useCallback, useMemo, useState } from 'react';
import { Keyboard, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import {
  classicApi,
  facebookCredentialRequest,
  type ClassicClaimMethod,
  type ClassicVerification,
} from '@/api/classic';
import * as authApi from '@/api/auth';
import { AuthProviderButtons } from '@/components/auth/AuthProviderButtons';
import { BevelButton } from '@/components/ui/BevelButton';
import { Input } from '@/components/ui/Input';
import { PidroText } from '@/components/ui/PidroText';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Surface } from '@/components/ui/Surface';
import { TextLink } from '@/components/ui/TextLink';
import { PidroColors, PidroLayout, PidroSpacing } from '@/design/tokens';
import { getInstallId } from '@/features/invites/installId';
import { requestNativeSocialCredential } from '@/features/auth/socialProviders';
import { takePendingClassicClaim } from '@/features/auth/classicFound';
import { runGuestSave } from '@/features/auth/saveGuest';
import { storedAgeTerms } from '@/features/onboarding/ageTerms';
import { authenticatedEntryDestination } from '@/navigation/initialRoute';
import { useAgeGateStore } from '@/stores/ageGate';
import { useAuthStore } from '@/stores/auth';
import { usePendingInviteStore } from '@/stores/pendingInvite';
import { apiErrorInfo } from '@/utils/apiErrors';
import { formatNumber, useTranslation, type TranslationKey } from '@/i18n';
import { localizedError } from '@pidro/shared';

// Ticket errors a retry can't fix: start over with a fresh verification.
const DEAD_TICKET_CODES = new Set([
  'CLAIM_TICKET_EXPIRED',
  'INVALID_CLAIM_TICKET',
  'CLAIM_TICKET_BINDING_MISMATCH',
]);

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
  already_claimed: null,
};

const SIGNED_IN_WITH = {
  password: 'auth.signed_password',
  apple: 'auth.signed_apple',
  facebook: 'auth.signed_facebook',
} as const;

function memberSince(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return String(date.getUTCFullYear());
}

export default function ClaimClassicScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { fixture: fixtureParam, from } = useLocalSearchParams<{
    fixture?: string;
    from?: string;
  }>();
  const fixture = (__DEV__ ? fixtureParam : undefined) as Fixture | undefined;
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
      ...(fixture === 'already-claimed'
        ? { already_claimed: { sign_in_method: 'password' as const } }
        : {}),
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
  const [error, setError] = useState<TranslationKey | null>(null);
  const [requestFailure, setRequestFailure] = useState<{
    error: unknown;
    fallback: TranslationKey;
  } | null>(null);
  const [errorProvider, setErrorProvider] = useState('');
  const [canSignIn, setCanSignIn] = useState(false);
  const alreadyClaimed = verification?.already_claimed ?? null;
  // A guest's password claim sets the email and password the account is recovered with.
  const guestCredentials = Boolean(user?.guest) && method === 'password';
  const needsCredentials = (!user && method === 'password') || guestCredentials;

  const clearField = useCallback((field: Field) => {
    setFields((current) => ({ ...current, [field]: undefined }));
    setError(null);
    setRequestFailure(null);
    setCanSignIn(false);
  }, []);

  const finishVerification = useCallback(
    (result: ClassicVerification, nextMethod: ClassicClaimMethod) => {
      setMethod(nextMethod);
      setVerification(result);
      setDisplayName(result.classic.name_allowed ? (result.classic.name ?? '') : '');
      setError(null);
      setRequestFailure(null);
    },
    []
  );

  const reportRequestError = useCallback(
    (requestError: unknown, fallback: TranslationKey, provider?: 'apple' | 'facebook') => {
      const info = apiErrorInfo(requestError);
      setError(null);
      setRequestFailure(null);
      setErrorProvider(provider === 'apple' ? 'Apple' : 'Facebook');
      // Signing in from here would replace whoever is signed in on this phone
      // (a guest's games included), so only offer it when nobody is.
      setCanSignIn(!user && info.code === 'ALREADY_CLAIMED' && info.action?.type === 'sign_in');
      if (info.code === 'PROVIDER_UNAVAILABLE') {
        setError('auth.provider_unavailable');
      } else if (DEAD_TICKET_CODES.has(info.code ?? '')) {
        setVerification(null);
        setError('auth.verification_invalid');
      } else if (provider && info.code === 'INVALID_CREDENTIALS') {
        setError('auth.classic_provider_missing');
      } else if (info.code === 'email' || info.code === 'EMAIL_TAKEN') {
        setFields({ email: 'auth.valid_email' });
      } else if (info.code === 'password') {
        setFields({ password: 'auth.password_min' });
      } else if (info.code === 'ALREADY_CLAIMED' && user) {
        setError('auth.classic_linked_other');
      } else {
        setRequestFailure({ error: requestError, fallback });
      }
    },
    [user]
  );

  const verifyPassword = useCallback(async () => {
    const nextFields: Partial<Record<Field, string>> = {};
    if (!login.trim()) nextFields.login = 'auth.enter_classic_identifier';
    if (!classicPassword) nextFields.classicPassword = 'auth.enter_classic_password';
    setFields(nextFields);
    if (Object.keys(nextFields).length) return;
    Keyboard.dismiss();
    setBusy(true);
    setError(null);
    setRequestFailure(null);
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
      reportRequestError(requestError, 'auth.classic_verify_failed');
    } finally {
      setBusy(false);
    }
  }, [classicPassword, finishVerification, login, reportRequestError, user]);

  const verifyProvider = useCallback(
    async (provider: 'apple' | 'facebook') => {
      setBusy(true);
      setError(null);
      setRequestFailure(null);
      try {
        const credential = await requestNativeSocialCredential(provider);
        if (credential.status === 'cancelled') return;
        if (credential.status === 'failure') {
          setError(credential.messageKey ?? 'auth.social_failed');
          setErrorProvider(provider === 'apple' ? 'Apple' : 'Facebook');
          return;
        }
        const installId = user ? undefined : await getInstallId();
        const result = await classicApi.verify(
          credential.provider === 'apple'
            ? { method: 'apple', identity_token: credential.token, install_id: installId }
            : {
                method: 'facebook',
                ...facebookCredentialRequest(credential.credential),
                install_id: installId,
              }
        );
        finishVerification(result, provider);
      } catch (requestError) {
        reportRequestError(requestError, 'auth.classic_verify_failed', provider);
      } finally {
        setBusy(false);
      }
    },
    [finishVerification, reportRequestError, user]
  );

  const confirmClaim = useCallback(async () => {
    if (!verification || !method || fixture) return;
    const nextFields: Partial<Record<Field, string>> = {};
    if (!user && username.trim().length < 3) nextFields.username = 'auth.username_min';
    if (needsCredentials) {
      if (!email.trim()) nextFields.email = 'auth.enter_an_email';
      if (password.length < 8) nextFields.password = 'auth.password_min';
    }
    if (!verification.classic.name_allowed && displayName.trim().length < 2) {
      nextFields.displayName = 'auth.public_name_min';
    }
    setFields(nextFields);
    if (Object.keys(nextFields).length) return;
    Keyboard.dismiss();
    setBusy(true);
    setError(null);
    setRequestFailure(null);
    try {
      const installId = user ? undefined : await getInstallId();
      const account = {
        ...(!user ? { username: username.trim() } : {}),
        ...(needsCredentials ? { email: email.trim(), password } : {}),
        ...(!verification.classic.name_allowed ? { display_name: displayName.trim() } : {}),
      };
      const claim = () =>
        classicApi.claim({
          ticket: verification.ticket,
          install_id: installId,
          ...(Object.keys(account).length ? { account } : {}),
          ...storedAgeTerms(),
        });
      if (guestCredentials) {
        // This claim saves the guest as Save your progress does, retiring the guest's token,
        // so an answer lost after the server saved is recovered by signing in.
        let refusal: unknown = null;
        const saved = await runGuestSave({
          original: useAuthStore.getState(),
          displayName: '',
          email: email.trim(),
          password,
          upgrade: () =>
            claim().catch((claimError: unknown) => {
              refusal = claimError;
              throw claimError;
            }),
          login: (identifier, accountPassword) =>
            authApi.login(identifier, accountPassword, storedAgeTerms()),
          getSession: useAuthStore.getState,
          install: (response) => setSession({ accessToken: response.token, user: response.user }),
          setSessionPreservation: (preserve) =>
            useAuthStore.getState().setPreserveSessionOnUnauthorized(preserve),
        });
        if (!saved.ok) {
          if (refusal && !saved.error.uncertain) {
            reportRequestError(refusal, 'auth.classic_claim_failed');
          } else {
            setError(saved.error.uncertain ? 'auth.save_uncertain' : 'auth.save_failed');
          }
          return;
        }
      } else {
        const result = await claim();
        setSession({ accessToken: result.token, user: result.user });
      }
      const claimed = useAuthStore.getState().user;
      if (!claimed) return;
      const pendingInvite = usePendingInviteStore.getState().pendingInvite;
      const destination = authenticatedEntryDestination(
        pendingInvite,
        useAgeGateStore.getState().ageBand,
        claimed
      );
      if (destination !== '/home') {
        router.replace(destination as Href);
      } else if (from === 'friends' && !claimed.guest) {
        router.replace('/friends');
      } else {
        router.replace({
          pathname: '/profile',
          params: { classicClaimed: claimed.guest ? 'guest' : 'yes' },
        });
      }
    } catch (requestError) {
      reportRequestError(requestError, 'auth.classic_claim_failed');
    } finally {
      setBusy(false);
    }
  }, [
    displayName,
    email,
    fixture,
    from,
    guestCredentials,
    method,
    needsCredentials,
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
    setRequestFailure(null);
    setCanSignIn(false);
  };

  const credentialFields = (
    <>
      <Input
        label={t('auth.email')}
        value={email}
        error={fields.email ? t(fields.email as TranslationKey) : undefined}
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
        label={t('auth.new_pidro_password')}
        value={password}
        error={fields.password ? t(fields.password as TranslationKey, { count: 8 }) : undefined}
        editable={!busy}
        secureTextEntry
        revealPassword
        onChangeText={(value) => {
          setPassword(value);
          clearField('password');
        }}
      />
    </>
  );

  return (
    <ScreenShell scroll compact testID="claim-classic-screen">
      <View style={styles.page}>
        <ScreenHeader
          title={t('auth.claim')}
          subtitle={t('auth.claim_intro')}
          onBack={() => router.back()}
        />

        {error || requestFailure ? (
          <Surface variant="subtle" style={styles.error} accessibilityRole="alert">
            <PidroText role="metadata" tone="danger" align="center">
              {requestFailure
                ? localizedError(requestFailure.error, requestFailure.fallback)
                : error
                  ? t(error, { provider: errorProvider })
                  : null}
            </PidroText>
            {canSignIn ? (
              <BevelButton
                label={t('auth.sign_in_that')}
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
                {t('auth.claim_method')}
              </PidroText>
              <PidroText role="body" tone="soft" align="center">
                {t('auth.claim_verify_note')}
              </PidroText>
            </View>

            {fixture && Platform.OS === 'web' ? (
              <View style={styles.providerFixtures}>
                <BevelButton
                  label={t('auth.apple')}
                  material="glass"
                  size="md"
                  fullWidth
                  onPress={() => undefined}
                />
                <BevelButton
                  label={t('auth.facebook')}
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
                {t('auth.or')}
              </PidroText>
              <View style={styles.rule} />
            </View>

            {method === 'password' ? (
              <View style={[styles.form, compactLandscape && styles.formLandscape]}>
                <Input
                  containerClassName={compactLandscape ? 'w-[48%] flex-grow' : undefined}
                  label={t('auth.classic_identifier')}
                  value={login}
                  error={fields.login ? t(fields.login as TranslationKey) : undefined}
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
                  label={t('auth.classic_password')}
                  value={classicPassword}
                  error={
                    fields.classicPassword ? t(fields.classicPassword as TranslationKey) : undefined
                  }
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
                <TextLink
                  label={t('auth.classic_forgot')}
                  size={14}
                  style={styles.forgot}
                  onPress={() =>
                    router.push({
                      pathname: '/(auth)/classic-forgot',
                      params: login.trim() ? { login: login.trim() } : {},
                    })
                  }
                />
                <BevelButton
                  label={t('auth.classic_verify')}
                  material="wood"
                  size="md"
                  fullWidth
                  loading={busy}
                  onPress={() => void verifyPassword()}
                />
              </View>
            ) : (
              <BevelButton
                label={t('auth.classic_credentials')}
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
                {t('auth.classic_found')}
              </PidroText>
              {alreadyClaimed ? null : (
                <PidroText role="body" tone="soft" align="center">
                  {t('auth.classic_check')}
                </PidroText>
              )}
            </View>

            <Surface variant="plaque" padded style={styles.preview}>
              {verification.classic.name_allowed && verification.classic.name ? (
                <PidroText role="title" align="center">
                  {verification.classic.name}
                </PidroText>
              ) : (
                <PidroText role="label" tone="muted" align="center">
                  {t('auth.classic_private')}
                </PidroText>
              )}
              <View style={styles.stats}>
                <Stat
                  label={t('auth.games_played')}
                  value={formatNumber(verification.classic.games_played)}
                />
                <Stat
                  label={t('auth.classic_level')}
                  value={formatNumber(verification.classic.level)}
                />
                {verification.classic.member_since ? (
                  <Stat
                    label={t('auth.member_since')}
                    value={memberSince(verification.classic.member_since)}
                  />
                ) : null}
              </View>
            </Surface>

            {alreadyClaimed ? (
              <View style={styles.form}>
                <PidroText role="body" tone="soft" align="center">
                  {t('auth.classic_linked')}
                </PidroText>
                {!user ? (
                  <>
                    {alreadyClaimed.sign_in_method ? (
                      <PidroText role="metadata" tone="muted" align="center">
                        {t(SIGNED_IN_WITH[alreadyClaimed.sign_in_method])}
                      </PidroText>
                    ) : null}
                    <BevelButton
                      label={t('auth.sign_in_that')}
                      material="wood"
                      size="md"
                      fullWidth
                      onPress={() => router.replace('/(auth)/login')}
                    />
                  </>
                ) : null}
                <BevelButton
                  label={t('auth.back')}
                  material="glass"
                  size="sm"
                  fullWidth
                  onPress={resetVerification}
                />
              </View>
            ) : null}

            {!alreadyClaimed && !verification.classic.name_allowed ? (
              <View style={styles.form}>
                <PidroText role="body" tone="soft">
                  {t('auth.classic_rename')}
                </PidroText>
                <Input
                  label={t('auth.new_public_name')}
                  value={displayName}
                  error={fields.displayName ? t(fields.displayName as TranslationKey) : undefined}
                  maxLength={20}
                  editable={!busy}
                  onChangeText={(value) => {
                    setDisplayName(value);
                    clearField('displayName');
                  }}
                />
              </View>
            ) : null}

            {!alreadyClaimed && !user ? (
              <View style={styles.form}>
                <PidroText role="label">{t('auth.create_your_account')}</PidroText>
                <Input
                  label={t('auth.username')}
                  value={username}
                  error={fields.username ? t(fields.username as TranslationKey) : undefined}
                  maxLength={20}
                  editable={!busy}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={(value) => {
                    setUsername(value);
                    clearField('username');
                  }}
                />
                {method === 'password' ? credentialFields : null}
              </View>
            ) : null}

            {!alreadyClaimed && guestCredentials ? (
              <View style={styles.form}>
                {credentialFields}
                <PidroText role="metadata" tone="muted">
                  {t('auth.guest_games')}
                </PidroText>
              </View>
            ) : null}

            {!alreadyClaimed && !canSignIn ? (
              <View style={styles.actions}>
                <BevelButton
                  label={t('auth.back')}
                  material="glass"
                  size="sm"
                  fullWidth
                  disabled={busy}
                  onPress={resetVerification}
                />
                <BevelButton
                  label={t(user ? 'auth.claim_this' : 'auth.create_claim')}
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
  // Full width so it breaks onto its own line beside the landscape fields.
  forgot: {
    width: '100%',
    alignItems: 'flex-end',
    paddingHorizontal: 2,
    marginVertical: -PidroSpacing.xs,
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
