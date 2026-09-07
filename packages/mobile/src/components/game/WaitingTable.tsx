import { ScrollView, useWindowDimensions, View } from 'react-native';
import { Fragment, useRef, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Background } from '@/components/ui/Background';
import { Button } from '@/components/ui/Button';
import { PidroText } from '@/components/ui/PidroText';
import { Modal } from '@/components/ui/Modal';
import { PidroColors } from '@/design/tokens';
import { availableMoveTargets, seatDisplayName } from '@/features/invites/hostControls';
import { t } from '@/i18n';
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
    const isBot = !!seat?.player?.is_bot;
    return {
      absolute,
      rel: relatives[(absoluteIndex - youIdx + 4) % 4],
      name: seatDisplayName(seat?.player) || (isBot ? 'Bot' : playerId ? 'Player' : 'Open seat'),
      playerId,
      isYou: !!playerId && playerId === youPlayerId,
      isBot,
      occupied: !!playerId,
      avatarUrl: seat?.player?.avatar_url ?? null,
    };
  });
}

function SeatPlate({
  seat,
  ready,
  relationship,
  onProfile,
}: {
  seat: SeatInfo;
  ready: boolean;
  relationship: string;
  onProfile?: () => void;
}) {
  const status = seat.occupied ? (ready ? 'Ready' : 'Pending') : 'Available';
  const identity = (
    <View className="items-center gap-2 py-2">
      <View className="relative">
        <View className="h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-white/20 bg-black/10">
          {seat.occupied ? (
            <Avatar
              key={seat.playerId}
              uri={seat.avatarUrl}
              // Bundled RN Web images need explicit dimensions instead of intrinsic size.
              style={{ width: 72, height: 72 }}
              resizeMode="cover"
            />
          ) : (
            <Feather name="user-plus" size={28} color={PidroColors.textSoft} />
          )}
        </View>
        {seat.occupied && ready && (
          <View
            testID={`waiting-ready-${seat.absolute}`}
            className="absolute right-0 bottom-0 h-6 w-6 items-center justify-center rounded-full border-2 border-[#12344c] bg-[#87ddd1]">
            <Feather name="check" size={14} color="#082738" />
          </View>
        )}
      </View>
      <PidroText
        testID={`waiting-name-${seat.absolute}`}
        role="label"
        align="center"
        numberOfLines={1}
        ellipsizeMode="tail"
        className="w-full">
        {seat.name}
      </PidroText>
      {(seat.isYou || (seat.isBot && seat.name !== 'Bot')) && (
        <PidroText role="metadata" tone="soft">
          {seat.isYou ? 'You' : 'Bot'}
        </PidroText>
      )}
    </View>
  );
  return (
    <View testID={`waiting-seat-${seat.absolute}`} className="min-w-0 flex-1">
      {onProfile ? (
        <PressableFX
          accessibilityRole="button"
          accessibilityLabel={`${seat.name}, ${relationship}, ${status}. View profile`}
          accessibilityHint="Opens the player's full name and profile"
          onPress={onProfile}>
          {identity}
        </PressableFX>
      ) : (
        <View accessible accessibilityLabel={`${seat.name}, ${relationship}, ${status}`}>
          {identity}
        </View>
      )}
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
  const canManageTable = canManage && !isSpectator;
  const seats = buildSeats(room, isSpectator ? '' : youPlayerId);
  const openSeats = seats.filter((seat) => !seat.occupied).length;
  const youPosition = isSpectator
    ? null
    : (POSITIONS.find((position) => room.positions?.[position] === youPlayerId) ?? null);
  const [tableMenuOpen, setTableMenuOpen] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState<SeatInfo | null>(null);
  const [profilePlayerId, setProfilePlayerId] = useState<string | null>(null);
  const [readyBusy, setReadyBusy] = useState(false);
  const readyBusyRef = useRef(false);
  const [readyError, setReadyError] = useState<string | null>(null);
  const isYouReady = !!youPosition && readyPlayers.includes(youPosition);
  const confirmReady = async () => {
    if (isSpectator || !onReady || readyDisabled || readyBusyRef.current || isYouReady) return;
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
  const teamName = (seat: SeatInfo) =>
    seat.rel === 'bottom' || seat.rel === 'top'
      ? youPosition
        ? 'Your team'
        : 'North / South'
      : youPosition
        ? 'Opponents'
        : 'East / West';

  return (
    <Background>
      <View
        testID="waiting-table"
        className="flex-1"
        style={{
          paddingTop: insets.top,
          paddingLeft: insets.left,
          paddingRight: insets.right,
          paddingBottom: insets.bottom + (isSpectator ? 64 : 0),
        }}>
        <View
          testID="waiting-toolbar"
          className="flex-row items-center justify-between gap-2 px-4 py-2">
          <Button
            label={isSpectator ? 'Back to lobby' : 'Leave'}
            variant="ghost"
            size="sm"
            onPress={onLeave}
          />
          <View className="min-w-0 flex-1 flex-row items-center justify-center gap-1">
            {room.locked && (
              <Feather
                name="lock"
                size={12}
                color={PidroColors.textSoft}
                accessibilityLabel="Table locked"
              />
            )}
            <PidroText testID="waiting-room-code" role="metadata" tone="soft" numberOfLines={1}>
              {room.code}
            </PidroText>
          </View>
          {canManageTable && openSeats > 0 && (
            <Button
              accessibilityLabel={t('table.invite')}
              variant="outline"
              size="icon"
              onPress={onOpenInvite}
              disabled={controlsBusy}>
              <Feather name="user-plus" size={20} color={PidroColors.text} />
            </Button>
          )}
          {canManageTable && (
            <Button
              label="Table"
              variant="ghost"
              size="sm"
              onPress={() => setTableMenuOpen(true)}
            />
          )}
        </View>
        <ScrollView
          testID="waiting-seats-scroll"
          className="flex-1"
          contentContainerClassName="grow justify-center gap-6 px-4 py-4">
          <View
            className={
              portrait
                ? 'w-full max-w-md items-center gap-3 self-center'
                : 'w-full max-w-4xl flex-row items-center gap-5 self-center'
            }>
            {[
              ['bottom', 'top'],
              ['left', 'right'],
            ].map((relatives, index) => (
              <Fragment key={index}>
                {index === 1 && (
                  <PidroText role="title" tone="soft" align="center">
                    VS
                  </PidroText>
                )}
                <View
                  testID={`waiting-team-${index}`}
                  className={portrait ? 'w-full gap-3' : 'min-w-0 flex-1 gap-3'}>
                  <PidroText role="label" tone={index === 0 ? 'gold' : 'cyan'} align="center">
                    {teamName(seats.find((seat) => seat.rel === relatives[0])!)}
                  </PidroText>
                  <View className="flex-row items-start gap-3">
                    {relatives.map((rel) => {
                      const seat = seats.find((candidate) => candidate.rel === rel)!;
                      return (
                        <SeatPlate
                          key={seat.absolute}
                          seat={seat}
                          ready={readyPlayers.includes(seat.absolute)}
                          relationship={
                            seat.isYou
                              ? 'You'
                              : youPosition
                                ? seat.rel === 'top'
                                  ? 'Partner'
                                  : 'Opponent'
                                : seat.absolute
                          }
                          onProfile={
                            seat.occupied && !seat.isBot
                              ? () => setProfilePlayerId(seat.playerId)
                              : undefined
                          }
                        />
                      );
                    })}
                  </View>
                </View>
              </Fragment>
            ))}
          </View>
          <View testID="readiness-panel" className="w-full max-w-xs gap-3 self-center">
            <View className="flex-row items-center justify-center gap-2">
              {openSeats === 0 && (
                <Feather name="check-circle" size={16} color={PidroColors.cyanText} />
              )}
              <PidroText
                role="metadata"
                tone="soft"
                align="center"
                className="shrink"
                accessibilityLiveRegion="polite">
                {joiningName
                  ? t('table.joining', { name: joiningName })
                  : openSeats > 0
                    ? `Waiting for ${openSeats} ${openSeats === 1 ? 'player' : 'players'}`
                    : `${readyPlayers.length} of 4 ready`}
              </PidroText>
            </View>
            {!isSpectator && openSeats === 0 && onReady && (
              <Button
                label={isYouReady ? "You're ready" : readyBusy ? 'Confirming…' : "I'm ready"}
                onPress={confirmReady}
                disabled={readyDisabled || isYouReady || readyBusy}
                loading={readyBusy}
              />
            )}
            {readyError && (
              <PidroText role="metadata" tone="danger" align="center">
                {readyError}
              </PidroText>
            )}
          </View>
        </ScrollView>
      </View>
      {isSpectator && <WatchingBadge />}
      <Modal
        isOpen={canManageTable && (tableMenuOpen || selectedSeatIsCurrent)}
        title={
          selectedSeatIsCurrent
            ? t('table.managePlayer', { name: selectedSeat!.name })
            : 'Table settings'
        }
        onClose={() => {
          setTableMenuOpen(false);
          setSelectedSeat(null);
        }}>
        <ScrollView
          style={{
            maxHeight: Math.min(320, Math.max(120, height - insets.top - insets.bottom - 160)),
          }}
          contentContainerClassName="gap-3">
          {selectedSeatIsCurrent ? (
            <>
              {moveTargets.map((position) => (
                <Button
                  key={position}
                  label={`${t('table.moveTo', { position: teamName(seats.find((seat) => seat.absolute === position)!) })} · ${t(`table.position.${position}`)}`}
                  variant="secondary"
                  disabled={controlsBusy}
                  onPress={() => {
                    if (canManageTable && selectedSeat?.playerId && selectedSeatIsCurrent)
                      onMovePlayer?.(selectedSeat.playerId, position);
                    setSelectedSeat(null);
                  }}
                />
              ))}
              <Button
                label={t('table.kick')}
                variant="destructive"
                disabled={controlsBusy}
                onPress={() => {
                  if (canManageTable && selectedSeatIsCurrent)
                    onKickPlayer?.(selectedSeat!.absolute);
                  setSelectedSeat(null);
                }}
              />
              <Button label="Back" variant="outline" onPress={() => setSelectedSeat(null)} />
            </>
          ) : (
            <>
              <Button
                label={room.locked ? t('table.unlock') : t('table.lock')}
                variant="outline"
                onPress={onToggleLock}
                loading={controlsBusy}
              />
              <PidroText role="metadata" tone="soft">
                Players
              </PidroText>
              {seats
                .filter((seat) => seat.occupied && !seat.isYou && !seat.isBot)
                .map((seat) => (
                  <Button
                    key={seat.playerId}
                    label={seat.name}
                    accessibilityLabel={t('table.managePlayer', { name: seat.name })}
                    variant="secondary"
                    onPress={() => setSelectedSeat(seat)}
                  />
                ))}
              <PidroText role="metadata" tone="muted">
                Seat changes or disconnects reset readiness. Bots are ready automatically.
              </PidroText>
              <Button label="Close" variant="outline" onPress={() => setTableMenuOpen(false)} />
            </>
          )}
        </ScrollView>
      </Modal>
      <PlayerProfileModal playerId={profilePlayerId} onClose={() => setProfilePlayerId(null)} />
    </Background>
  );
}
