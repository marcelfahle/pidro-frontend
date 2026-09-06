import type { Position } from '@pidro/shared';

interface OwnerDecisionBannerProps {
  playerName: string;
  position: Position;
  onOpenSeat: (position: Position) => void;
  onKeepBot: (position: Position) => void;
  busy?: boolean;
  error?: string | null;
  pendingCount?: number;
}

export function OwnerDecisionBanner({
  playerName,
  position,
  onOpenSeat,
  onKeepBot,
  busy = false,
  error,
  pendingCount = 1,
}: OwnerDecisionBannerProps) {
  return (
    <div className="animate-slide-in-top absolute inset-x-0 top-0 z-40 flex justify-center p-2">
      <section
        aria-label="Seat decision"
        className="flex max-w-xl flex-wrap items-center gap-3 rounded-lg border border-amber-400/30 bg-amber-950/95 px-4 py-2.5 shadow-lg"
      >
        <span className="text-sm text-amber-100">
          {playerName} left ({position}). Open this seat for another player?
          {pendingCount > 1 && ` ${pendingCount - 1} more waiting.`}
        </span>
        {error && (
          <p role="status" className="w-full text-sm text-red-200">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => onOpenSeat(position)}
            className="rounded-md bg-amber-500/90 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-950 transition-colors hover:bg-amber-400"
          >
            {busy ? 'Opening…' : 'Open Seat'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onKeepBot(position)}
            className="rounded-md border border-amber-400/30 bg-amber-900/50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-200 transition-colors hover:bg-amber-800/60"
          >
            Keep Bot
          </button>
        </div>
      </section>
    </div>
  );
}
