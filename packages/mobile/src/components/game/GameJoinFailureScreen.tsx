import { StyleSheet, View } from 'react-native';
import type { TerminalGameJoinFailure } from '@/channels/gameJoinFailure';
import { PidroSpacing } from '@/design/tokens';
import { Background } from '@/components/ui/Background';
import { BevelButton } from '@/components/ui/BevelButton';
import { PidroText } from '@/components/ui/PidroText';
import { Surface } from '@/components/ui/Surface';
import { useTranslation } from '@/i18n';

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
  const { t } = useTranslation();
  const seatUnavailable = failure === 'seat_unavailable';
  const title =
    failure === 'away'
      ? t('game.away')
      : seatUnavailable
        ? t('game.expired')
        : t('game.unavailable');
  const message =
    failure === 'away'
      ? t('game.away_description')
      : seatUnavailable
        ? t('game.expired_description')
        : failure === 'access_unavailable'
          ? t('game.access_description')
          : t('game.gone_description');

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
            <BevelButton label={t('game.im_back')} onPress={onReturn} style={styles.action} />
          ) : null}
          <BevelButton
            label={t(exitLabel === 'Back home' ? 'game.back_home' : 'game.lobby')}
            onPress={onExit}
            material="glass"
            style={styles.action}
          />
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
