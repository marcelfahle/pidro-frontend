import { View, StyleSheet } from 'react-native';
import { Room, Position } from '@/types/lobby';
import { RoomTeamDisplay } from './RoomTeamDisplay';
import { PidroText } from '@/components/ui/PidroText';
import { Surface } from '@/components/ui/Surface';
import { PidroSpacing, PidroType } from '@/design/tokens';

interface RoomCardProps {
  room: Room;
  onJoin: (code: string, position?: Position) => void;
  currentUserId?: string | null;
  currentUsername?: string | null;
  compact?: boolean;
  minimumGames?: Partial<Record<Position, number>>;
}

export function RoomCard({
  room,
  onJoin,
  currentUserId,
  currentUsername,
  compact = false,
  minimumGames,
}: RoomCardProps) {
  const playersCount =
    room.player_count ??
    room.players_count ??
    room.player_ids?.length ??
    room.seats?.filter((s) => !!s.player).length ??
    0;

  const maxPlayers = room.max_players ?? 4;
  const isFull = playersCount >= maxPlayers;
  const isPlaying = ['playing', 'ready', 'finished'].includes(room.status);
  const roomName = room.name || `Room ${room.code}`;

  return (
    <Surface
      testID={`lobby-table-${room.code}`}
      variant="card"
      style={[styles.card, compact && styles.cardCompact]}>
      <View style={[styles.titleCopy, compact && styles.titleCompact]}>
        <PidroText role="label" numberOfLines={1}>
          {roomName}
        </PidroText>
      </View>

      <View style={compact && styles.teamsCompact}>
        <RoomTeamDisplay
          seats={room.seats}
          positions={room.positions}
          availablePositions={room.available_positions}
          onJoinSeat={(pos) => onJoin(room.code, pos)}
          isFull={isFull}
          isPlaying={isPlaying}
          currentUserId={currentUserId}
          currentUsername={currentUsername}
          tableName={roomName}
          minimumGames={minimumGames}
        />
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    gap: PidroSpacing.sm,
    padding: PidroSpacing.md,
  },
  cardCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.md,
    padding: PidroSpacing.sm,
  },
  titleCopy: {
    minWidth: 0,
    height: PidroType.label.lineHeight * 1.5,
  },
  titleCompact: {
    width: '26%',
    justifyContent: 'center',
  },
  teamsCompact: {
    flex: 1,
    minWidth: 0,
  },
});
