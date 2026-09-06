/**
 * DEV HARNESS — open at /table-dev. Renders the Skia table (M1–M3) behind the M4 RN
 * overlays. `?phase=waiting|playing|bidding|declaring|second_deal|game_over` picks which
 * overlay to show with mock data. Native renders directly; web lazy-loads CanvasKit.
 * DevOverlays is pure RN (no Skia) so it's safe to import statically. Throwaway.
 */
import { useEffect, useState, type ComponentType } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { WaitingTable } from '@/components/game/WaitingTable';
import { InviteModal } from '@/components/invites/InviteModal';
import { DevOverlays } from '@/game/canvas/DevOverlays';
import { loadGameCanvasDev } from '@/game/canvas/loadGameCanvasDev';
import type { GameCanvasDevProps } from '@/game/canvas/GameCanvasDev';
import type { Position, Room } from '@/types/lobby';
import type { Invite, SeatStatus } from '@pidro/shared';
import { TableFeedback } from '@/components/game/TableFeedback';

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
      player: { id: 'p-west', username: 'Wynn' },
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

function SkiaDevTable({
  onHandPresentationReadyChange,
  autoPlay,
  phase,
  lifecycle,
  feedbackHeight,
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
      feedbackHeight={feedbackHeight}
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
  }>();
  const phase = typeof params.phase === 'string' ? params.phase : 'playing';
  const autoPlay = params.autoplay === 'true';
  const [isHandReady, setIsHandReady] = useState(false);
  const [dismissed, setDismissed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [feedbackHeight, setFeedbackHeight] = useState(0);
  const names = ['Nora', 'Eli', 'Wynn'];
  const positions = ['north', 'east', 'west'] as const;
  const [readyPlayers, setReadyPlayers] = useState<Position[]>(['north', 'west']);

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
                  player: { id: 'p-east', username: 'Erin' },
                }
              : seat
          ),
        }
      : WAITING_ROOM;
    return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#081422' }}>
        <SafeAreaProvider>
          <WaitingTable
            room={waitingRoom}
            readyPlayers={full ? readyPlayers : ['north']}
            readyDisabled={false}
            onReady={async () => setReadyPlayers((current) => [...current, 'south'])}
            youPlayerId="p-south"
            onLeave={() => {}}
            canManage={hostControls}
            onOpenInvite={() => {}}
            onToggleLock={() => {}}
            onMovePlayer={() => {}}
            onKickPlayer={() => {}}
          />
          {hostControls ? (
            <InviteModal
              isOpen={params.invite === 'true'}
              roomCode={WAITING_ROOM.code}
              onClose={() => {}}
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
        <SkiaDevTable
          onHandPresentationReadyChange={setIsHandReady}
          autoPlay={autoPlay}
          phase={phase === 'dealer_selection' ? 'dealer_selection' : 'playing'}
          lifecycle={params.lifecycle}
          feedbackHeight={feedbackHeight}
        />
        <DevOverlays phase={phase} isHandReady={isHandReady} />
        <View
          pointerEvents="box-none"
          className="absolute inset-x-0 top-0"
          onLayout={(event) => setFeedbackHeight(event.nativeEvent.layout.height)}>
          {params.feedback && (
            <TableFeedback
              decisions={{
                decision:
                  params.feedback === 'owner' && dismissed < 3
                    ? {
                        key: String(dismissed),
                        id: String(dismissed),
                        position: positions[dismissed],
                        playerName: names[dismissed],
                      }
                    : null,
                pendingCount: 3 - dismissed,
                busy: false,
                error,
                keepBot: () => {
                  setDismissed((count) => count + 1);
                  setError(null);
                },
                openSeat: async () => {
                  setError('Could not open the seat. Please try again.');
                },
              }}
              notice={
                params.feedback === 'notice'
                  ? { message: 'Nora (north) disconnected. Bot is filling in.', variant: 'warning' }
                  : null
              }
              dismissNotice={() => {}}
            />
          )}
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
