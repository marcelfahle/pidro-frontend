import { useCallback, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lobbyApi } from '@/api/lobby';
import { Avatar } from '@/components/ui/Avatar';
import { Background } from '@/components/ui/Background';
import { BevelButton } from '@/components/ui/BevelButton';
import { gradientBg } from '@/components/ui/Bevel';
import { LogoGlow } from '@/components/home/LogoGlow';
import { usePillClearance } from '@/components/shell/TabPill';
import { PidroLogo } from '@/components/ui/PidroLogo';
import { PidroText } from '@/components/ui/PidroText';
import { PressableFX } from '@/components/ui/PressableFX';
import { Surface } from '@/components/ui/Surface';
import { PidroBevel, PidroColors, PidroFonts, PidroSpacing } from '@/design/tokens';
import { useAuthStore } from '@/stores/auth';
import { useLobbyStore } from '@/stores/lobby';
import { useProfileIdentity } from '@/hooks/useProfileIdentity';
import { apiErrorInfo } from '@/utils/apiErrors';
import { gameRoute } from '@/navigation/gameRoute';

// Progression is mocked until leagues/levels land server-side; the layout
// is the real one so the numbers can go live without moving anything.
const MOCK_LEVEL = 12;
const MOCK_RATING = 1487;
const MOCK_LEAGUE = 'LEAGUE III · 9 WINS TO LEAGUE IV';
const MOCK_LEAGUE_PROGRESS = 0.64;

export default function HomeScreen() {
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const user = useAuthStore((state) => state.user);
  const upsertLobbyRoom = useLobbyStore((state) => state.upsertLobbyRoom);
  const router = useRouter();
  const [singlePlayerLoading, setSinglePlayerLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshIdentity = useProfileIdentity();
  const pillClearance = usePillClearance();

  useFocusEffect(
    useCallback(() => {
      void refreshIdentity().catch(() => undefined);
    }, [refreshIdentity])
  );

  const createSinglePlayerRoom = async () => {
    const response = await lobbyApi.createRoom({
      name: `${user?.username ?? 'Player'}'s solo table`,
      settings: { min_games: 1, time_limit: 0, private: false },
      seats: { seat_2: 'ai', seat_3: 'ai', seat_4: 'ai' },
      bot_difficulty: 'basic',
    });
    if (!response?.code) throw new Error('No room code returned');
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

  const topBar = (
    <View style={styles.topBar}>
      <PressableFX
        accessibilityRole="button"
        accessibilityLabel="Open your profile"
        onPress={() => router.push('/profile')}
        style={styles.identity}>
        <View style={[styles.levelRing, gradientBg(PidroBevel.goldRimGradient)]}>
          <Avatar
            uri={user?.avatar_url}
            style={styles.avatar}
            resizeMode="cover"
            accessibilityLabel="Your profile picture"
          />
        </View>
        <View style={styles.identityCopy}>
          <PidroText role="label" numberOfLines={1}>
            {user?.username ?? 'Player'}
          </PidroText>
          <PidroText role="metadata" tone="muted">
            Level {MOCK_LEVEL}
          </PidroText>
        </View>
      </PressableFX>

      <View style={styles.progression}>
        <View style={[styles.ratingRim, gradientBg(PidroBevel.goldRimGradient)]}>
          <View
            style={[
              styles.ratingFace,
              gradientBg(
                `linear-gradient(180deg, ${PidroBevel.panelHi}, ${PidroBevel.panelMid} 60%, ${PidroBevel.panelDeep})`
              ),
            ]}>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill={PidroBevel.textGold}>
              <Path d="M12 2l2.4 5.7 6.1.5-4.6 4 1.4 6L12 15l-5.3 3.2 1.4-6-4.6-4 6.1-.5z" />
            </Svg>
            <PidroText style={styles.ratingValue}>{MOCK_RATING}</PidroText>
          </View>
        </View>
        <View style={styles.leagueBar}>
          <View style={[styles.leagueFill, { width: `${MOCK_LEAGUE_PROGRESS * 100}%` }]} />
        </View>
        <PidroText style={styles.leagueLabel}>{MOCK_LEAGUE}</PidroText>
      </View>
    </View>
  );

  const logoStage = (
    <View style={styles.logoStage} pointerEvents="none">
      <LogoGlow size={landscape ? 360 : 440} />
      <PidroLogo size="hero" />
    </View>
  );

  const actions = (
    <View style={[styles.actions, landscape && styles.actionsLandscape]}>
      {error ? (
        <Surface variant="subtle" style={styles.error} accessibilityRole="alert">
          <PidroText role="metadata" tone="danger" align="center">
            {error}
          </PidroText>
        </Surface>
      ) : null}

      <View style={styles.playWrap}>
        <BevelButton
          label="PLAY"
          material="wood"
          size={landscape ? 'lg' : 'hero'}
          weight="hero"
          fullWidth
          onPress={() => router.push('/lobby')}
        />
        <View style={styles.playBadge} pointerEvents="none">
          <PidroText style={styles.playBadgeLabel}>FIND A TABLE</PidroText>
        </View>
      </View>

      <View style={styles.chips}>
        <BevelButton
          material="glass"
          size="sm"
          accessibilityLabel="Solo practice. Start immediately with three bots."
          loading={singlePlayerLoading}
          onPress={handleSinglePlayer}>
          <Svg
            width={15}
            height={15}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#CFEFFF"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round">
            <Path d="M6 4.5l13 7.5-13 7.5z" />
          </Svg>
          <PidroText style={styles.chipLabel}>Solo practice</PidroText>
        </BevelButton>
        <BevelButton
          material="glass"
          size="sm"
          accessibilityLabel="Play with friends. Create a table and invite them."
          onPress={() => router.push('/lobby')}>
          <Svg
            width={15}
            height={15}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#CFEFFF"
            strokeWidth={2}
            strokeLinecap="round">
            <Path d="M9 11.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM3 20a6 6 0 0 1 12 0M16.5 5.5a3.2 3.2 0 0 1 0 5.6M21 20a6 6 0 0 0-4-5.6" />
          </Svg>
          <PidroText style={styles.chipLabel}>Play with friends</PidroText>
        </BevelButton>
      </View>
    </View>
  );

  return (
    <Background>
      <View style={[styles.scrim, landscape && styles.scrimLandscape]}>
        <SafeAreaView
          testID="home-screen"
          style={styles.safe}
          edges={landscape ? ['top', 'left', 'bottom'] : ['top', 'left', 'right']}>
          {landscape ? (
            <View style={[styles.mainLandscape, { paddingRight: pillClearance.right }]}>
              <View style={styles.bodyLandscape}>
                {logoStage}
                {/* The action stack centers below the corner HUD, not
                    against the full height — keeps it off the progress
                    block on tall phones without sagging the logo. */}
                <View style={styles.actionsColumnLandscape}>{actions}</View>
              </View>
              {/* HUD floats; the world centers against the full height. */}
              <View
                pointerEvents="box-none"
                style={[styles.topBarOverlay, { right: pillClearance.right }]}>
                {topBar}
              </View>
            </View>
          ) : (
            <View style={[styles.main, { paddingBottom: pillClearance.bottom }]}>
              {topBar}
              {logoStage}
              {actions}
            </View>
          )}
        </SafeAreaView>
      </View>
    </Background>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: PidroColors.screenScrim,
  },
  scrimLandscape: {
    flexDirection: 'row',
  },
  safe: {
    flex: 1,
  },
  main: {
    flex: 1,
    paddingHorizontal: PidroSpacing.md,
    paddingTop: PidroSpacing.xs,
  },
  mainLandscape: {
    flex: 1,
    paddingLeft: PidroSpacing.md,
  },
  topBarOverlay: {
    position: 'absolute',
    top: PidroSpacing.xs,
    left: PidroSpacing.md,
  },
  bodyLandscape: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.md,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: PidroSpacing.sm,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.xs,
    minHeight: 46,
  },
  levelRing: {
    width: 46,
    height: 46,
    borderRadius: 23,
    padding: 2.5,
    boxShadow: '0px 2px 6px rgba(0,0,0,0.4)',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 21,
  },
  identityCopy: {
    minWidth: 0,
    maxWidth: 170,
  },
  progression: {
    alignItems: 'flex-end',
    gap: 4,
  },
  ratingRim: {
    borderRadius: 12,
    padding: 1.5,
    boxShadow: '0px 2px 6px rgba(0,0,0,0.4)',
  },
  ratingFace: {
    borderRadius: 10.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 13,
    boxShadow: 'inset 0px 1px 3px rgba(0,0,0,0.35)',
  },
  ratingValue: {
    fontFamily: PidroFonts.display,
    fontWeight: '400',
    fontSize: 16,
    lineHeight: 21,
    color: PidroBevel.textGold,
    textShadowColor: 'rgba(0, 0, 0, 0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    transform: [{ translateY: -0.5 }],
  },
  leagueBar: {
    width: 172,
    height: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  leagueFill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: PidroBevel.rim,
  },
  leagueLabel: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: 'rgba(214, 238, 250, 0.65)',
  },
  logoStage: {
    flex: 1,
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    gap: PidroSpacing.sm,
    paddingBottom: PidroSpacing.xs,
  },
  actionsLandscape: {
    width: 300,
    paddingBottom: 0,
  },
  actionsColumnLandscape: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingTop: 104,
  },
  error: {
    borderColor: PidroColors.dangerBorder,
    padding: PidroSpacing.sm,
  },
  // Match the hero's own width cap so the badge hugs the button at any
  // container width instead of anchoring to a wider wrapper.
  playWrap: {
    position: 'relative',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 340,
  },
  playBadge: {
    position: 'absolute',
    top: -9,
    right: 6,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: PidroColors.cyan,
    boxShadow: '0px 2px 6px rgba(0,0,0,0.4)',
  },
  playBadgeLabel: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
    letterSpacing: 0.6,
    color: '#06263f',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: PidroSpacing.sm,
  },
  chipLabel: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 10, 20, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
