import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { publicPlayerName, type ProfileIdentity } from '@pidro/shared';
import { lobbyApi } from '@/api/lobby';
import { useLobbyChannel } from '@/channels/hooks/useLobbyChannel';
import { AuthSheet, type AuthSheetReason } from '@/components/auth/AuthSheet';
import { ClassicPlaque } from '@/components/home/ClassicPlaque';
import { LevelRing } from '@/components/home/LevelRing';
import { LogoGlow } from '@/components/home/LogoGlow';
import { usePillClearance } from '@/components/shell/TabPill';
import { Background } from '@/components/ui/Background';
import { BevelButton } from '@/components/ui/BevelButton';
import { HomeTileButton, type HomeTileSize } from '@/components/ui/HomeTileButton';
import { Icon } from '@/components/ui/Icon';
import { PidroLogo } from '@/components/ui/PidroLogo';
import { PidroText } from '@/components/ui/PidroText';
import { PressableFX } from '@/components/ui/PressableFX';
import { Surface } from '@/components/ui/Surface';
import { PidroBevel, PidroColors, PidroLayout, PidroSpacing } from '@/design/tokens';
import { createSoloRoom } from '@/features/game/solo';
import { useProfileIdentity } from '@/hooks/useProfileIdentity';
import { gameRoute } from '@/navigation/gameRoute';
import { useAuthStore } from '@/stores/auth';
import { useLobbyStore } from '@/stores/lobby';
import { apiErrorInfo } from '@/utils/apiErrors';

type LobbyCountState = 'loading' | 'ready' | 'failed';

export default function HomeScreen() {
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const compactLandscape = landscape && height < PidroLayout.compactHeight;
  const tablet = Math.min(width, height) >= 700;
  const tileSize: HomeTileSize = tablet ? 'tablet' : compactLandscape ? 'landscape' : 'phone';
  const user = useAuthStore((state) => state.user);
  const guest = Boolean(user?.guest);
  const lobby = useLobbyStore((state) => state.lobby);
  const setLobby = useLobbyStore((state) => state.setLobby);
  const setStats = useLobbyStore((state) => state.setStats);
  const upsertLobbyRoom = useLobbyStore((state) => state.upsertLobbyRoom);
  const router = useRouter();
  const [singlePlayerLoading, setSinglePlayerLoading] = useState(false);
  const [accountSheetReason, setAccountSheetReason] = useState<AuthSheetReason | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [identity, setIdentity] = useState<ProfileIdentity | null>(null);
  const [lobbyCountState, setLobbyCountState] = useState<LobbyCountState>('loading');
  const refreshIdentity = useProfileIdentity();
  const rawPillClearance = usePillClearance();
  const pillClearance = guest ? { bottom: 0, right: 0 } : rawPillClearance;
  const playerName = publicPlayerName(user?.username, 'Player', user?.display_name);

  useLobbyChannel(
    useCallback(() => {
      if (!guest) setLobbyCountState('ready');
    }, [guest])
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void refreshIdentity()
        .then((nextIdentity) => {
          if (active && nextIdentity) setIdentity(nextIdentity);
        })
        .catch(() => undefined);

      if (!guest) {
        setLobbyCountState('loading');
        void lobbyApi
          .listLobby()
          .then((response) => {
            if (!active) return;
            setLobby(response.lobby);
            setStats({ active_games: response.rooms.length });
            setLobbyCountState('ready');
          })
          .catch(() => {
            if (active) setLobbyCountState('failed');
          });
      }

      return () => {
        active = false;
      };
    }, [guest, refreshIdentity, setLobby, setStats])
  );

  const createSinglePlayerRoom = async () => {
    const response = await createSoloRoom(playerName);
    if (response.room) upsertLobbyRoom(response.room, 'my_rejoinable');
    router.replace(gameRoute(response.code, 'single-player'));
  };

  const handleSinglePlayer = async () => {
    setSinglePlayerLoading(true);
    setError(null);

    try {
      await createSinglePlayerRoom();
    } catch (err: unknown) {
      const { code, detail } = apiErrorInfo(err);
      if (code === 'ALREADY_IN_ROOM') {
        const lobbyResponse = await lobbyApi.listLobby().catch(() => null);
        if (lobbyResponse?.lobby.my_rejoinable.length) {
          setError('You already have a multiplayer table. Rejoin it or leave it first.');
          router.push('/lobby');
        } else {
          try {
            await lobbyApi.leaveRoom('current');
            await createSinglePlayerRoom();
          } catch (retryError) {
            const retryDetail = apiErrorInfo(retryError).detail;
            setError(
              retryDetail
                ? `We could not start a solo game: ${retryDetail}`
                : 'We could not clear your previous solo table. Please try again.'
            );
          }
        }
      } else {
        setError(
          detail
            ? `We could not start a solo game: ${detail}`
            : 'We could not start a solo game. Please try again.'
        );
      }
    } finally {
      setSinglePlayerLoading(false);
    }
  };

  const games = identity?.games_played;
  const level = identity?.veteran?.level;
  const gamesLabel = games === 1 ? '1 game' : `${games?.toLocaleString()} games`;
  const identityMeta = guest
    ? games != null
      ? `Guest · ${gamesLabel}`
      : 'Guest'
    : games != null && level != null
      ? `${gamesLabel} · Level ${level}`
      : null;
  const onlineStatus =
    lobbyCountState !== 'ready'
      ? undefined
      : lobby.open_tables.length > 0
        ? `${lobby.open_tables.length} ${lobby.open_tables.length === 1 ? 'table' : 'tables'} open`
        : 'Start a table';

  const topBar = (
    <View style={[styles.topBar, tablet && styles.topBarTablet]}>
      <PressableFX
        accessibilityRole="button"
        accessibilityLabel="Open your profile"
        onPress={() => router.push('/profile')}
        style={styles.identity}>
        <LevelRing
          uri={user?.avatar_url}
          size={tablet ? 56 : compactLandscape ? 44 : 48}
          accessibilityLabel="Your profile picture"
        />
        <View style={styles.identityCopy}>
          <PidroText
            style={[styles.playerName, tablet && styles.playerNameTablet]}
            numberOfLines={1}>
            {playerName}
          </PidroText>
          {identityMeta ? (
            <View style={styles.identityMeta}>
              <PidroText role="metadata" tone="soft" style={tablet && styles.identityMetaTablet}>
                {identityMeta}
              </PidroText>
              {guest ? <Icon name="chevron-right" size={14} color={PidroColors.textSoft} /> : null}
            </View>
          ) : null}
        </View>
      </PressableFX>
      {guest ? (
        <BevelButton
          accessibilityLabel="Settings"
          material="glass"
          size="icon"
          onPress={() => router.push('/settings')}
          style={tablet && styles.settingsTablet}>
          <Icon name="settings" size={tablet ? 22 : 20} />
        </BevelButton>
      ) : null}
    </View>
  );

  const logoStage = (
    <View
      style={[styles.logoStage, compactLandscape && styles.logoStageLandscape]}
      pointerEvents="none">
      <LogoGlow size={tablet ? 700 : compactLandscape ? 360 : 420} />
      <PidroLogo size="hero" width={tablet ? 440 : compactLandscape ? 270 : 280} />
    </View>
  );

  const actions = (
    <View
      style={[
        styles.actions,
        tablet && styles.actionsTablet,
        compactLandscape && styles.actionsLandscape,
      ]}>
      {error ? (
        <Surface variant="subtle" style={styles.error} accessibilityRole="alert">
          <PidroText role="metadata" tone="danger" align="center">
            {error}
          </PidroText>
        </Surface>
      ) : null}

      <View style={[styles.tiles, tablet && styles.tilesTablet]}>
        <HomeTileButton
          material={guest ? 'wood' : 'glass'}
          icon={
            <Icon
              name="bot"
              size={tablet ? 40 : compactLandscape ? 28 : 30}
              color={guest ? PidroBevel.textGold : PidroColors.iconOnGlass}
            />
          }
          title="Quick game"
          subtitle="You and three bots"
          status={guest ? 'No sign-up' : undefined}
          size={tileSize}
          loading={singlePlayerLoading}
          onPress={handleSinglePlayer}
          testID="home-quick-game"
          style={!guest && compactLandscape && styles.accountLandscapeTile}
        />
        <HomeTileButton
          material={guest ? 'glass' : 'wood'}
          icon={
            <Icon
              name="friends"
              size={tablet ? 40 : compactLandscape ? 28 : 30}
              color={guest ? PidroColors.iconOnGlass : PidroBevel.textGold}
            />
          }
          title="Play online"
          subtitle="Real players"
          status={guest ? 'Needs a free account' : onlineStatus}
          size={tileSize}
          onPress={() => {
            if (guest) setAccountSheetReason('multiplayer');
            else router.push('/lobby');
          }}
          testID="home-play-online"
          style={!guest && compactLandscape && styles.accountLandscapeTile}
        />
      </View>

      {guest ? (
        <>
          <ClassicPlaque onPress={() => router.push('/(auth)/claim-classic')} />
          <View style={styles.accountLinks}>
            <PidroText role="metadata" tone="soft" style={tablet && styles.accountTextTablet}>
              Have an account?
            </PidroText>
            <Pressable
              accessibilityRole="link"
              onPress={() => router.push('/(auth)/login')}
              style={styles.accountLink}>
              <PidroText
                role="metadata"
                tone="cyan"
                style={[styles.signIn, tablet && styles.accountTextTablet]}>
                Sign in
              </PidroText>
            </Pressable>
          </View>
        </>
      ) : null}
    </View>
  );

  return (
    <Background>
      <View style={styles.scrim}>
        <SafeAreaView
          testID="home-screen"
          style={styles.safe}
          edges={
            guest
              ? ['top', 'left', 'right', 'bottom']
              : compactLandscape
                ? ['top', 'left', 'bottom']
                : ['top', 'left', 'right']
          }>
          <View
            style={[
              styles.main,
              tablet && styles.mainTablet,
              compactLandscape && styles.mainLandscape,
              !compactLandscape && {
                paddingBottom: tablet && landscape ? 56 : pillClearance.bottom,
              },
              compactLandscape && !guest && { paddingRight: pillClearance.right },
            ]}>
            {topBar}
            {compactLandscape ? (
              <View style={styles.bodyLandscape}>
                {logoStage}
                {actions}
              </View>
            ) : (
              <>
                {logoStage}
                {actions}
              </>
            )}
          </View>
        </SafeAreaView>
      </View>
      <AuthSheet
        isOpen={accountSheetReason != null}
        reason={accountSheetReason ?? 'save'}
        onClose={() => setAccountSheetReason(null)}
        onSaved={() => {
          const shouldFindTable = accountSheetReason === 'multiplayer';
          setAccountSheetReason(null);
          if (shouldFindTable) router.push('/lobby');
        }}
        onClaimClassic={() => {
          setAccountSheetReason(null);
          router.push('/(auth)/claim-classic');
        }}
        onJoinCode={() => {
          setAccountSheetReason(null);
          router.push('/join-code');
        }}
      />
    </Background>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: PidroColors.screenScrim },
  safe: { flex: 1 },
  main: {
    flex: 1,
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 25,
    paddingTop: PidroSpacing.md,
    paddingBottom: PidroSpacing.lg,
  },
  mainTablet: { gap: PidroSpacing.lg, paddingHorizontal: 48, paddingTop: 48, paddingBottom: 56 },
  mainLandscape: { paddingHorizontal: 56, paddingVertical: PidroSpacing.md, gap: 6 },
  topBar: {
    width: '100%',
    maxWidth: 794,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: PidroSpacing.sm,
    flexShrink: 0,
  },
  topBarTablet: { gap: 14 },
  identity: {
    minWidth: 0,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.sm,
    minHeight: 48,
  },
  identityCopy: { minWidth: 0, flexShrink: 1 },
  playerName: { fontSize: 17, lineHeight: 22, fontWeight: '800', color: PidroColors.text },
  playerNameTablet: { fontSize: 20, lineHeight: 26 },
  identityMeta: { flexDirection: 'row', alignItems: 'center', gap: PidroSpacing.xxs },
  identityMetaTablet: { fontSize: 14, lineHeight: 18 },
  settingsTablet: { width: 48, minHeight: 48 },
  logoStage: {
    width: '100%',
    flex: 1,
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoStageLandscape: { width: 340, alignSelf: 'stretch', flexShrink: 1 },
  bodyLandscape: {
    width: '100%',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: PidroSpacing.xxl,
  },
  actions: { width: '100%', maxWidth: 340, alignItems: 'stretch', gap: 14, flexShrink: 0 },
  actionsLandscape: { width: 330, gap: 10 },
  actionsTablet: { maxWidth: 480, gap: PidroSpacing.lg },
  tiles: { width: '100%', flexDirection: 'row', gap: PidroSpacing.sm },
  tilesTablet: { gap: PidroSpacing.md },
  accountLandscapeTile: { minHeight: 170 },
  error: { borderColor: PidroColors.dangerBorder, padding: PidroSpacing.sm },
  accountLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  accountLink: {
    minHeight: PidroLayout.touchTarget,
    justifyContent: 'center',
    paddingHorizontal: PidroSpacing.xs,
  },
  signIn: { fontWeight: '800' },
  accountTextTablet: { fontSize: 17, lineHeight: 22 },
});
