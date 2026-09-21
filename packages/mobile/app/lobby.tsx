import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { lobbyApi } from '@/api/lobby';
import { useLobbyChannel } from '@/channels/hooks/useLobbyChannel';
import { CreateRoomModal } from '@/components/lobby/CreateRoomModal';
import { RoomCard } from '@/components/lobby/RoomCard';
import { BevelButton } from '@/components/ui/BevelButton';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { PidroText } from '@/components/ui/PidroText';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Surface } from '@/components/ui/Surface';
import { PidroColors, PidroLayout, PidroSpacing } from '@/design/tokens';
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
    const haystack = `${room.name ?? ''} ${room.code}`.toLowerCase();
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
  const realtimeRevisionRef = useRef(0);

  const markRealtimeUpdate = useCallback(() => {
    realtimeRevisionRef.current += 1;
  }, []);

  useLobbyChannel(markRealtimeUpdate);

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
  const visibleTableCount =
    rejoinableTables.length + openTables.length + substituteTables.length + watchTables.length;
  const hasQuery = query.trim().length > 0;
  const isEmptyLobby = !isLoading && !hasQuery && visibleTableCount === 0;
  const hasNoResults = !isLoading && hasQuery && visibleTableCount === 0;
  const isUnavailable = !isLoading && !!error && visibleTableCount === 0;

  const loadLobby = useCallback(async () => {
    const revisionAtStart = realtimeRevisionRef.current;
    setLoading(true);
    setError(null);
    try {
      const response = await lobbyApi.listLobby();
      if (realtimeRevisionRef.current === revisionAtStart) {
        setLobby(response.lobby);
        setStats({ active_games: response.rooms.length });
      }
    } catch {
      console.warn('[Lobby] Categorized lobby unavailable; falling back to the room list.');
      try {
        const response = await lobbyApi.listRooms();
        if (realtimeRevisionRef.current === revisionAtStart) {
          setRooms(response?.rooms || []);
          if (response?.meta) setStats(response.meta);
        }
      } catch {
        setError('We could not load the tables. Please try again.');
        console.error('[Lobby] Failed to load tables from either lobby endpoint.');
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

  const handleWatchRoom = async (code: string) => {
    try {
      await lobbyApi.watchRoom(code);
      router.push(`/game/${code}`);
    } catch (watchError: unknown) {
      const { detail } = apiErrorInfo(watchError);
      Alert.alert('Could not watch', detail || 'That table may no longer be available.');
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

  const search = (
    <View style={landscape && styles.search}>
      <Input
        value={query}
        onChangeText={setQuery}
        placeholder="Search tables"
        returnKeyType="search"
        accessibilityLabel="Search tables"
      />
    </View>
  );

  return (
    <ScreenShell testID="lobby-screen" contentStyle={styles.shell}>
      <View style={styles.header}>
        <BevelButton
          material="glass"
          size="icon"
          accessibilityLabel="Go back"
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/home');
          }}>
          <Icon name="arrow-left" size={22} />
        </BevelButton>
        <View style={!landscape && styles.headerTitle}>
          <PidroText role="label" numberOfLines={1}>
            Tables
          </PidroText>
        </View>
        {landscape ? search : null}
        <PidroText
          role="metadata"
          tone="soft"
          accessibilityLabel={`${stats.online_players} players online`}>
          <PidroText role="metadata" style={styles.onlineDot}>
            ●{' '}
          </PidroText>
          {stats.online_players} online
        </PidroText>
        <BevelButton
          material="glass"
          size="icon"
          accessibilityLabel="Create table"
          onPress={handleNewTable}>
          <Icon name="plus" size={22} />
        </BevelButton>
      </View>
      {!landscape ? search : null}

      <View style={styles.content}>
        {error && !isUnavailable ? (
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
        ) : isUnavailable ? (
          <LobbyEmptyState
            title="Couldn’t load tables"
            description="We couldn’t load the tables. Please try again."
            actionLabel="Try again"
            onAction={loadLobby}
            quiet
          />
        ) : isEmptyLobby ? (
          <LobbyEmptyState
            title="No tables available"
            description="Create a table and invite your friends."
            actionLabel="Create a table"
            onAction={handleNewTable}
          />
        ) : hasNoResults ? (
          <LobbyEmptyState
            title="No matching tables"
            description="Try a table name or code, or clear your search."
            actionLabel="Clear search"
            onAction={() => setQuery('')}
            quiet
          />
        ) : (
          <ScrollView
            style={styles.roomScroll}
            contentContainerStyle={styles.roomScrollContent}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={loadLobby}
                tintColor={PidroColors.cyan}
              />
            }
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

            {openTables.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.roomGrid}>
                  {openTables.map((room) => (
                    <RoomCard
                      key={room.code}
                      room={room}
                      onJoin={handleJoinRoom}
                      currentUserId={user?.id}
                      currentUsername={user?.username}
                      compact={landscape}
                    />
                  ))}
                </View>
              </View>
            ) : null}

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
                    onPress={() => handleWatchRoom(room.code)}
                  />
                ))}
              </View>
            ) : null}
          </ScrollView>
        )}
      </View>

      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setCreateError(null);
        }}
        onSubmit={handleCreateRoom}
        isLoading={isCreating}
        username={user?.username}
        avatarUrl={user?.avatar_url}
        error={createError}
      />
    </ScreenShell>
  );
}

function LobbyEmptyState({
  title,
  description,
  actionLabel,
  onAction,
  quiet = false,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  quiet?: boolean;
}) {
  return (
    <ScrollView style={styles.roomScroll} keyboardShouldPersistTaps="handled">
      <View testID="lobby-empty-state" style={styles.emptyState}>
        <View style={styles.emptyCopy}>
          <PidroText role="title" align="center">
            {title}
          </PidroText>
          <PidroText role="body" tone="soft" align="center">
            {description}
          </PidroText>
        </View>
        <BevelButton
          label={actionLabel}
          material={quiet ? 'glass' : 'wood'}
          size="sm"
          onPress={onAction}
          style={styles.emptyAction}
        />
      </View>
    </ScrollView>
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
  const roomName = room.name || `Table ${room.code}`;
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
      <BevelButton
        label={label}
        material={primary ? 'wood' : 'glass'}
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
  content: {
    minHeight: 0,
    flex: 1,
    gap: PidroSpacing.sm,
    paddingTop: PidroSpacing.xxs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.xs,
  },
  headerTitle: { flex: 1, minWidth: 0 },
  search: { flex: 1, minWidth: 0 },
  onlineDot: { color: PidroColors.cyan },
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
  roomScrollContent: {
    gap: PidroSpacing.lg,
    paddingBottom: PidroSpacing.md,
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
  emptyState: {
    width: '100%',
    maxWidth: PidroLayout.contentMaxWidth,
    alignSelf: 'center',
    gap: PidroSpacing.sm,
    padding: PidroSpacing.md,
    paddingTop: PidroSpacing.lg,
  },
  emptyCopy: {
    gap: PidroSpacing.xxs,
  },
  emptyAction: {
    alignSelf: 'center',
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
