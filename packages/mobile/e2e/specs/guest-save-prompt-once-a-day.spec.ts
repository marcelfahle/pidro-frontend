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
  // Force the order that races: the new table is refused while the leave from
  // the game-over window is in flight, and Home's own leave finds nothing to leave.
  const refused = (status: number, code: string, detail: string) => ({
    status,
    contentType: 'application/json',
    body: JSON.stringify({ errors: [{ code, detail }] }),
  });
  let createRefused = false;
  await page.route('**/api/v1/rooms', (route) => {
    if (route.request().method() !== 'POST' || createRefused) return route.continue();
    createRefused = true;
    return route.fulfill(refused(409, 'ALREADY_IN_ROOM', 'Player is already in a room'));
  });
  await page.route('**/api/v1/rooms/current/leave', (route) =>
    route.fulfill(refused(404, 'NOT_IN_ROOM', 'Player is not in any room'))
  );
  await page.getByTestId('game-over-home').click();
  await expect(new HomeScreen(page).root).toBeVisible();

  await page.getByTestId('home-quick-game').click();
  await page.waitForURL(/\/game\/[A-Z0-9]+/);
  const second = await playOutGame(page, started.token);
  // The result is complete once the XP shows; the prompt would have come with it.
  await expect(second.getByText(/\+\d+ XP/)).toBeVisible();
  await expect(second.getByText('Ready for real players?')).toHaveCount(0);
});
