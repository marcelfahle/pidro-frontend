/**
 * DEV HARNESS — open at /table-dev. Renders the Skia table (M1–M3) behind the M4 RN
 * overlays. `?phase=waiting|playing|bidding|declaring|second_deal|game_over` picks which
 * overlay to show with mock data. Native renders directly; web lazy-loads CanvasKit.
 * DevOverlays is pure RN (no Skia) so it's safe to import statically. Throwaway.
 */
import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import {
  SafeAreaInsetsContext,
  SafeAreaProvider,
  type EdgeInsets,
} from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { WaitingTable } from '@/components/game/WaitingTable';
import { InviteModal } from '@/components/invites/InviteModal';
import { DevOverlays } from '@/game/canvas/DevOverlays';
import { loadGameCanvasDev } from '@/game/canvas/loadGameCanvasDev';
import type { GameCanvasDevProps } from '@/game/canvas/GameCanvasDev';
import type { Position, Room } from '@/types/lobby';
import type { Card, Invite, SeatStatus } from '@pidro/shared';
import { TableFeedback, TableSeatDecision, useTableNotices } from '@/components/game/TableFeedback';
import { loadGameCanvasTable } from '@/game/canvas/loadGameCanvasTable';
import { useGameStore } from '@/stores/game';

const DEAL_HAND: Card[] = [
  { rank: 8, suit: 'clubs' },
  { rank: 14, suit: 'spades' },
  { rank: 3, suit: 'hearts' },
  { rank: 11, suit: 'diamonds' },
  { rank: 13, suit: 'clubs' },
  { rank: 10, suit: 'hearts' },
  { rank: 2, suit: 'spades' },
  { rank: 6, suit: 'diamonds' },
  { rank: 12, suit: 'hearts' },
];

const DEALER_POOL: Card[] = [
  ...DEAL_HAND,
  { rank: 5, suit: 'spades' },
  { rank: 11, suit: 'spades' },
  { rank: 4, suit: 'clubs' },
];

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

const FIXTURE_INSETS: Record<string, EdgeInsets> = {
  island: { top: 59, bottom: 34, left: 0, right: 0 },
  'island-left': { top: 0, bottom: 21, left: 59, right: 0 },
  'island-right': { top: 0, bottom: 21, left: 0, right: 59 },
  android: { top: 24, bottom: 48, left: 0, right: 0 },
  'android-buttons': { top: 24, bottom: 48, left: 0, right: 0 },
  'android-gesture': { top: 24, bottom: 24, left: 0, right: 0 },
  none: { top: 0, bottom: 0, left: 0, right: 0 },
};

/**
 * `?safeArea=` fakes insets so a browser can stand in for a device. Without it
 * the harness inherits the REAL ones — a simulator must show real clearances,
 * not reproduce the browser's zero-inset blindness. (Web has no insets either
 * way, so the captured baselines are unaffected.)
 */
function FixtureInsets({ preset, children }: { preset?: string; children: ReactNode }) {
  if (!preset) return <>{children}</>;
  const insets = FIXTURE_INSETS[preset] ?? FIXTURE_INSETS.none;
  return <SafeAreaInsetsContext.Provider value={insets}>{children}</SafeAreaInsetsContext.Provider>;
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
    rematch?: string;
    result?: string;
    xp?: string;
    readyResult?: string;
    deal?: string;
    dealer?: string;
    clear?: string;
  }>();
  const phase = typeof params.phase === 'string' ? params.phase : 'playing';
  const autoPlay = params.autoplay === 'true';
  const [isHandReady, setIsHandReady] = useState(false);
  const [dismissed, setDismissed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const names = ['Nora', 'Eli', 'Wynn'];
  const positions = ['north', 'east', 'west'] as const;
  const viewerPosition = params.viewer === 'east' ? 'east' : 'south';
  const [readyPlayers, setReadyPlayers] = useState<Position[]>(
    phase === 'ready-solo'
      ? (['north', 'east', 'south', 'west'] as Position[]).filter(
          (position) => position !== viewerPosition
        )
      : ['north', 'west']
  );
  const [waitingPositions, setWaitingPositions] = useState<Room['positions']>();
  const [inviteOpen, setInviteOpen] = useState(params.invite === 'true');
  const [waitingLocked, setWaitingLocked] = useState(false);

  if (
    (params.role || phase === 'second_deal') &&
    !phase.startsWith('waiting') &&
    !phase.startsWith('ready')
  ) {
    return (
      <SafeAreaProvider>
        <FixtureInsets preset={params.safeArea}>
          <RolePreview
            role={params.role === 'spectator' ? 'spectator' : 'player'}
            phase={phase}
            feedback={params.feedback}
            canPass={params.pass !== 'disabled'}
            deal={params.deal}
            dealer={params.dealer}
            autoClear={params.clear === 'true'}
          />
        </FixtureInsets>
      </SafeAreaProvider>
    );
  }

  if (
    phase === 'waiting' ||
    phase === 'waiting-host' ||
    phase === 'ready' ||
    phase === 'ready-host' ||
    phase === 'ready-solo'
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
        phase === 'ready-solo' && seat.player
          ? {
              ...seat,
              player: {
                id: seat.player.id,
                username: seat.position === viewerPosition ? 'Alex' : 'Bot',
                is_bot: seat.position !== viewerPosition,
              },
            }
          : params.names === 'long' && seat.player?.id === 'p-west'
            ? { ...seat, player: { ...seat.player, username: 'Alexandria the Long-Named Player' } }
            : seat
      ),
    };
    return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#081422' }}>
        <SafeAreaProvider>
          <FixtureInsets preset={params.safeArea}>
            <WaitingTable
              room={fixtureRoom}
              isSpectator={params.role === 'spectator'}
              readyPlayers={full ? readyPlayers : ['north']}
              readyDisabled={false}
              onReady={async () => {
                if (params.readyResult === 'error') throw new Error('Fixture readiness failure');
                await new Promise((resolve) => setTimeout(resolve, 500));
                setReadyPlayers((current) => [...current, viewerPosition]);
              }}
              youPlayerId={`p-${viewerPosition}`}
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
          </FixtureInsets>
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
        <FixtureInsets preset={params.safeArea}>
          <SkiaDevTable
            onHandPresentationReadyChange={setIsHandReady}
            autoPlay={autoPlay}
            phase={phase === 'dealer_selection' || phase === 'game_over' ? phase : 'playing'}
            lifecycle={params.lifecycle}
          />
          <DevOverlays
            phase={phase}
            isHandReady={isHandReady}
            canPass={params.pass !== 'disabled'}
            rematch={params.rematch}
            result={params.result}
            xp={params.xp}
            playerName={params.playerName}
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
        </FixtureInsets>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Exercise the production controller/store, not the animation-only mock model. */
function RolePreview({
  role,
  phase,
  feedback,
  canPass,
  deal,
  dealer,
  autoClear,
}: {
  role: 'player' | 'spectator';
  phase: string;
  feedback?: string;
  canPass: boolean;
  deal?: string;
  dealer?: string;
  autoClear?: boolean;
}) {
  const [Table, setTable] = useState<Awaited<ReturnType<typeof loadGameCanvasTable>> | null>(null);
  useEffect(() => {
    let active = true;
    const store = useGameStore.getState();
    const previewPhase =
      phase === 'bidding'
        ? 'bidding'
        : phase === 'declaring'
          ? 'declaring'
          : phase === 'second_deal'
            ? 'second_deal'
            : 'playing';
    const dealerPosition = ['north', 'east', 'south', 'west'].includes(dealer ?? '')
      ? (dealer as Position)
      : previewPhase === 'second_deal'
        ? 'south'
        : 'north';
    const automaticExisting: Card[] = [
      { rank: 14, suit: 'spades' },
      { rank: 13, suit: 'spades' },
    ];
    const automaticRobbed: Card[] = [
      { rank: 11, suit: 'spades' },
      { rank: 10, suit: 'spades' },
      { rank: 5, suit: 'spades' },
      { rank: 5, suit: 'clubs' },
      { rank: 2, suit: 'spades' },
      { rank: 6, suit: 'diamonds' },
    ];
    const automaticPool = [...automaticExisting, ...automaticRobbed];
    const automaticKept = [
      automaticExisting[0],
      automaticRobbed[0],
      automaticRobbed[1],
      automaticRobbed[2],
      automaticRobbed[3],
      automaticRobbed[4],
    ];
    store.reset();
    store.initFromRoom({ room: WAITING_ROOM, youPlayerId: 'p-south' });
    store.setRole(role);
    store.setYouPosition('south');
    store.setChannelStatus(true);
    store.setServerState({
      phase: deal === 'true' ? 'dealing' : previewPhase,
      current_player: previewPhase === 'second_deal' ? dealerPosition : 'south',
      trump: previewPhase === 'playing' || previewPhase === 'second_deal' ? 'spades' : null,
      dealer: dealerPosition,
      scores: { north_south: 36, east_west: 29 },
      hand_number: 4,
      players: {
        north: {
          hand:
            previewPhase === 'second_deal' && dealerPosition === 'north'
              ? 17
              : deal === 'true'
                ? 0
                : deal === 'cold'
                  ? 9
                  : 6,
        },
        east: { hand: deal === 'true' ? 0 : deal === 'cold' ? 9 : 6 },
        west: { hand: deal === 'true' ? 0 : deal === 'cold' ? 9 : 6 },
        south: {
          hand:
            previewPhase === 'second_deal' && dealerPosition === 'south'
              ? DEALER_POOL
              : phase === 'auto_rob'
                ? automaticKept
                : deal === 'true'
                  ? []
                  : deal === 'cold'
                    ? DEAL_HAND
                    : [
                        { rank: 14, suit: 'spades' },
                        { rank: 13, suit: 'hearts' },
                      ],
        },
      },
      current_trick:
        previewPhase === 'playing' ? [{ player: 'west', card: { rank: 5, suit: 'diamonds' } }] : [],
    });
    if (phase === 'auto_rob') {
      store.setPresentation({
        dealer_rob: {
          dealer: dealerPosition,
          automatic: true,
          started_at_ms: Date.now(),
          ends_at_ms: Date.now() + 60_000,
          ...(role === 'player' && dealerPosition === 'south'
            ? {
                pool: automaticPool,
                kept: automaticKept,
                discarded: [automaticExisting[1], automaticRobbed[5]],
              }
            : {}),
        },
      });
    }
    const presentationTimer =
      phase === 'auto_rob' && autoClear
        ? setTimeout(() => store.setPresentation(null), 1_800)
        : null;
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
          : previewPhase === 'second_deal'
            ? dealerPosition === 'south' && role === 'player'
              ? [{ type: 'select_hand' as const, cards: [] }]
              : []
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
      if (presentationTimer) clearTimeout(presentationTimer);
      store.reset();
    };
  }, [role, phase, canPass, deal, dealer, autoClear]);

  useEffect(() => {
    if (!Table || deal !== 'true') return;
    const store = useGameStore.getState();
    const initial = store.serverState;
    if (!initial) return;
    const dealt = {
      ...initial,
      phase: 'bidding' as const,
      players: {
        north: { hand: 9 },
        east: { hand: 9 },
        west: { hand: 9 },
        south: {
          hand: DEAL_HAND,
        },
      },
    };
    const timer = setTimeout(() => store.setServerState(dealt), 900);
    return () => clearTimeout(timer);
    // Re-arm whenever the initialization effect above resets the fixture.
  }, [Table, deal, dealer, role, phase, canPass]);
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
