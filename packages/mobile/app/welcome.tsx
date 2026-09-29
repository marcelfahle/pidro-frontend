import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Redirect, useRouter, type Href } from 'expo-router';
import { useNetworkState } from 'expo-network';
import { publicPlayerName, type InvitePreview } from '@pidro/shared';
import { invitesApi } from '@/api/invites';
import { LogoGlow } from '@/components/home/LogoGlow';
import { BevelButton } from '@/components/ui/BevelButton';
import { Icon } from '@/components/ui/Icon';
import { PidroLogo } from '@/components/ui/PidroLogo';
import { PidroText } from '@/components/ui/PidroText';
import { PressableFX } from '@/components/ui/PressableFX';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Surface } from '@/components/ui/Surface';
import { PidroColors, PidroLayout, PidroSpacing } from '@/design/tokens';
import { createSoloRoom } from '@/features/game/solo';
import { useAuth } from '@/hooks/useAuth';
import { classifyInviteState } from '@/features/invites/joinFlow';
import { authenticatedDestination } from '@/navigation/initialRoute';
import { gameRoute } from '@/navigation/gameRoute';
import { useLobbyStore } from '@/stores/lobby';
import { usePendingInviteStore } from '@/stores/pendingInvite';

type LaunchState = 'idle' | 'creatingGuest' | 'creatingRoom' | 'roomFailed' | 'joiningInvite';

export default function WelcomeScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const compactPortrait = !landscape && height < 700;
  const network = useNetworkState();
  const offline = network.isConnected === false || network.isInternetReachable === false;
  const pendingInvite = usePendingInviteStore((state) => state.pendingInvite);
  const clearPendingInvite = usePendingInviteStore((state) => state.clearPendingInvite);
  const upsertLobbyRoom = useLobbyStore((state) => state.upsertLobbyRoom);
  const { isAuthenticated, user, continueAsGuest, error: authError, clearError } = useAuth();
  const [launchState, setLaunchState] = useState<LaunchState>('idle');
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [invitePreview, setInvitePreview] = useState<InvitePreview | null>(null);
  const launchBusy = launchState === 'creatingGuest' || launchState === 'creatingRoom';

  useEffect(() => {
    if (!pendingInvite) return;
    let active = true;
    invitesApi
      .preview(pendingInvite.code)
      .then((preview) => {
        if (!active) return;
        // A dead invite would leave JOIN TABLE leading nowhere; show PLAY instead.
        if (classifyInviteState(preview.state) === 'terminal') clearPendingInvite();
        else setInvitePreview(preview);
      })
      .catch(() => {
        if (active) setInvitePreview(null);
      });
    return () => {
      active = false;
    };
  }, [clearPendingInvite, pendingInvite]);

  const startSolo = useCallback(
    async (playerName: string) => {
      setLaunchState('creatingRoom');
      setLaunchError(null);
      try {
        const response = await createSoloRoom(playerName);
        if (response.room) upsertLobbyRoom(response.room, 'my_rejoinable');
        router.replace(gameRoute(response.code, 'single-player'));
      } catch {
        setLaunchState('roomFailed');
        setLaunchError('We could not start your solo table. Try again.');
      }
    },
    [router, upsertLobbyRoom]
  );

  const launch = useCallback(async () => {
    if (launchBusy || offline) return;
    clearError();
    setLaunchError(null);

    if (launchState === 'roomFailed' && user) {
      await startSolo(publicPlayerName(user.username, 'Player', user.display_name));
      return;
    }

    setLaunchState('creatingGuest');
    const session = await continueAsGuest();
    if (!session) {
      setLaunchState('idle');
      return;
    }

    if (pendingInvite) {
      setLaunchState('joiningInvite');
      router.replace(authenticatedDestination(pendingInvite) as Href);
      return;
    }

    await startSolo(publicPlayerName(session.user.username, 'Player', session.user.display_name));
  }, [
    clearError,
    continueAsGuest,
    launchBusy,
    launchState,
    offline,
    pendingInvite,
    router,
    startSolo,
    user,
  ]);

  if (isAuthenticated && launchState === 'idle') {
    return <Redirect href={authenticatedDestination(pendingInvite) as Href} />;
  }

  const currentPreview =
    pendingInvite && invitePreview?.code === pendingInvite.code ? invitePreview : null;
  const inviter = currentPreview?.host || 'A friend';
  return (
    <ScreenShell
      testID="welcome-screen"
      scroll
      contentStyle={landscape ? styles.landscape : styles.portrait}>
      <View
        style={[
          styles.logoStage,
          landscape && styles.logoStageLandscape,
          compactPortrait && styles.logoStageCompact,
        ]}
        pointerEvents="none">
        <LogoGlow size={landscape ? 340 : compactPortrait ? 280 : 400} />
        <PidroLogo size="hero" />
      </View>

      <View testID="welcome-window" style={styles.actions}>
        {pendingInvite ? (
          <Surface variant="card" style={styles.inviteCard}>
            <View style={styles.inviteAvatar}>
              <PidroText role="title" tone="gold">
                {inviter.charAt(0).toUpperCase()}
              </PidroText>
            </View>
            <View style={styles.inviteCopy}>
              <PidroText role="label" numberOfLines={1}>
                {inviter} saved you a seat
              </PidroText>
              <PidroText role="metadata" tone="soft">
                Table {pendingInvite.code}
              </PidroText>
            </View>
            <PidroText role="metadata" tone="cyan">
              INVITE
            </PidroText>
          </Surface>
        ) : null}

        {offline ? (
          <Surface variant="subtle" style={styles.offline} accessibilityRole="alert">
            <PidroText role="metadata" tone="gold" align="center">
              You&apos;re offline. Connect to play.
            </PidroText>
          </Surface>
        ) : null}

        {authError || launchError ? (
          <Surface variant="subtle" style={styles.error} accessibilityRole="alert">
            <PidroText role="metadata" tone="danger" align="center">
              {launchError || authError}
            </PidroText>
          </Surface>
        ) : null}

        <BevelButton
          label={pendingInvite ? 'JOIN TABLE' : 'PLAY'}
          material="wood"
          size={landscape ? 'lg' : 'hero'}
          weight="hero"
          fullWidth
          disabled={offline}
          loading={launchBusy}
          onPress={launch}
        />

        <PressableFX
          accessibilityRole="button"
          accessibilityLabel="Played Pidro Classic? Bring your name and games."
          disabled={offline || launchBusy}
          onPress={() => router.push('/(auth)/login')}
          style={[styles.classic, (offline || launchBusy) && styles.disabled]}>
          <View style={styles.classicIcon}>
            <Icon name="friends" size={24} color={PidroColors.cyan} />
          </View>
          <View style={styles.classicCopy}>
            <PidroText role="label">Played Pidro Classic?</PidroText>
            <PidroText role="metadata" tone="soft">
              Bring your name and games.
            </PidroText>
          </View>
          <Icon name="chevron-right" size={22} color={PidroColors.cyanText} />
        </PressableFX>

        <View style={[styles.accountLinks, (offline || launchBusy) && styles.disabled]}>
          <PressableFX
            accessibilityRole="link"
            disabled={offline || launchBusy}
            onPress={() => router.push('/(auth)/login')}
            style={styles.accountLink}>
            <PidroText role="metadata" tone="cyan">
              Sign in
            </PidroText>
          </PressableFX>
          <View style={styles.dot} />
          <PressableFX
            accessibilityRole="link"
            disabled={offline || launchBusy}
            onPress={() => router.push('/(auth)/register')}
            style={styles.accountLink}>
            <PidroText role="metadata" tone="cyan">
              Create account
            </PidroText>
          </PressableFX>
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  portrait: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: PidroSpacing.md,
  },
  landscape: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: PidroSpacing.xl,
  },
  logoStage: {
    width: '100%',
    height: 210,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoStageLandscape: {
    width: '43%',
    maxWidth: 360,
    height: 300,
    flexShrink: 1,
  },
  logoStageCompact: { height: 130 },
  actions: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'stretch',
    gap: PidroSpacing.sm,
  },
  inviteCard: {
    minHeight: 64,
    padding: PidroSpacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.sm,
  },
  inviteAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PidroColors.glass,
  },
  inviteCopy: { flex: 1, minWidth: 0 },
  offline: { padding: PidroSpacing.sm, borderColor: PidroColors.gold },
  error: { padding: PidroSpacing.sm },
  classic: {
    minHeight: 64,
    padding: PidroSpacing.sm,
    borderWidth: 1,
    borderRadius: 12,
    borderColor: PidroColors.borderStrong,
    backgroundColor: PidroColors.panelStrong,
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.sm,
  },
  classicIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PidroColors.glass,
  },
  classicCopy: { flex: 1, minWidth: 0 },
  accountLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: PidroSpacing.xxs,
  },
  accountLink: {
    minHeight: PidroLayout.touchTarget,
    justifyContent: 'center',
    paddingHorizontal: PidroSpacing.sm,
  },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: PidroColors.textMuted },
  disabled: { opacity: 0.5 },
});
