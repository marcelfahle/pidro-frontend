import { View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Seat, Position } from '@/types/lobby';
import { POSITION_TO_INDEX } from '@/utils/positions';
import { PidroColors, PidroLayout, PidroRadii, PidroSpacing } from '@/design/tokens';
import { PressableFX } from '@/components/ui/PressableFX';
import { PidroText } from '@/components/ui/PidroText';

interface RoomTeamDisplayProps {
  seats?: Seat[];
  positions?: {
    north: string | null;
    east: string | null;
    south: string | null;
    west: string | null;
  };
  availablePositions?: Position[];
  onJoinSeat: (position: Position) => void;
  isFull: boolean;
  isPlaying: boolean;
  currentUserId?: string | null;
  currentUsername?: string | null;
}

export function RoomTeamDisplay({
  seats,
  positions,
  availablePositions,
  onJoinSeat,
  isFull,
  isPlaying,
  currentUserId,
  currentUsername,
}: RoomTeamDisplayProps) {
  const getSeat = (
    pos: Position
  ):
    | {
        status: 'occupied' | 'free';
        player: { id: string; username: string; is_bot?: boolean } | null;
      }
    | undefined => {
    if (positions) {
      const playerId = positions[pos];
      if (playerId) {
        const seatFromSeats = seats?.find((s) => s.player?.id === playerId);
        if (seatFromSeats?.player) {
          return {
            status: 'occupied',
            player: {
              ...seatFromSeats.player,
              username:
                playerId === currentUserId && currentUsername
                  ? currentUsername
                  : seatFromSeats.player.username,
            },
          };
        }
        return {
          status: 'occupied',
          player: {
            id: playerId,
            username:
              playerId === currentUserId && currentUsername
                ? currentUsername
                : playerId.slice(0, 8),
          },
        };
      }
      return { status: 'free', player: null };
    }

    if (!seats) return undefined;
    const targetIndex = POSITION_TO_INDEX[pos];
    const seat = seats.find((s) => s.seat_index === targetIndex);
    if (!seat) return { status: 'free' as const, player: null };
    return seat;
  };

  const isAvailable = (pos: Position) => {
    if (availablePositions) {
      return availablePositions.includes(pos);
    }
    const seat = getSeat(pos);
    return seat?.status === 'free' || !seat?.player;
  };

  const renderSeat = (position: Position) => {
    const seat = getSeat(position);
    const isOccupied = seat?.status === 'occupied' || !!seat?.player;
    const player = seat?.player;
    const canJoin = isAvailable(position) && !isPlaying && !isFull;

    if (isOccupied && player) {
      return (
        <View style={styles.seat}>
          <View style={[styles.avatar, player.is_bot && styles.botAvatar]}>
            {player.is_bot ? (
              <Feather name="cpu" size={16} color="#fff6d1" />
            ) : (
              <PidroText role="label" style={styles.avatarText}>
                {player.username.charAt(0).toUpperCase()}
              </PidroText>
            )}
          </View>
          <PidroText role="metadata" style={styles.name} numberOfLines={1}>
            {player.username}
          </PidroText>
        </View>
      );
    }

    return (
      <PressableFX
        accessibilityRole="button"
        accessibilityLabel={`Join ${position} seat`}
        accessibilityState={{ disabled: !canJoin }}
        onPress={() => onJoinSeat(position)}
        disabled={!canJoin}
        style={[styles.seat, styles.openSeat, !canJoin && styles.disabled]}
        pressedStyle={canJoin ? styles.openSeatPressed : undefined}>
        <View style={styles.openIcon}>
          <Feather name="plus" size={16} color="rgba(221,246,255,0.72)" />
        </View>
        <PidroText role="metadata" tone="soft">
          Open
        </PidroText>
      </PressableFX>
    );
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.team}>
        {renderSeat('north')}
        {renderSeat('south')}
      </View>
      <View style={styles.vsWrap}>
        <PidroText role="metadata" tone="muted">
          vs.
        </PidroText>
      </View>
      <View style={styles.team}>
        {renderSeat('east')}
        {renderSeat('west')}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: PidroSpacing.xs,
  },
  team: {
    flex: 1,
    gap: PidroSpacing.xs,
  },
  vsWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  seat: {
    minHeight: PidroLayout.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.xs,
    borderRadius: PidroRadii.surface,
    borderWidth: 1,
    borderColor: PidroColors.border,
    backgroundColor: PidroColors.panel,
    paddingHorizontal: PidroSpacing.xs,
    paddingVertical: PidroSpacing.xs,
  },
  avatar: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: PidroRadii.tight,
    borderWidth: 1,
    borderColor: PidroColors.cyanBorder,
    backgroundColor: PidroColors.glassHover,
  },
  botAvatar: {
    borderColor: PidroColors.goldDark,
    backgroundColor: PidroColors.goldSoft,
  },
  avatarText: {
    color: PidroColors.text,
  },
  name: {
    minWidth: 0,
    flex: 1,
    color: PidroColors.text,
  },
  openSeat: {
    borderStyle: 'dashed',
  },
  openSeatPressed: {
    backgroundColor: PidroColors.glassHover,
  },
  openIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: PidroRadii.tight,
    borderWidth: 1,
    borderColor: PidroColors.cyanBorder,
  },
  disabled: {
    opacity: 0.46,
  },
});
