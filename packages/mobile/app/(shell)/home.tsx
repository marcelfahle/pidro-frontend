import { useCallback, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { clampRoomName } from '@pidro/shared';
import { lobbyApi } from '@/api/lobby';
import { Background } from '@/components/ui/Background';
import { BevelButton } from '@/components/ui/BevelButton';
import { CtaBadge } from '@/components/home/CtaBadge';
import { LeagueProgress } from '@/components/home/LeagueProgress';
import { LevelRing } from '@/components/home/LevelRing';
import { LogoGlow } from '@/components/home/LogoGlow';
import { RatingPlaque } from '@/components/home/RatingPlaque';
import { Icon } from '@/components/ui/Icon';
import { usePillClearance } from '@/components/shell/TabPill';
import { PidroLogo } from '@/components/ui/PidroLogo';
import { PidroText } from '@/components/ui/PidroText';
import { PressableFX } from '@/components/ui/PressableFX';
import { Surface } from '@/components/ui/Surface';
import { PidroBevel, PidroColors, PidroSpacing } from '@/design/tokens';
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
      name: clampRoomName(`${user?.username ?? 'Player'}'s solo table`),
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
        <LevelRing uri={user?.avatar_url} accessibilityLabel="Your profile picture" />
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
        <RatingPlaque rating={MOCK_RATING} />
        <LeagueProgress progress={MOCK_LEAGUE_PROGRESS} label={MOCK_LEAGUE} align="flex-end" />
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

      <CtaBadge label="FIND A TABLE">
        <BevelButton
          label="PLAY"
          material="wood"
          size={landscape ? 'lg' : 'hero'}
          weight="hero"
          fullWidth
          onPress={() => router.push('/lobby')}
        />
      </CtaBadge>

      <View style={styles.chips}>
        <BevelButton
          material="glass"
          size="sm"
          accessibilityLabel="Solo practice. Start immediately with three bots."
          loading={singlePlayerLoading}
          onPress={handleSinglePlayer}>
          <Icon name="play" />
          <PidroText role="label" style={PidroBevel.glassLabelShadow}>
            Solo practice
          </PidroText>
        </BevelButton>
        <BevelButton
          material="glass"
          size="sm"
          accessibilityLabel="Play with friends. Create a table and invite them."
          onPress={() => router.push('/lobby')}>
          <Icon name="friends" />
          <PidroText role="label" style={PidroBevel.glassLabelShadow}>
            Play with friends
          </PidroText>
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
  identityCopy: {
    minWidth: 0,
    maxWidth: 170,
  },
  progression: {
    alignItems: 'flex-end',
    gap: 4,
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: PidroSpacing.sm,
  },
});
