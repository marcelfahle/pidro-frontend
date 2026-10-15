import { describe, expect, it } from 'bun:test';
import {
  FADE_MS,
  SHOW_MS,
  initialTickerState,
  isTickerIdle,
  stepTicker,
  visibleLines,
} from '../../src/game/actionTickerSchedule.ts';

const ids = (n, prefix = 'a') => Array.from({ length: n }, (_, i) => `${prefix}${i}`);
const shown = (state, now) => visibleLines(state, now).map((line) => line.id);

describe('action ticker schedule', () => {
  it('does not replay what was already there when state first arrives', () => {
    // The table mounts before server state; nothing is history until it arrives.
    let state = stepTicker(initialTickerState(), [], 0, false);
    state = stepTicker(state, ids(12), 100);
    expect(shown(state, 100)).toEqual([]);
    expect(isTickerIdle(state, 100)).toBe(true);
  });

  it('shows the first action of a fresh game', () => {
    // State arrives before anyone has bid: the log is empty, and the first bid is news.
    let state = stepTicker(initialTickerState(), [], 0, false);
    state = stepTicker(state, [], 50);
    state = stepTicker(state, ['bid-1-west'], 900);
    expect(shown(state, 900)).toEqual(['bid-1-west']);
  });

  it('shows a new line for SHOW_MS, fades it, and only then goes idle', () => {
    let state = stepTicker(initialTickerState(), ['old'], 0);
    state = stepTicker(state, ['old', 'new'], 1000);
    expect(visibleLines(state, 1000)).toEqual([{ id: 'new', fading: false }]);
    expect(visibleLines(state, 1000 + SHOW_MS + 1)).toEqual([{ id: 'new', fading: true }]);
    expect(isTickerIdle(state, 1000 + SHOW_MS + 1)).toBe(false);
    expect(shown(state, 1000 + SHOW_MS + FADE_MS)).toEqual([]);
    expect(isTickerIdle(state, 1000 + SHOW_MS + FADE_MS)).toBe(true);
  });

  it('never cuts a line short when a burst arrives', () => {
    let state = stepTicker(initialTickerState(), ['x'], 0);
    state = stepTicker(state, ['x', 'p1'], 0);
    state = stepTicker(state, ['x', 'p1', 'p2'], 1500);
    state = stepTicker(state, ['x', 'p1', 'p2', 'p3', 'take', 'two'], 2000);
    // Three slots: p1, p2 and p3 show; the take and the 2 wait.
    expect(shown(state, 2000)).toEqual(['p1', 'p2', 'p3']);
    // p1 is still on screen until it has had its full time.
    expect(shown(stepTicker(state, ['x', 'p1', 'p2', 'p3', 'take', 'two'], 3000), 3000)).toContain(
      'p1'
    );
    // Once p1 has faded, the take moves up in order.
    const later = stepTicker(state, ['x', 'p1', 'p2', 'p3', 'take', 'two'], SHOW_MS + FADE_MS);
    expect(shown(later, SHOW_MS + FADE_MS)).toEqual(['p2', 'p3', 'take']);
  });

  it('drops the oldest waiting lines when far behind', () => {
    let state = stepTicker(initialTickerState(), ['x'], 0);
    state = stepTicker(state, ['x', ...ids(10)], 0);
    expect(shown(state, 0)).toEqual(['a0', 'a1', 'a2']);
    expect(state.queue).toEqual(['a4', 'a5', 'a6', 'a7', 'a8', 'a9']);
  });

  it('does not queue a line again when it comes back', () => {
    let state = stepTicker(initialTickerState(), ['x'], 0);
    state = stepTicker(state, ['x', 'n'], 0);
    state = stepTicker(state, ['x'], 100);
    state = stepTicker(state, ['x', 'n'], SHOW_MS + FADE_MS);
    expect(shown(state, SHOW_MS + FADE_MS)).toEqual([]);
  });
});
