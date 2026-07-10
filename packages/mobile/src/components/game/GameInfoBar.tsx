import { View, Text, StyleSheet } from 'react-native';
import type { GamePhase, Suit } from '@/types/game';
import type { Position } from '@/types/lobby';
import { SUIT_SYMBOLS, SUIT_COLORS_RAW } from '@/utils/cards';
import { getTeamScores } from '@/utils/positions';

interface GameInfoBarProps {
  phase: GamePhase;
  trumpSuit: Suit | null;
  scores: { north_south: number; east_west: number } | null;
  youPosition: Position | null;
  roundNumber: number | null;
}

const PHASE_LABELS: Record<string, string> = {
  dealer_selection: 'Selecting Dealer',
  dealing: 'Dealing',
  bidding: 'Bidding',
  declaring: 'Declaring Trump',
  declaring_trump: 'Declaring Trump',
  trump_declaration: 'Declaring Trump',
  discarding: 'Discarding',
  second_deal: 'Second Deal',
  playing: 'Playing',
  scoring: 'Scoring',
  hand_complete: 'Hand Complete',
  complete: 'Game Over',
  game_over: 'Game Over',
  finished: 'Game Over',
};

export function GameInfoBar({
  phase,
  trumpSuit,
  scores,
  youPosition,
  roundNumber,
}: GameInfoBarProps) {
  const teamScores = scores ? getTeamScores(scores, youPosition) : { us: 0, them: 0 };

  return (
    <View style={styles.container}>
      <View style={styles.scoresRow}>
        <Text style={styles.teamLabel}>Us</Text>
        <Text style={styles.scoreValue}>{teamScores.us}</Text>
        <Text style={styles.separator}>-</Text>
        <Text style={styles.scoreValue}>{teamScores.them}</Text>
        <Text style={styles.teamLabel}>Them</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.phaseText}>{PHASE_LABELS[phase] ?? phase}</Text>
        {roundNumber != null && <Text style={styles.roundText}>Hand #{roundNumber}</Text>}
        {trumpSuit ? (
          <Text style={[styles.trumpText, { color: SUIT_COLORS_RAW[trumpSuit] }]}>
            {SUIT_SYMBOLS[trumpSuit]}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(88, 28, 135, 0.3)',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    gap: 4,
  },
  scoresRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  teamLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(191, 219, 254, 0.7)',
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  separator: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  phaseText: {
    fontSize: 11,
    color: 'rgba(191, 219, 254, 0.7)',
  },
  roundText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  trumpText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
