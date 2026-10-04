import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Redirect, useRouter, type Href } from 'expo-router';
import { useNetworkState } from 'expo-network';
import { publicPlayerName, type InvitePreview } from '@pidro/shared';
import { invitesApi } from '@/api/invites';
import { ClassicPlaque } from '@/components/home/ClassicPlaque';
import { LogoGlow } from '@/components/home/LogoGlow';
import { HomeTileButton, type HomeTileSize } from '@/components/ui/HomeTileButton';
import { Icon } from '@/components/ui/Icon';
import { PidroLogo } from '@/components/ui/PidroLogo';
import { PidroText } from '@/components/ui/PidroText';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Surface } from '@/components/ui/Surface';
import { PidroBevel, PidroColors, PidroLayout, PidroSpacing } from '@/design/tokens';
import { createSoloRoom } from '@/features/game/solo';
import { useAuth } from '@/hooks/useAuth';
import { classifyInviteState } from '@/features/invites/joinFlow';
import { authenticatedEntryDestination } from '@/navigation/initialRoute';
import { gameRoute } from '@/navigation/gameRoute';
import { useAgeGateStore } from '@/stores/ageGate';
import { useLobbyStore } from '@/stores/lobby';
import { usePendingInviteStore } from '@/stores/pendingInvite';

type LaunchState = 'idle' | 'creatingGuest' | 'creatingRoom' | 'roomFailed' | 'joiningInvite';

export default function WelcomeScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const compactLandscape = landscape && height < PidroLayout.compactHeight;
  const tablet = Math.min(width, height) >= 700;
  const tileSize: HomeTileSize = tablet ? 'tablet' : compactLandscape ? 'landscape' : 'phone';
  const network = useNetworkState();
  const offline = network.isConnected === false || network.isInternetReachable === false;
  const pendingInvite = usePendingInviteStore((state) => state.pendingInvite);
  const ageBand = useAgeGateStore((state) => state.ageBand);
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

    const destination = authenticatedEntryDestination(pendingInvite, ageBand, session.user);
    if (destination !== '/home') {
      setLaunchState('joiningInvite');
      router.replace(destination as Href);
      return;
    }

    await startSolo(publicPlayerName(session.user.username, 'Player', session.user.display_name));
  }, [
    clearError,
    continueAsGuest,
    ageBand,
    launchBusy,
    launchState,
    offline,
    pendingInvite,
    router,
    startSolo,
    user,
  ]);

  if (isAuthenticated && launchState === 'idle') {
    return user ? (
      <Redirect href={authenticatedEntryDestination(pendingInvite, ageBand, user) as Href} />
    ) : null;
  }

  const currentPreview =
    pendingInvite && invitePreview?.code === pendingInvite.code ? invitePreview : null;
  const inviter = currentPreview?.host || 'A friend';
  return (
    <ScreenShell
      testID="welcome-screen"
      scroll
      contentStyle={[
        styles.screen,
        compactLandscape ? styles.screenLandscape : tablet && styles.screenTablet,
      ]}>
      {!compactLandscape ? <View style={styles.headerSpacer} /> : null}
      <View style={compactLandscape ? styles.bodyLandscape : styles.body}>
        <View
          style={[styles.logoStage, compactLandscape && styles.logoStageLandscape]}
          pointerEvents="none">
          <LogoGlow size={tablet ? 700 : compactLandscape ? 360 : 420} />
          <PidroLogo size="hero" width={tablet ? 440 : compactLandscape ? 270 : 280} />
        </View>

        <View
          testID="welcome-window"
          style={[
            styles.actions,
            tablet && styles.actionsTablet,
            compactLandscape && styles.actionsLandscape,
          ]}>
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

          <View style={[styles.tiles, tablet && styles.tilesTablet]}>
            <HomeTileButton
              material="wood"
              icon={
                <Icon
                  name="bot"
                  size={tablet ? 40 : compactLandscape ? 28 : 30}
                  color={PidroBevel.textGold}
                />
              }
              title="Quick game"
              subtitle="You and three bots"
              status="No sign-up"
              size={tileSize}
              disabled={offline}
              loading={launchBusy}
              onPress={launch}
              testID="welcome-quick-game"
            />
            <HomeTileButton
              material="glass"
              icon={
                <Icon
                  name="friends"
                  size={tablet ? 40 : compactLandscape ? 28 : 30}
                  color={PidroColors.iconOnGlass}
                />
              }
              title="Play online"
              subtitle="Real players"
              status="Needs a free account"
              size={tileSize}
              disabled={offline || launchBusy}
              onPress={() => router.push('/(auth)/register')}
              testID="welcome-play-online"
            />
          </View>

          <ClassicPlaque
            disabled={offline || launchBusy}
            onPress={() => router.push('/(auth)/claim-classic')}
          />

          <View style={[styles.accountLinks, (offline || launchBusy) && styles.disabled]}>
            <PidroText role="metadata" tone="cyan">
              Have an account?
            </PidroText>
            <Pressable
              accessibilityRole="link"
              disabled={offline || launchBusy}
              onPress={() => router.push('/(auth)/login')}
              style={styles.accountLink}>
              <PidroText role="metadata" tone="cyan" style={styles.signIn}>
                Sign in
              </PidroText>
            </Pressable>
          </View>
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: PidroSpacing.sm,
  },
  screenLandscape: { paddingVertical: PidroSpacing.md },
  screenTablet: { paddingHorizontal: PidroSpacing.xl, paddingVertical: PidroSpacing.xl },
  headerSpacer: { width: '100%', height: 48, flexShrink: 0 },
  body: { width: '100%', flex: 1, alignItems: 'center', gap: 14 },
  bodyLandscape: {
    width: '100%',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: PidroSpacing.xxl,
  },
  logoStage: {
    width: '100%',
    flex: 1,
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoStageLandscape: {
    width: 340,
    alignSelf: 'stretch',
    flexShrink: 1,
  },
  actions: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'stretch',
    gap: 14,
  },
  actionsLandscape: { width: 330 },
  actionsTablet: { maxWidth: 480, gap: PidroSpacing.lg },
  tiles: { width: '100%', flexDirection: 'row', gap: PidroSpacing.sm },
  tilesTablet: { gap: PidroSpacing.md },
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
  signIn: { fontWeight: '800' },
  disabled: { opacity: 0.5 },
});
