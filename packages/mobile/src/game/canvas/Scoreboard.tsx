/**
 * Mounted navy-and-brass score plaque. Tap for locally observed score changes.
 * Under it in portrait, beside it in landscape where the West seat sits below,
 * the action ticker: the latest table actions, resting on who holds the bid as
 * Classic's "Bet 6" did. Tap the ticker for the hand's log.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { gradientBg } from '@/components/ui/Bevel';
import { Icon } from '@/components/ui/Icon';
import { PidroText } from '@/components/ui/PidroText';
import { PressableFX } from '@/components/ui/PressableFX';
import { PidroBevel, PidroColors, PidroFonts, PidroRadii, PidroSpacing } from '@/design/tokens';
import type { Position } from '@/types/lobby';
import { handLogEntries, type HandLogGroup } from '@/game/handLog';
import { ActionTicker, type TickerRestingLine } from './ActionTicker';
import { HandLogWindow } from './HandLogWindow';
import { TableUtilityWindow } from './TableUtilityWindow';
import { formatNumber, useTranslation } from '@/i18n';

type Scores = { north_south: number; east_west: number } | null | undefined;
type ConcreteScores = { north_south: number; east_west: number };
type ScoreHistoryEntry = {
  handNumber: number;
  previous: ConcreteScores;
  totals: ConcreteScores;
};

// The plaque's fonts are capped, so its height is fixed: rim, padding, label, figure.
const RIM = 1.5;
const LABEL_LINE = 13;
const VALUE_LINE = 29;
export const SCORE_PLAQUE_HEIGHT = 2 * RIM + 2 * PidroSpacing.xxs + LABEL_LINE + VALUE_LINE;

function teams(scores: Scores, you: Position | null) {
  const ns = scores?.north_south ?? 0;
  const ew = scores?.east_west ?? 0;
  const youAreNS = you === null || you === 'north' || you === 'south';
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
  return `${value > 0 ? '+' : ''}${formatNumber(value)}`;
}

export function Scoreboard({
  scores,
  youPosition,
  handNumber = null,
  roomCode = null,
  top = 0,
  left = 0,
  log = [],
  resting = null,
  yourTurn = false,
  ticker,
  stateArrived = true,
}: {
  scores: Scores;
  youPosition: Position | null;
  handNumber?: number | null;
  roomCode?: string | null;
  top?: number;
  left?: number;
  /** The hand log behind the ticker. */
  log?: HandLogGroup[];
  resting?: TickerRestingLine | null;
  /** The log steps aside when it becomes your turn. */
  yourTurn?: boolean;
  /** Where the ticker keeps off North's fan (layout's tickerPlacement); null leaves it out. */
  ticker?: { lineMaxWidth: number; drop: number } | null;
  /** False until the table has its first server state; the ticker waits for it. */
  stateArrived?: boolean;
}) {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const { us, them } = teams(scores, youPosition);
  const usLabel = youPosition ? t('game.us').toLocaleUpperCase() : t('game.ns_short');
  const themLabel = youPosition ? t('game.them').toLocaleUpperCase() : t('game.ew_short');
  const [isOpen, setIsOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  // The log steps aside the moment it becomes your turn.
  const [turnSeen, setTurnSeen] = useState(yourTurn);
  if (yourTurn !== turnSeen) {
    setTurnSeen(yourTurn);
    if (yourTurn) setLogOpen(false);
  }
  const entries = useMemo(() => handLogEntries(log), [log]);
  const [scoreHistory, setScoreHistory] = useState<ScoreHistoryEntry[]>([]);
  const prevScoresRef = useRef<ConcreteScores | null>(scores ? copyScores(scores) : null);
  const prevRoomRef = useRef<string | null>(roomCode);

  useEffect(() => {
    if (prevRoomRef.current === roomCode) return;
    prevRoomRef.current = roomCode;
    setIsOpen(false);
    setLogOpen(false);
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
    <View
      style={[
        styles.wrap,
        landscape ? styles.wrapRow : null,
        { top, left: left + PidroSpacing.sm },
      ]}
      pointerEvents="box-none">
      <PressableFX
        accessibilityRole="button"
        accessibilityLabel={t('game.score_accessibility', { usLabel, us, themLabel, them })}
        accessibilityState={{ expanded: isOpen }}
        onPress={() => setIsOpen((open) => !open)}
        style={[styles.plaque, gradientBg(PidroBevel.goldRimGradient)]}>
        <View style={styles.plaqueRow}>
          <View style={styles.col}>
            <PidroText role="metadata" tone="gold" style={styles.label} maxFontSizeMultiplier={1}>
              {usLabel}
            </PidroText>
            <PidroText role="title" style={styles.value} maxFontSizeMultiplier={1}>
              {formatNumber(us)}
            </PidroText>
          </View>
          <View style={styles.divider} />
          <View style={styles.col}>
            <PidroText role="metadata" tone="gold" style={styles.label} maxFontSizeMultiplier={1}>
              {themLabel}
            </PidroText>
            <PidroText role="title" style={styles.value} maxFontSizeMultiplier={1}>
              {formatNumber(them)}
            </PidroText>
          </View>
          <Icon name="chevron-down" size={14} color={PidroColors.goldLight} />
        </View>
      </PressableFX>
      {/* A new table starts its ticker afresh. */}
      {ticker !== null ? (
        <View style={{ marginTop: ticker?.drop ?? 0 }} pointerEvents="box-none">
          <ActionTicker
            key={roomCode ?? 'table'}
            entries={entries}
            resting={resting}
            onOpenLog={() => setLogOpen(true)}
            stateArrived={stateArrived}
            lineMaxWidth={ticker?.lineMaxWidth}
          />
        </View>
      ) : null}
      {/* Closed, the log builds nothing. */}
      <HandLogWindow open={logOpen} onClose={() => setLogOpen(false)} groups={logOpen ? log : []} />

      <TableUtilityWindow
        title={t('game.recent_scores')}
        open={isOpen}
        onClose={() => setIsOpen(false)}>
        <PidroText role="metadata" tone="muted">
          {t('game.score_description')}
        </PidroText>
        <View style={styles.historyHeader}>
          <PidroText role="metadata" tone="gold" style={styles.historyDelta}>
            {usLabel}
          </PidroText>
          <PidroText role="metadata" tone="gold" style={styles.historyDelta}>
            {themLabel}
          </PidroText>
        </View>
        {scoreHistory.length === 0 ? (
          <PidroText role="metadata" tone="muted" align="center" style={styles.historyEmpty}>
            {t('game.no_scores')}
          </PidroText>
        ) : (
          [...scoreHistory].reverse().map((entry) => {
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
                <View style={styles.historyDelta}>
                  <PidroText role="label" align="center">
                    {formatDelta(deltaScores.us)}
                  </PidroText>
                  <PidroText role="metadata" tone="muted" align="center">
                    {t('game.total', { number: formatNumber(totalScores.us) })}
                  </PidroText>
                </View>
                <View style={styles.historyDelta}>
                  <PidroText role="label" align="center">
                    {formatDelta(deltaScores.them)}
                  </PidroText>
                  <PidroText role="metadata" tone="muted" align="center">
                    {t('game.total', { number: formatNumber(totalScores.them) })}
                  </PidroText>
                </View>
              </View>
            );
          })
        )}
      </TableUtilityWindow>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', zIndex: 44, alignItems: 'flex-start', gap: PidroSpacing.xxs },
  // Top-aligned, so a growing ticker never moves the plaque.
  wrapRow: { flexDirection: 'row', alignItems: 'flex-start', gap: PidroSpacing.sm },
  plaque: {
    padding: RIM,
    borderRadius: PidroRadii.lg,
    boxShadow: PidroBevel.glassDropShadow,
  },
  plaqueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.xs,
    paddingHorizontal: PidroSpacing.sm,
    paddingVertical: PidroSpacing.xxs,
    backgroundColor: PidroBevel.panelDeep,
    borderRadius: PidroRadii.lg - RIM,
    boxShadow: PidroBevel.glassFaceInset,
  },
  col: { alignItems: 'center', minWidth: 52 },
  label: {
    fontSize: 10,
    lineHeight: LABEL_LINE,
  },
  value: {
    color: PidroColors.text,
    fontFamily: PidroFonts.display,
    fontWeight: '400',
    fontSize: 22,
    lineHeight: VALUE_LINE,
  },
  divider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: PidroColors.goldSoft,
    marginVertical: 2,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: PidroColors.border,
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
});
