import { StyleSheet, View } from 'react-native';
import type { TerminalGameJoinFailure } from '@/channels/gameJoinFailure';
import { PidroSpacing } from '@/design/tokens';
import { Background } from '@/components/ui/Background';
import { BevelButton } from '@/components/ui/BevelButton';
import { PidroText } from '@/components/ui/PidroText';
import { Surface } from '@/components/ui/Surface';

interface GameJoinFailureScreenProps {
  failure: TerminalGameJoinFailure | 'away';
  exitLabel: 'Back home' | 'Back to lobby';
  onExit: () => void;
  /** Joins the table again; only the away screen offers it. */
  onReturn?: () => void;
}

export function GameJoinFailureScreen({
  failure,
  exitLabel,
  onExit,
  onReturn,
}: GameJoinFailureScreenProps) {
  const seatUnavailable = failure === 'seat_unavailable';
  const title =
    failure === 'away'
      ? 'You were away'
      : seatUnavailable
        ? 'Your reconnect window expired'
        : 'Table unavailable';
  const message =
    failure === 'away'
      ? 'You missed a few turns, so a bot is taking your seat. Come back soon to play it yourself.'
      : seatUnavailable
        ? 'Your seat is no longer available. The game has continued without you.'
        : failure === 'access_unavailable'
          ? 'You no longer have access to this table.'
          : 'This table no longer exists.';

  return (
    <Background>
      <View style={styles.screen}>
        <Surface
          variant="window"
          style={styles.window}
          padded
          accessibilityRole="alert"
          testID={failure === 'away' ? 'game-away-window' : 'game-join-failure-window'}>
          <PidroText role="title" align="center">
            {title}
          </PidroText>
          <PidroText role="body" tone="soft" align="center">
            {message}
          </PidroText>
          {onReturn ? (
            <BevelButton label="I'm back" onPress={onReturn} style={styles.action} />
          ) : null}
          <BevelButton label={exitLabel} onPress={onExit} material="glass" style={styles.action} />
        </Surface>
      </View>
    </Background>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: PidroSpacing.md,
  },
  window: {
    width: '100%',
    maxWidth: 520,
    gap: PidroSpacing.md,
  },
  action: {
    alignSelf: 'center',
  },
});
