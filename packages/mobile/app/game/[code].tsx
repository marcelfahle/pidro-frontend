import {
  pushGameAction,
  useGameChannel,
  type OwnerDecisionEvent,
  type ProgressionSummary,
  type SeatEvent,
} from '@/channels/hooks/useGameChannel';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLobbyStore } from '@/stores/lobby';
import { useGameStore } from '@/stores/game';
import { useAuthStore } from '@/stores/auth';
import { lobbyApi } from '@/api/lobby';
import { api } from '@/api/client';
import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
import type { Room, SeatType } from '@/types/lobby';
import type { LegalAction, ServerGameState } from '@/types/game';
import { WaitingTable } from '@/components/game/WaitingTable';
import { Background } from '@/components/ui/Background';
import { Button } from '@/components/ui/Button';
import { PidroText } from '@/components/ui/PidroText';
import { Surface } from '@/components/ui/Surface';
import { GameTable } from '@/components/game/GameTable';
import { PidroSpacing } from '@/design/tokens';
import { USE_SKIA_TABLE } from '@/game/featureFlags';
import { loadGameCanvasTable } from '@/game/canvas/loadGameCanvasTable';

type SkiaTableProps = {
  room: Room;
  progressionSummary?: ProgressionSummary | null;
  onLeave: () => void;
  onPlayAgain?: (room: Room) => void;
};

/**
 * Loads the Skia table dynamically so the Skia module is NEVER evaluated at app
 * boot (Expo Router imports every route file at startup; an eager Skia import runs
 * before CanvasKit loads and breaks every canvas on web). The platform-specific
 * loader keeps CanvasKit imports out of native bundles.
 */
function SkiaGameTable(props: SkiaTableProps) {
  const [Comp, setComp] = useState<ComponentType<SkiaTableProps> | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    loadGameCanvasTable()
      .then((Component) => {
        if (active) setComp(() => Component);
      })
      .catch((error) => {
        console.error('[GameScreen] failed to load Skia table', error);
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, [loadAttempt]);

  if (loadError) {
    return (
      <Background>
        <View style={styles.tableLoadState}>
          <Surface variant="window" style={styles.tableLoadWindow} padded accessibilityRole="alert">
            <PidroText role="title" align="center">
              The table could not open
            </PidroText>
            <PidroText role="body" tone="soft" align="center">
              Your game is still on the server. Try loading the table again, or leave safely.
            </PidroText>
            <View style={styles.tableLoadActions}>
              <Button
                label="Leave table"
                variant="outline"
                onPress={props.onLeave}
                style={styles.tableLoadButton}
              />
              <Button
                label="Try again"
                onPress={() => {
                  setComp(null);
                  setLoadError(false);
                  setLoadAttempt((attempt) => attempt + 1);
                }}
                style={styles.tableLoadButton}
              />
            </View>
          </Surface>
        </View>
      </Background>
    );
  }

  if (!Comp) {
    return (
      <Background>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="mt-4 text-white/60">Loading table…</Text>
        </View>
      </Background>
    );
  }
  return <Comp {...props} />;
}

const styles = StyleSheet.create({
  tableLoadState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: PidroSpacing.md,
  },
  tableLoadWindow: {
    width: '100%',
    maxWidth: 520,
    gap: PidroSpacing.md,
  },
  tableLoadActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: PidroSpacing.sm,
  },
  tableLoadButton: {
    minWidth: 144,
    flex: 1,
  },
});

/**
 * Full-screen game view for Pidro
 * Route: /game/{room_code}
 */
export default function GameScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const rooms = useLobbyStore((s) => s.rooms);
  const updateRoom = useLobbyStore((s) => s.updateRoom);
  const youPlayerId = useAuthStore((s) => s.user?.id ?? '');
  const youUsername = useAuthStore((s) => s.user?.username ?? null);
  const authHydrated = useAuthStore((s) => s.hydrated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const initGame = useGameStore((s) => s.initFromRoom);
  const resetGame = useGameStore((s) => s.reset);
  const setServerState = useGameStore((s) => s.setServerState);
  const setLegalActions = useGameStore((s) => s.setLegalActions);
  const youPositionAbs = useGameStore((s) => s.youPositionAbs);
  const setSeatStatus = useGameStore((s) => s.setSeatStatus);

  // NOTE: We don't use useLobbyChannel here - game screen relies on GameChannel for updates
  // Lobby channel stays connected in the background via lobby.tsx in the navigation stack

  const [roomLookup, setRoomLookup] = useState<{
    roomCode: string;
    room?: Room;
  } | null>(null);
  const room =
    rooms.find((candidate) => candidate.code === code) ??
    (roomLookup?.roomCode === code ? roomLookup.room : undefined);
  const [progressionResult, setProgressionResult] = useState<{
    roomCode: string;
    summary: ProgressionSummary;
  } | null>(null);
  const progressionSummary =
    progressionResult?.roomCode === code ? progressionResult.summary : null;

  // Hide status bar when entering game
  useEffect(() => {
    StatusBar.setHidden(true, 'slide');
    return () => {
      StatusBar.setHidden(false, 'slide');
    };
  }, []);

  // Initialize game store when room is available and we have user info
  useEffect(() => {
    if (room && youPlayerId) {
      initGame({ room, youPlayerId });
    }
  }, [room, youPlayerId, initGame]);

  useEffect(() => {
    if (youPositionAbs && youUsername) {
      setSeatStatus(youPositionAbs, 'normal', youUsername);
    }
  }, [youPositionAbs, youUsername, setSeatStatus]);

  // Get current game phase from the game store
  const serverPhase = useGameStore((s) => s.serverState?.phase);
  const shouldRestoreServerState =
    (room?.status === 'playing' || room?.status === 'finished') && !serverPhase;

  // Refetch the room once when the game starts: the snapshot fetched while
  // 'waiting' predates late joiners, so seat usernames would otherwise stay
  // stale placeholders for the whole game.
  const refreshedForGameRef = useRef<string | null>(null);
  useEffect(() => {
    if (!serverPhase || !code || !authHydrated || !accessToken) return;
    if (refreshedForGameRef.current === code) return;
    refreshedForGameRef.current = code;
    lobbyApi
      .getRoom(code)
      .then((fetchedRoom) => {
        setRoomLookup({ roomCode: code, room: fetchedRoom });
        updateRoom(fetchedRoom);
      })
      .catch(() => {});
  }, [serverPhase, code, authHydrated, accessToken, updateRoom]);

  // Debug: track status changes
  console.log('[GameScreen] room.status=', room?.status, 'serverPhase=', serverPhase);

  // Subscribe to the game channel as soon as we're seated — including while the
  // room is still 'waiting'. The server broadcasts the initial game_state on
  // this channel when the game starts, so a waiting owner/joiner flips to the
  // table without needing a lobby-channel round trip (previously the owner
  // could stay stuck on the waiting screen after the last seat filled).
  const hasGameState = !!serverPhase;
  const canJoinGameChannel =
    authHydrated && !!accessToken && !!room && (room.status !== 'finished' || hasGameState);
  const handleSeatEvent = useCallback((event: SeatEvent) => {
    Alert.alert(event.variant === 'error' ? 'Table Error' : 'Table Update', event.message);
  }, []);

  const handleOwnerDecision = useCallback((event: OwnerDecisionEvent) => {
    Alert.alert(
      'Seat Filled by Bot',
      `${event.playerName} did not return. Open the seat for a substitute?`,
      [
        { text: 'Keep Bot', style: 'cancel' },
        {
          text: 'Open Seat',
          onPress: () => {
            pushGameAction('open_seat', { position: event.position }).catch((error: unknown) => {
              const message =
                typeof error === 'object' && error !== null && 'reason' in error
                  ? String((error as { reason: string }).reason)
                  : 'Failed to open seat';
              Alert.alert('Action Failed', message);
            });
          },
        },
      ]
    );
  }, []);

  const handleProgressionSummary = useCallback(
    (summary: ProgressionSummary) => {
      if (code) setProgressionResult({ roomCode: code, summary });
    },
    [code]
  );

  useGameChannel({
    roomCode: code ?? '',
    enabled: canJoinGameChannel,
    onSeatEvent: handleSeatEvent,
    onOwnerDecision: handleOwnerDecision,
    onProgressionSummary: handleProgressionSummary,
  });

  useEffect(() => {
    if (!code || !authHydrated || !accessToken || !shouldRestoreServerState) {
      return;
    }

    let cancelled = false;

    const restoreServerState = async () => {
      try {
        const response = await api.get<{
          data?: {
            state?: ServerGameState;
            game_state?: ServerGameState;
            legal_actions?: LegalAction[];
          };
          state?: ServerGameState;
          game_state?: ServerGameState;
          legal_actions?: LegalAction[];
        }>(`/api/v1/rooms/${code}/state`);
        if (cancelled) return;

        const payload = response.data;
        const restoredState =
          payload?.data?.state ??
          payload?.data?.game_state ??
          payload?.state ??
          payload?.game_state ??
          null;
        const legalActions = payload?.data?.legal_actions ?? payload?.legal_actions ?? [];

        if (restoredState) {
          setServerState(restoredState);
          setLegalActions(legalActions);
        }
      } catch (error) {
        console.warn('[GameScreen] Failed to restore game state:', error);
      }
    };

    restoreServerState();

    return () => {
      cancelled = true;
    };
  }, [accessToken, authHydrated, code, setLegalActions, setServerState, shouldRestoreServerState]);

  // Clean up game store when leaving screen
  useEffect(() => {
    console.log('[GameScreen] MOUNTED');
    return () => {
      console.log('[GameScreen] UNMOUNTING - calling resetGame');
      resetGame();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch room details on entry. The lobby store can be stale after a refresh or
  // route restore, so always ask the server for the current room status.
  useEffect(() => {
    let cancelled = false;

    const fetchRoom = async () => {
      if (!code || !authHydrated || !accessToken) return;

      try {
        const fetchedRoom = await lobbyApi.getRoom(code);
        if (cancelled) return;
        setRoomLookup({ roomCode: code, room: fetchedRoom });
        updateRoom(fetchedRoom);
      } catch (error) {
        if (!cancelled) setRoomLookup({ roomCode: code });
        console.error('Failed to fetch room details', error);
      }
    };

    fetchRoom();

    return () => {
      cancelled = true;
    };
  }, [accessToken, authHydrated, code, updateRoom]);

  const handlePlayAgain = useCallback(
    async (oldRoom: Room) => {
      const seats = oldRoom.seats ?? [];
      const seatType = (index: number): SeatType => {
        const seat = seats.find((s) => s.seat_index === index);
        if (seat?.player?.is_bot) return 'ai';
        return 'open';
      };
      const seatConfig = {
        seat_2: seatType(1),
        seat_3: seatType(2),
        seat_4: seatType(3),
      };
      const hasBot =
        seatConfig.seat_2 === 'ai' || seatConfig.seat_3 === 'ai' || seatConfig.seat_4 === 'ai';

      try {
        const result = await lobbyApi.createRoom({
          name: oldRoom.name ?? 'Game Room',
          settings: { min_games: 1, time_limit: 0, private: false },
          seats: seatConfig,
          ...(hasBot && { bot_difficulty: 'basic' }),
        });
        const newCode = result?.code;
        if (newCode) {
          router.replace(`/game/${newCode}`);
          return;
        }
      } catch (error) {
        console.error('[GameScreen] Failed to create new game:', error);
      }
      router.replace('/lobby');
    },
    [router]
  );

  const handleLeaveGame = () => {
    const roomCode = room?.code ?? code;

    if (roomCode) {
      void lobbyApi.leaveRoom(roomCode).catch((error) => {
        console.warn('Failed to leave room:', error);
      });
    }

    router.replace('/lobby');
  };

  if (!room && roomLookup?.roomCode !== code) {
    return (
      <Background>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="mt-4 text-white/60">Joining room...</Text>
        </View>
      </Background>
    );
  }

  if (shouldRestoreServerState && authHydrated && accessToken) {
    return (
      <Background>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="mt-4 text-white/60">Restoring table...</Text>
        </View>
      </Background>
    );
  }

  if (!room) {
    return (
      <Background>
        <SafeAreaView style={{ flex: 1 }}>
          <View className="flex-1 items-center justify-center p-4">
            <Text className="text-xl font-bold text-white">Room not found</Text>
            <TouchableOpacity
              onPress={handleLeaveGame}
              className="mt-4 rounded-lg bg-white/10 px-6 py-3">
              <Text className="font-semibold text-white">Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Background>
    );
  }

  // Show game table when we have active game state (any in-game phase)
  // This prevents unmounting during phase transitions like dealer_selection
  const inGamePhases = [
    'dealer_selection',
    'dealing',
    'bidding',
    'declaring',
    'declaring_trump',
    'trump_declaration',
    'discarding',
    'second_deal',
    'playing',
    'scoring',
    'hand_complete',
    'complete',
    'game_over',
    'finished',
  ];
  const isInGamePhase = serverPhase && inGamePhases.includes(serverPhase);

  if (room.status === 'playing' || isInGamePhase) {
    // Skia canvas table behind a flag (default off); legacy GameTable is the reference.
    return USE_SKIA_TABLE ? (
      <SkiaGameTable
        room={room}
        progressionSummary={progressionSummary}
        onLeave={handleLeaveGame}
        onPlayAgain={handlePlayAgain}
      />
    ) : (
      <GameTable
        room={room}
        progressionSummary={progressionSummary}
        onLeave={handleLeaveGame}
        onPlayAgain={handlePlayAgain}
      />
    );
  }

  return <WaitingTable room={room} youPlayerId={youPlayerId} onLeave={handleLeaveGame} />;
}
