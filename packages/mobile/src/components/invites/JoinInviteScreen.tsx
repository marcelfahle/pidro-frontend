import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import type { InvitePreview, InviteSource } from '@pidro/shared';
import { normalizeInviteCode } from '@pidro/shared';
import { createGuest } from '@/api/auth';
import { invitesApi } from '@/api/invites';
import { lobbyApi } from '@/api/lobby';
import { Button } from '@/components/ui/Button';
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
import { t } from '@/i18n';
import { useAuthStore } from '@/stores/auth';
import { useLobbyStore } from '@/stores/lobby';
import { usePendingInviteStore } from '@/stores/pendingInvite';

interface Props {
  code: string;
  source?: InviteSource;
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
  const router = useRouter();
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
  const [nameError, setNameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [terminalLoadError, setTerminalLoadError] = useState(false);
  const [movedCode, setMovedCode] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const retriedRef = useRef(false);
  const redeemingRef = useRef(false);
  const guestCreatingRef = useRef(false);
  const autoRedeemedCodeRef = useRef<string | null>(null);
  const routeActiveRef = useRef(true);
  const storesHydrated = authHydrated && pendingHydrated;

  useEffect(() => {
    routeActiveRef.current = true;
    return () => {
      routeActiveRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (pendingHydrated) setPendingInvite(code, source);
  }, [code, pendingHydrated, setPendingInvite, source]);

  const loadPreview = useCallback(async () => {
    if (!pendingHydrated || fixture) return;
    try {
      const result = await invitesApi.preview(code);
      if (!routeActiveRef.current) return;
      setPreview(result);
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
      setError(terminal ? t('invite.state.unknown') : t('invite.error.network'));
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
    autoRedeemedCodeRef.current = null;
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
    (state: Exclude<InvitePreview['state'], 'open' | 'moved'>, detail?: string) => {
      setPreview((current) => (current ? { ...current, state } : current));
      setError(detail ?? null);
      if (classifyInviteState(state) === 'terminal') clearPendingInvite();
    },
    [clearPendingInvite]
  );

  const redeem = useCallback(
    async (alreadyRetried: boolean) => {
      if (redeemingRef.current) return;
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
          applyStateChange(outcome.state, outcome.detail);
        } else if (outcome.kind === 'confirmLeave') {
          setConfirmLeave(true);
          setError(outcome.detail ?? t('invite.error.alreadyInRoom'));
        } else if (outcome.kind === 'sessionCleared') {
          autoRedeemedCodeRef.current = null;
          setError(t('invite.error.sessionExpired'));
        } else {
          setError(outcome.detail ?? t('invite.error.redeem'));
        }
      } finally {
        redeemingRef.current = false;
        if (routeActiveRef.current) setSubmitting(false);
      }
    },
    [applyStateChange, clearPendingInvite, code, router, setPendingInvite, source, upsertRoom]
  );

  useEffect(() => {
    if (
      storesHydrated &&
      user &&
      preview?.state === 'open' &&
      autoRedeemedCodeRef.current !== code
    ) {
      autoRedeemedCodeRef.current = code;
      void redeem(false);
    }
  }, [code, preview?.state, redeem, storesHydrated, user]);

  const submitGuest = useCallback(async () => {
    if (guestCreatingRef.current) return;
    const validation = validateDisplayName(displayName);
    if (validation.error) {
      setNameError(t(`invite.name.${validation.error}`));
      return;
    }

    guestCreatingRef.current = true;
    setNameError(null);
    setError(null);
    setSubmitting(true);
    try {
      const session = await createGuest({
        display_name: validation.value,
        invite_code: code,
        platform: invitePlatform(),
      });
      if (!routeActiveRef.current) return;
      autoRedeemedCodeRef.current = code;
      setSession({ accessToken: session.token, user: session.user });
      await redeem(false);
    } catch (caught) {
      if (!routeActiveRef.current) return;
      const outcome = resolveJoinFailure(caught, false);
      if (outcome.kind === 'moved') {
        setMovedCode(outcome.nextCode);
        setPendingInvite(outcome.nextCode, source);
      } else if (outcome.kind === 'stateChanged') {
        applyStateChange(outcome.state, outcome.detail);
      } else {
        setError(
          outcome.kind === 'failed' && outcome.detail ? outcome.detail : t('invite.error.guest')
        );
      }
    } finally {
      guestCreatingRef.current = false;
      if (routeActiveRef.current) setSubmitting(false);
    }
  }, [applyStateChange, code, displayName, redeem, setPendingInvite, setSession, source]);

  const leaveAndRetry = useCallback(async () => {
    if (retriedRef.current) return;
    retriedRef.current = true;
    setSubmitting(true);
    try {
      await lobbyApi.leaveRoom('current');
      if (!routeActiveRef.current) return;
      await redeem(true);
    } catch (caught) {
      if (!routeActiveRef.current) return;
      retriedRef.current = false;
      const outcome = resolveJoinFailure(caught, true);
      setError(
        outcome.kind === 'failed' && outcome.detail ? outcome.detail : t('invite.error.redeem')
      );
    } finally {
      if (routeActiveRef.current) setSubmitting(false);
    }
  }, [redeem]);

  const exit = useCallback(() => {
    if (submitting || guestCreatingRef.current || redeemingRef.current) return;
    routeActiveRef.current = false;
    clearPendingInvite();
    router.replace((user ? '/home' : '/(auth)/login') as Href);
  }, [clearPendingInvite, router, submitting, user]);

  const availability = movedCode ? 'moved' : preview ? classifyInviteState(preview.state) : null;
  const flowLoading = loading || !storesHydrated;
  const messageKey =
    preview && preview.state !== 'open' && preview.state !== 'moved'
      ? stateMessageKeys[preview.state]
      : null;

  return (
    <ScreenShell scroll compact testID="join-invite-screen" contentStyle={styles.shell}>
      <ScreenHeader title={t('invite.title')} subtitle={t('invite.code', { code })} onBack={exit} />
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
                taken: preview.seats_taken,
                total: preview.seats_total,
              })}
            </PidroText>
            {messageKey ? (
              <PidroText role="body" tone="soft" align="center">
                {t(messageKey)}
              </PidroText>
            ) : null}
          </View>
        ) : null}

        {error ? (
          <PidroText role="body" tone="danger" align="center" accessibilityRole="alert">
            {error}
          </PidroText>
        ) : null}

        {!flowLoading && terminalLoadError ? (
          <Button label={t('invite.exit')} variant="outline" onPress={exit} />
        ) : null}

        {!flowLoading &&
        !terminalLoadError &&
        (availability === 'recoverable' || (!preview && error)) ? (
          <Button label={t('common.tryAgain')} onPress={retryPreview} loading={submitting} />
        ) : null}

        {!flowLoading && availability === 'moved' ? (
          movedCode ? (
            <Button label={t('invite.followHost')} onPress={() => followMovedInvite(movedCode)} />
          ) : (
            <Button label={t('invite.exit')} variant="outline" onPress={exit} />
          )
        ) : null}

        {!flowLoading && availability === 'terminal' ? (
          <Button label={t('invite.exit')} variant="outline" onPress={exit} />
        ) : null}

        {!flowLoading && availability === 'joinable' && !user ? (
          <View style={styles.form}>
            <Input
              label={t('invite.name.label')}
              placeholder={t('invite.name.placeholder')}
              value={displayName}
              onChangeText={setDisplayName}
              error={nameError ?? undefined}
              editable={!submitting}
              maxLength={80}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={submitGuest}
            />
            <Button
              label={t('invite.join')}
              onPress={submitGuest}
              loading={submitting}
              disabled={!displayName.trim()}
              size="lg"
            />
          </View>
        ) : null}

        {!flowLoading && availability === 'joinable' && user ? (
          <View style={styles.stack}>
            <PidroText role="body" tone="soft" align="center" accessibilityLiveRegion="polite">
              {submitting
                ? t('invite.joining')
                : t('invite.readyAs', { name: user.display_name ?? user.username })}
            </PidroText>
            {error && !confirmLeave && !submitting ? (
              <Button
                label={t('common.tryAgain')}
                onPress={() => void redeem(retriedRef.current)}
              />
            ) : null}
          </View>
        ) : null}

        {confirmLeave ? (
          <View style={styles.actions}>
            <Button
              label={t('common.cancel')}
              variant="outline"
              onPress={() => setConfirmLeave(false)}
            />
            <Button
              label={t('invite.leaveAndJoin')}
              variant="destructive"
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
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: PidroSpacing.sm,
  },
  stack: {
    gap: PidroSpacing.sm,
  },
});
