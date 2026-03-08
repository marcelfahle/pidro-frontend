import type { Position } from '@pidro/shared';

interface OwnerDecisionBannerProps {
  playerName: string;
  position: Position;
  onOpenSeat: (position: Position) => void;
  onKeepBot: (position: Position) => void;
}

export function OwnerDecisionBanner({
  playerName,
  position,
  onOpenSeat,
  onKeepBot,
}: OwnerDecisionBannerProps) {
  return (
    <div className="animate-slide-in-top absolute inset-x-0 top-0 z-40 flex justify-center p-2">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-400/30 bg-amber-950/90 px-4 py-2.5 shadow-lg backdrop-blur-sm">
        <span className="text-sm text-amber-100">
          {playerName} left. Open their seat for another player?
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onOpenSeat(position)}
            className="rounded-md bg-amber-500/90 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-950 transition-colors hover:bg-amber-400"
          >
            Open Seat
          </button>
          <button
            type="button"
            onClick={() => onKeepBot(position)}
            className="rounded-md border border-amber-400/30 bg-amber-900/50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-200 transition-colors hover:bg-amber-800/60"
          >
            Keep Bot
          </button>
        </div>
      </div>
    </div>
  );
}
