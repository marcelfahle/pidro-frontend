import { expect } from '@playwright/test';

/** Waits, by polling, until the clock has passed `time` (ms since the epoch). */
export const untilAfter = (time: number) =>
  expect.poll(() => Date.now(), { timeout: 10_000 }).toBeGreaterThan(time);
