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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { RuleSet } from '@pidro/shared';
import { RuleSetChip, RuleSetSelector, ruleSetLabel } from '@/components/rules/RuleSet';
import { filterRuleSet, lobbyRuleSetFilter } from '@/features/rules/ruleSets';
import { lobbyFixture } from '@/features/rules/fixtures';
import { useSettingsStore } from '@/stores/settings';
import { t } from '@/i18n';
import { publicPlayerName } from '@pidro/shared';
import { captureAnalytics } from '@/analytics/PostHogAnalytics';
import { lobbyApi } from '@/api/lobby';
import { useLobbyChannel } from '@/channels/hooks/useLobbyChannel';
import { CreateRoomModal } from '@/components/lobby/CreateRoomModal';
import { RoomCard } from '@/components/lobby/RoomCard';
import { OpenChair, TableTop } from '@/components/lobby/TableTop';
import { AuthFlowButton, AuthFlowHeading } from '@/components/auth/AuthFlow';
import { AuthSheet } from '@/components/auth/AuthSheet';
import { BevelButton } from '@/components/ui/BevelButton';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { PidroText } from '@/components/ui/PidroText';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Surface } from '@/components/ui/Surface';
import { TextLink } from '@/components/ui/TextLink';
import { PidroColors, PidroLayout, PidroSpacing } from '@/design/tokens';
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

function filterByQuery(rooms: Room[], query: string): Room[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return rooms;
  return rooms.filter((room) => {
    const haystack = `${room.name ?? ''} ${room.code}`.toLowerCase();
    return haystack.includes(normalized);
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
  const preferred = useSettingsStore((state) => state.preferredRuleSet);
  const savedFilter = useSettingsStore((state) => state.lobbyRuleSetFilter);
  const saveFilter = useSettingsStore((state) => state.setLobbyRuleSetFilter);
  const [fixtureFilter, setFixtureFilter] = useState<RuleSet | 'all'>(fixture?.filter ?? 'all');
  const filter = fixture ? fixtureFilter : lobbyRuleSetFilter(preferred, savedFilter);
  const changeFilter = fixture ? setFixtureFilter : saveFilter;
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
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
  const [query, setQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);
  const pendingAccountActionRef = useRef<(() => Promise<void>) | null>(null);
  const realtimeRevisionRef = useRef(0);
  const quickGame = useQuickGame(playerName);

  const requestAccount = (retry: () => Promise<void>) => {
    pendingAccountActionRef.current = retry;
    setIsCreateModalOpen(false);
    setAccountSheetOpen(true);
  };

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
    () =>
      filterByQuery(
        filterRuleSet(
          lobby.open_tables.filter((room) => !roomHasUser(room, user?.id)),
          filter
        ),
        query
      ),
    [lobby.open_tables, query, user?.id, filter]
  );
  const rejoinableTables = useMemo(
    () => filterByQuery(filterRuleSet(activeRooms, filter), query),
    [activeRooms, query, filter]
  );
  const substituteTables = useMemo(
    () => filterByQuery(filterRuleSet(lobby.substitute_needed, filter), query),
    [lobby.substitute_needed, query, filter]
  );
  const watchTables = useMemo(
    () => filterByQuery(filterRuleSet(lobby.spectatable, filter), query),
    [lobby.spectatable, query, filter]
  );
  const visibleTableCount =
    rejoinableTables.length + openTables.length + substituteTables.length + watchTables.length;
  const hasQuery = query.trim().length > 0;
  const hasNoResults = !isLoading && hasQuery && visibleTableCount === 0;
  const isUnavailable = !isLoading && !!error && visibleTableCount === 0;
  const isEmptyLobby =
    !isLoading && !hasQuery && !isUnavailable && activeRooms.length === 0 &&
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

  const handleJoinRoom = async (code: string, position?: Position, mayRequestAccount = true) => {
    if (fixture) return;
    try {
      const response = await lobbyApi.joinRoom(code, position);
      captureAnalytics('room_joined', { join_source: 'lobby' });
      upsertLobbyRoom(response.room, 'my_rejoinable');
      router.push(`/game/${code}`);
    } catch (joinError: unknown) {
      const { code: errorCode, detail } = apiErrorInfo(joinError);
      if (errorCode === 'ACCOUNT_REQUIRED') {
        if (mayRequestAccount) {
          requestAccount(() => handleJoinRoom(code, position, false));
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

  const handleWatchRoom = async (code: string, mayRequestAccount = true) => {
    if (fixture) return;
    try {
      await lobbyApi.watchRoom(code);
      router.push(`/game/${code}`);
    } catch (watchError: unknown) {
      const { code: errorCode, detail } = apiErrorInfo(watchError);
      if (errorCode === 'ACCOUNT_REQUIRED' && mayRequestAccount) {
        requestAccount(() => handleWatchRoom(code, false));
        return;
      }
      Alert.alert('Could not watch', detail || 'That table may no longer be available.');
    }
  };

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
            `You are already at table ${activeRoom.code}. Rejoin it or leave before creating another table.`
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
        <View style={!landscape && styles.headerTitle}>
          <PidroText role="label" numberOfLines={1}>
            Tables
          </PidroText>
        </View>
        {landscape && !isEmptyLobby ? search : null}
        {landscape && isEmptyLobby ? <View style={styles.headerTitle} /> : null}
        {(fixture ? 8 : stats.online_players) > 1 ? (
          <PidroText
            role="metadata"
            tone="soft"
            accessibilityLabel={`${fixture ? 8 : stats.online_players} players online`}>
            <PidroText role="metadata" style={styles.onlineDot}>
              ●{' '}
            </PidroText>
            {fixture ? 8 : stats.online_players} online
          </PidroText>
        ) : null}
        <BevelButton
          material="glass"
          size="icon"
          accessibilityLabel="Create table"
          onPress={handleNewTable}>
          <Icon name="plus" size={22} />
        </BevelButton>
      </View>
      {!landscape && !isEmptyLobby ? search : null}
      <View testID="lobby-rule-filter">
        <RuleSetSelector value={filter} onChange={changeFilter} includeAll />
      </View>

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
        ) : !isLoading && !isEmptyLobby && visibleTableCount === 0 && filter !== 'all' ? (
          <LobbyEmptyState
            title={t('rules.empty', { rules: ruleSetLabel(filter) })}
            description=""
            actionLabel={t('rules.showAll')}
            onAction={() => {
              changeFilter('all');
              setQuery('');
            }}
          />
        ) : isEmptyLobby ? (
          <EmptyLobby
            onStart={handleNewTable}
            onJoinCode={() => router.push('/join-code')}
            onQuickGame={quickGame.start}
            quickGameLoading={quickGame.loading}
            filter={filter}
            onShowAll={() => changeFilter('all')}
          />
        ) : hasNoResults ? (
          <LobbyEmptyState
            title="No matching tables"
            description="Try a table name or code, or clear your search."
            actionLabel="Clear search"
            onAction={() => setQuery('')}
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
                    onPress={() => {
                      if (!fixture) router.push(`/game/${room.code}`);
                    }}
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
                      currentUsername={playerName}
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

/** Nobody is playing: the table from above and the three ways to start. */
function EmptyLobby({
  onStart,
  onJoinCode,
  onQuickGame,
  quickGameLoading,
  filter,
  onShowAll,
}: {
  onStart: () => void;
  onJoinCode: () => void;
  onQuickGame: () => void;
  quickGameLoading: boolean;
  filter: RuleSet | 'all';
  onShowAll: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const landscape = width > height;
  const tablet = Math.min(width, height) >= 700;
  // The drawing is 340×270; it shrinks to fit a narrow phone or a short landscape screen.
  const scale = Math.min(
    1,
    landscape
      ? (height - insets.top - insets.bottom - 92) / 270
      : (width - insets.left - insets.right - 2 * PidroSpacing.md) / 340
  );
  const at = (value: number) => value * scale;
  const chair = (left: number, top: number) => (
    <OpenChair size={at(52)} style={[styles.emptyChair, { left: at(left), top: at(top) }]} />
  );

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
        style={{ width: at(340), height: at(270) }}>
        <TableTop
          mark={at(40)}
          style={{ left: at(60), top: at(55), width: at(220), height: at(160) }}
        />
        {chair(144, 2)}
        {chair(4, 109)}
        {chair(284, 109)}
        {chair(144, 216)}
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
          {filter !== 'all' ? (
            <>
              <PidroText role="metadata" tone="soft" align="center">
                {t('rules.empty', { rules: ruleSetLabel(filter) })}
              </PidroText>
              <TextLink label={t('rules.showAll')} onPress={onShowAll} />
            </>
          ) : null}
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
        <RuleSetChip
          ruleSet={room.config?.rule_set ?? 'finnish'}
          testID={`room-rules-${room.code}`}
        />
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
    flex: 1,
    minHeight: 0,
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
  emptyChair: { position: 'absolute' },
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
