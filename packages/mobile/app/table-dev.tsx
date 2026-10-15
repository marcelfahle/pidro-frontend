/**
 * DEV HARNESS — open at /table-dev. Renders the Skia table (M1–M3) behind the M4 RN
 * overlays. `?phase=waiting|playing|bidding|declaring|second_deal|game_over` picks which
 * overlay to show with mock data. Native renders directly; web lazy-loads CanvasKit.
 * DevOverlays is pure RN (no Skia) so it's safe to import statically. Throwaway.
 */
import { useEffect, useState, type ComponentType } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FixtureInsets } from '@/components/dev/FixtureInsets';
import { LocaleFixture } from '@/components/dev/LocaleFixture';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { WaitingTable } from '@/components/game/WaitingTable';
import { InviteModal } from '@/components/invites/InviteModal';
import { DevOverlays } from '@/game/canvas/DevOverlays';
import { loadGameCanvasDev } from '@/game/canvas/loadGameCanvasDev';
import type { GameCanvasDevProps } from '@/game/canvas/GameCanvasDev';
import type { Position, Room } from '@/types/lobby';
import type { Card, Invite, RuleSet, SeatStatus, ServerBid, ServerGameState } from '@pidro/shared';
import { TableFeedback, TableSeatDecision, useTableNotices } from '@/components/game/TableFeedback';
import { loadGameCanvasTable } from '@/game/canvas/loadGameCanvasTable';
import { useGameStore } from '@/stores/game';
import { useLocale } from '@/i18n';

// `bids=`: a hand's bids landing one by one against three bots.
const BID_ROUNDS: Record<string, { dealer: Position; bids: ServerBid[] }> = {
  // South deals: West passes, North bids 7, East goes to 9, then it is you.
  round: {
    dealer: 'south',
    bids: [
      { position: 'west', amount: 'pass' },
      { position: 'north', amount: 7 },
      { position: 'east', amount: 9 },
    ],
  },
  // West deals: North bids 7, East passes, you go to 9, and West is still to bid.
  high: {
    dealer: 'west',
    bids: [
      { position: 'north', amount: 7 },
      { position: 'east', amount: 'pass' },
      { position: 'south', amount: 9 },
    ],
  },
};
const BID_STEP_MS = 450;
const CLOCKWISE: Position[] = ['north', 'east', 'south', 'west'];
const nextSeat = (position: Position) => CLOCKWISE[(CLOCKWISE.indexOf(position) + 1) % 4];
const highBid = (bids: ServerBid[]) => bids.filter((bid) => bid.amount !== 'pass').at(-1) ?? null;

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
      player: {
        id: 'p-south',
        username: 'Alexandria the Long-Named Player',
        level: 44,
        pin: 'classic',
      },
      position: 'south',
    },
    {
      seat_index: 2,
      status: 'occupied',
      player: {
        id: 'p-west',
        username: 'mfios1',
        avatar_url: fixtureAvatar('i', '#437d9e'),
        level: 18,
      },
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

/** `bids=`: a solo table, you and three bots, as a quick game seats it. */
const BOT_ROOM: Room = {
  ...WAITING_ROOM,
  status: 'playing',
  player_count: 4,
  positions: { north: 'b-north', east: 'b-east', south: 'p-south', west: 'b-west' },
  seats: [
    { ...WAITING_ROOM.seats![0], player: { id: 'p-south', username: 'Mia', level: 44 } },
    ...(
      [
        ['west', 'Wynn'],
        ['north', 'Nora'],
        ['east', 'Eli'],
      ] as const
    ).map(([position, username], index) => ({
      seat_index: index + 2,
      status: 'occupied' as const,
      player: { id: `b-${position}`, username, is_bot: true },
      position,
    })),
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
            key: 'game.notice_disconnected_seat',
            seat: { name: 'Nora', position: 'north' },
            variant: 'warning',
          }),
        800
      ),
      setTimeout(
        () =>
          addNotice({
            key: 'game.notice_disconnected_seat',
            seat: { name: 'Nora', position: 'north' },
            variant: 'warning',
          }),
        1_000
      ),
      setTimeout(
        () => addNotice({ key: 'game.notice_back', params: { name: 'Nora' }, variant: 'success' }),
        1_200
      ),
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
  return (
    <LocaleFixture>
      <TableDevHarness />
    </LocaleFixture>
  );
}

function TableDevHarness() {
  const locale = useLocale();
  const params = useLocalSearchParams<{
    fixture?: string;
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
    guest?: string;
    connection?: string;
    bids?: string;
  }>();
  const fixture = params.fixture;
  const ruleSet: RuleSet = fixture?.startsWith('louisiana') ? 'louisiana' : 'finnish';
  const rulesFixtureSeen = !fixture?.endsWith('explainer');
  const phase = fixture?.endsWith('game-over')
    ? 'game_over'
    : fixture?.endsWith('bidding')
      ? 'bidding'
      : fixture?.includes('waiting')
        ? 'waiting'
        : typeof params.phase === 'string'
          ? params.phase
          : 'playing';
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
    (fixture || params.role || phase === 'second_deal') &&
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
            ruleSet={ruleSet}
            rulesFixtureSeen={rulesFixtureSeen}
            connected={params.connection !== 'lost'}
            bidRound={BID_ROUNDS[params.bids ?? ''] ?? null}
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
              room={
                fixture
                  ? {
                      ...fixtureRoom,
                      config: {
                        name: null,
                        bot_difficulty: 'basic',
                        solo: false,
                        ...fixtureRoom.config,
                        rule_set: ruleSet,
                      },
                    }
                  : fixtureRoom
              }
              rulesFixtureSeen={fixture ? rulesFixtureSeen : undefined}
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
              notice={
                params.notice === 'true'
                  ? {
                      ...(locale === 'sv'
                        ? {
                            key: 'game.notice_joined_seat' as const,
                            seat: { name: 'Nora', position: 'north' as const },
                          }
                        : { message: 'Nora joined the table.' }),
                      variant: 'success',
                    }
                  : null
              }
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
            guest={params.guest === 'true'}
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
                  ? {
                      key: 'game.notice_disconnected_seat',
                      seat: { name: 'Nora', position: 'north' },
                      variant: 'warning',
                    }
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
  ruleSet = 'finnish',
  rulesFixtureSeen,
  connected = true,
  bidRound = null,
}: {
  role: 'player' | 'spectator';
  phase: string;
  feedback?: string;
  canPass: boolean;
  deal?: string;
  dealer?: string;
  autoClear?: boolean;
  ruleSet?: RuleSet;
  rulesFixtureSeen?: boolean;
  connected?: boolean;
  bidRound?: (typeof BID_ROUNDS)[string] | null;
}) {
  const [Table, setTable] = useState<Awaited<ReturnType<typeof loadGameCanvasTable>> | null>(null);
  useEffect(() => {
    let active = true;
    const store = useGameStore.getState();
    const previewPhase =
      phase === 'game_over'
        ? 'game_over'
        : phase === 'bidding'
          ? 'bidding'
          : phase === 'declaring'
            ? 'declaring'
            : phase === 'second_deal'
              ? 'second_deal'
              : 'playing';
    const dealerPosition = ['north', 'east', 'south', 'west'].includes(dealer ?? '')
      ? (dealer as Position)
      : bidRound
        ? bidRound.dealer
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
    store.initFromRoom({ room: bidRound ? BOT_ROOM : WAITING_ROOM, youPlayerId: 'p-south' });
    store.setRole(role);
    store.setYouPosition('south');
    store.setChannelStatus(connected);
    store.setServerState({
      variant: ruleSet,
      config: { min_bid: ruleSet === 'louisiana' ? 7 : 6 },
      phase: deal === 'true' ? 'dealing' : previewPhase,
      current_player:
        previewPhase === 'second_deal'
          ? dealerPosition
          : bidRound
            ? bidRound.bids[0].position
            : 'south',
      trump: previewPhase === 'playing' || previewPhase === 'second_deal' ? 'spades' : null,
      dealer: dealerPosition,
      scores: { north_south: previewPhase === 'game_over' ? 62 : 36, east_west: 29 },
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
                        ...(ruleSet === 'louisiana' ? [{ rank: 5, suit: 'clubs' as const }] : []),
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
            ...([6, 7, 8, 9, 10, 11, 12, 13, 14] as const)
              .filter(
                (amount) =>
                  amount >= (ruleSet === 'louisiana' ? 7 : 6) &&
                  amount > Number(highBid(bidRound?.bids ?? [])?.amount ?? 0)
              )
              .map((amount) => ({ type: 'bid', amount }) as const),
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
            : ruleSet === 'louisiana'
              ? [
                  { type: 'play_card', card: { rank: 13, suit: 'hearts' } },
                  { type: 'play_card', card: { rank: 5, suit: 'clubs' } },
                ]
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
  }, [role, phase, canPass, deal, dealer, autoClear, ruleSet, connected, bidRound]);

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

  // `bids=`: the seats bid in turn, as the server tells it.
  useEffect(() => {
    if (!Table || !bidRound) return;
    const store = useGameStore.getState();
    const initial = store.serverState;
    if (!initial) return;
    const timers = bidRound.bids.map((bid, index) =>
      setTimeout(
        () => {
          const bids = bidRound.bids.slice(0, index + 1);
          const high = highBid(bids);
          store.setServerState({
            ...initial,
            current_player: nextSeat(bid.position),
            bids,
            ...(high ? { highest_bid: high } : {}),
          } as unknown as ServerGameState);
        },
        BID_STEP_MS * (index + 1)
      )
    );
    return () => timers.forEach(clearTimeout);
  }, [Table, bidRound, role, phase, canPass, dealer]);
  return (
    <View className="flex-1">
      {Table ? (
        <Table
          room={bidRound ? BOT_ROOM : WAITING_ROOM}
          rulesFixtureSeen={rulesFixtureSeen}
          onLeave={() => {}}
        />
      ) : (
        <Loading />
      )}
      {feedback === 'timed' ? (
        <TimedTableFeedback />
      ) : (
        <TableFeedback
          notice={
            feedback === 'notice'
              ? {
                  key: 'game.notice_disconnected_seat',
                  seat: { name: 'Nora', position: 'north' },
                  variant: 'warning',
                }
              : null
          }
        />
      )}
    </View>
  );
}
