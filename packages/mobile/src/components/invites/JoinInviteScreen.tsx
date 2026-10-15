import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import type { InviteArrivalSource, InvitePreview } from '@pidro/shared';
import { normalizeInviteCode, publicPlayerName } from '@pidro/shared';
import { captureAnalytics } from '@/analytics/PostHogAnalytics';
import { createGuest } from '@/api/auth';
import { invitesApi } from '@/api/invites';
import { lobbyApi } from '@/api/lobby';
import { BevelButton } from '@/components/ui/BevelButton';
import { RuleSetChip } from '@/components/rules/RuleSet';
import { Input } from '@/components/ui/Input';
import { PidroText } from '@/components/ui/PidroText';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Surface } from '@/components/ui/Surface';
import { PidroSpacing } from '@/design/tokens';
import {
  classifyInviteState,
  resolveJoinFailure,
  validateDisplayName,
} from '@/features/invites/joinFlow';
import { invitePlatform } from '@/features/invites/platform';
import { getInstallId } from '@/features/invites/installId';
import { storedAgeTerms } from '@/features/onboarding/ageTerms';
import { useTranslation, formatNumber, type TranslationKey } from '@/i18n';
import { localizedError } from '@/utils/apiErrors';
import { authenticatedEntryDestination } from '@/navigation/initialRoute';
import { useAgeGateStore } from '@/stores/ageGate';
import { useAuthStore } from '@/stores/auth';
import { useLobbyStore } from '@/stores/lobby';
import { usePendingInviteStore } from '@/stores/pendingInvite';

interface Props {
  code: string;
  source?: InviteArrivalSource;
  fixture?: InvitePreview | null;
}

const stateMessageKeys = {
  full: 'invite.state.full',
  locked: 'invite.state.locked',
  started: 'invite.state.started',
  closed: 'invite.state.closed',
  expired: 'invite.state.expired',
  revoked: 'invite.state.revoked',
} as const;

export function JoinInviteScreen({ code, source, fixture }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const compactLandscape = width > height && height < 500;
  const authHydrated = useAuthStore((state) => state.hydrated);
  const user = useAuthStore((state) => state.user);
  const setSession = useAuthStore((state) => state.setSession);
  const pendingHydrated = usePendingInviteStore((state) => state.hydrated);
  const setPendingInvite = usePendingInviteStore((state) => state.setPendingInvite);
  const clearPendingInvite = usePendingInviteStore((state) => state.clearPendingInvite);
  const upsertRoom = useLobbyStore((state) => state.upsertLobbyRoom);
  const [preview, setPreview] = useState<InvitePreview | null>(fixture ?? null);
  const [loading, setLoading] = useState(!fixture);
  const [submitting, setSubmitting] = useState(false);
  const [displayName, setDisplayName] = useState(() => {
    if (user || !fixture?.label) return '';
    const normalized = validateDisplayName(fixture.label);
    return normalized.error ? '' : normalized.value;
  });
  const [nameError, setNameError] = useState<TranslationKey | null>(null);
  const [error, setError] = useState<{ cause?: unknown; fallback: TranslationKey } | null>(null);
  const [terminalLoadError, setTerminalLoadError] = useState(false);
  const [movedCode, setMovedCode] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const retriedRef = useRef(false);
  const redeemingRef = useRef(false);
  const guestCreatingRef = useRef(false);
  const routeActiveRef = useRef(true);
  const storesHydrated = authHydrated && pendingHydrated;

  useEffect(() => {
    routeActiveRef.current = true;
    return () => {
      routeActiveRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (pendingHydrated && !fixture) setPendingInvite(code, source);
  }, [code, fixture, pendingHydrated, setPendingInvite, source]);

  const loadPreview = useCallback(async () => {
    if (!pendingHydrated || fixture) return;
    try {
      const result = await invitesApi.preview(code);
      if (!routeActiveRef.current) return;
      setPreview(result);
      captureAnalytics('invite_previewed', {
        invite_state: result.state,
        arrival_source: source ?? 'direct',
        authenticated: Boolean(useAuthStore.getState().user),
      });
      if (!useAuthStore.getState().user && result.label) {
        const normalized = validateDisplayName(result.label);
        if (!normalized.error) setDisplayName((current) => current || normalized.value);
      }
      const availability = classifyInviteState(result.state);
      if (availability === 'terminal') clearPendingInvite();
      if (availability === 'moved') {
        const successor = result.next_code ? normalizeInviteCode(result.next_code) : null;
        if (successor) {
          setMovedCode(successor);
          setPendingInvite(successor, source);
        } else {
          clearPendingInvite();
        }
      }
    } catch (caught) {
      if (!routeActiveRef.current) return;
      const status = (caught as { response?: { status?: number } })?.response?.status;
      const terminal = status === 404 || status === 410;
      setTerminalLoadError(terminal);
      setError({
        cause: caught,
        fallback: terminal ? 'invite.state.unknown' : 'invite.error.network',
      });
      if (terminal) clearPendingInvite();
    } finally {
      if (routeActiveRef.current) setLoading(false);
    }
  }, [clearPendingInvite, code, fixture, pendingHydrated, setPendingInvite, source]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- route-bound async server preview
    void loadPreview();
  }, [loadPreview]);

  const retryPreview = useCallback(() => {
    setLoading(true);
    setError(null);
    setTerminalLoadError(false);
    void loadPreview();
  }, [loadPreview]);

  const followMovedInvite = useCallback(
    (successor: string) => {
      setPendingInvite(successor, source);
      const suffix = source ? `?source=${source}` : '';
      router.replace(`/join/${successor}${suffix}` as Href);
    },
    [router, setPendingInvite, source]
  );

  const applyStateChange = useCallback(
    (state: Exclude<InvitePreview['state'], 'open' | 'moved'>) => {
      setPreview((current) => (current ? { ...current, state } : current));
      setError(null);
      if (classifyInviteState(state) === 'terminal') clearPendingInvite();
    },
    [clearPendingInvite]
  );

  const redeem = useCallback(
    async (alreadyRetried: boolean) => {
      if (fixture || redeemingRef.current) return;
      redeemingRef.current = true;
      setSubmitting(true);
      setError(null);
      setConfirmLeave(false);
      try {
        const result = await invitesApi.redeem(code, {
          platform: invitePlatform(),
          ...(source ? { source } : {}),
        });
        if (!routeActiveRef.current) return;
        const currentUser = useAuthStore.getState().user;
        captureAnalytics('invite_joined', {
          arrival_source: source ?? 'direct',
          account_type: currentUser?.guest ? 'guest' : 'registered',
          seat_hint_honored: result.hint_honored,
        });
        upsertRoom(result.room, 'my_rejoinable');
        clearPendingInvite();
        if (!result.hint_honored) {
          void AccessibilityInfo.announceForAccessibility(t('invite.notice.seatChanged'));
        }
        router.replace(`/game/${result.room.code}` as Href);
      } catch (caught) {
        if (!routeActiveRef.current) return;
        const outcome = resolveJoinFailure(caught, alreadyRetried);
        if (outcome.kind === 'moved') {
          setMovedCode(outcome.nextCode);
          setPendingInvite(outcome.nextCode, source);
        } else if (outcome.kind === 'stateChanged') {
          applyStateChange(outcome.state);
        } else if (outcome.kind === 'confirmLeave') {
          setConfirmLeave(true);
          setError({ cause: caught, fallback: 'invite.error.alreadyInRoom' });
        } else if (outcome.kind === 'sessionCleared') {
          setError({ fallback: 'invite.error.sessionExpired' });
        } else {
          setError({ cause: caught, fallback: 'invite.error.redeem' });
        }
      } finally {
        redeemingRef.current = false;
        if (routeActiveRef.current) setSubmitting(false);
      }
    },
    [
      applyStateChange,
      clearPendingInvite,
      code,
      fixture,
      router,
      setPendingInvite,
      source,
      upsertRoom,
      t,
    ]
  );

  const submitGuest = useCallback(async () => {
    if (fixture || guestCreatingRef.current) return;
    const validation = validateDisplayName(displayName);
    if (validation.error) {
      setNameError(`invite.name.${validation.error}`);
      return;
    }

    guestCreatingRef.current = true;
    setNameError(null);
    setError(null);
    setSubmitting(true);
    try {
      const installId = await getInstallId().catch(() => undefined);
      const session = await createGuest({
        display_name: validation.value,
        invite_code: code,
        platform: invitePlatform(),
        ...(installId ? { install_id: installId } : {}),
        ...storedAgeTerms(),
      });
      if (!routeActiveRef.current) return;
      captureAnalytics('guest_created', { arrival_source: source ?? 'direct' });
      setSession({ accessToken: session.token, user: session.user });
      const destination = authenticatedEntryDestination(
        usePendingInviteStore.getState().pendingInvite,
        useAgeGateStore.getState().ageBand,
        session.user
      );
      if (destination === '/age') {
        router.replace(destination as Href);
        return;
      }
      await redeem(false);
    } catch (caught) {
      if (!routeActiveRef.current) return;
      const outcome = resolveJoinFailure(caught, false);
      if (outcome.kind === 'moved') {
        setMovedCode(outcome.nextCode);
        setPendingInvite(outcome.nextCode, source);
      } else if (outcome.kind === 'stateChanged') {
        applyStateChange(outcome.state);
      } else {
        setError({ cause: caught, fallback: 'invite.error.guest' });
      }
    } finally {
      guestCreatingRef.current = false;
      if (routeActiveRef.current) setSubmitting(false);
    }
  }, [
    applyStateChange,
    code,
    displayName,
    fixture,
    redeem,
    router,
    setPendingInvite,
    setSession,
    source,
  ]);

  const leaveAndRetry = useCallback(async () => {
    if (retriedRef.current) return;
    retriedRef.current = true;
    setSubmitting(true);
    // No table left to leave is the state the invite wanted; the join reports what is wrong.
    // After a failed leave the join asks again, so a player still seated can leave again.
    const left = await lobbyApi.leaveRoom('current').then(
      () => true,
      () => false
    );
    if (!routeActiveRef.current) return;
    if (!left) retriedRef.current = false;
    await redeem(left);
  }, [redeem]);

  const exit = useCallback(() => {
    if (submitting || guestCreatingRef.current || redeemingRef.current) return;
    routeActiveRef.current = false;
    clearPendingInvite();
    router.replace((user ? '/home' : '/welcome') as Href);
  }, [clearPendingInvite, router, submitting, user]);

  const availability = movedCode ? 'moved' : preview ? classifyInviteState(preview.state) : null;
  const flowLoading = loading || !storesHydrated;
  const messageKey =
    preview && preview.state !== 'open' && preview.state !== 'moved'
      ? stateMessageKeys[preview.state]
      : null;

  return (
    <ScreenShell scroll compact testID="join-invite-screen" contentStyle={styles.shell}>
      <ScreenHeader title={t('invite.title')} onBack={exit} />
      <Surface testID="join-invite-window" variant="window" padded style={styles.panel}>
        {flowLoading ? (
          <PidroText role="body" tone="soft" align="center" accessibilityLiveRegion="polite">
            {t('invite.loading')}
          </PidroText>
        ) : null}

        {!flowLoading && preview ? (
          <View style={styles.copy}>
            <PidroText role="display" align="center">
              {preview.host
                ? t('invite.hostedBy', { host: preview.host })
                : t('invite.hostedByUnknown')}
            </PidroText>
            <PidroText role="body" tone="soft" align="center">
              {t('invite.seats', {
                taken: formatNumber(preview.seats_taken),
                total: formatNumber(preview.seats_total),
              })}
            </PidroText>
            <RuleSetChip ruleSet={preview.config?.rule_set ?? 'finnish'} testID="invite-rule-set" />
            {messageKey ? (
              <PidroText role="body" tone="soft" align="center">
                {t(messageKey)}
              </PidroText>
            ) : null}
          </View>
        ) : null}

        {error ? (
          <PidroText role="body" tone="danger" align="center" accessibilityRole="alert">
            {localizedError(error.cause, error.fallback)}
          </PidroText>
        ) : null}

        {!flowLoading && terminalLoadError ? (
          <BevelButton label={t('invite.exit')} material="glass" onPress={exit} />
        ) : null}

        {!flowLoading &&
        !terminalLoadError &&
        (availability === 'recoverable' || (!preview && error)) ? (
          <BevelButton label={t('common.tryAgain')} onPress={retryPreview} loading={submitting} />
        ) : null}

        {!flowLoading && availability === 'moved' ? (
          movedCode ? (
            <BevelButton
              label={t('invite.followHost')}
              onPress={() => followMovedInvite(movedCode)}
            />
          ) : (
            <BevelButton label={t('invite.exit')} material="glass" onPress={exit} />
          )
        ) : null}

        {!flowLoading && availability === 'terminal' ? (
          <BevelButton label={t('invite.exit')} material="glass" onPress={exit} />
        ) : null}

        {!flowLoading && availability === 'joinable' && !user ? (
          <View style={styles.form}>
            <View style={[styles.joinRow, compactLandscape && styles.joinRowCompact]}>
              <View style={styles.nameField}>
                <Input
                  label={t('invite.name.label')}
                  placeholder={t('invite.name.placeholder')}
                  value={displayName}
                  onChangeText={setDisplayName}
                  error={nameError ? t(nameError) : undefined}
                  editable={!submitting}
                  maxLength={80}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="go"
                  onSubmitEditing={submitGuest}
                />
              </View>
              <BevelButton
                label={t('invite.join')}
                material="wood"
                size="md"
                onPress={submitGuest}
                loading={submitting}
                disabled={!displayName.trim()}
              />
            </View>
            <View style={styles.accountEntry}>
              {compactLandscape ? null : (
                <PidroText role="metadata" tone="muted" align="center">
                  {t('social.join_account')}
                </PidroText>
              )}
              <View style={styles.accountActions}>
                <BevelButton
                  label={t('social.create_account')}
                  material="glass"
                  size="sm"
                  onPress={() => router.push('/(auth)/register')}
                />
                <BevelButton
                  label={t('social.sign_in')}
                  material="glass"
                  size="sm"
                  onPress={() => router.push('/(auth)/login')}
                />
              </View>
            </View>
          </View>
        ) : null}

        {!flowLoading && availability === 'joinable' && user ? (
          <View style={styles.stack}>
            <PidroText role="body" tone="soft" align="center" accessibilityLiveRegion="polite">
              {submitting
                ? t('invite.joining')
                : t('invite.readyAs', {
                    name: publicPlayerName(user.username, t('social.player'), user.display_name),
                  })}
            </PidroText>
            {!confirmLeave ? (
              <BevelButton
                label={t('invite.join')}
                loading={submitting}
                onPress={() => void redeem(retriedRef.current)}
              />
            ) : null}
          </View>
        ) : null}

        {confirmLeave ? (
          <View style={styles.actions}>
            <BevelButton
              label={t('common.cancel')}
              material="glass"
              onPress={() => setConfirmLeave(false)}
            />
            <BevelButton
              label={t('invite.leaveAndJoin')}
              tone="danger"
              onPress={leaveAndRetry}
              loading={submitting}
            />
          </View>
        ) : null}
      </Surface>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  shell: {
    justifyContent: 'center',
    gap: PidroSpacing.md,
  },
  panel: {
    gap: PidroSpacing.md,
  },
  copy: {
    gap: PidroSpacing.xs,
  },
  form: {
    gap: PidroSpacing.md,
  },
  joinRow: {
    gap: PidroSpacing.md,
  },
  joinRowCompact: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  nameField: {
    minWidth: 0,
    flex: 1,
  },
  accountEntry: {
    gap: PidroSpacing.xs,
  },
  accountActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: PidroSpacing.sm,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: PidroSpacing.sm,
  },
  stack: {
    gap: PidroSpacing.sm,
  },
});
