import type { ActiveTurnTimer } from '@pidro/shared';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TurnTimerBanner } from './TurnTimerBanner';

function buildTimer(overrides: Partial<ActiveTurnTimer> = {}): ActiveTurnTimer {
  return {
    timerId: 1,
    scope: 'seat',
    position: 'south',
    phase: 'playing',
    durationMs: 30_000,
    transitionDelayMs: 1_500,
    serverTime: '2026-03-11T12:34:56.789Z',
    remainingMs: 31_500,
    receivedAtMs: Date.now(),
    eventSeq: 9,
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-03-11T12:34:56.789Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('TurnTimerBanner', () => {
  it('shows the transition delay before the active countdown starts', () => {
    render(<TurnTimerBanner turnTimer={buildTimer()} youPosition="south" />);

    expect(screen.getByText('Your Clock')).toBeTruthy();
    expect(screen.getByText('Starts in 2s')).toBeTruthy();
    expect(screen.getByText('Auto-play')).toBeTruthy();
  });

  it('switches to the countdown display and supports room-owned timers', () => {
    render(
      <TurnTimerBanner
        turnTimer={buildTimer({
          scope: 'room',
          position: null,
          phase: 'dealer_selection',
          durationMs: 30_000,
          transitionDelayMs: 0,
          remainingMs: 30_000,
        })}
        youPosition="north"
      />,
    );

    expect(screen.getByText('Dealer Draw Clock')).toBeTruthy();
    expect(screen.getByText('30s left')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(1_100);
    });

    expect(screen.getByText('29s left')).toBeTruthy();
  });
});
