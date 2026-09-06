import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useRef, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Background } from '@/components/ui/Background';
import { Button } from '@/components/ui/Button';
import { PidroText } from '@/components/ui/PidroText';
import { Surface } from '@/components/ui/Surface';
import { Modal } from '@/components/ui/Modal';
import { PidroColors, PidroRadii, PidroSpacing } from '@/design/tokens';
import { availableMoveTargets, seatDisplayName } from '@/features/invites/hostControls';
import { t } from '@/i18n';
import { Scoreboard } from '@/game/canvas/Scoreboard';
import type { Position, Room } from '@/types/lobby';
import { Avatar } from '@/components/ui/Avatar';
import { PressableFX } from '@/components/ui/PressableFX';
import { PlayerProfileModal } from '@/components/profile/PlayerProfileModal';
import { WatchingBadge } from './WatchingBadge';

const POSITIONS: Position[] = ['north', 'east', 'south', 'west'];
type RelPosition = 'top' | 'right' | 'bottom' | 'left';

interface SeatInfo {
  absolute: Position;
  rel: RelPosition;
  name: string;
  playerId: string | null;
  isYou: boolean;
  isBot: boolean;
  occupied: boolean;
  avatarUrl: string | null;
}

function buildSeats(room: Room, youPlayerId: string): SeatInfo[] {
  const positions = room.positions;
  const seatByPlayerId = new Map(
    (room.seats ?? []).filter((seat) => seat.player).map((seat) => [seat.player!.id, seat] as const)
  );
  const youAbs = POSITIONS.find((position) => positions?.[position] === youPlayerId) ?? 'south';
  const youIdx = POSITIONS.indexOf(youAbs);
  const relatives: RelPosition[] = ['bottom', 'left', 'top', 'right'];

  return POSITIONS.map((absolute, absoluteIndex) => {
    const playerId = positions?.[absolute] ?? null;
    const seat = playerId ? seatByPlayerId.get(playerId) : undefined;
    const isYou = !!playerId && playerId === youPlayerId;
    const isBot = !!seat?.player?.is_bot;
    const name = isYou ? 'You' : isBot ? 'Bot' : seatDisplayName(seat?.player) || 'Open seat';
    const rel = relatives[(absoluteIndex - youIdx + 4) % 4];
    return {
      absolute,
      rel,
      name,
      playerId,
      isYou,
      isBot,
      occupied: !!playerId,
      avatarUrl: seat?.player?.avatar_url ?? null,
    };
  });
}

const SEAT_ANCHORS: Record<
  RelPosition,
  { top?: string; bottom?: string; left?: string; right?: string; center?: boolean }
> = {
  top: { top: '8%', center: true },
  bottom: { bottom: '9%', center: true },
  left: { left: '3%', top: '43%' },
  right: { right: '3%', top: '43%' },
};

function SeatPlate({
  seat,
  portrait,
  ready,
  onManage,
  onProfile,
}: {
  seat: SeatInfo;
  portrait: boolean;
  ready: boolean;
  onManage?: () => void;
  onProfile?: () => void;
}) {
  const anchor = SEAT_ANCHORS[seat.rel];
  const isSideSeat = seat.rel === 'left' || seat.rel === 'right';
  return (
    <View
      style={[
        styles.seatWrap,
        {
          top: anchor.top as never,
          bottom: anchor.bottom as never,
          left: anchor.center ? 0 : (anchor.left as never),
          right: anchor.center ? 0 : (anchor.right as never),
          alignItems: anchor.center ? 'center' : anchor.left ? 'flex-start' : 'flex-end',
        },
        portrait && isSideSeat && styles.sideSeatPortrait,
      ]}
      pointerEvents="box-none">
      <Surface
        testID={`waiting-seat-${seat.absolute}`}
        variant="plaque"
        style={[styles.seatPlate, seat.isYou && styles.seatPlateYou]}>
        {seat.occupied ? (
          onProfile ? (
            <View className="-m-1">
              <PressableFX
                accessibilityRole="button"
                accessibilityLabel={
                  seat.isYou ? 'View your profile' : `View ${seat.name}'s profile`
                }
                onPress={onProfile}>
                <View className="h-11 w-11 items-center justify-center">
                  <Avatar uri={seat.avatarUrl} style={styles.avatar} resizeMode="cover" />
                </View>
              </PressableFX>
            </View>
          ) : (
            <Avatar uri={seat.avatarUrl} style={styles.avatar} resizeMode="cover" />
          )
        ) : (
          <View style={styles.openAvatar}>
            <Feather name="user-plus" size={17} color={PidroColors.textMuted} />
          </View>
        )}
        <View style={styles.seatCopy}>
          <PidroText role="label" tone={seat.isYou ? 'gold' : 'default'} numberOfLines={1}>
            {seat.name}
          </PidroText>
          <PidroText role="metadata" tone={seat.occupied ? 'cyan' : 'muted'}>
            {seat.occupied ? (ready ? 'Ready' : 'Pending') : 'Available'}
          </PidroText>
        </View>
        {onManage ? (
          <Button
            accessibilityLabel={t('table.managePlayer', { name: seat.name })}
            variant="ghost"
            size="icon"
            onPress={onManage}>
            <Feather name="more-horizontal" size={20} color={PidroColors.text} />
          </Button>
        ) : null}
      </Surface>
    </View>
  );
}

interface Props {
  room: Room;
  youPlayerId: string;
  isSpectator?: boolean;
  onLeave: () => void;
  readyPlayers?: Position[];
  readyDisabled?: boolean;
  onReady?: () => Promise<void>;
  canManage?: boolean;
  joiningName?: string | null;
  controlsBusy?: boolean;
  onOpenInvite?: () => void;
  onToggleLock?: () => void;
  onMovePlayer?: (userId: string, position: Position) => void;
  onKickPlayer?: (position: Position) => void;
}

export function WaitingTable({
  room,
  youPlayerId,
  isSpectator = false,
  onLeave,
  readyPlayers = [],
  readyDisabled = true,
  onReady,
  canManage = false,
  joiningName,
  controlsBusy = false,
  onOpenInvite,
  onToggleLock,
  onMovePlayer,
  onKickPlayer,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const portrait = height >= width;
  const compactLandscape = !portrait && width < 720;
  const seats = buildSeats(room, isSpectator ? '' : youPlayerId);
  const openSeats = seats.filter((seat) => !seat.occupied).length;
  const youPosition = isSpectator
    ? null
    : (POSITIONS.find((position) => room.positions?.[position] === youPlayerId) ?? null);
  const [selectedSeat, setSelectedSeat] = useState<SeatInfo | null>(null);
  const [profilePlayerId, setProfilePlayerId] = useState<string | null>(null);
  const [readyBusy, setReadyBusy] = useState(false);
  const readyBusyRef = useRef(false);
  const [readyError, setReadyError] = useState<string | null>(null);
  const isYouReady = !!youPosition && readyPlayers.includes(youPosition);
  const confirmReady = async () => {
    if (!onReady || readyDisabled || readyBusyRef.current || isYouReady) return;
    readyBusyRef.current = true;
    setReadyBusy(true);
    setReadyError(null);
    try {
      await onReady();
    } catch {
      setReadyError('Readiness was not confirmed. Check the table and try again.');
    } finally {
      readyBusyRef.current = false;
      setReadyBusy(false);
    }
  };
  const selectedSeatIsCurrent =
    !!selectedSeat && room.positions?.[selectedSeat.absolute] === selectedSeat.playerId;
  const moveTargets =
    selectedSeat && selectedSeatIsCurrent ? availableMoveTargets(room, selectedSeat.absolute) : [];

  return (
    <Background>
      <View testID="waiting-table" style={styles.root}>
        <Scoreboard
          scores={{ north_south: 0, east_west: 0 }}
          youPosition={youPosition}
          roomCode={room.code}
          top={insets.top}
          left={insets.left}
        />
        <Button
          label={isSpectator ? 'Back to lobby' : 'Leave'}
          variant="outline"
          size="sm"
          onPress={onLeave}
          style={[styles.leave, { top: insets.top + 8, right: insets.right + 10 }]}
        />
        {isSpectator && <WatchingBadge />}

        {seats.map((seat) => (
          <SeatPlate
            key={seat.rel}
            seat={seat}
            portrait={portrait}
            onProfile={
              seat.occupied && !seat.isBot ? () => setProfilePlayerId(seat.playerId) : undefined
            }
            ready={readyPlayers.includes(seat.absolute)}
            onManage={
              canManage && seat.occupied && !seat.isYou && !seat.isBot && seat.playerId
                ? () => setSelectedSeat(seat)
                : undefined
            }
          />
        ))}

        <View style={styles.centerWrap} pointerEvents="box-none">
          <Surface
            testID="readiness-panel"
            variant="window"
            className={portrait ? 'w-full py-4' : 'w-[44%] py-2'}
            style={[
              styles.statusWindow,
              compactLandscape && canManage && styles.statusWindowCompact,
            ]}>
            <PidroText role="title" align="center">
              {joiningName
                ? t('table.joining', { name: joiningName })
                : openSeats > 0
                  ? `Waiting for ${openSeats} more ${openSeats === 1 ? 'player' : 'players'}…`
                  : 'Everyone ready?'}
            </PidroText>
            <PidroText role="metadata" tone="soft" align="center">
              {readyPlayers.length}/4 ready · Bots are ready automatically
            </PidroText>
            {!isSpectator && openSeats === 0 && onReady ? (
              <Button
                label={isYouReady ? "You're ready" : "I'm ready"}
                onPress={confirmReady}
                disabled={readyDisabled || isYouReady || readyBusy}
                loading={readyBusy}
                className="w-full"
              />
            ) : null}
            {portrait ? (
              <PidroText role="metadata" tone="soft" align="center">
                Seat changes or a disconnect reset confirmations.
              </PidroText>
            ) : null}
            {readyError ? (
              <PidroText role="metadata" align="center">
                {readyError}
              </PidroText>
            ) : null}
            {canManage ? (
              <View style={styles.hostActions}>
                <Button
                  label={t('table.invite')}
                  size="sm"
                  onPress={onOpenInvite}
                  disabled={controlsBusy}
                  style={styles.hostAction}
                />
                <Button
                  label={room.locked ? t('table.unlock') : t('table.lock')}
                  variant="outline"
                  size="sm"
                  onPress={onToggleLock}
                  loading={controlsBusy}
                  style={styles.hostAction}
                />
              </View>
            ) : null}
          </Surface>
        </View>
      </View>
      <Modal
        isOpen={canManage && selectedSeatIsCurrent}
        title={selectedSeat ? t('table.managePlayer', { name: selectedSeat.name }) : undefined}
        description={t('table.manageDescription')}
        onClose={() => setSelectedSeat(null)}>
        <View style={styles.manageActions}>
          {moveTargets.map((position) => (
            <Button
              key={position}
              label={t('table.moveTo', { position: t(`table.position.${position}`) })}
              variant="secondary"
              disabled={controlsBusy}
              onPress={() => {
                if (selectedSeat?.playerId && selectedSeatIsCurrent) {
                  onMovePlayer?.(selectedSeat.playerId, position);
                }
                setSelectedSeat(null);
              }}
            />
          ))}
          {selectedSeat ? (
            <Button
              label={t('table.kick')}
              variant="destructive"
              disabled={controlsBusy}
              onPress={() => {
                if (selectedSeatIsCurrent) onKickPlayer?.(selectedSeat.absolute);
                setSelectedSeat(null);
              }}
            />
          ) : null}
          <Button
            label={t('common.cancel')}
            variant="outline"
            disabled={controlsBusy}
            onPress={() => setSelectedSeat(null)}
          />
        </View>
      </Modal>
      <PlayerProfileModal playerId={profilePlayerId} onClose={() => setProfilePlayerId(null)} />
    </Background>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  leave: {
    position: 'absolute',
    zIndex: 120,
  },
  seatWrap: {
    position: 'absolute',
    zIndex: 5,
    paddingHorizontal: PidroSpacing.xs,
  },
  sideSeatPortrait: {
    top: '24%',
  },
  seatPlate: {
    maxWidth: 190,
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.xs,
    padding: PidroSpacing.xs,
  },
  seatPlateYou: {
    borderColor: PidroColors.goldDark,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: PidroRadii.tight,
    borderWidth: 1,
    borderColor: PidroColors.cyanBorder,
  },
  openAvatar: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: PidroRadii.tight,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: PidroColors.border,
  },
  seatCopy: {
    minWidth: 0,
    flex: 1,
  },
  centerWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    padding: PidroSpacing.md,
  },
  statusWindow: {
    maxWidth: 470,
    alignItems: 'center',
    gap: PidroSpacing.xs,
    paddingHorizontal: PidroSpacing.lg,
  },
  statusWindowCompact: {
    maxWidth: 300,
    paddingHorizontal: PidroSpacing.sm,
    paddingVertical: PidroSpacing.sm,
  },
  hostActions: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: PidroSpacing.xs,
  },
  hostAction: {
    minWidth: 120,
    flex: 1,
  },
  manageActions: {
    gap: PidroSpacing.sm,
  },
});
