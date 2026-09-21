import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Fragment, useRef, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Background } from '@/components/ui/Background';
import { BevelButton } from '@/components/ui/BevelButton';
import { Surface } from '@/components/ui/Surface';
import { LevelRing } from '@/components/home/LevelRing';
import { PidroText } from '@/components/ui/PidroText';
import { Modal } from '@/components/ui/Modal';
import { PidroColors, PidroLayout, PidroRadii, PidroSpacing } from '@/design/tokens';
import { availableMoveTargets, seatDisplayName } from '@/features/invites/hostControls';
import { t } from '@/i18n';
import type { Position, Room } from '@/types/lobby';
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
  compact,
}: {
  seat: SeatInfo;
  ready: boolean;
  relationship: string;
  onProfile?: () => void;
  compact: boolean;
}) {
  const status = seat.occupied ? (ready ? 'Ready' : 'Pending') : 'Available';
  const identity = (
    <View style={styles.identity}>
      <View>
        <View style={[styles.avatar, compact && styles.avatarCompact]}>
          {seat.occupied ? (
            <LevelRing key={seat.playerId} uri={seat.avatarUrl} size={compact ? 48 : 64} />
          ) : (
            <Feather name="user-plus" size={28} color={PidroColors.textSoft} />
          )}
        </View>
        {seat.occupied && ready && (
          <View testID={`waiting-ready-${seat.absolute}`} style={styles.readyBadge}>
            <Feather name="check" size={12} color={PidroColors.ink} />
          </View>
        )}
      </View>
      <PidroText
        testID={`waiting-name-${seat.absolute}`}
        role="label"
        align="center"
        numberOfLines={1}
        ellipsizeMode="tail"
        style={styles.fullWidth}>
        {seat.name}
      </PidroText>
      <PidroText role="metadata" tone="soft">
        {seat.isYou ? 'You' : ' '}
      </PidroText>
      <PidroText role="metadata" style={ready ? styles.readyText : styles.pendingText}>
        {seat.occupied ? (ready ? 'Ready' : 'Not ready') : 'Available'}
      </PidroText>
    </View>
  );
  return (
    <View testID={`waiting-seat-${seat.absolute}`} style={styles.seat}>
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
  /** Host only: fill a vacant seat with a bot. */
  onSeatBot?: (position: Position) => void;
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
  onSeatBot,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const portrait = height >= width;
  const compact = height < PidroLayout.compactHeight;
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
        style={{
          flex: 1,
          paddingTop: insets.top,
          paddingLeft: insets.left,
          paddingRight: insets.right,
          paddingBottom: insets.bottom + (isSpectator ? 64 : 0),
        }}>
        <View testID="waiting-toolbar" style={styles.toolbar}>
          <BevelButton
            label={isSpectator ? 'Back to lobby' : 'Leave'}
            material="glass"
            size="sm"
            onPress={onLeave}
          />
          <View style={styles.toolbarSpace} />
          {canManageTable && openSeats > 0 && (
            <BevelButton
              accessibilityLabel={t('table.invite')}
              material="glass"
              size="icon"
              onPress={onOpenInvite}
              disabled={controlsBusy}>
              <Feather name="user-plus" size={20} color={PidroColors.text} />
            </BevelButton>
          )}
          {canManageTable && (
            <BevelButton
              label="Table"
              material="glass"
              size="sm"
              onPress={() => setTableMenuOpen(true)}
            />
          )}
        </View>
        <ScrollView
          testID="waiting-seats-scroll"
          style={styles.scroll}
          contentContainerStyle={[styles.content, compact && styles.compactContent]}>
          {!compact && (
            <View style={styles.heading}>
              <PidroText role="display" align="center">
                {openSeats > 0 ? 'Gather your table' : isYouReady ? 'All set!' : 'Ready to play?'}
              </PidroText>
              <PidroText role="metadata" tone="soft" align="center">
                {openSeats > 0
                  ? 'Four seats. Two teams. One great game.'
                  : 'The game begins when everyone is ready.'}
              </PidroText>
            </View>
          )}
          <View style={[styles.matchup, !portrait && styles.matchupLandscape]}>
            {[
              ['bottom', 'top'],
              ['left', 'right'],
            ].map((relatives, index) => (
              <Fragment key={index}>
                {index === 1 && (
                  <PidroText role="label" tone="soft" align="center" style={styles.versus}>
                    VS
                  </PidroText>
                )}
                <Surface
                  variant="panel"
                  testID={`waiting-team-${index}`}
                  style={[styles.team, !portrait && styles.teamLandscape]}>
                  <PidroText
                    role="label"
                    tone={index === 0 ? 'gold' : 'cyan'}
                    align="center"
                    style={styles.teamHeading}>
                    {teamName(seats.find((seat) => seat.rel === relatives[0])!)}
                  </PidroText>
                  <View style={styles.roster}>
                    {relatives.map((rel) => {
                      const seat = seats.find((candidate) => candidate.rel === rel)!;
                      return (
                        <SeatPlate
                          key={seat.absolute}
                          seat={seat}
                          compact={compact}
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
                </Surface>
              </Fragment>
            ))}
          </View>
          <View testID="readiness-panel" style={styles.readiness}>
            <View style={styles.status}>
              {openSeats === 0 && (
                <Feather name="check-circle" size={16} color={PidroColors.cyanText} />
              )}
              <PidroText
                role="metadata"
                tone="soft"
                align="center"
                style={styles.statusText}
                accessibilityLiveRegion="polite">
                {joiningName
                  ? t('table.joining', { name: joiningName })
                  : openSeats > 0
                    ? `Waiting for ${openSeats} ${openSeats === 1 ? 'player' : 'players'}`
                    : `${readyPlayers.length} of 4 ready`}
              </PidroText>
            </View>
            {canManageTable && openSeats > 0 && onSeatBot && (
              <BevelButton
                testID="waiting-seat-bot"
                label={t('table.seatBot')}
                material="glass"
                fullWidth
                disabled={controlsBusy}
                onPress={() => {
                  const open = seats.find((seat) => !seat.occupied);
                  if (open) onSeatBot(open.absolute);
                }}
              />
            )}
            {!isSpectator && openSeats === 0 && onReady && (
              <BevelButton
                label={isYouReady ? "You're ready" : readyBusy ? 'Confirming…' : "I'm ready"}
                fullWidth
                size={compact ? 'md' : 'lg'}
                weight="hero"
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
          contentContainerStyle={styles.menu}>
          {selectedSeatIsCurrent ? (
            <>
              {moveTargets.map((position) => (
                <BevelButton
                  key={position}
                  label={`${t('table.moveTo', { position: teamName(seats.find((seat) => seat.absolute === position)!) })} · ${t(`table.position.${position}`)}`}
                  material="glass"
                  fullWidth
                  disabled={controlsBusy}
                  onPress={() => {
                    if (canManageTable && selectedSeat?.playerId && selectedSeatIsCurrent)
                      onMovePlayer?.(selectedSeat.playerId, position);
                    setSelectedSeat(null);
                  }}
                />
              ))}
              <BevelButton
                accessibilityLabel={t('table.kick')}
                material="glass"
                fullWidth
                disabled={controlsBusy}
                onPress={() => {
                  if (canManageTable && selectedSeatIsCurrent)
                    onKickPlayer?.(selectedSeat!.absolute);
                  setSelectedSeat(null);
                }}>
                <PidroText role="label" tone="danger">
                  {t('table.kick')}
                </PidroText>
              </BevelButton>
              <BevelButton
                label="Back"
                material="glass"
                fullWidth
                onPress={() => setSelectedSeat(null)}
              />
            </>
          ) : (
            <>
              <BevelButton
                label={room.locked ? t('table.unlock') : t('table.lock')}
                material="glass"
                fullWidth
                onPress={onToggleLock}
                loading={controlsBusy}
              />
              <PidroText role="metadata" tone="soft">
                Players
              </PidroText>
              {seats
                .filter((seat) => seat.occupied && !seat.isYou && !seat.isBot)
                .map((seat) => (
                  <BevelButton
                    key={seat.playerId}
                    label={seat.name}
                    accessibilityLabel={t('table.managePlayer', { name: seat.name })}
                    material="glass"
                    fullWidth
                    onPress={() => setSelectedSeat(seat)}
                  />
                ))}
              <PidroText role="metadata" tone="muted">
                Seat changes or disconnects reset readiness. Bots are ready automatically.
              </PidroText>
              <BevelButton
                label="Close"
                material="glass"
                fullWidth
                onPress={() => setTableMenuOpen(false)}
              />
            </>
          )}
        </ScrollView>
      </Modal>
      <PlayerProfileModal playerId={profilePlayerId} onClose={() => setProfilePlayerId(null)} />
    </Background>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.xs,
    paddingHorizontal: PidroSpacing.md,
    paddingVertical: PidroSpacing.xs,
  },
  toolbarSpace: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: PidroSpacing.lg,
    padding: PidroSpacing.md,
  },
  compactContent: { gap: PidroSpacing.sm, paddingVertical: PidroSpacing.xs },
  heading: { gap: PidroSpacing.xs },
  matchup: {
    width: '100%',
    maxWidth: PidroLayout.contentMaxWidth,
    alignSelf: 'center',
    gap: PidroSpacing.xs,
  },
  matchupLandscape: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: PidroLayout.wideContentMaxWidth,
  },
  versus: { paddingHorizontal: PidroSpacing.xxs },
  team: { padding: PidroSpacing.sm, gap: PidroSpacing.sm },
  teamLandscape: { flex: 1, minWidth: 0 },
  teamHeading: {
    paddingBottom: PidroSpacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: PidroColors.border,
  },
  roster: { flexDirection: 'row', gap: PidroSpacing.xs },
  seat: { flex: 1, minWidth: 0 },
  identity: { alignItems: 'center', gap: PidroSpacing.xxs },
  avatar: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: PidroRadii.full,
    backgroundColor: PidroColors.panelSoft,
  },
  avatarCompact: { width: 48, height: 48 },
  readyBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: PidroRadii.full,
    borderWidth: 2,
    borderColor: PidroColors.ink,
    backgroundColor: PidroColors.success,
  },
  fullWidth: { width: '100%' },
  readyText: { color: PidroColors.success },
  pendingText: { color: PidroColors.textMuted },
  readiness: { width: '100%', maxWidth: 380, alignSelf: 'center', gap: PidroSpacing.sm },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: PidroSpacing.xs,
  },
  statusText: { flexShrink: 1 },
  menu: { gap: PidroSpacing.sm },
});
