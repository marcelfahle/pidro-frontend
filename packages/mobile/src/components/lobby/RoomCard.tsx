import { View, StyleSheet } from 'react-native';
import { Room, Position } from '@/types/lobby';
import { RoomTeamDisplay } from './RoomTeamDisplay';
import { PidroText } from '@/components/ui/PidroText';
import { Surface } from '@/components/ui/Surface';
import { PidroSpacing } from '@/design/tokens';

interface RoomCardProps {
  room: Room;
  onJoin: (code: string, position?: Position) => void;
  currentUserId?: string | null;
  currentUsername?: string | null;
  compact?: boolean;
}

export function RoomCard({
  room,
  onJoin,
  currentUserId,
  currentUsername,
  compact = false,
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
  const roomName = room.name || room.metadata?.name || `Room ${room.code}`;
  const statusLabel = room.status === 'waiting' ? 'Open' : room.status;

  return (
    <Surface variant="card" style={[styles.card, compact && styles.cardCompact]}>
      <View style={styles.headerRow}>
        <View style={styles.titleCopy}>
          <PidroText role="label" numberOfLines={1}>
            {roomName}
          </PidroText>
          <PidroText role="metadata" tone="muted" numberOfLines={1}>
            Table {room.code} · {playersCount}/{maxPlayers} players
          </PidroText>
        </View>
        <PidroText
          role="metadata"
          tone={room.status === 'waiting' ? 'cyan' : 'soft'}
          style={styles.status}>
          {statusLabel}
        </PidroText>
      </View>

      <RoomTeamDisplay
        seats={room.seats}
        positions={room.positions}
        availablePositions={room.available_positions}
        onJoinSeat={(pos) => onJoin(room.code, pos)}
        isFull={isFull}
        isPlaying={isPlaying}
        currentUserId={currentUserId}
        currentUsername={currentUsername}
      />

      <PidroText role="metadata" tone="muted" numberOfLines={1}>
        {room.settings?.min_games && room.settings.min_games > 0
          ? `${room.settings.min_games} ${room.settings.min_games === 1 ? 'game' : 'games'} minimum`
          : 'No game minimum'}
        {' · '}
        {room.settings?.time_limit && room.settings.time_limit > 0
          ? `${room.settings.time_limit}-second turns`
          : 'No turn timer'}
      </PidroText>
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
    gap: PidroSpacing.xs,
    padding: PidroSpacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: PidroSpacing.sm,
  },
  titleCopy: {
    minWidth: 0,
    flex: 1,
    gap: PidroSpacing.xxs,
  },
  status: {
    textTransform: 'capitalize',
  },
});
