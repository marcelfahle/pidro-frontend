import { View, StyleSheet } from 'react-native';
import { Room, Position } from '@/types/lobby';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { RoomTeamDisplay } from './RoomTeamDisplay';
import { PidroText } from '@/components/ui/PidroText';
import { PidroColors, PidroRadii, PidroSpacing } from '@/design/tokens';

interface RoomCardProps {
  room: Room;
  onJoin: (code: string, position?: Position) => void;
  currentUserId?: string | null;
  currentUsername?: string | null;
}

export function RoomCard({ room, onJoin, currentUserId, currentUsername }: RoomCardProps) {
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

  return (
    <Card>
      <CardHeader>
        <View style={styles.headerRow}>
          <CardTitle>{roomName}</CardTitle>
          <View style={styles.statusPill}>
            <PidroText role="metadata" tone="soft" style={styles.statusText}>
              {room.status}
            </PidroText>
          </View>
        </View>
      </CardHeader>

      <CardContent>
        <View style={styles.teams}>
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
        </View>

        <View style={styles.settingsRow}>
          <PidroText role="metadata" tone="muted">
            Table rules
          </PidroText>
          <PidroText role="metadata" tone="soft" style={styles.settingsValue}>
            {room.settings?.min_games && room.settings.min_games > 0
              ? `${room.settings.min_games} ${room.settings.min_games === 1 ? 'game' : 'games'} minimum`
              : 'No minimum'}
            {' · '}
            {room.settings?.time_limit && room.settings.time_limit > 0
              ? `${room.settings.time_limit}s turns`
              : 'No timer'}
          </PidroText>
        </View>
      </CardContent>
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: PidroSpacing.sm,
  },
  statusPill: {
    borderRadius: PidroRadii.full,
    borderWidth: 1,
    borderColor: PidroColors.border,
    backgroundColor: PidroColors.panel,
    paddingHorizontal: PidroSpacing.xs,
    paddingVertical: PidroSpacing.xxs,
  },
  statusText: {
    textTransform: 'capitalize',
  },
  teams: {
    marginBottom: PidroSpacing.sm,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: PidroSpacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(91, 221, 255, 0.18)',
    paddingTop: PidroSpacing.xs,
  },
  settingsValue: {
    flexShrink: 1,
    textAlign: 'right',
  },
});
