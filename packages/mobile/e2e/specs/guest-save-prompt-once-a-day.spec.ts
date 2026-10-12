import { test, expect } from '../fixtures';
import { HomeScreen } from '../screens/home-screen';
import { guest } from '../support/api';
import { playOutGame } from '../support/game';
import { startSignedIn } from '../support/session';

test.setTimeout(150_000);

test('the save prompt after a finished game shows once that day', async ({ page, player }) => {
  const started = await guest(player);
  await startSignedIn(page, started);
  await page.goto('/home');

  await page.getByTestId('home-quick-game').click();
  await page.waitForURL(/\/game\/[A-Z0-9]+/);
  const first = await playOutGame(page, started.token);
  await expect(first.getByText('Ready for real players?')).toBeVisible();
  // Let the table be left before the next one is asked for.
  const left = page.waitForResponse((response) => response.url().includes('/leave'));
  await page.getByTestId('game-over-home').click();
  await left;
  await expect(new HomeScreen(page).root).toBeVisible();

  await page.getByTestId('home-quick-game').click();
  await page.waitForURL(/\/game\/[A-Z0-9]+/);
  const second = await playOutGame(page, started.token);
  // The result is complete once the XP shows; the prompt would have come with it.
  await expect(second.getByText(/\+\d+ XP/)).toBeVisible();
  await expect(second.getByText('Ready for real players?')).toHaveCount(0);
});
