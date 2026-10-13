import { test, expect } from '../fixtures';
import { HomeScreen } from '../screens/home-screen';
import { guest } from '../support/api';
import { startSignedIn } from '../support/session';

test('Quick game leaves no table when the lobby cannot be loaded', async ({ page, player }) => {
  await startSignedIn(page, await guest(player));
  await page.goto('/home');
  await expect(new HomeScreen(page).root).toBeVisible({ timeout: 30_000 });

  // The new table is refused as if the player sat somewhere, and the lobby that
  // would say where cannot be reached.
  await page.route('**/api/v1/rooms', (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({
          status: 422,
          contentType: 'application/json',
          body: JSON.stringify({
            errors: [{ code: 'ALREADY_IN_ROOM', detail: 'Player is already in a room' }],
          }),
        })
      : route.continue()
  );
  await page.route('**/api/v1/lobby', (route) => route.abort());
  const leaves: string[] = [];
  page.on('request', (request) => {
    if (request.url().endsWith('/leave')) leaves.push(request.url());
  });

  await page.getByTestId('home-quick-game').click();
  await expect(
    page.getByText('We could not check whether you are at another table.')
  ).toBeVisible();
  expect(leaves).toEqual([]);

  await page.unrouteAll();
  await page.getByTestId('home-quick-game').click();
  await page.waitForURL(/\/game\/[A-Z0-9]+/);
  expect(leaves).toEqual([]);
});
