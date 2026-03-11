import type { ActiveTurnTimer, Position } from '@pidro/shared';
import { useEffect, useState } from 'react';

interface TurnTimerBannerProps {
  turnTimer: ActiveTurnTimer | null;
  youPosition: Position | null;
}

function formatPosition(position: Position | null, youPosition: Position | null): string {
  if (!position) return 'Table';
  if (position === youPosition) return 'Your';
  return `${position[0].toUpperCase()}${position.slice(1)}`;
}

function formatSeconds(ms: number): string {
  return `${Math.max(0, Math.ceil(ms / 1000))}s`;
}

function phaseVerb(phase: ActiveTurnTimer['phase']): string {
  switch (phase) {
    case 'bidding':
      return 'Auto-pass';
    case 'declaring':
    case 'declaring_trump':
    case 'trump_declaration':
      return 'Auto-declare';
    case 'playing':
      return 'Auto-play';
    case 'second_deal':
      return 'Auto-select';
    case 'dealer_selection':
      return 'Auto-select';
    default:
      return 'Auto-play';
  }
}

export function TurnTimerBanner({ turnTimer, youPosition }: TurnTimerBannerProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!turnTimer) return;

    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [turnTimer]);

  if (!turnTimer) return null;

  const elapsedMs = now - turnTimer.receivedAtMs;
  const remainingTotalMs = Math.max(0, turnTimer.remainingMs - elapsedMs);
  const transitionRemainingMs = Math.max(0, remainingTotalMs - turnTimer.durationMs);
  const countdownRemainingMs = Math.min(turnTimer.durationMs, remainingTotalMs);
  const progress =
    turnTimer.durationMs > 0 ? Math.max(0.04, countdownRemainingMs / turnTimer.durationMs) : 0.04;

  const tone =
    transitionRemainingMs > 0
      ? 'from-cyan-500/80 via-sky-300/80 to-cyan-500/80'
      : progress > 0.5
        ? 'from-cyan-400 to-emerald-300'
        : progress > 0.25
          ? 'from-amber-300 to-orange-400'
          : 'from-red-400 to-orange-500';

  const label =
    turnTimer.scope === 'room'
      ? 'Dealer Draw Clock'
      : `${formatPosition(turnTimer.position, youPosition)} Clock`;

  const status =
    transitionRemainingMs > 0
      ? `Starts in ${formatSeconds(transitionRemainingMs)}`
      : `${formatSeconds(countdownRemainingMs)} left`;

  return (
    <div
      className="w-full max-w-[360px] max-sm:max-w-none"
      data-testid="turn-timer-banner"
      data-tone={transitionRemainingMs > 0 ? 'transition' : progress > 0.25 ? 'active' : 'critical'}
    >
      <div className="relative overflow-hidden rounded-[16px] border border-[#ffd26b]/35 bg-[linear-gradient(180deg,rgba(255,214,114,0.12)_0%,rgba(3,18,27,0.74)_40%,rgba(2,10,15,0.94)_100%)] px-3 py-2 shadow-[0_12px_24px_rgba(12,4,0,0.35)] backdrop-blur-sm max-sm:rounded-none max-sm:border-x-0 max-sm:border-t-0 max-sm:px-4 max-sm:py-2">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,232,168,0.2),transparent_55%)]" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ffe6a5]/75">
              {label}
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-base font-black uppercase tracking-[0.08em] text-white max-sm:text-sm">
                {status}
              </div>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-50/55">
                {phaseVerb(turnTimer.phase)}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-[#ffe6a5]/55">
              Phase
            </div>
            <div className="text-[11px] font-black uppercase tracking-[0.12em] text-white/85">
              {turnTimer.phase.replace(/_/g, ' ')}
            </div>
          </div>
        </div>

        <div className="relative mt-2 h-2.5 overflow-hidden rounded-full border border-white/10 bg-black/35">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${tone} shadow-[0_0_18px_rgba(255,196,84,0.35)] transition-[width] duration-200 ease-linear`}
            style={{ width: `${progress * 100}%` }}
          />
          {transitionRemainingMs > 0 && (
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent_0%,rgba(255,255,255,0.18)_40%,transparent_80%)] animate-[pidroTimerSweep_1.2s_linear_infinite]" />
          )}
        </div>
      </div>
    </div>
  );
}
