import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useState } from 'react';
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
    return { absolute, rel, name, playerId, isYou, isBot, occupied: !!playerId };
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
  onManage,
}: {
  seat: SeatInfo;
  portrait: boolean;
  onManage?: () => void;
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
      pointerEvents={onManage ? 'box-none' : 'none'}>
      <Surface variant="plaque" style={[styles.seatPlate, seat.isYou && styles.seatPlateYou]}>
        {seat.occupied ? (
          <Image
            source={require('~/assets/images/avatar1.png')}
            style={styles.avatar}
            resizeMode="cover"
          />
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
            {seat.occupied ? 'Waiting' : 'Available'}
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
  onLeave: () => void;
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
  onLeave,
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
  const seats = buildSeats(room, youPlayerId);
  const openSeats = seats.filter((seat) => !seat.occupied).length;
  const youPosition =
    POSITIONS.find((position) => room.positions?.[position] === youPlayerId) ?? null;
  const [selectedSeat, setSelectedSeat] = useState<SeatInfo | null>(null);
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
          label="Leave"
          variant="outline"
          size="sm"
          onPress={onLeave}
          style={[styles.leave, { top: insets.top + 8, right: insets.right + 10 }]}
        />

        {seats.map((seat) => (
          <SeatPlate
            key={seat.rel}
            seat={seat}
            portrait={portrait}
            onManage={
              canManage && seat.occupied && !seat.isYou && !seat.isBot && seat.playerId
                ? () => setSelectedSeat(seat)
                : undefined
            }
          />
        ))}

        <View style={styles.centerWrap} pointerEvents="box-none">
          <Surface
            variant="window"
            style={[
              styles.statusWindow,
              compactLandscape && canManage && styles.statusWindowCompact,
            ]}>
            <PidroText role="title" align="center">
              {joiningName
                ? t('table.joining', { name: joiningName })
                : openSeats > 0
                  ? `Waiting for ${openSeats} more ${openSeats === 1 ? 'player' : 'players'}…`
                  : 'Starting the game…'}
            </PidroText>
            <PidroText role="metadata" tone="soft" align="center">
              Table {room.code} · The game starts automatically when every seat is filled.
            </PidroText>
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
    top: '32%',
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
    paddingVertical: PidroSpacing.md,
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
