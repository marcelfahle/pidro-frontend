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
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { LobbyCategoryKey } from '@pidro/shared';
import { lobbyFixture } from '@/features/lobby/fixtures';
import { filterPlayers, lobbyCounts } from '@/features/lobby/tableRow';
import { pickProfile } from '@/game/canvas/layout';
import { publicPlayerName } from '@pidro/shared';
import { captureAnalytics } from '@/analytics/PostHogAnalytics';
import { lobbyApi } from '@/api/lobby';
import { useLobbyChannel } from '@/channels/hooks/useLobbyChannel';
import { CreateRoomModal } from '@/components/lobby/CreateRoomModal';
import { RoomCard } from '@/components/lobby/RoomCard';
import { OpenChair } from '@/components/lobby/OpenChair';
import { AuthFlowButton, AuthFlowHeading } from '@/components/auth/AuthFlow';
import { AuthSheet } from '@/components/auth/AuthSheet';
import { BevelButton } from '@/components/ui/BevelButton';
import { gradientBg } from '@/components/ui/Bevel';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { PidroText } from '@/components/ui/PidroText';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Surface } from '@/components/ui/Surface';
import { TextLink } from '@/components/ui/TextLink';
import { PidroBevel, PidroColors, PidroLayout, PidroSpacing } from '@/design/tokens';
import { useQuickGame } from '@/hooks/useQuickGame';
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

export default function LobbyScreen() {
  const { fixture: fixtureParam } = useLocalSearchParams<{ fixture?: string }>();
  return <LobbyContent key={fixtureParam ?? 'live'} fixture={lobbyFixture(fixtureParam)} />;
}

function LobbyRealtime({ onUpdate }: { onUpdate: () => void }) {
  useLobbyChannel(onUpdate);
  return null;
}

function LobbyContent({ fixture }: { fixture: ReturnType<typeof lobbyFixture> }) {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const profile = pickProfile(width, height);
  const portraitPhone = profile === 'phone-portrait';
  const columns = portraitPhone ? 1 : profile === 'tablet-landscape' ? 3 : 2;
  const tablet = profile.startsWith('tablet');
  const user = useAuthStore((state) => state.user);
  const playerName = publicPlayerName(user?.username, 'Player', user?.display_name);
  const {
    rooms: storedRooms,
    lobby: storedLobby,
    stats,
    isLoading: storedLoading,
    error: storedError,
    setRooms,
    setLobby,
    setStats,
    setLoading,
    setError,
    upsertLobbyRoom,
  } = useLobbyStore();
  const lobby = fixture?.lobby ?? storedLobby;
  const rooms = fixture ? Object.values(fixture.lobby).flat() : storedRooms;
  const isLoading = fixture ? false : storedLoading;
  const error = fixture ? null : storedError;
  const [query, setQuery] = useState(fixture?.query ?? '');
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [joining, setJoining] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);
  const pendingAccountActionRef = useRef<(() => Promise<void>) | null>(null);
  const realtimeRevisionRef = useRef(0);
  const quickGame = useQuickGame();

  const requestAccount = useCallback((retry: () => Promise<void>) => {
    pendingAccountActionRef.current = retry;
    setIsCreateModalOpen(false);
    setAccountSheetOpen(true);
  }, []);

  const markRealtimeUpdate = useCallback(() => {
    realtimeRevisionRef.current += 1;
  }, []);

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
    () => filterPlayers(lobby.open_tables, query),
    [lobby.open_tables, query]
  );
  const rejoinableTables = useMemo(
    () => filterPlayers(lobby.my_rejoinable, query),
    [lobby.my_rejoinable, query]
  );
  const substituteTables = useMemo(
    () => filterPlayers(lobby.substitute_needed, query),
    [lobby.substitute_needed, query]
  );
  const watchTables = useMemo(
    () => filterPlayers(lobby.spectatable, query),
    [lobby.spectatable, query]
  );
  const visibleTableCount =
    rejoinableTables.length + openTables.length + substituteTables.length + watchTables.length;
  const hasQuery = query.trim().length > 0;
  const hasNoResults = !isLoading && hasQuery && visibleTableCount === 0;
  const isUnavailable = !isLoading && !!error && visibleTableCount === 0;
  const isEmptyLobby =
    !isLoading &&
    !hasQuery &&
    !isUnavailable &&
    activeRooms.length === 0 &&
    Object.values(lobby).every((tables) => tables.length === 0);

  const loadLobby = useCallback(async () => {
    if (fixture) return;
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
  }, [fixture, setError, setLoading, setLobby, setRooms, setStats]);

  useEffect(() => {
    loadLobby();
  }, [loadLobby]);

  const handleJoinRoom = useCallback(
    async function joinRoom(code: string, position?: Position, mayRequestAccount = true) {
      if (fixture || joining) return;
      setJoining(code);
      setRowErrors((errors) => ({ ...errors, [code]: '' }));
      try {
        const response = await lobbyApi.joinRoom(code, position);
        captureAnalytics('room_joined', { join_source: 'lobby' });
        upsertLobbyRoom(response.room, 'my_rejoinable');
        router.push(`/game/${code}`);
      } catch (joinError: unknown) {
        const { code: errorCode, detail } = apiErrorInfo(joinError);
        if (errorCode === 'ACCOUNT_REQUIRED') {
          if (mayRequestAccount) {
            requestAccount(() => joinRoom(code, position, false));
          } else {
            Alert.alert(
              'Could not join',
              detail || 'Your account could not be confirmed. Please try again.'
            );
          }
          return;
        }
        if (errorCode === 'ALREADY_IN_ROOM') {
          if (activeRoom?.code === code) {
            router.push(`/game/${code}`);
            return;
          }
        }
        setRowErrors((errors) => ({
          ...errors,
          [code]: detail || 'That seat may no longer be available.',
        }));
        await loadLobby();
      } finally {
        setJoining(null);
      }
    },
    [fixture, joining, upsertLobbyRoom, router, requestAccount, activeRoom?.code, loadLobby]
  );

  const handleWatchRoom = useCallback(
    async function watchRoom(code: string, mayRequestAccount = true) {
      if (fixture) return;
      try {
        await lobbyApi.watchRoom(code);
        router.push(`/game/${code}`);
      } catch (watchError: unknown) {
        const { code: errorCode, detail } = apiErrorInfo(watchError);
        if (errorCode === 'ACCOUNT_REQUIRED' && mayRequestAccount) {
          requestAccount(() => watchRoom(code, false));
          return;
        }
        Alert.alert('Could not watch', detail || 'That table may no longer be available.');
      }
    },
    [fixture, router, requestAccount]
  );

  const handleRowAction = useCallback(
    (code: string, category: LobbyCategoryKey) => {
      if (fixture) return;
      if (category === 'my_rejoinable') router.push(`/game/${code}`);
      else void handleWatchRoom(code);
    },
    [fixture, router, handleWatchRoom]
  );

  const handleCreateRoom = async (
    data: CreateRoomRequest,
    invite = false,
    mayRequestAccount = true,
    showFailureAlert = false
  ) => {
    if (fixture) return;
    // An invite seat is an open seat; the waiting table opens with its invite sheet up.
    const openTable = (code: string) =>
      router.replace(invite ? `/game/${code}?invite=true` : `/game/${code}`);
    const reportFailure = (message: string) => {
      if (showFailureAlert) Alert.alert('Could not create table', message);
      else setCreateError(message);
    };
    setIsCreating(true);
    setCreateError(null);
    try {
      const response = await lobbyApi.createRoom(data);
      if (!response?.code) throw new Error('No room code returned');
      captureAnalytics('room_created', {
        creation_source: 'lobby',
        has_bots: Object.values(data.seats ?? {}).some((seat) => seat === 'ai'),
      });
      if (response.room) upsertLobbyRoom(response.room, 'my_rejoinable');
      setIsCreateModalOpen(false);
      openTable(response.code);
    } catch (createRoomError: unknown) {
      const { code, detail } = apiErrorInfo(createRoomError);
      if (code === 'ACCOUNT_REQUIRED') {
        if (mayRequestAccount) {
          requestAccount(() => handleCreateRoom(data, invite, false, true));
        } else {
          reportFailure(detail || 'Your account could not be confirmed. Please try again.');
        }
        return;
      }
      if (code === 'ALREADY_IN_ROOM') {
        if (activeRoom) {
          reportFailure(
            'You are already at a table. Rejoin it or leave before creating another table.'
          );
        } else {
          try {
            // No table left to leave is the state the lobby wanted.
            await lobbyApi.leaveRoom('current').catch(() => undefined);
            const retryResponse = await lobbyApi.createRoom(data);
            if (!retryResponse?.code) throw new Error('No room code returned after retry');
            captureAnalytics('room_created', {
              creation_source: 'lobby_retry',
              has_bots: Object.values(data.seats ?? {}).some((seat) => seat === 'ai'),
            });
            if (retryResponse.room) {
              upsertLobbyRoom(retryResponse.room, 'my_rejoinable');
            }
            setIsCreateModalOpen(false);
            openTable(retryResponse.code);
            return;
          } catch (retryError) {
            const retryInfo = apiErrorInfo(retryError);
            if (retryInfo.code === 'ACCOUNT_REQUIRED') {
              if (mayRequestAccount) {
                requestAccount(() => handleCreateRoom(data, invite, false, true));
              } else {
                reportFailure(
                  retryInfo.detail || 'Your account could not be confirmed. Please try again.'
                );
              }
              return;
            }
            const retryDetail = retryInfo.detail;
            reportFailure(
              retryDetail
                ? `We could not clear your previous table: ${retryDetail}`
                : 'The server still has you at another table. Refresh the lobby, then rejoin or leave it before creating a new table.'
            );
          }
        }
      } else {
        reportFailure(
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
    if (fixture) return;
    if (activeRoom) {
      Alert.alert('Current table', 'You are already at a table.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Rejoin', onPress: () => router.push(`/game/${activeRoom.code}`) },
      ]);
      return;
    }
    setCreateError(null);
    setIsCreateModalOpen(true);
  };

  const search = (
    <View style={!portraitPhone && styles.search}>
      <Input
        compact
        value={query}
        onChangeText={setQuery}
        placeholder="Find a player"
        returnKeyType="search"
        accessibilityLabel="Find a player"
        style={{ paddingLeft: 40 }}
      />
      <View pointerEvents="none" style={styles.searchIcon}>
        <Icon name="search" size={18} color={PidroColors.textMuted} />
      </View>
    </View>
  );

  return (
    <ScreenShell testID="lobby-screen" contentStyle={[styles.shell, tablet && styles.tabletShell]}>
      {!fixture ? <LobbyRealtime onUpdate={markRealtimeUpdate} /> : null}
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
        <View style={portraitPhone ? styles.headerTitle : styles.headerCounts}>
          <PidroText role="label" numberOfLines={1}>
            {fixture ? 104 : stats.online_players} playing now
          </PidroText>
          <PidroText role="metadata" tone="soft">
            {lobbyCounts(lobby)}
          </PidroText>
        </View>
        {!portraitPhone && !isEmptyLobby ? search : null}
        {!portraitPhone && isEmptyLobby ? <View style={styles.headerTitle} /> : null}
        <BevelButton
          material={portraitPhone ? 'glass' : 'wood'}
          size={portraitPhone ? 'icon' : 'sm'}
          label={portraitPhone ? undefined : 'Start a table'}
          accessibilityLabel="Start a table"
          onPress={handleNewTable}>
          <Icon name="plus" size={22} />
        </BevelButton>
      </View>
      {portraitPhone && !isEmptyLobby ? search : null}

      <View style={styles.content}>
        {quickGame.error ? (
          <Surface variant="subtle" style={styles.error} accessibilityRole="alert">
            <PidroText role="metadata" tone="danger">
              {quickGame.error}
            </PidroText>
          </Surface>
        ) : null}

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
          />
        ) : isEmptyLobby ? (
          <EmptyLobby
            onStart={handleNewTable}
            onJoinCode={() => router.push('/join-code')}
            onQuickGame={quickGame.start}
            quickGameLoading={quickGame.loading}
          />
        ) : hasNoResults ? (
          <LobbyEmptyState
            title="No matching tables"
            description="Try a player’s name, or clear your search."
            actionLabel="Clear search"
            onAction={() => setQuery('')}
          />
        ) : (
          <ScrollView
            style={styles.roomScroll}
            contentContainerStyle={[
              styles.roomScrollContent,
              portraitPhone && { paddingBottom: 100 },
            ]}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={loadLobby}
                tintColor={PidroColors.cyan}
              />
            }
            showsVerticalScrollIndicator={false}>
            {(
              [
                ['my_rejoinable', 'Your table', rejoinableTables],
                ['open_tables', 'Open tables', openTables],
                ['substitute_needed', 'Needs a substitute', substituteTables],
                ['spectatable', 'Watch', watchTables],
              ] as [LobbyCategoryKey, string, Room[]][]
            ).map(([category, title, tables]) =>
              tables.length ? (
                <View key={category} style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <PidroText role="metadata" tone="cyan" style={styles.eyebrow}>
                      {title}
                    </PidroText>
                    {category === 'open_tables' ? (
                      <PidroText role="metadata" style={styles.goldHint}>
                        Tap an open seat to sit down.
                      </PidroText>
                    ) : null}
                  </View>
                  <View style={styles.roomGrid}>
                    {tables.map((room) => (
                      <View key={room.code} style={{ width: `${100 / columns}%`, padding: 5 }}>
                        <RoomCard
                          room={room}
                          category={category}
                          onJoin={handleJoinRoom}
                          pending={joining === room.code}
                          error={rowErrors[room.code]}
                          onAction={handleRowAction}
                        />
                      </View>
                    ))}
                  </View>
                </View>
              ) : null
            )}
          </ScrollView>
        )}
        {portraitPhone && !isEmptyLobby ? (
          <View
            pointerEvents="box-none"
            style={[
              styles.pinned,
              gradientBg(`linear-gradient(180deg, transparent 0%, ${PidroColors.feltBottom} 45%)`),
            ]}>
            <BevelButton label="Start a table" size="lg" fullWidth onPress={handleNewTable} />
          </View>
        ) : null}
      </View>

      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setCreateError(null);
        }}
        onSubmit={handleCreateRoom}
        isLoading={isCreating}
        username={playerName}
        avatarUrl={user?.avatar_url}
        error={createError}
      />
      <AuthSheet
        isOpen={accountSheetOpen}
        reason="multiplayer"
        onClose={() => {
          pendingAccountActionRef.current = null;
          setAccountSheetOpen(false);
        }}
        onSaved={() => {
          const retry = pendingAccountActionRef.current;
          pendingAccountActionRef.current = null;
          setAccountSheetOpen(false);
          void retry?.();
        }}
        onClaimClassic={() => {
          pendingAccountActionRef.current = null;
          setAccountSheetOpen(false);
          router.push('/(auth)/claim-classic');
        }}
      />
    </ScreenShell>
  );
}

function LobbyEmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
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
          material="glass"
          size="sm"
          onPress={onAction}
          style={styles.emptyAction}
        />
      </View>
    </ScrollView>
  );
}

/** Nobody is playing: four chairs and the three ways to start. */
function EmptyLobby({
  onStart,
  onJoinCode,
  onQuickGame,
  quickGameLoading,
}: {
  onStart: () => void;
  onJoinCode: () => void;
  onQuickGame: () => void;
  quickGameLoading: boolean;
}) {
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const tablet = pickProfile(width, height).startsWith('tablet');
  const chairSize = width < 360 ? 44 : 56;

  return (
    <ScrollView
      style={styles.roomScroll}
      contentContainerStyle={[
        styles.emptyLobby,
        landscape && styles.emptyLobbyLandscape,
        tablet && styles.emptyLobbyTablet,
      ]}
      showsVerticalScrollIndicator={false}>
      <View
        testID="lobby-empty"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.emptyChairs,
          !landscape && !tablet && { marginTop: Math.min(120, height * 0.14) },
        ]}>
        <OpenChair size={chairSize} />
        <OpenChair size={chairSize} />
        <PidroText role="label" tone="muted">
          vs
        </PidroText>
        <OpenChair size={chairSize} />
        <OpenChair size={chairSize} />
      </View>
      <View
        style={
          landscape ? styles.emptyColumnLandscape : [styles.emptyColumn, tablet && styles.grow0]
        }>
        <View style={styles.emptyLobbyCopy}>
          <AuthFlowHeading align="center" hero>
            No one is at a table yet
          </AuthFlowHeading>
          <PidroText role="body" tone="soft" align="center">
            Start one and it shows up here for everyone. Open seats wait for players, and any seat
            can be a bot.
          </PidroText>
        </View>
        {landscape || tablet ? null : <View style={styles.emptySpacer} />}
        <View style={styles.emptyActions}>
          <AuthFlowButton label="Start a table" onPress={onStart} />
          <BevelButton
            label="Join with a table code"
            material="glass"
            size="md"
            fullWidth
            leadingIcon={<Icon name="hash" size={18} />}
            onPress={onJoinCode}
          />
          <TextLink
            label="Or play a quick game with bots"
            disabled={quickGameLoading}
            onPress={onQuickGame}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    minHeight: 0,
    gap: PidroSpacing.sm,
    maxWidth: 1194,
    paddingHorizontal: 20,
  },
  tabletShell: { paddingHorizontal: 48, paddingTop: 32 },
  headerCounts: { width: 170 },
  searchIcon: { position: 'absolute', left: 13, top: 13 },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 1, fontWeight: '900', fontSize: 11 },
  goldHint: { color: PidroBevel.textGold, flexShrink: 1 },
  pinned: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: 28 },
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
    gap: 16,
    paddingBottom: PidroSpacing.md,
  },
  section: {
    gap: 3,
  },
  sectionHeader: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: PidroSpacing.sm,
  },
  roomGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
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
  emptyLobby: {
    flexGrow: 1,
    alignItems: 'center',
    gap: PidroSpacing.md,
    paddingTop: PidroSpacing.xs,
  },
  emptyLobbyLandscape: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: PidroSpacing.xl,
    paddingTop: 0,
  },
  // A tablet has room to spare: the whole stack sits together in the middle.
  emptyLobbyTablet: { justifyContent: 'center', paddingBottom: PidroSpacing.xxl },
  emptyChairs: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  emptyLobbyCopy: { gap: PidroSpacing.xs },
  emptyColumn: {
    width: '100%',
    maxWidth: 400,
    flexGrow: 1,
    gap: PidroSpacing.md,
  },
  emptyColumnLandscape: {
    flex: 1,
    maxWidth: 400,
    justifyContent: 'center',
    gap: PidroSpacing.sm,
  },
  emptySpacer: { flexGrow: 1 },
  grow0: { flexGrow: 0 },
  emptyActions: {
    alignItems: 'stretch',
    gap: PidroSpacing.sm,
  },
});
