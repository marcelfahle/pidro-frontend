import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { lobbyApi } from '@/api/lobby';
import { useLobbyChannel } from '@/channels/hooks/useLobbyChannel';
import { CreateRoomModal } from '@/components/lobby/CreateRoomModal';
import { RoomCard } from '@/components/lobby/RoomCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PidroText } from '@/components/ui/PidroText';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Surface } from '@/components/ui/Surface';
import { PidroColors, PidroSpacing } from '@/design/tokens';
import { useAuthStore } from '@/stores/auth';
import { useLobbyStore } from '@/stores/lobby';
import type { CreateRoomRequest, Position, Room } from '@/types/lobby';
import { apiErrorInfo } from '@/utils/apiErrors';

function roomHasUser(room: Room, userId?: string | null): boolean {
  if (!userId) return false;
  if (room.player_ids?.includes(userId)) return true;
  if (room.positions && Object.values(room.positions).includes(userId)) return true;
  return (
    room.seats?.some((seat) => seat.player?.id === userId || seat.player_id === userId) ?? false
  );
}

function uniqueRooms(rooms: Room[]): Room[] {
  const seen = new Set<string>();
  return rooms.filter((room) => {
    if (!room.code || seen.has(room.code)) return false;
    seen.add(room.code);
    return true;
  });
}

function filterByQuery(rooms: Room[], query: string): Room[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return rooms;
  return rooms.filter((room) => {
    const haystack = `${room.name ?? ''} ${room.metadata?.name ?? ''} ${room.code}`.toLowerCase();
    return haystack.includes(normalized);
  });
}

export default function LobbyScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const user = useAuthStore((state) => state.user);
  const {
    rooms,
    lobby,
    stats,
    isLoading,
    error,
    setRooms,
    setLobby,
    setStats,
    setLoading,
    setError,
    upsertLobbyRoom,
  } = useLobbyStore();
  const [query, setQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useLobbyChannel();

  const activeRooms = useMemo(
    () =>
      uniqueRooms([
        ...lobby.my_rejoinable,
        ...lobby.open_tables.filter((room) => roomHasUser(room, user?.id)),
        ...rooms.filter((room) => room.status !== 'finished' && roomHasUser(room, user?.id)),
      ]),
    [lobby.my_rejoinable, lobby.open_tables, rooms, user?.id]
  );
  const activeRoom = activeRooms[0] ?? null;
  const openTables = useMemo(
    () =>
      filterByQuery(
        lobby.open_tables.filter((room) => !roomHasUser(room, user?.id)),
        query
      ),
    [lobby.open_tables, query, user?.id]
  );
  const rejoinableTables = useMemo(() => filterByQuery(activeRooms, query), [activeRooms, query]);
  const substituteTables = useMemo(
    () => filterByQuery(lobby.substitute_needed, query),
    [lobby.substitute_needed, query]
  );
  const watchTables = useMemo(
    () => filterByQuery(lobby.spectatable, query),
    [lobby.spectatable, query]
  );
  const isEmptyLobby =
    !isLoading &&
    rejoinableTables.length === 0 &&
    openTables.length === 0 &&
    substituteTables.length === 0 &&
    watchTables.length === 0;

  const loadLobby = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await lobbyApi.listLobby();
      setLobby(response.lobby);
      setStats({ active_games: response.rooms.length });
    } catch (categorizedError) {
      console.warn('Categorized lobby unavailable, falling back to rooms:', categorizedError);
      try {
        const response = await lobbyApi.listRooms();
        setRooms(response?.rooms || []);
        if (response?.meta) setStats(response.meta);
      } catch (fallbackError) {
        setError('We could not load the tables. Please try again.');
        console.error('Load lobby error:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  }, [setError, setLoading, setLobby, setRooms, setStats]);

  useEffect(() => {
    loadLobby();
  }, [loadLobby]);

  const handleJoinRoom = async (code: string, position?: Position) => {
    try {
      const response = await lobbyApi.joinRoom(code, position);
      upsertLobbyRoom(response.room, 'my_rejoinable');
      router.push(`/game/${code}`);
    } catch (joinError: unknown) {
      const { code: errorCode, detail } = apiErrorInfo(joinError);
      if (errorCode === 'ALREADY_IN_ROOM') {
        if (activeRoom?.code === code) {
          router.push(`/game/${code}`);
          return;
        }
        Alert.alert(
          'You are already playing',
          activeRoom
            ? `You are already at table ${activeRoom.code}. Rejoin it or leave before joining another table.`
            : 'You are already at another table. Refresh the lobby to rejoin or leave it first.'
        );
        return;
      }
      Alert.alert('Could not join', detail || 'That table may be full or no longer available.');
    }
  };

  const handleCreateRoom = async (data: CreateRoomRequest) => {
    setIsCreating(true);
    setCreateError(null);
    try {
      const response = await lobbyApi.createRoom(data);
      if (!response?.code) throw new Error('No room code returned');
      if (response.room) upsertLobbyRoom(response.room, 'my_rejoinable');
      setIsCreateModalOpen(false);
      router.replace(`/game/${response.code}`);
    } catch (createRoomError: unknown) {
      const { code, detail } = apiErrorInfo(createRoomError);
      if (code === 'ALREADY_IN_ROOM') {
        if (activeRoom) {
          setCreateError(
            `You are already at table ${activeRoom.code}. Rejoin it or leave before creating another table.`
          );
        } else {
          try {
            await lobbyApi.leaveRoom('current');
            const retryResponse = await lobbyApi.createRoom(data);
            if (!retryResponse?.code) throw new Error('No room code returned after retry');
            if (retryResponse.room) {
              upsertLobbyRoom(retryResponse.room, 'my_rejoinable');
            }
            setIsCreateModalOpen(false);
            router.replace(`/game/${retryResponse.code}`);
            return;
          } catch (retryError) {
            const retryDetail = apiErrorInfo(retryError).detail;
            setCreateError(
              retryDetail
                ? `We could not clear your previous table: ${retryDetail}`
                : 'The server still has you at another table. Refresh the lobby, then rejoin or leave it before creating a new table.'
            );
          }
        }
      } else {
        setCreateError(
          detail
            ? `We could not create the table: ${detail}`
            : 'We could not create the table. Please try again.'
        );
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleNewTable = () => {
    if (activeRoom) {
      Alert.alert('Current table', `You are already at table ${activeRoom.code}.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Rejoin', onPress: () => router.push(`/game/${activeRoom.code}`) },
      ]);
      return;
    }
    setCreateError(null);
    setIsCreateModalOpen(true);
  };

  return (
    <ScreenShell testID="lobby-screen" contentStyle={styles.shell}>
      <ScreenHeader
        title="Multiplayer"
        subtitle={`${stats.online_players} online · ${stats.active_games} active games`}
        onBack={() => router.replace('/home')}
        trailing={<Button label="New table" onPress={handleNewTable} size="sm" />}
      />

      <Surface variant="panel" style={[styles.panel, isEmptyLobby && styles.panelEmpty]} padded>
        <View style={styles.searchRow}>
          <Input
            value={query}
            onChangeText={setQuery}
            placeholder="Search tables"
            returnKeyType="search"
            accessibilityLabel="Search tables"
            containerClassName="flex-1"
          />
          <Button
            accessibilityLabel="Refresh tables"
            variant="secondary"
            size="icon"
            onPress={loadLobby}
            disabled={isLoading}>
            <Feather name="refresh-cw" size={21} color={PidroColors.text} />
          </Button>
        </View>

        {error ? (
          <Surface variant="subtle" style={styles.error} accessibilityRole="alert">
            <PidroText role="metadata" tone="danger">
              {error}
            </PidroText>
          </Surface>
        ) : null}

        {isLoading && rooms.length === 0 ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={PidroColors.cyan} />
            <PidroText role="body" tone="soft">
              Loading tables…
            </PidroText>
          </View>
        ) : (
          <ScrollView
            style={[styles.roomScroll, isEmptyLobby && styles.roomScrollEmpty]}
            contentContainerStyle={styles.roomScrollContent}
            showsVerticalScrollIndicator={false}>
            {rejoinableTables.length > 0 ? (
              <View style={styles.section}>
                <SectionHeader title="Your tables" count={rejoinableTables.length} />
                {rejoinableTables.map((room) => (
                  <ActionRoomRow
                    key={`mine-${room.code}`}
                    room={room}
                    label="Rejoin"
                    primary
                    onPress={() => router.push(`/game/${room.code}`)}
                  />
                ))}
              </View>
            ) : null}

            <View style={styles.section}>
              <SectionHeader title="Open tables" count={openTables.length} />
              {openTables.length > 0 ? (
                <View style={[styles.roomGrid, landscape && styles.roomGridLandscape]}>
                  {openTables.map((room) => (
                    <View key={room.code} style={landscape && styles.roomCellLandscape}>
                      <RoomCard
                        room={room}
                        onJoin={handleJoinRoom}
                        currentUserId={user?.id}
                        currentUsername={user?.username}
                      />
                    </View>
                  ))}
                </View>
              ) : (
                <Surface variant="subtle" style={styles.empty}>
                  <PidroText role="label" align="center">
                    No open tables
                  </PidroText>
                  <PidroText role="body" tone="soft" align="center">
                    Create a new table, or start a solo game from Home.
                  </PidroText>
                </Surface>
              )}
            </View>

            {substituteTables.length > 0 ? (
              <View style={styles.section}>
                <SectionHeader title="Needs a player" count={substituteTables.length} />
                {substituteTables.map((room) => (
                  <ActionRoomRow
                    key={`sub-${room.code}`}
                    room={room}
                    label="Join as substitute"
                    onPress={() => handleJoinRoom(room.code)}
                  />
                ))}
              </View>
            ) : null}

            {watchTables.length > 0 ? (
              <View style={styles.section}>
                <SectionHeader title="Watch" count={watchTables.length} />
                {watchTables.map((room) => (
                  <ActionRoomRow
                    key={`watch-${room.code}`}
                    room={room}
                    label="Watch"
                    onPress={() => router.push(`/game/${room.code}`)}
                  />
                ))}
              </View>
            ) : null}
          </ScrollView>
        )}
      </Surface>

      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setCreateError(null);
        }}
        onSubmit={handleCreateRoom}
        isLoading={isCreating}
        username={user?.username}
        error={createError}
      />
    </ScreenShell>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <View style={styles.sectionHeader}>
      <PidroText role="label">{title}</PidroText>
      <PidroText role="metadata" tone="muted">
        {count}
      </PidroText>
    </View>
  );
}

function ActionRoomRow({
  room,
  label,
  onPress,
  primary = false,
}: {
  room: Room;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  const roomName = room.name || room.metadata?.name || `Table ${room.code}`;
  const players =
    room.player_count ??
    room.players_count ??
    room.seats?.filter((seat) => seat.status === 'occupied' || seat.player).length ??
    0;

  return (
    <Surface variant="subtle" style={[styles.actionRoom, primary && styles.actionRoomPrimary]}>
      <View style={styles.actionRoomCopy}>
        <PidroText role="label" numberOfLines={1}>
          {roomName}
        </PidroText>
        <PidroText role="metadata" tone="muted" numberOfLines={1}>
          Table {room.code} · {room.status} · {players}/4
        </PidroText>
      </View>
      <Button
        label={label}
        variant={primary ? 'default' : 'secondary'}
        size="sm"
        onPress={onPress}
      />
    </Surface>
  );
}

const styles = StyleSheet.create({
  shell: {
    gap: PidroSpacing.sm,
  },
  panel: {
    minHeight: 0,
    flex: 1,
    gap: PidroSpacing.sm,
  },
  panelEmpty: {
    flexBasis: 'auto',
    flexGrow: 0,
    flexShrink: 0,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.xs,
  },
  error: {
    borderColor: PidroColors.dangerBorder,
    padding: PidroSpacing.sm,
  },
  loading: {
    minHeight: 180,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: PidroSpacing.sm,
  },
  roomScroll: {
    minHeight: 0,
    flex: 1,
  },
  roomScrollEmpty: {
    flexBasis: 'auto',
    flexGrow: 0,
    flexShrink: 0,
  },
  roomScrollContent: {
    gap: PidroSpacing.lg,
    paddingBottom: PidroSpacing.xxs,
  },
  section: {
    gap: PidroSpacing.sm,
  },
  sectionHeader: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: PidroSpacing.sm,
  },
  roomGrid: {
    gap: PidroSpacing.sm,
  },
  roomGridLandscape: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  roomCellLandscape: {
    width: '49%',
  },
  empty: {
    alignItems: 'center',
    gap: PidroSpacing.xs,
    padding: PidroSpacing.lg,
  },
  actionRoom: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.sm,
    padding: PidroSpacing.sm,
  },
  actionRoomPrimary: {
    borderColor: PidroColors.goldDark,
    backgroundColor: PidroColors.goldSoft,
  },
  actionRoomCopy: {
    minWidth: 0,
    flex: 1,
    gap: PidroSpacing.xxs,
  },
});
