import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { SeatRow, TeamSection, VsDivider } from '@/components/lobby/SeatRow';
import { PidroText } from '@/components/ui/PidroText';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { seatRow, type SeatView } from '@/features/lobby/seatRow';
import { BOT_CREW } from '@/features/lobby/fixtures';

const maija = { user_id: 'u_maija', display_name: 'Maija', avatar_url: null };
const you: SeatView = { team: 'you', opened: false, type: 'held', player: { username: 'Bengt' } };

/** Every state a seat row can show, four seats at a time, the way New table lays them out. */
const FIXTURES: Record<string, { title: string; seats: SeatView[] }> = {
  setup: {
    title: 'Before the table opens: friend, 100+, bot',
    seats: [
      you,
      { team: 'partner', opened: false, type: 'held', held_for: maija },
      { team: 'opponent', opened: false, type: 'open', min_games: 100 },
      { team: 'opponent', opened: false, type: 'ai' },
    ],
  },
  'setup-open': {
    title: 'Before the table opens: anyone, 1000+, password',
    seats: [
      you,
      { team: 'partner', opened: false, type: 'open' },
      { team: 'opponent', opened: false, type: 'open', min_games: 1000 },
      { team: 'opponent', opened: false, type: 'open', password: '4821' },
    ],
  },
  opened: {
    title: 'After: friend online, seated, password',
    seats: [
      you,
      { team: 'partner', opened: true, type: 'held', held_for: maija, presence: 'online' },
      {
        team: 'opponent',
        opened: true,
        type: 'open',
        player: { id: 'u_kalle', username: 'Kalle' },
      },
      { team: 'opponent', opened: true, type: 'open', password: '4821' },
    ],
  },
  'opened-more': {
    title: 'After: friend not online, open, bot seated',
    seats: [
      you,
      { team: 'partner', opened: true, type: 'held', held_for: maija, presence: 'offline' },
      { team: 'opponent', opened: true, type: 'open', min_games: 100 },
      { team: 'opponent', opened: true, type: 'ai', player: { is_bot: true, ...BOT_CREW[1] } },
    ],
  },
};

export function SeatRowGallery({ fixture }: { fixture?: string }) {
  const { width, height } = useWindowDimensions();
  const columns = width > height;
  const { title, seats } = FIXTURES[fixture ?? 'setup'] ?? FIXTURES.setup;
  const rows = seats.map((seat, index) => (
    <SeatRow key={index} row={seatRow(seat)} onPress={() => {}} testID={`seat-row-${index}`} />
  ));
  return (
    <ScreenShell contentStyle={[styles.shell, !columns && styles.stacked]}>
      <View testID="ui-seat-rows-panel" style={styles.panel}>
        <PidroText role="label" tone="soft">
          {title}
        </PidroText>
        <View style={[styles.teams, columns && styles.columns]}>
          <TeamSection team="yours" style={columns && styles.column}>
            {rows.slice(0, 2)}
          </TeamSection>
          <VsDivider between={columns ? 'columns' : 'rows'} />
          <TeamSection team="opponents" style={columns && styles.column}>
            {rows.slice(2)}
          </TeamSection>
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, justifyContent: 'center', paddingVertical: 20 },
  stacked: { maxWidth: 620 },
  panel: { gap: 14 },
  teams: { gap: 12 },
  columns: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  column: { flex: 1 },
});
