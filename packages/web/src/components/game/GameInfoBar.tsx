import type { GamePhase, Suit } from '@pidro/shared';
import { SUIT_COLORS_RAW, SUIT_SYMBOLS } from '@pidro/shared';

interface GameInfoBarProps {
  phase: GamePhase;
  trumpSuit: Suit | null;
  scores: { north_south: number; east_west: number } | null;
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

export function GameInfoBar({ phase, trumpSuit, scores, roundNumber, roomCode }: GameInfoBarProps) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-emerald-950/60 px-4 py-2 text-sm">
      {/* Left: scores */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-emerald-400">N/S:</span>
          <span className="font-bold text-white">{scores?.north_south ?? 0}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-emerald-400">E/W:</span>
          <span className="font-bold text-white">{scores?.east_west ?? 0}</span>
        </div>
      </div>

      {/* Center: phase + round */}
      <div className="flex items-center gap-2">
        <span className="text-emerald-300">{PHASE_LABELS[phase] ?? phase}</span>
        {roundNumber != null && <span className="text-emerald-500">Hand #{roundNumber}</span>}
      </div>

      {/* Right: trump + room code */}
      <div className="flex items-center gap-3">
        {trumpSuit ? (
          <div className="flex items-center gap-1">
            <span className="text-emerald-400">Trump:</span>
            <span className="text-lg font-bold" style={{ color: SUIT_COLORS_RAW[trumpSuit] }}>
              {SUIT_SYMBOLS[trumpSuit]}
            </span>
          </div>
        ) : (
          <span className="text-emerald-500/60">No trump</span>
        )}
        <span className="text-emerald-600">{roomCode}</span>
      </div>
    </div>
  );
}
