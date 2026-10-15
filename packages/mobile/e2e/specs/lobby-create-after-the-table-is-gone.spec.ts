import { test, expect } from '../fixtures';
import { register } from '../support/api';
import { startSignedIn } from '../support/session';

test('a new table is created when the old one is already gone', async ({ page, player }) => {
  await startSignedIn(page, await register(player));
  await page.goto('/lobby');
  await expect(page.getByTestId('lobby-screen')).toBeVisible({ timeout: 30_000 });

  // The first create is refused as if the player still sat at a table that is
  // gone by the time the lobby leaves it: the server answers "not in any room".
  let refused = false;
  await page.route('**/api/v1/rooms', (route) => {
    if (route.request().method() !== 'POST' || refused) return route.continue();
    refused = true;
    return route.fulfill({
      status: 422,
      contentType: 'application/json',
      body: JSON.stringify({
        errors: [{ code: 'ALREADY_IN_ROOM', detail: 'Player is already in a room' }],
      }),
    });
  });
  const left = page.waitForResponse((response) => response.url().endsWith('/current/leave'));

  await page.getByRole('button', { name: 'Start a table', exact: true }).first().click();
  await page
    .getByTestId('create-room-window')
    .getByRole('button', { name: 'Open the table' })
    .click();
  expect((await left).status()).toBe(404);
  await page.waitForURL(/\/game\/[A-Z0-9]+/);
});
