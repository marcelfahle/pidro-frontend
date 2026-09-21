import { View, StyleSheet } from 'react-native';
import { Seat, Position } from '@/types/lobby';
import { POSITION_TO_INDEX } from '@/utils/positions';
import { PidroColors, PidroRadii, PidroSpacing, PidroType } from '@/design/tokens';
import { PressableFX } from '@/components/ui/PressableFX';
import { PidroText } from '@/components/ui/PidroText';
import { LevelRing } from '@/components/home/LevelRing';
import { BevelPressable } from '@/components/ui/Bevel';
import { Icon } from '@/components/ui/Icon';
import { SeatRequirementBadge } from './SeatRequirementBadge';
import { PlayerProfileModal } from '@/components/profile/PlayerProfileModal';
import { useState } from 'react';

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
  tableName?: string;
  /** Presentation only until the server supplies and enforces seat requirements. */
  minimumGames?: Partial<Record<Position, number>>;
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
  tableName,
  minimumGames,
}: RoomTeamDisplayProps) {
  const [profilePlayerId, setProfilePlayerId] = useState<string | null>(null);
  const getSeat = (
    pos: Position
  ):
    | {
        status: 'occupied' | 'free';
        player: {
          id: string;
          username: string;
          is_bot?: boolean;
          avatar_url?: string | null;
        } | null;
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
    const canJoin = !isOccupied && isAvailable(position) && !isPlaying && !isFull;

    if (isOccupied && player) {
      const content = (
        <>
          <LevelRing uri={player.avatar_url} size={48} />
          <PidroText role="metadata" style={styles.name} numberOfLines={1}>
            {player.username}
          </PidroText>
        </>
      );
      return player.is_bot ? (
        <View style={styles.seat}>{content}</View>
      ) : (
        <PressableFX
          accessibilityRole="button"
          accessibilityLabel={`View ${player.username}'s profile`}
          onPress={() => setProfilePlayerId(player.id)}
          style={styles.seat}>
          {content}
        </PressableFX>
      );
    }

    return (
      <View style={styles.seat}>
        <View>
          <BevelPressable
            material="glass"
            radius={PidroRadii.full}
            accessibilityRole="button"
            accessibilityLabel={`Join ${position} seat${tableName ? ` at ${tableName}` : ''}${minimumGames?.[position] ? `, minimum ${minimumGames[position]} games` : ''}`}
            accessibilityState={{ disabled: !canJoin }}
            onPress={() => onJoinSeat(position)}
            disabled={!canJoin}
            style={[styles.openSeat, !canJoin && styles.disabled]}
            contentStyle={styles.openIcon}>
            <Icon name="plus" size={24} />
          </BevelPressable>
          {minimumGames?.[position] ? (
            <SeatRequirementBadge games={minimumGames[position]!} />
          ) : null}
        </View>
      </View>
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
          vs
        </PidroText>
      </View>
      <View style={styles.team}>
        {renderSeat('east')}
        {renderSeat('west')}
      </View>
      <PlayerProfileModal
        key={profilePlayerId ?? 'closed'}
        playerId={profilePlayerId}
        onClose={() => setProfilePlayerId(null)}
      />
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
    minWidth: 0,
    flexDirection: 'row',
    gap: PidroSpacing.xs,
  },
  vsWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  seat: {
    flex: 1,
    minWidth: 0,
    // Reserve the same scaled name line for every seat, including vacant ones.
    height: 48 + PidroSpacing.xxs + PidroType.metadata.lineHeight * 1.5,
    alignItems: 'center',
    gap: PidroSpacing.xxs,
  },
  name: {
    width: '100%',
    textAlign: 'center',
    color: PidroColors.text,
  },
  openSeat: {
    width: 48,
    height: 48,
  },
  openIcon: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.46,
  },
});
