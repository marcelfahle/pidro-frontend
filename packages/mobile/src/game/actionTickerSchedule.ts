/**
 * Paces the plaque's ticker so every line can be read. Up to three lines show;
 * each stays SHOW_MS, fades for FADE_MS, and only then frees its slot, so a
 * burst (a trick's last card, its take and the 2 of trump) waits its turn
 * instead of cutting earlier lines short. What was already on the table when
 * state first arrived is never replayed. Pure: the caller supplies the clock.
 */

export const SHOW_MS = 3500;
export const FADE_MS = 400;
const MAX_LINES = 3;
/** Far behind (fast bots), the oldest waiting lines are dropped; the log keeps them. */
const MAX_QUEUE = 6;

export type TickerState = {
  /** False until the first non-empty snapshot sets what counts as already seen. */
  ready: boolean;
  seen: ReadonlySet<string>;
  queue: string[];
  lines: { id: string; shownAt: number }[];
};

export function initialTickerState(): TickerState {
  return { ready: false, seen: new Set(), queue: [], lines: [] };
}

const expired = (line: { shownAt: number }, now: number) => now >= line.shownAt + SHOW_MS + FADE_MS;

export function stepTicker(state: TickerState, ids: readonly string[], now: number): TickerState {
  if (!state.ready) {
    // The table mounts before state arrives; the first real snapshot is history.
    return ids.length === 0 ? state : { ready: true, seen: new Set(ids), queue: [], lines: [] };
  }
  const fresh = ids.filter((id) => !state.seen.has(id));
  const seen = fresh.length > 0 ? new Set([...state.seen, ...fresh]) : state.seen;
  const queue = [...state.queue, ...fresh];
  const lines = state.lines.filter((line) => !expired(line, now));
  while (lines.length < MAX_LINES && queue.length > 0) {
    lines.push({ id: queue.shift() as string, shownAt: now });
  }
  return { ready: true, seen, queue: queue.slice(-MAX_QUEUE), lines };
}

export function visibleLines(state: TickerState, now: number): { id: string; fading: boolean }[] {
  return state.lines
    .filter((line) => !expired(line, now))
    .map((line) => ({ id: line.id, fading: now >= line.shownAt + SHOW_MS }));
}

/** Nothing on screen or fading: the resting line may show. */
export function isTickerIdle(state: TickerState, now: number): boolean {
  return visibleLines(state, now).length === 0 && state.queue.length === 0;
}

/** Milliseconds until the next line fades or frees its slot, or null when nothing is pending. */
export function nextTickerChange(state: TickerState, now: number): number | null {
  const times = state.lines.flatMap((line) => [
    line.shownAt + SHOW_MS,
    line.shownAt + SHOW_MS + FADE_MS,
  ]);
  const upcoming = times.filter((time) => time > now);
  return upcoming.length > 0 ? Math.min(...upcoming) - now : null;
}
