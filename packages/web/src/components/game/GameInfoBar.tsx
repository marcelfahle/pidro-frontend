import type { ActiveTurnTimer, Position } from '@pidro/shared';
import { getTeamScores } from '@pidro/shared';
import { useEffect, useRef, useState } from 'react';

type Scores = { north_south: number; east_west: number };

interface GameInfoBarProps {
  scores: Scores | null;
  viewerPosition: Position;
  viewerIsSpectator?: boolean;
  handNumber: number | null;
  roomCode: string;
}

interface ScoreHistoryEntry {
  handNumber: number;
  previous: Scores;
  totals: Scores;
}

function copyScores(scores: Scores): Scores {
  return {
    north_south: scores.north_south,
    east_west: scores.east_west,
  };
}

function scoresChanged(a: Scores, b: Scores): boolean {
  return a.north_south !== b.north_south || a.east_west !== b.east_west;
}

function formatDelta(value: number): string {
  if (value > 0) return `+${value}`;
  return value.toString();
}

export function GameInfoBar({
  scores,
  viewerPosition,
  viewerIsSpectator = false,
  handNumber,
  roomCode,
}: GameInfoBarProps) {
  const teamScores = scores ? getTeamScores(scores, viewerPosition) : { us: 0, them: 0 };
  const homeTeamLabel = viewerIsSpectator ? 'NS' : 'Us';
  const awayTeamLabel = viewerIsSpectator ? 'EW' : 'Them';
  const expandedHomeTeamLabel = viewerIsSpectator ? 'North/South' : 'Us';
  const expandedAwayTeamLabel = viewerIsSpectator ? 'East/West' : 'Them';

  // Track score changes for bump animation
  const prevScoresRef = useRef(teamScores);
  const [usBump, setUsBump] = useState(false);
  const [themBump, setThemBump] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [scoreHistory, setScoreHistory] = useState<ScoreHistoryEntry[]>([]);
  const prevRawScoresRef = useRef<Scores | null>(scores ? copyScores(scores) : null);
  const prevRoomCodeRef = useRef(roomCode);

  useEffect(() => {
    if (teamScores.us !== prevScoresRef.current.us) {
      setUsBump(true);
      const t = setTimeout(() => setUsBump(false), 400);
      return () => clearTimeout(t);
    }
  }, [teamScores.us]);

  useEffect(() => {
    if (teamScores.them !== prevScoresRef.current.them) {
      setThemBump(true);
      const t = setTimeout(() => setThemBump(false), 400);
      return () => clearTimeout(t);
    }
  }, [teamScores.them]);

  useEffect(() => {
    prevScoresRef.current = teamScores;
  });

  useEffect(() => {
    if (prevRoomCodeRef.current === roomCode) return;
    prevRoomCodeRef.current = roomCode;
    setScoreHistory([]);
    setIsHistoryOpen(false);
    prevRawScoresRef.current = null;
  }, [roomCode]);

  useEffect(() => {
    if (!scores) return;

    const previousScores = prevRawScoresRef.current;
    if (!previousScores) {
      prevRawScoresRef.current = copyScores(scores);
      return;
    }

    if (!scoresChanged(previousScores, scores)) return;

    setScoreHistory((entries) => {
      const inferredHandNumber =
        handNumber != null ? Math.max(1, handNumber - 1) : entries.length + 1;
      const lastEntry = entries[entries.length - 1];
      const lastHandNumber = lastEntry?.handNumber ?? 0;
      const nextHandNumber =
        inferredHandNumber > lastHandNumber ? inferredHandNumber : lastHandNumber + 1;

      return [
        ...entries,
        {
          handNumber: nextHandNumber,
          previous: copyScores(previousScores),
          totals: copyScores(scores),
        },
      ].slice(-12);
    });
    prevRawScoresRef.current = copyScores(scores);
  }, [scores, handNumber]);

  return (
    <div className="relative flex flex-col items-start gap-2">
      <button
        type="button"
        className="pidro-score-mini grid min-w-[128px] grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 pb-3 pt-2 max-sm:min-w-[112px] max-sm:px-3 max-sm:pb-2.5"
        aria-expanded={isHistoryOpen}
        aria-label={`${homeTeamLabel} ${teamScores.us}, ${awayTeamLabel} ${teamScores.them}. Toggle hand scores.`}
        onClick={() => setIsHistoryOpen((open) => !open)}
      >
        <span className="sr-only">{homeTeamLabel}</span>
        <span
          className={`text-center text-[34px] font-black leading-none text-white max-sm:text-[26px] ${usBump ? 'animate-score-bump' : ''}`}
        >
          {teamScores.us}
        </span>
        <span className="h-9 w-px bg-[#ffcc54]/25 max-sm:h-7" />
        <span className="sr-only">{awayTeamLabel}</span>
        <span
          className={`text-center text-[34px] font-black leading-none text-[#ffb12c] max-sm:text-[26px] ${themBump ? 'animate-score-bump' : ''}`}
        >
          {teamScores.them}
        </span>
      </button>

      {isHistoryOpen && (
        <div className="pidro-score-history w-[244px] p-3 text-[#fff2c2] max-sm:w-[214px] max-sm:p-2.5">
          <div className="flex items-center justify-between border-b border-[#ffcc54]/20 pb-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#ffebaa]/70">
            <span>Hands</span>
            <span>
              {expandedHomeTeamLabel} / {expandedAwayTeamLabel}
            </span>
          </div>

          {scoreHistory.length === 0 ? (
            <div className="py-3 text-center text-xs font-bold text-cyan-50/60">
              No completed hands yet
            </div>
          ) : (
            <ol className="mt-2 grid gap-1.5">
              {scoreHistory.map((entry) => {
                const totalScores = getTeamScores(entry.totals, viewerPosition);
                const deltaScores = getTeamScores(
                  {
                    north_south: entry.totals.north_south - entry.previous.north_south,
                    east_west: entry.totals.east_west - entry.previous.east_west,
                  },
                  viewerPosition,
                );

                return (
                  <li
                    key={`${entry.handNumber}-${entry.totals.north_south}-${entry.totals.east_west}`}
                    className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-md bg-cyan-950/30 px-2 py-1.5 text-xs font-black"
                  >
                    <span className="text-[#ffcc54]">H{entry.handNumber}</span>
                    <span className="text-center text-white">
                      {formatDelta(deltaScores.us)} / {formatDelta(deltaScores.them)}
                    </span>
                    <span className="font-mono text-cyan-50/75">
                      {totalScores.us}-{totalScores.them}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
