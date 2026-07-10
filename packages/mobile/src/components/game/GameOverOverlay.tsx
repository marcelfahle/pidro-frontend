import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { PidroText } from '@/components/ui/PidroText';
import { Surface } from '@/components/ui/Surface';
import { PidroColors, PidroRadii, PidroSpacing } from '@/design/tokens';
import type { GameViewModel, RelativePlayerView, ServerGameState } from '@/types/game';
import { getTeamScores, isNorthSouthTeam } from '@/utils/positions';

interface GameOverOverlayProps {
  viewModel: GameViewModel;
  serverState: ServerGameState;
  progressionSummary?: {
    xp_earned: number;
    veteran_level: number;
    leveled_up: boolean;
    veteran_title?: string;
  } | null;
  onBackToLobby: () => void;
  onPlayAgain: () => void;
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
  onBackToLobby,
  onPlayAgain,
}: GameOverOverlayProps) {
  const { width, height } = useWindowDimensions();
  const portrait = height >= width;
  const compact = height < 520;
  const rawScores = serverState.scores ?? { north_south: 0, east_west: 0 };
  const youPlayer = viewModel.players.find((player) => player.isYou);
  const spectator = !youPlayer;
  const relativeScores = getTeamScores(rawScores, viewModel.viewerPositionAbsolute);
  const scores = spectator
    ? { first: rawScores.north_south, second: rawScores.east_west }
    : { first: relativeScores.us, second: relativeScores.them };
  const labels = spectator
    ? { first: 'North / South', second: 'East / West' }
    : { first: 'Us', second: 'Them' };
  const tied = rawScores.north_south === rawScores.east_west;
  const viewerWon = !spectator && relativeScores.us > relativeScores.them;
  const northSouthWon = tied ? null : rawScores.north_south > rawScores.east_west;

  const outcome = tied
    ? 'The game ends in a tie'
    : spectator
      ? `${northSouthWon ? 'North / South' : 'East / West'} wins!`
      : viewerWon
        ? 'Your team wins!'
        : 'The other team wins';
  const winners =
    northSouthWon == null
      ? []
      : viewModel.players.filter(
          (player) => isNorthSouthTeam(player.absolutePosition) === northSouthWon
        );

  return (
    <View style={styles.overlay}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Surface
          testID="game-over-window"
          variant="window"
          style={[styles.panel, { maxWidth: portrait ? 520 : 760 }]}>
          <View style={[styles.celebration, compact && styles.celebrationCompact]}>
            <PidroText role="metadata" tone="gold" align="center">
              GAME OVER
            </PidroText>
            <PidroText role="display" align="center" style={compact && styles.outcomeCompact}>
              {viewerWon ? `🎉 ${outcome} 🎉` : outcome}
            </PidroText>
          </View>

          <View style={[styles.summary, portrait && styles.summaryPortrait]}>
            <View style={styles.scoreSection}>
              <PidroText role="label" tone="soft" align="center">
                Final score
              </PidroText>
              <View style={styles.scoreRow}>
                <Score
                  value={scores.first}
                  label={labels.first}
                  highlighted={scores.first >= scores.second}
                />
                <PidroText role="title" tone="muted">
                  –
                </PidroText>
                <Score
                  value={scores.second}
                  label={labels.second}
                  highlighted={scores.second >= scores.first}
                />
              </View>
            </View>

            {!tied ? (
              <View style={styles.teamSection}>
                <PidroText role="label" tone="soft">
                  Winning team
                </PidroText>
                <View style={styles.playerList}>
                  {winners.map((player) => (
                    <Surface
                      key={player.absolutePosition}
                      variant="subtle"
                      style={styles.playerChip}>
                      <View style={styles.avatar}>
                        <PidroText role="label" style={styles.avatarText} maxFontSizeMultiplier={1}>
                          {displayName(player)[0]?.toUpperCase() ?? '?'}
                        </PidroText>
                      </View>
                      <PidroText role="metadata" numberOfLines={1} style={styles.playerName}>
                        {displayName(player)}
                      </PidroText>
                    </Surface>
                  ))}
                </View>
              </View>
            ) : null}
          </View>

          {progressionSummary ? (
            <Surface variant="subtle" style={styles.progression}>
              <ProgressStat label="XP earned" value={progressionSummary.xp_earned.toString()} />
              <View style={styles.progressionDivider} />
              <ProgressStat
                label="Level"
                value={`${progressionSummary.veteran_level}${progressionSummary.leveled_up ? ' ↑' : ''}`}
              />
              {progressionSummary.veteran_title ? (
                <>
                  <View style={styles.progressionDivider} />
                  <ProgressStat label="Title" value={progressionSummary.veteran_title} />
                </>
              ) : null}
            </Surface>
          ) : null}

          <View style={[styles.actions, portrait && styles.actionsPortrait]}>
            <Button
              label="Back to lobby"
              variant="outline"
              onPress={onBackToLobby}
              style={styles.actionButton}
            />
            <Button label="Play again" onPress={onPlayAgain} style={styles.actionButton} />
          </View>
        </Surface>
      </ScrollView>
    </View>
  );
}

function Score({
  value,
  label,
  highlighted,
}: {
  value: number;
  label: string;
  highlighted: boolean;
}) {
  return (
    <View style={styles.score}>
      <PidroText role="display" tone={highlighted ? 'gold' : 'default'} style={styles.scoreValue}>
        {value}
      </PidroText>
      <PidroText role="metadata" tone="muted" align="center">
        {label}
      </PidroText>
    </View>
  );
}

function ProgressStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.progressStat}>
      <PidroText role="metadata" tone="muted" align="center">
        {label}
      </PidroText>
      <PidroText role="label" tone="gold" align="center" numberOfLines={2}>
        {value}
      </PidroText>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
    backgroundColor: PidroColors.backdrop,
  },
  scrollContent: {
    minHeight: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: PidroSpacing.md,
  },
  panel: {
    width: '100%',
    gap: PidroSpacing.md,
    padding: PidroSpacing.md,
  },
  celebration: {
    alignItems: 'center',
    gap: PidroSpacing.xs,
    paddingVertical: PidroSpacing.xs,
  },
  celebrationCompact: {
    paddingVertical: 0,
  },
  outcomeCompact: {
    fontSize: 24,
    lineHeight: 29,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: PidroSpacing.md,
  },
  summaryPortrait: {
    flexDirection: 'column',
  },
  scoreSection: {
    minWidth: 0,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: PidroSpacing.sm,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: PidroSpacing.md,
  },
  score: {
    minWidth: 92,
    alignItems: 'center',
  },
  scoreValue: {
    fontVariant: ['tabular-nums'],
  },
  teamSection: {
    minWidth: 0,
    flex: 1,
    gap: PidroSpacing.sm,
  },
  playerList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: PidroSpacing.xs,
  },
  playerChip: {
    minWidth: 118,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.xs,
    padding: PidroSpacing.xs,
  },
  avatar: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: PidroRadii.tight,
    backgroundColor: PidroColors.gold,
  },
  avatarText: {
    color: PidroColors.ink,
  },
  playerName: {
    minWidth: 0,
    flex: 1,
  },
  progression: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: PidroSpacing.sm,
    padding: PidroSpacing.sm,
  },
  progressStat: {
    minWidth: 72,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressionDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: PidroColors.border,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: PidroSpacing.sm,
  },
  actionsPortrait: {
    flexDirection: 'column',
  },
  actionButton: {
    minWidth: 150,
    flex: 1,
  },
});
