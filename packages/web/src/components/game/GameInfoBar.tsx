import type { GamePhase, Position, Suit } from '@pidro/shared';
import { getTeamScores, SUIT_COLORS_RAW, SUIT_SYMBOLS } from '@pidro/shared';
import { useEffect, useRef, useState } from 'react';

interface GameInfoBarProps {
  phase: GamePhase;
  trumpSuit: Suit | null;
  scores: { north_south: number; east_west: number } | null;
  youPosition: Position | null;
  roundNumber: number | null;
  roomCode: string;
  currentBid: number | null;
  bidWinner: Position | null;
}

const PHASE_LABELS: Record<GamePhase, string> = {
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
};

function isNorthSouth(position: Position): boolean {
  return position === 'north' || position === 'south';
}

function bidTeamLabel(bidWinner: Position, youPosition: Position | null): string {
  if (!youPosition) return isNorthSouth(bidWinner) ? 'NS' : 'EW';
  const sameTeam = isNorthSouth(bidWinner) === isNorthSouth(youPosition);
  return sameTeam ? 'Us' : 'Them';
}

export function GameInfoBar({
  phase,
  trumpSuit,
  scores,
  youPosition,
  roundNumber,
  roomCode,
  currentBid,
  bidWinner,
}: GameInfoBarProps) {
  const teamScores = scores ? getTeamScores(scores, youPosition) : { us: 0, them: 0 };

  // Track score changes for bump animation
  const prevScoresRef = useRef(teamScores);
  const [usBump, setUsBump] = useState(false);
  const [themBump, setThemBump] = useState(false);

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

  // Show bid during playing phase (and trump declaration / discarding / second deal)
  const showBid =
    currentBid != null &&
    bidWinner != null &&
    (phase === 'playing' ||
      phase === 'declaring' ||
      phase === 'declaring_trump' ||
      phase === 'trump_declaration' ||
      phase === 'discarding' ||
      phase === 'second_deal');

  return (
    <div className="pidro-score-plaque w-[320px] px-4 pb-4 pt-2 max-md:w-[84vw] max-md:max-w-[320px] max-md:px-3 max-md:pb-2.5">
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3 border-b border-[#ffcc54]/20 pb-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ffebaa]/65">
            Us
          </div>
          <div
            className={`text-4xl font-black text-white max-md:text-3xl ${usBump ? 'animate-score-bump' : ''}`}
          >
            {teamScores.us}
          </div>
        </div>
        <div className="h-10 w-px bg-[#ffcc54]/20" />
        <div className="text-right">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ffebaa]/65">
            Them
          </div>
          <div
            className={`text-4xl font-black text-[#ffcc54] max-md:text-3xl ${themBump ? 'animate-score-bump' : ''}`}
          >
            {teamScores.them}
          </div>
        </div>
      </div>

      {trumpSuit && (
        <div
          className="flex items-center justify-center gap-2 border-b border-[#ffcc54]/20 py-2 text-lg font-black uppercase tracking-[0.14em]"
          style={{ color: SUIT_COLORS_RAW[trumpSuit] }}
        >
          <span className="text-2xl">{SUIT_SYMBOLS[trumpSuit]}</span>
          <span className="text-white">{trumpSuit}</span>
          {showBid && (
            <span className="ml-2 text-sm text-[#fff0b2]">
              Bid {currentBid} ({bidTeamLabel(bidWinner, youPosition)})
            </span>
          )}
        </div>
      )}

      {!trumpSuit && showBid && (
        <div className="flex items-center justify-center border-b border-[#ffcc54]/20 py-2 text-sm font-black uppercase tracking-[0.14em] text-[#fff0b2]">
          Bid {currentBid} ({bidTeamLabel(bidWinner, youPosition)})
        </div>
      )}

      <div className="mt-2.5 grid gap-2 text-xs font-black uppercase tracking-[0.12em] text-[#fff0b8] max-md:grid-cols-2 max-md:text-[11px]">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[#ffebaa]/70">Phase</span>
          <span className="text-right text-white">{PHASE_LABELS[phase] ?? phase}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[#ffebaa]/70">Hand</span>
          <span className="text-right text-white">
            {roundNumber != null ? `#${roundNumber}` : 'Soon'}
          </span>
        </div>
        {!trumpSuit && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-[#ffebaa]/70">Trump</span>
            <span className="text-right text-white/75">Undeclared</span>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <span className="text-[#ffebaa]/70">Room</span>
          <span className="font-mono text-right tracking-[0.28em] text-white">{roomCode}</span>
        </div>
      </div>
    </div>
  );
}
