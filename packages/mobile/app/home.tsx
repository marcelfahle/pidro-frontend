import { useState } from 'react';
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { lobbyApi } from '@/api/lobby';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { PidroLogo } from '@/components/ui/PidroLogo';
import { PidroText } from '@/components/ui/PidroText';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Surface } from '@/components/ui/Surface';
import { PidroColors, PidroRadii, PidroSpacing } from '@/design/tokens';
import { useAuthStore } from '@/stores/auth';
import { useLobbyStore } from '@/stores/lobby';
import { apiErrorInfo } from '@/utils/apiErrors';

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
    router.replace(`/game/${response.code}`);
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
        if (lobbyResponse?.rooms?.length) {
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
      <Surface variant="plaque" style={styles.playerPlate}>
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
      </Surface>

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
              Play a quick solo game or join friends online.
            </PidroText>
          </View>

          {error ? (
            <Surface variant="subtle" style={styles.error} accessibilityRole="alert">
              <PidroText role="metadata" tone="danger" align="center">
                {error}
              </PidroText>
            </Surface>
          ) : null}

          <View style={[styles.playActions, landscape && styles.playActionsLandscape]}>
            <Button
              label="Single player"
              onPress={handleSinglePlayer}
              loading={singlePlayerLoading}
              size="lg"
              style={landscape && styles.playButtonLandscape}
            />
            <Button
              label="Multiplayer"
              onPress={() => router.push('/lobby')}
              size="lg"
              style={landscape && styles.playButtonLandscape}
            />
          </View>

          <View style={styles.utilities} accessibilityLabel="More options">
            <IconButton icon="settings" label="Settings" onPress={() => router.push('/settings')} />
            <IconButton icon="help-circle" label="Help" onPress={() => router.push('/help')} />
            <IconButton icon="user" label="Profile" onPress={() => router.push('/profile')} />
          </View>
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  shell: {
    gap: PidroSpacing.md,
  },
  playerPlate: {
    maxWidth: 280,
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.xs,
    padding: PidroSpacing.xs,
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
    gap: PidroSpacing.md,
    paddingBottom: PidroSpacing.xs,
  },
  actionPaneLandscape: {
    width: '48%',
    maxWidth: 440,
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
  playActionsLandscape: {
    flexDirection: 'row',
  },
  playButtonLandscape: {
    flex: 1,
  },
  utilities: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: PidroSpacing.xs,
  },
});
