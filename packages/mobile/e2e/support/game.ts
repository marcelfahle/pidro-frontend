import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { expect, type Page } from '@playwright/test';
import { API } from './api';

const run = promisify(execFile);

/** The room code of the table the page is at. */
export function tableCode(page: Page) {
  const code = /\/game\/([A-Z0-9]+)/.exec(page.url())?.[1];
  if (!code) throw new Error(`not at a table: ${page.url()}`);
  return code;
}

/**
 * Plays the player's seat to game over over the real game channel, the way the
 * game e2e does, while the page watches. A table with bots waits for the human.
 */
export async function playOutGame(page: Page, token: string) {
  const script = join(__dirname, '../../scripts/autoplay-full-game.mjs');
  const room = tableCode(page);
  await run(process.execPath, [script, '--token', token, '--room', room], {
    env: { ...process.env, API_BASE_URL: API, WS_BASE_URL: `${API.replace(/^http/, 'ws')}/socket` },
    timeout: 120_000,
  });
  const window = page.getByTestId('game-over-window');
  await expect(window).toBeVisible({ timeout: 30_000 });
  return window;
}
