/**
 * DEV HARNESS — open at /table-dev. Renders the Skia table (M1–M3) behind the M4 RN
 * overlays. `?phase=waiting|playing|bidding|declaring|second_deal|game_over` picks which
 * overlay to show with mock data. Native renders directly; web lazy-loads CanvasKit.
 * DevOverlays is pure RN (no Skia) so it's safe to import statically. Throwaway.
 */
import { useEffect, useState, type ComponentType } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaInsetsContext, SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { WaitingTable } from '@/components/game/WaitingTable';
import { InviteModal } from '@/components/invites/InviteModal';
import { DevOverlays } from '@/game/canvas/DevOverlays';
import { loadGameCanvasDev } from '@/game/canvas/loadGameCanvasDev';
import type { GameCanvasDevProps } from '@/game/canvas/GameCanvasDev';
import type { Position, Room } from '@/types/lobby';
import type { Invite, SeatStatus } from '@pidro/shared';
import { TableFeedback, TableSeatDecision, useTableNotices } from '@/components/game/TableFeedback';
import { loadGameCanvasTable } from '@/game/canvas/loadGameCanvasTable';
import { useGameStore } from '@/stores/game';

const WAITING_ROOM: Room = {
  code: 'DEV01',
  name: 'Friday friends',
  status: 'waiting',
  host_id: 'p-south',
  player_count: 3,
  max_players: 4,
  positions: {
    north: 'p-north',
    east: null,
    south: 'p-south',
    west: 'p-west',
  },
  seats: [
    {
      seat_index: 1,
      status: 'occupied',
      player: { id: 'p-south', username: 'Alexandria the Long-Named Player' },
      position: 'south',
    },
    {
      seat_index: 2,
      status: 'occupied',
      player: { id: 'p-west', username: 'mfios1', avatar_url: fixtureAvatar('i', '#437d9e') },
      position: 'west',
    },
    {
      seat_index: 3,
      status: 'occupied',
      player: { id: 'p-north', username: 'Bot', is_bot: true },
      position: 'north',
    },
    { seat_index: 4, status: 'free', player: null, position: 'east' },
  ],
};

function fixtureAvatar(initial: string, color: string) {
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="${color}"/><text x="40" y="54" text-anchor="middle" font-size="48" fill="white">${initial}</text></svg>`)}`;
}

const INVITE_FIXTURE: Invite = {
  code: '7KQ4M2XB',
  state: 'open',
  url: 'https://www.pidro.online/j/7KQ4M2XB',
  share_text: 'Come play Pidro with me 🃏 https://www.pidro.online/j/7KQ4M2XB — code 7KQ4-M2XB',
  seat_hint: 'partner',
  label: 'Friday game',
  expires_at: '2099-09-03T15:30:00Z',
};

function Loading() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#081422',
      }}>
      <Text style={{ color: 'white' }}>Loading Skia…</Text>
    </View>
  );
}

function TimedTableFeedback() {
  const { notice, addNotice } = useTableNotices(WAITING_ROOM.code);

  useEffect(() => {
    const timers = [
      setTimeout(
        () =>
          addNotice({
            message: 'Nora (north) disconnected. Bot is filling in.',
            variant: 'warning',
          }),
        800
      ),
      setTimeout(
        () =>
          addNotice({
            message: 'Nora (north) disconnected. Bot is filling in.',
            variant: 'warning',
          }),
        1_000
      ),
      setTimeout(() => addNotice({ message: 'Nora reconnected.', variant: 'success' }), 1_200),
    ];
    return () => timers.forEach(clearTimeout);
  }, [addNotice]);

  return <TableFeedback notice={notice} />;
}

function SkiaDevTable({
  onHandPresentationReadyChange,
  autoPlay,
  phase,
  lifecycle,
}: GameCanvasDevProps) {
  const [Comp, setComp] = useState<ComponentType<GameCanvasDevProps> | null>(null);

  useEffect(() => {
    let active = true;
    loadGameCanvasDev()
      .then((Component) => {
        if (active) setComp(() => Component);
      })
      .catch((error) => console.error('[TableDev] failed to load Skia table', error));
    return () => {
      active = false;
    };
  }, []);

  return Comp ? (
    <Comp
      onHandPresentationReadyChange={onHandPresentationReadyChange}
      autoPlay={autoPlay}
      phase={phase}
      lifecycle={lifecycle}
    />
  ) : (
    <Loading />
  );
}

export default function TableDevRoute() {
  if (!__DEV__) return <Redirect href="/home" />;
  return <TableDevHarness />;
}

function TableDevHarness() {
  const params = useLocalSearchParams<{
    phase?: string;
    autoplay?: string;
    invite?: string;
    lifecycle?: SeatStatus;
    feedback?: string;
    role?: string;
    playerName?: string;
    notice?: string;
    names?: string;
    safeArea?: string;
    pass?: string;
    viewer?: string;
    selection?: string;
  }>();
  const phase = typeof params.phase === 'string' ? params.phase : 'playing';
  const autoPlay = params.autoplay === 'true';
  const [isHandReady, setIsHandReady] = useState(false);
  const [dismissed, setDismissed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const names = ['Nora', 'Eli', 'Wynn'];
  const positions = ['north', 'east', 'west'] as const;
  const [readyPlayers, setReadyPlayers] = useState<Position[]>(['north', 'west']);
  const [waitingPositions, setWaitingPositions] = useState<Room['positions']>();
  const [inviteOpen, setInviteOpen] = useState(params.invite === 'true');
  const [waitingLocked, setWaitingLocked] = useState(false);
  const fixtureInsets =
    params.safeArea === 'island'
      ? { top: 59, bottom: 34, left: 0, right: 0 }
      : params.safeArea === 'android-buttons' || params.safeArea === 'android'
        ? { top: 24, bottom: 48, left: 0, right: 0 }
        : params.safeArea === 'android-gesture'
          ? { top: 24, bottom: 24, left: 0, right: 0 }
          : { top: 0, bottom: 0, left: 0, right: 0 };

  if (params.selection) {
    return (
      <SafeAreaProvider>
        <SafeAreaInsetsContext.Provider value={fixtureInsets}>
          <DealerPreview scenario={params.selection} />
        </SafeAreaInsetsContext.Provider>
      </SafeAreaProvider>
    );
  }

  if (params.role && !phase.startsWith('waiting') && !phase.startsWith('ready')) {
    return (
      <SafeAreaProvider>
        <SafeAreaInsetsContext.Provider value={fixtureInsets}>
          <RolePreview
            role={params.role === 'player' ? 'player' : 'spectator'}
            phase={phase}
            feedback={params.feedback}
            canPass={params.pass !== 'disabled'}
          />
        </SafeAreaInsetsContext.Provider>
      </SafeAreaProvider>
    );
  }

  if (
    phase === 'waiting' ||
    phase === 'waiting-host' ||
    phase === 'ready' ||
    phase === 'ready-host'
  ) {
    const hostControls = phase === 'waiting-host' || phase === 'ready-host';
    const full = phase.startsWith('ready');
    const waitingRoom: Room = full
      ? {
          ...WAITING_ROOM,
          positions: { ...WAITING_ROOM.positions!, east: 'p-east' },
          seats: WAITING_ROOM.seats!.map((seat) =>
            seat.position === 'east'
              ? {
                  ...seat,
                  status: 'occupied',
                  player: {
                    id: 'p-east',
                    username: 'mfand1',
                    avatar_url: fixtureAvatar('a', '#8e6851'),
                  },
                }
              : seat
          ),
        }
      : WAITING_ROOM;
    const fixtureRoom = {
      ...waitingRoom,
      locked: waitingLocked,
      positions: waitingPositions ?? waitingRoom.positions,
      seats: waitingRoom.seats?.map((seat) =>
        params.names === 'long' && seat.player?.id === 'p-west'
          ? { ...seat, player: { ...seat.player, username: 'Alexandria the Long-Named Player' } }
          : seat
      ),
    };
    return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#081422' }}>
        <SafeAreaProvider>
          <SafeAreaInsetsContext.Provider value={fixtureInsets}>
            <WaitingTable
              room={fixtureRoom}
              isSpectator={params.role === 'spectator'}
              readyPlayers={full ? readyPlayers : ['north']}
              readyDisabled={false}
              onReady={async () =>
                setReadyPlayers((current) => [
                  ...current,
                  params.viewer === 'east' ? 'east' : 'south',
                ])
              }
              youPlayerId={params.viewer === 'east' ? 'p-east' : 'p-south'}
              onLeave={() => {}}
              canManage={hostControls}
              onOpenInvite={() => setInviteOpen(true)}
              onToggleLock={() => setWaitingLocked((locked) => !locked)}
              onMovePlayer={(playerId, target) => {
                const positions = { ...fixtureRoom.positions! };
                const source = (Object.keys(positions) as Position[]).find(
                  (position) => positions[position] === playerId
                )!;
                positions[source] = positions[target];
                positions[target] = playerId;
                setWaitingPositions(positions);
                setReadyPlayers(['north']);
              }}
              onKickPlayer={(position) => {
                setWaitingPositions({ ...fixtureRoom.positions!, [position]: null });
                setReadyPlayers(['north']);
              }}
            />
          </SafeAreaInsetsContext.Provider>
          {hostControls ? (
            <InviteModal
              isOpen={inviteOpen}
              roomCode={WAITING_ROOM.code}
              onClose={() => setInviteOpen(false)}
              fixture={INVITE_FIXTURE}
            />
          ) : null}
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#081422' }}>
      <SafeAreaProvider>
        <SafeAreaInsetsContext.Provider value={fixtureInsets}>
          <SkiaDevTable
            onHandPresentationReadyChange={setIsHandReady}
            autoPlay={autoPlay}
            phase={phase === 'dealer_selection' ? 'dealer_selection' : 'playing'}
            lifecycle={params.lifecycle}
          />
          <DevOverlays
            phase={phase}
            isHandReady={isHandReady}
            canPass={params.pass !== 'disabled'}
          />
          {params.feedback === 'owner' && (
            <TableSeatDecision
              decisions={{
                decision:
                  params.feedback === 'owner' && dismissed < 3
                    ? {
                        key: String(dismissed),
                        id: String(dismissed),
                        position: positions[dismissed],
                        playerName:
                          dismissed === 0 ? (params.playerName ?? names[0]) : names[dismissed],
                      }
                    : null,
                pendingCount: 3 - dismissed,
                busy,
                error,
                keepBot: async () => {
                  setDismissed((count) => count + 1);
                  setError(null);
                },
                openSeat: async () => {
                  setBusy(true);
                  setError(null);
                  await new Promise((resolve) => setTimeout(resolve, 800));
                  setError('Could not confirm the seat update. Please try again.');
                  setBusy(false);
                },
              }}
            />
          )}
          {params.feedback === 'timed' ? (
            <TimedTableFeedback />
          ) : (
            <TableFeedback
              notice={
                params.feedback === 'notice' || params.notice === 'true'
                  ? { message: 'Nora (north) disconnected. Bot is filling in.', variant: 'warning' }
                  : null
              }
            />
          )}
        </SafeAreaInsetsContext.Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Exercise the production controller/store, not the animation-only mock model. */
function DealerPreview({ scenario }: { scenario: string }) {
  const [Table, setTable] = useState<Awaited<ReturnType<typeof loadGameCanvasTable>> | null>(null);
  useEffect(() => {
    let active = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    void loadGameCanvasTable().then((component) => {
      if (!active) return;
      const store = useGameStore.getState();
      store.reset();
      const room = {
        ...WAITING_ROOM,
        positions: { north: 'p-north', east: 'p-east', south: 'p-south', west: 'p-west' },
        seats: WAITING_ROOM.seats?.map((seat) =>
          seat.position === 'east' ? { ...seat, player: { id: 'p-east', username: 'Eli' } } : seat
        ),
      };
      store.initFromRoom({ room, youPlayerId: 'p-south' });
      store.setRole('player');
      store.setYouPosition('south');
      store.setChannelStatus(true);
      const elapsed =
        scenario === 'near'
          ? 2950
          : scenario === 'selected'
            ? 1800
            : scenario === 'network'
              ? 400
              : 0;
      const snapshot = {
        game_instance_id: 'dealer-preview',
        state_revision: 1,
        server_time_ms: 10000 + elapsed,
        presentation: { dealer_selection: { started_at_ms: 10000, ends_at_ms: 13000 } },
        legal_actions: [],
        state: {
          phase: 'dealer_selection',
          current_dealer: 'east',
          current_player: null,
          scores: { north_south: 0, east_west: 0 },
          hand_number: 1,
          players: {
            north: { hand: 0 },
            east: { hand: 0 },
            south: { hand: [] },
            west: { hand: 0 },
          },
          dealer_selection_cuts: {
            north: { rank: 9, suit: 'clubs' },
            east: { rank: 14, suit: 'spades' },
            south: { rank: 5, suit: 'hearts' },
            west: { rank: 7, suit: 'diamonds' },
          },
        },
      };
      const bidding = {
        ...snapshot,
        state_revision: 2,
        server_time_ms: 13000,
        presentation: null,
        legal_actions: [{ type: 'bid', amount: 6 }, { type: 'pass' }],
        state: {
          ...snapshot.state,
          phase: 'bidding',
          current_player: 'south',
          dealer_selection_cuts: null,
          players: { ...snapshot.state.players, south: { hand: [{ rank: 14, suit: 'spades' }] } },
        },
      };
      store.applyGameSnapshot(scenario === 'bidding' ? bidding : snapshot);
      const transition = setTimeout(
        () => {
          store.applyGameSnapshot(bidding);
          if (scenario === 'stale') store.applyGameSnapshot(snapshot);
        },
        Math.max(0, 3000 - elapsed)
      );
      const render = setTimeout(
        () => {
          if (active) setTable(() => component);
        },
        scenario === 'delayed' ? 1600 : 0
      );
      timers.push(transition, render);
    });
    return () => {
      active = false;
      timers.forEach(clearTimeout);
      useGameStore.getState().reset();
    };
  }, [scenario]);
  return Table ? <Table room={WAITING_ROOM} onLeave={() => {}} /> : <Loading />;
}

function RolePreview({
  role,
  phase,
  feedback,
  canPass,
}: {
  role: 'player' | 'spectator';
  phase: string;
  feedback?: string;
  canPass: boolean;
}) {
  const [Table, setTable] = useState<Awaited<ReturnType<typeof loadGameCanvasTable>> | null>(null);
  useEffect(() => {
    let active = true;
    const store = useGameStore.getState();
    const previewPhase =
      phase === 'bidding' ? 'bidding' : phase === 'declaring' ? 'declaring' : 'playing';
    store.reset();
    store.initFromRoom({ room: WAITING_ROOM, youPlayerId: 'p-south' });
    store.setRole(role);
    store.setYouPosition('south');
    store.setChannelStatus(true);
    store.setServerState({
      phase: previewPhase,
      current_player: 'south',
      trump: previewPhase === 'playing' ? 'spades' : null,
      dealer: 'north',
      scores: { north_south: 36, east_west: 29 },
      hand_number: 4,
      players: {
        north: { hand: 6 },
        east: { hand: 6 },
        west: { hand: 6 },
        south: {
          hand: [
            { rank: 14, suit: 'spades' },
            { rank: 13, suit: 'hearts' },
          ],
        },
      },
      current_trick:
        previewPhase === 'playing' ? [{ player: 'west', card: { rank: 5, suit: 'diamonds' } }] : [],
    });
    store.setLegalActions(
      previewPhase === 'bidding'
        ? [
            ...([6, 7, 8, 9, 10, 11, 12, 13, 14] as const).map(
              (amount) => ({ type: 'bid', amount }) as const
            ),
            ...(canPass ? ([{ type: 'pass' }] as const) : []),
          ]
        : previewPhase === 'declaring'
          ? (['clubs', 'diamonds', 'hearts', 'spades'] as const).map(
              (suit) => ({ type: 'declare_trump', suit }) as const
            )
          : [{ type: 'play_card', card: { rank: 14, suit: 'spades' } }]
    );
    if (previewPhase === 'playing') {
      store.setTurnTimer({
        timerId: 1,
        scope: 'seat',
        position: 'south',
        phase: 'playing',
        durationMs: 30_000,
        transitionDelayMs: 0,
        serverTime: new Date().toISOString(),
        remainingMs: 30_000,
        receivedAtMs: Date.now(),
        eventSeq: 1,
      });
    }
    loadGameCanvasTable().then((component) => {
      if (active) setTable(() => component);
    });
    return () => {
      active = false;
      store.reset();
    };
  }, [role, phase, canPass]);
  return (
    <View className="flex-1">
      {Table ? <Table room={WAITING_ROOM} onLeave={() => {}} /> : <Loading />}
      {feedback === 'timed' ? (
        <TimedTableFeedback />
      ) : (
        <TableFeedback
          notice={
            feedback === 'notice'
              ? { message: 'Nora (north) disconnected. Bot is filling in.', variant: 'warning' }
              : null
          }
        />
      )}
    </View>
  );
}
