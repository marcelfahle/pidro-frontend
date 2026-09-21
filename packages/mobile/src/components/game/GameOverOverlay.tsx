import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LevelRing } from '@/components/home/LevelRing';
import { BevelButton } from '@/components/ui/BevelButton';
import { Icon } from '@/components/ui/Icon';
import { PidroText } from '@/components/ui/PidroText';
import { Surface } from '@/components/ui/Surface';
import { PidroBevel, PidroColors, PidroSpacing } from '@/design/tokens';
import type { RematchVote } from '@pidro/shared';
import type { GameViewModel, RelativePlayerView, ServerGameState } from '@/types/game';
import { getTeamScores, isNorthSouthTeam, resolveWinningTeam } from '@/utils/positions';
import { VictoryConfetti } from './VictoryConfetti';

interface GameOverOverlayProps {
  viewModel: GameViewModel;
  serverState: ServerGameState;
  progressionSummary?: {
    xp_earned: number;
    veteran_level: number;
    leveled_up: boolean;
    veteran_title?: string;
  } | null;
  onHome: () => void;
  onPlayAgain: () => void;
  rematch?: RematchVote | null;
  rematchPending?: boolean;
}

function displayName(player: RelativePlayerView): string {
  if (player.isYou) return 'You';
  if (player.username) return player.username;
  if (player.seatStatus === 'bot_substitute' || player.seatStatus === 'permanent_bot') return 'Bot';
  return player.absolutePosition;
}

export function GameOverOverlay({
  viewModel,
  serverState,
  progressionSummary,
  onHome,
  onPlayAgain,
  rematch,
  rematchPending = false,
}: GameOverOverlayProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const compact = height - insets.top - insets.bottom < 520;
  const wide = width - insets.left - insets.right >= 600;
  const rawScores = serverState.scores ?? { north_south: 0, east_west: 0 };
  const spectator = !viewModel.players.some((player) => player.isYou);
  const relativeScores = getTeamScores(rawScores, viewModel.viewerPositionAbsolute);
  const firstIsNorthSouth = spectator || isNorthSouthTeam(viewModel.viewerPositionAbsolute);
  const winningTeam = resolveWinningTeam(serverState.winner, rawScores);
  const tied = winningTeam == null;
  const firstWon = !tied && (winningTeam === 'north_south') === firstIsNorthSouth;
  const viewerWon = !spectator && firstWon;
  const outcome = tied
    ? 'A tie!'
    : spectator
      ? `${winningTeam === 'north_south' ? 'North / South' : 'East / West'} win!`
      : viewerWon
        ? 'You won!'
        : 'Opponents win';
  const rematchStatus =
    rematch && rematch.needed > 1 && rematch.agreed > 0
      ? `${rematch.agreed} of ${rematch.needed} want to play again`
      : null;

  return (
    <View testID="game-over-overlay" style={styles.overlay} accessibilityViewIsModal>
      <View
        style={[
          styles.safeContent,
          {
            paddingTop: insets.top + PidroSpacing.md,
            paddingBottom: insets.bottom + PidroSpacing.md,
            paddingLeft: insets.left + PidroSpacing.md,
            paddingRight: insets.right + PidroSpacing.md,
          },
        ]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <Surface
            testID="game-over-window"
            variant="window"
            style={[styles.panel, compact && styles.panelCompact]}>
            <PidroText
              role={compact ? 'title' : 'display'}
              accessibilityRole="header"
              align="center">
              {outcome}
            </PidroText>
            <View style={styles.teams}>
              {[true, false].map((first) => (
                <View
                  key={String(first)}
                  testID={first ? 'result-team-first' : 'result-team-second'}
                  style={[styles.team, !first && styles.secondTeam]}>
                  <PidroText role="label" tone="soft" align="center">
                    {spectator
                      ? first
                        ? 'North / South'
                        : 'East / West'
                      : first
                        ? 'Your team'
                        : 'Opponents'}
                  </PidroText>
                  <PidroText
                    testID={first ? 'result-score-first' : 'result-score-second'}
                    role={compact ? 'display' : 'score'}
                    tone={!tied && first === firstWon ? 'gold' : 'default'}
                    align="center">
                    {spectator
                      ? first
                        ? rawScores.north_south
                        : rawScores.east_west
                      : first
                        ? relativeScores.us
                        : relativeScores.them}
                  </PidroText>
                  <View style={[styles.players, wide && styles.playersWide]}>
                    {viewModel.players
                      .filter(
                        (player) =>
                          (isNorthSouthTeam(player.absolutePosition) === firstIsNorthSouth) ===
                          first
                      )
                      .map((player) => (
                        <View
                          key={player.absolutePosition}
                          style={[styles.player, wide && styles.playerWide]}>
                          <LevelRing uri={player.avatar_url} size={compact ? 32 : 44} />
                          <PidroText role="label" numberOfLines={2} style={styles.playerName}>
                            {displayName(player)}
                          </PidroText>
                        </View>
                      ))}
                  </View>
                </View>
              ))}
            </View>
            {!spectator && progressionSummary && (
              <Surface variant="subtle" style={styles.progression}>
                <PidroText role="label" tone="gold" align="center">
                  +{progressionSummary.xp_earned} XP
                  {progressionSummary.leveled_up
                    ? ` · Level ${progressionSummary.veteran_level}!`
                    : ''}
                </PidroText>
              </Surface>
            )}
          </Surface>
        </ScrollView>
        <View style={styles.footer}>
          {rematchStatus && !spectator ? (
            <Surface variant="panel" style={styles.rematchStatus}>
              <PidroText
                testID="rematch-status"
                accessibilityLiveRegion="polite"
                role="metadata"
                tone="soft"
                align="center">
                {rematchStatus}
              </PidroText>
            </Surface>
          ) : null}
          <View style={styles.actions}>
            <BevelButton
              testID="game-over-home"
              accessibilityLabel="Home"
              material="glass"
              size="icon"
              onPress={onHome}>
              <Icon name="home" size={24} />
            </BevelButton>
            {!spectator && (
              <BevelButton
                testID="play-again"
                label={rematch?.youAgreed ? 'Waiting…' : 'Rematch'}
                leadingIcon={<Icon name="rematch" size={22} color={PidroBevel.textGold} />}
                disabled={!rematch || rematch.youAgreed}
                loading={rematchPending}
                onPress={onPlayAgain}
              />
            )}
          </View>
        </View>
      </View>
      {viewerWon && <VictoryConfetti />}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
    backgroundColor: PidroColors.backdrop,
  },
  safeContent: { flex: 1, gap: PidroSpacing.sm },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  panel: {
    width: '100%',
    maxWidth: 680,
    flexShrink: 0,
    paddingVertical: PidroSpacing.xxl,
    paddingHorizontal: PidroSpacing.md,
    gap: PidroSpacing.xl,
  },
  panelCompact: { paddingVertical: PidroSpacing.md, gap: PidroSpacing.sm },
  teams: { flexDirection: 'row' },
  team: { flex: 1, minWidth: 0, gap: PidroSpacing.xs, paddingHorizontal: PidroSpacing.xs },
  secondTeam: { borderLeftWidth: 1, borderLeftColor: PidroColors.border },
  players: { gap: PidroSpacing.sm, marginTop: PidroSpacing.xs },
  playersWide: { flexDirection: 'row' },
  player: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.xs,
  },
  playerWide: { flex: 1 },
  playerName: { flex: 1, minWidth: 0 },
  progression: { padding: PidroSpacing.sm },
  footer: { gap: PidroSpacing.xs },
  rematchStatus: {
    alignSelf: 'center',
    paddingVertical: PidroSpacing.xxs,
    paddingHorizontal: PidroSpacing.sm,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: PidroSpacing.md,
  },
});
