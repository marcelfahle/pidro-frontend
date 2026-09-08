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

  if (params.role && !phase.startsWith('waiting') && !phase.startsWith('ready')) {
    return (
      <SafeAreaProvider>
        <SafeAreaInsetsContext.Provider value={fixtureInsets}>
          <RolePreview
            role={params.role === 'player' ? 'player' : 'spectator'}
            phase={phase}
            feedback={params.feedback}
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
function RolePreview({
  role,
  phase,
  feedback,
}: {
  role: 'player' | 'spectator';
  phase: string;
  feedback?: string;
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
      trump: 'spades',
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
      current_trick: [{ player: 'west', card: { rank: 5, suit: 'diamonds' } }],
    });
    store.setLegalActions([{ type: 'play_card', card: { rank: 14, suit: 'spades' } }]);
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
  }, [role, phase]);
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
