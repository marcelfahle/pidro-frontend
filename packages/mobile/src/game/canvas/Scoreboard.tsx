/**
 * Gold/brass scoreboard plaque pinned top-left — matches the original Pidro game
 * (a hanging banner showing Us | Them totals). Tap to expand recent hand deltas.
 */
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { PidroText } from '@/components/ui/PidroText';
import { PressableFX } from '@/components/ui/PressableFX';
import { PidroColors, PidroRadii, PidroSpacing } from '@/design/tokens';
import type { Position } from '@/types/lobby';

type Scores = { north_south: number; east_west: number } | null | undefined;
type ConcreteScores = { north_south: number; east_west: number };
type ScoreHistoryEntry = {
  handNumber: number;
  previous: ConcreteScores;
  totals: ConcreteScores;
};

function teams(scores: Scores, you: Position | null) {
  const ns = scores?.north_south ?? 0;
  const ew = scores?.east_west ?? 0;
  const youAreNS = you === 'north' || you === 'south';
  return { us: youAreNS ? ns : ew, them: youAreNS ? ew : ns };
}

function copyScores(scores: ConcreteScores): ConcreteScores {
  return {
    north_south: scores.north_south,
    east_west: scores.east_west,
  };
}

function scoresChanged(a: ConcreteScores, b: ConcreteScores): boolean {
  return a.north_south !== b.north_south || a.east_west !== b.east_west;
}

function formatDelta(value: number): string {
  if (value > 0) return `+${value}`;
  return value.toString();
}

export function Scoreboard({
  scores,
  youPosition,
  handNumber = null,
  roomCode = null,
  top = 0,
  left = 0,
}: {
  scores: Scores;
  youPosition: Position | null;
  handNumber?: number | null;
  roomCode?: string | null;
  top?: number;
  left?: number;
}) {
  const { us, them } = teams(scores, youPosition);
  const [isOpen, setIsOpen] = useState(false);
  const [scoreHistory, setScoreHistory] = useState<ScoreHistoryEntry[]>([]);
  const prevScoresRef = useRef<ConcreteScores | null>(scores ? copyScores(scores) : null);
  const prevRoomRef = useRef<string | null>(roomCode);

  useEffect(() => {
    if (prevRoomRef.current === roomCode) return;
    prevRoomRef.current = roomCode;
    setIsOpen(false);
    setScoreHistory([]);
    prevScoresRef.current = scores ? copyScores(scores) : null;
  }, [roomCode, scores]);

  useEffect(() => {
    if (!scores) return;

    const previous = prevScoresRef.current;
    if (!previous) {
      prevScoresRef.current = copyScores(scores);
      return;
    }

    if (!scoresChanged(previous, scores)) return;

    setScoreHistory((entries) => {
      const inferredHandNumber =
        handNumber != null ? Math.max(1, handNumber - 1) : entries.length + 1;
      const lastHandNumber = entries[entries.length - 1]?.handNumber ?? 0;
      const nextHandNumber =
        inferredHandNumber > lastHandNumber ? inferredHandNumber : lastHandNumber + 1;
      return [
        ...entries,
        {
          handNumber: nextHandNumber,
          previous: copyScores(previous),
          totals: copyScores(scores),
        },
      ].slice(-8);
    });
    prevScoresRef.current = copyScores(scores);
  }, [scores, handNumber]);

  return (
    // Hangs from the top edge like the original: the plaque's top is cropped
    // off-screen, only the rounded bottom shows.
    <View style={[styles.wrap, { top: top - 10, left: left + 12 }]} pointerEvents="box-none">
      <PressableFX
        accessibilityRole="button"
        accessibilityLabel={`Us ${us}, them ${them}. Toggle hand scores.`}
        accessibilityState={{ expanded: isOpen }}
        onPress={() => setIsOpen((open) => !open)}
        style={styles.plaque}
        pressedStyle={styles.plaquePressed}>
        <View style={styles.plaqueRow}>
          <View style={styles.col}>
            <PidroText role="metadata" tone="gold" style={styles.label}>
              US
            </PidroText>
            <PidroText role="title" style={styles.value}>
              {us}
            </PidroText>
          </View>
          <View style={styles.divider} />
          <View style={styles.col}>
            <PidroText role="metadata" tone="gold" style={styles.label}>
              THEM
            </PidroText>
            <PidroText role="title" style={styles.value}>
              {them}
            </PidroText>
          </View>
          <Feather
            name={isOpen ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={PidroColors.goldLight}
          />
        </View>
      </PressableFX>

      {isOpen && (
        <View style={styles.history}>
          <View style={styles.historyHeader}>
            <PidroText role="metadata" tone="gold">
              Hands
            </PidroText>
            <PidroText role="metadata" tone="muted">
              Us / Them
            </PidroText>
          </View>
          {scoreHistory.length === 0 ? (
            <PidroText role="metadata" tone="muted" align="center" style={styles.historyEmpty}>
              No completed hands yet
            </PidroText>
          ) : (
            scoreHistory.map((entry) => {
              const totalScores = teams(entry.totals, youPosition);
              const deltaScores = teams(
                {
                  north_south: entry.totals.north_south - entry.previous.north_south,
                  east_west: entry.totals.east_west - entry.previous.east_west,
                },
                youPosition
              );
              return (
                <View
                  key={`${entry.handNumber}-${entry.totals.north_south}-${entry.totals.east_west}`}
                  style={styles.historyRow}>
                  <PidroText role="metadata" tone="gold">{`H${entry.handNumber}`}</PidroText>
                  <PidroText role="metadata" style={styles.historyDelta}>
                    {formatDelta(deltaScores.us)} / {formatDelta(deltaScores.them)}
                  </PidroText>
                  <PidroText role="metadata" tone="soft" style={styles.historyTotal}>
                    {`${totalScores.us}-${totalScores.them}`}
                  </PidroText>
                </View>
              );
            })
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', zIndex: 44 },
  plaque: {
    paddingHorizontal: 16,
    paddingTop: 17,
    paddingBottom: 8,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderWidth: 2.5,
    borderTopWidth: 0,
    borderColor: PidroColors.goldDark,
    backgroundColor: PidroColors.woodBottom,
  },
  plaquePressed: {
    opacity: 0.86,
  },
  plaqueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.sm,
  },
  col: { alignItems: 'center', minWidth: 34 },
  label: {
    fontSize: 10,
    lineHeight: 13,
  },
  value: { color: PidroColors.text, fontSize: 22, lineHeight: 24 },
  divider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: PidroColors.goldSoft,
    marginVertical: 2,
  },
  history: {
    marginTop: 8,
    width: 206,
    borderRadius: PidroRadii.surface,
    borderWidth: 1,
    borderColor: PidroColors.cyanBorder,
    backgroundColor: PidroColors.panelStrong,
    padding: PidroSpacing.sm,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,212,38,0.2)',
    paddingBottom: 6,
  },
  historyEmpty: {
    paddingVertical: PidroSpacing.sm,
  },
  historyRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: PidroRadii.tight,
    backgroundColor: PidroColors.panel,
    paddingHorizontal: PidroSpacing.xs,
    paddingVertical: 6,
    gap: PidroSpacing.xs,
  },
  historyDelta: {
    flex: 1,
    textAlign: 'center',
  },
  historyTotal: {
    fontVariant: ['tabular-nums'],
  },
});
