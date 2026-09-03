import { useState } from 'react';
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { lobbyApi } from '@/api/lobby';
import { Button } from '@/components/ui/Button';
import { MenuAction } from '@/components/ui/MenuAction';
import { PidroLogo } from '@/components/ui/PidroLogo';
import { PidroText } from '@/components/ui/PidroText';
import { PressableFX } from '@/components/ui/PressableFX';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Surface } from '@/components/ui/Surface';
import { PidroColors, PidroLayout, PidroRadii, PidroSpacing } from '@/design/tokens';
import { useAuthStore } from '@/stores/auth';
import { useLobbyStore } from '@/stores/lobby';
import { apiErrorInfo } from '@/utils/apiErrors';
import { gameRoute } from '@/navigation/gameRoute';

export default function HomeScreen() {
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const user = useAuthStore((state) => state.user);
  const upsertLobbyRoom = useLobbyStore((state) => state.upsertLobbyRoom);
  const router = useRouter();
  const [singlePlayerLoading, setSinglePlayerLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <ScreenShell testID="home-screen" contentStyle={styles.shell}>
      <View style={styles.topBar}>
        <PressableFX
          accessibilityRole="button"
          accessibilityLabel="Open your profile"
          onPress={() => router.push('/profile')}
          style={styles.playerPlate}
          pressedStyle={styles.playerPlatePressed}>
          <Image
            source={require('../assets/images/avatar1.png')}
            style={styles.avatar}
            resizeMode="cover"
            accessibilityLabel="Your profile picture"
          />
          <View style={styles.playerCopy}>
            <PidroText role="metadata" tone="gold">
              Welcome back
            </PidroText>
            <PidroText role="label" numberOfLines={1}>
              {user?.username ?? 'Player'}
            </PidroText>
          </View>
          <Feather name="chevron-right" size={18} color={PidroColors.textMuted} />
        </PressableFX>

        <View style={styles.utilityActions} accessibilityLabel="Help and settings">
          <Button
            accessibilityLabel="Help"
            variant="ghost"
            size="icon"
            onPress={() => router.push('/help')}
            style={styles.utilityButton}>
            <Feather name="help-circle" size={21} color={PidroColors.textSoft} />
          </Button>
          <Button
            accessibilityLabel="Settings"
            variant="ghost"
            size="icon"
            onPress={() => router.push('/settings')}
            style={styles.utilityButton}>
            <Feather name="settings" size={21} color={PidroColors.textSoft} />
          </Button>
        </View>
      </View>

      <View style={[styles.main, landscape && styles.mainLandscape]}>
        <View
          style={[styles.logoStage, landscape && styles.logoStageLandscape]}
          pointerEvents="none">
          <PidroLogo size="hero" />
        </View>

        <View style={[styles.actionPane, landscape && styles.actionPaneLandscape]}>
          <View style={styles.intro}>
            <PidroText role="title" align={landscape ? 'left' : 'center'}>
              Choose a table
            </PidroText>
            <PidroText role="body" tone="soft" align={landscape ? 'left' : 'center'}>
              Start a quick game or join friends online.
            </PidroText>
          </View>

          {error ? (
            <Surface variant="subtle" style={styles.error} accessibilityRole="alert">
              <PidroText role="metadata" tone="danger" align="center">
                {error}
              </PidroText>
            </Surface>
          ) : null}

          <View style={styles.playActions}>
            <MenuAction
              title="Single player"
              description="Start immediately with three bots."
              icon="play"
              onPress={handleSinglePlayer}
              loading={singlePlayerLoading}
              variant="primary"
            />
            <MenuAction
              title="Multiplayer"
              description="Find a table or create one for friends."
              icon="users"
              onPress={() => router.push('/lobby')}
            />
            <Button
              label="Have an invite code?"
              variant="outline"
              onPress={() => router.push('/join-code' as Href)}
            />
          </View>
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  shell: {
    gap: PidroSpacing.sm,
  },
  topBar: {
    minHeight: PidroLayout.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: PidroSpacing.sm,
  },
  playerPlate: {
    minWidth: 0,
    maxWidth: 280,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.xs,
    overflow: 'hidden',
    borderRadius: PidroRadii.surface,
    borderWidth: 1,
    borderColor: PidroColors.borderStrong,
    backgroundColor: PidroColors.panelStrong,
    padding: PidroSpacing.xs,
  },
  playerPlatePressed: {
    backgroundColor: PidroColors.glassHover,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: PidroRadii.tight,
    borderWidth: 1,
    borderColor: PidroColors.cyanBorder,
  },
  playerCopy: {
    minWidth: 0,
    flex: 1,
  },
  utilityActions: {
    flexDirection: 'row',
    gap: PidroSpacing.xs,
  },
  utilityButton: {
    borderWidth: 1,
    borderColor: PidroColors.border,
    backgroundColor: PidroColors.panelStrong,
  },
  main: {
    minHeight: 0,
    flex: 1,
  },
  mainLandscape: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.xl,
  },
  logoStage: {
    minHeight: 190,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoStageLandscape: {
    width: '48%',
    minHeight: 0,
    alignSelf: 'stretch',
  },
  actionPane: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    gap: PidroSpacing.md,
    paddingBottom: PidroSpacing.xs,
  },
  actionPaneLandscape: {
    width: '46%',
    maxWidth: 420,
  },
  intro: {
    gap: PidroSpacing.xxs,
  },
  error: {
    borderColor: PidroColors.dangerBorder,
    padding: PidroSpacing.sm,
  },
  playActions: {
    gap: PidroSpacing.sm,
  },
});
