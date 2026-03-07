import type { GamePhase, Position, Suit } from '@pidro/shared';
import { SUIT_COLORS_RAW, SUIT_SYMBOLS, getTeamScores } from '@pidro/shared';

interface GameInfoBarProps {
  phase: GamePhase;
  trumpSuit: Suit | null;
  scores: { north_south: number; east_west: number } | null;
  youPosition: Position | null;
  roundNumber: number | null;
  roomCode: string;
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

export function GameInfoBar({
  phase,
  trumpSuit,
  scores,
  youPosition,
  roundNumber,
  roomCode,
}: GameInfoBarProps) {
  const teamScores = scores ? getTeamScores(scores, youPosition) : { us: 0, them: 0 };

  return (
    <div className="pidro-score-plaque w-[320px] px-4 pb-4 pt-2 max-md:w-[84vw] max-md:max-w-[320px] max-md:px-3 max-md:pb-2.5">
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3 border-b border-[#ffcc54]/20 pb-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ffebaa]/65">Us</div>
          <div className="text-4xl font-black text-white max-md:text-3xl">{teamScores.us}</div>
        </div>
        <div className="h-10 w-px bg-[#ffcc54]/20" />
        <div className="text-right">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ffebaa]/65">
            Them
          </div>
          <div className="text-4xl font-black text-[#ffcc54] max-md:text-3xl">{teamScores.them}</div>
        </div>
      </div>

      <div className="mt-2.5 grid gap-2 text-xs font-black uppercase tracking-[0.12em] text-[#fff0b8] max-md:grid-cols-2 max-md:text-[11px]">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[#ffebaa]/70">Phase</span>
          <span className="text-right text-white">{PHASE_LABELS[phase] ?? phase}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[#ffebaa]/70">Hand</span>
          <span className="text-right text-white">{roundNumber != null ? `#${roundNumber}` : 'Soon'}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[#ffebaa]/70">Trump</span>
          {trumpSuit ? (
            <span
              className="flex items-center gap-2 text-right text-white"
              style={{ color: SUIT_COLORS_RAW[trumpSuit] }}
            >
              {SUIT_SYMBOLS[trumpSuit]} <span className="text-white">{trumpSuit}</span>
            </span>
          ) : (
            <span className="text-right text-white/75">Undeclared</span>
          )}
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[#ffebaa]/70">Room</span>
          <span className="font-mono text-right tracking-[0.28em] text-white">{roomCode}</span>
        </div>
      </div>
    </div>
  );
}
